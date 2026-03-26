import type { ChapterContent } from '../../types.js';

export default {
  title: '設計分散式鍵值儲存（Key-Value Store）',
  content: `
<section id="consistent-hashing">
  <h2>Consistent Hashing 實作</h2>
  <p>分散式 Key-Value Store（如 Dynamo、Cassandra、Redis Cluster）的核心問題是：如何將資料分配到多個節點，同時在節點增減時盡量減少資料遷移？答案是 <strong>Consistent Hashing（一致性雜湊）</strong>。</p>

  <arch-diagram src="./diagrams/ch22-kvstore.json" caption="分散式 KV Store 架構：Consistent Hashing 環、虛擬節點分佈、Quorum 讀寫流程、Gossip 協議成員管理，以及 Vector Clock 衝突解決的完整設計。"></arch-diagram>

  <h3>普通雜湊的問題</h3>
  <pre data-lang="text"><code class="language-text">普通雜湊：node = hash(key) % N（N = 節點數量）

問題：當 N 變化時，幾乎所有 key 都需要重新分配！

範例（N=3 → N=4）：
  key="user:123" → hash=456
  舊：456 % 3 = 0 → Node 0
  新：456 % 4 = 0 → Node 0（碰巧相同）

  key="user:456" → hash=789
  舊：789 % 3 = 0 → Node 0
  新：789 % 4 = 1 → Node 1（需要遷移！）

平均約 (N-1)/N 比例的 key 需要重新分配
加入一個節點（N=3→4）：約 75% 的資料需要遷移
這在生產環境中是災難性的（同時大量資料遷移 = 服務中斷）</code></pre>

  <h3>Consistent Hashing 的工作原理</h3>
  <pre data-lang="text"><code class="language-text">Hash Ring（雜湊環）：
  1. 雜湊值空間形成一個環（0 到 2^32-1 = ~43億）
  2. 每個節點映射到環上的一個點（用節點 ID 的雜湊值）
  3. 每個 key 沿著環順時針方向找到第一個節點

加入新節點（Node E 加入 Node C 和 Node D 之間）：
  只有 Node E 到 Node C 之間（逆時針方向）的 key
  需要從 Node D 遷移到 Node E
  遷移比例約 = 1/N（N = 節點數量）

移除節點（Node C 下線）：
  Node C 負責的 key 自動歸屬給順時針方向的下一個節點 Node D
  遷移比例約 = 1/N

理想情況下：N 個節點均勻分佈在環上
  每個節點負責 1/N 的 key 空間
  加入/移除一個節點時，只有 1/N 的資料需要遷移</code></pre>

  <h3>虛擬節點（Virtual Nodes）完整算法</h3>
  <p>純粹的 Consistent Hashing 存在負載不均衡的問題：節點在環上的分佈並非完美均勻，導致部分節點負載過重。虛擬節點透過讓每個物理節點對應多個環上的點來解決這個問題。</p>
  <pre data-lang="typescript"><code class="language-typescript">class ConsistentHashRing {
  private ring = new Map&lt;number, string&gt;();  // hash → nodeId
  private sortedKeys: number[] = [];           // 排序的雜湊值（用於二分搜尋）
  private readonly virtualNodesPerPhysical: number;

  constructor(virtualNodesPerPhysical = 150) {
    this.virtualNodesPerPhysical = virtualNodesPerPhysical;
  }

  addNode(nodeId: string, weight = 1): void {
    // weight 允許高性能節點獲得更多虛擬節點（更多資料）
    const vnodeCount = Math.round(this.virtualNodesPerPhysical * weight);

    for (let i = 0; i &lt; vnodeCount; i++) {
      // 每個虛擬節點有唯一的 ID
      const virtualNodeId = \`\${nodeId}#vnode-\${i}\`;
      const hash = this.murmurHash3(virtualNodeId);

      this.ring.set(hash, nodeId);
      this.insertSorted(hash);
    }

    console.log(\`Added node \${nodeId} with \${vnodeCount} virtual nodes\`);
  }

  removeNode(nodeId: string, weight = 1): void {
    const vnodeCount = Math.round(this.virtualNodesPerPhysical * weight);

    for (let i = 0; i &lt; vnodeCount; i++) {
      const virtualNodeId = \`\${nodeId}#vnode-\${i}\`;
      const hash = this.murmurHash3(virtualNodeId);

      this.ring.delete(hash);
      this.removeSorted(hash);
    }
  }

  // 找到負責指定 key 的節點（順時針方向的第一個節點）
  getNode(key: string): string {
    if (this.ring.size === 0) throw new Error('Ring is empty');

    const hash = this.murmurHash3(key);

    // 二分搜尋：找到第一個 >= hash 的位置
    let lo = 0, hi = this.sortedKeys.length - 1;
    while (lo &lt; hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (this.sortedKeys[mid] &lt; hash) lo = mid + 1;
      else hi = mid;
    }

    // 繞回：如果所有節點的 hash 都小於 key 的 hash，繞回環的起點
    const nodeHash = this.sortedKeys[lo] >= hash
      ? this.sortedKeys[lo]
      : this.sortedKeys[0];

    return this.ring.get(nodeHash)!;
  }

  // 獲取負責指定 key 的多個副本節點（用於 Replication）
  getNodes(key: string, count: number): string[] {
    const hash = this.murmurHash3(key);
    const startIdx = this.findStartIndex(hash);
    const nodes = new Set&lt;string&gt;();

    // 沿環順時針收集不同的物理節點（跳過同一物理節點的虛擬節點）
    let idx = startIdx;
    while (nodes.size &lt; count && nodes.size &lt; this.getPhysicalNodeCount()) {
      const nodeId = this.ring.get(this.sortedKeys[idx])!;
      nodes.add(nodeId);
      idx = (idx + 1) % this.sortedKeys.length;
    }

    if (nodes.size &lt; count) {
      throw new Error(\`Not enough nodes: requested \${count}, available \${nodes.size}\`);
    }

    return [...nodes];
  }

  private getPhysicalNodeCount(): number {
    return new Set(this.ring.values()).size;
  }

  private murmurHash3(key: string): number {
    // MurmurHash3：分佈均勻、計算快速，適合 Consistent Hashing
    let h = 0x811c9dc5;
    for (let i = 0; i &lt; key.length; i++) {
      h ^= key.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;  // 確保無符號 32 位整數
  }
}

// 使用示例：根據性能設置不同的虛擬節點數
const ring = new ConsistentHashRing(150);
ring.addNode('node-A', 1.0);   // 標準節點：150 個虛擬節點
ring.addNode('node-B', 2.0);   // 高性能節點：300 個虛擬節點（2 倍資料）
ring.addNode('node-C', 0.5);   // 低性能節點：75 個虛擬節點（半數資料）</code></pre>

  <h3>節點加入/離開的數據遷移</h3>
  <pre data-lang="text"><code class="language-text">節點加入時的資料遷移流程：

場景：4 個節點的環中加入 Node E

步驟：
  1. Node E 計算自己在環上的位置（150 個虛擬節點）
  2. 對每個虛擬節點，找到其順時針方向的下一個節點（原責任節點）
  3. 通知原責任節點：「請將你負責範圍內的部分 key 遷移給我」
  4. 原責任節點批次傳輸這些 key-value 對
  5. 遷移完成後，Node E 開始正式接受讀寫請求

遷移期間的一致性保證：
  - 遷移中的 key：兩個節點都保留副本
  - 讀取：優先讀 Node E（最新），若不存在回退到原節點
  - 寫入：同時寫入兩個節點（雙寫），直到遷移完成
  - 遷移完成後：原節點刪除已遷移的 key

Cassandra 的 Bootstrap 流程（業界實踐）：
  1. 新節點加入時標記為 JOINING 狀態
  2. 開始 streaming（從其他節點接收數據）
  3. Streaming 完成後，新節點標記為 NORMAL
  4. 其他節點更新路由表，開始向新節點發送請求
  平均遷移速度：數百 MB/秒（受網路和磁碟限制）</code></pre>

  <callout-box type="info" title="虛擬節點數量的選擇">
    <p>虛擬節點越多，負載分佈越均勻，但記憶體消耗也越高。實際系統中 100-200 個虛擬節點通常足夠達到良好的均勻性（負載標準差 &lt; 5%）。Cassandra 的 vnodes 預設是 256 個。Amazon DynamoDB 的 Consistent Hashing 使用虛擬節點，每個節點在環上有多個位置，確保即使在節點故障時，負載也能均勻地分散到其他節點。</p>
  </callout-box>
</section>

<section id="replication-quorum">
  <h2>資料複製策略（Quorum）</h2>
  <p>為了保證高可用性和容錯性，資料需要複製到多個節點。Quorum（法定人數）機制在一致性和可用性之間提供了靈活的取捨。</p>

  <h3>NWR Quorum 數學推導</h3>
  <pre data-lang="text"><code class="language-text">N = 複製因子（Replication Factor）
W = 寫入 Quorum（Write Quorum，寫入需要確認的節點數）
R = 讀取 Quorum（Read Quorum，讀取需要回應的節點數）

強一致性條件：W + R > N
  → 讀取集合和寫入集合必然有交集（Overlap）
  → 交集中的節點一定有最新的資料
  → 因此讀取一定能看到最新的寫入

常見配置（N=3）：
  W=2, R=2（W+R=4 > 3）：
    → 強一致性
    → 讀寫都快（只等 2 個節點，1 個可以失敗）
    → 最常用的配置

  W=3, R=1（W+R=4 > 3）：
    → 強一致性
    → 寫入慢（等全部 3 個節點），讀取快（任意 1 個）
    → 適合讀多寫少

  W=1, R=3（W+R=4 > 3）：
    → 強一致性
    → 寫入快（任意 1 個確認），讀取慢（等全部 3 個）
    → 適合寫多讀少

  W=1, R=1（W+R=2 ≤ 3）：
    → 最終一致性（Eventual Consistency）
    → 讀寫都最快，但可能讀到舊資料
    → 適合允許短暫不一致的場景（如瀏覽計數）

容錯能力：
  N=3, W=2, R=2：可容忍 1 個節點故障
  N=5, W=3, R=3：可容忍 2 個節點故障
  一般規律：最多容忍 floor((N-1)/2) 個節點故障</code></pre>

  <h3>Quorum 讀寫實作</h3>
  <pre data-lang="typescript"><code class="language-typescript">class QuorumKVStore {
  private readonly N = 3;  // 複製因子
  private readonly W = 2;  // 寫入 Quorum
  private readonly R = 2;  // 讀取 Quorum

  async write(key: string, value: string): Promise&lt;void&gt; {
    const nodes = this.ring.getNodes(key, this.N);
    const timestamp = Date.now();

    const writeResults = await Promise.allSettled(
      nodes.map(nodeId =>
        this.nodeClients.get(nodeId)!.set(key, value, { timestamp })
      )
    );

    const successCount = writeResults.filter(r => r.status === 'fulfilled').length;
    if (successCount &lt; this.W) {
      throw new QuorumNotReachedException(
        \`Write quorum not reached: \${successCount}/\${this.W} nodes confirmed\`
      );
    }
    // W=2 時：即使 Node C 暫時失敗，寫入也成功
    // Node C 後來恢復時，透過 Gossip + Anti-entropy 同步資料
  }

  async read(key: string): Promise&lt;string | null&gt; {
    const nodes = this.ring.getNodes(key, this.N);

    const readResults = await Promise.allSettled(
      nodes.map(nodeId =>
        this.nodeClients.get(nodeId)!.get(key)
      )
    );

    const successResponses = readResults
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult&lt;VersionedValue&gt;).value)
      .filter(v => v !== null);

    if (successResponses.length &lt; this.R) {
      throw new QuorumNotReachedException(
        \`Read quorum not reached: \${successResponses.length}/\${this.R} nodes\`
      );
    }

    // 從多個回應中選取最新版本（最大時間戳）
    const latest = successResponses.reduce((a, b) =>
      a.timestamp > b.timestamp ? a : b
    );

    // Read Repair：異步修復落後的節點
    successResponses
      .filter(v => v.timestamp &lt; latest.timestamp)
      .forEach(oldVersion => {
        this.repairNode(key, latest).catch(console.error);
      });

    return latest.value;
  }
}</code></pre>

  <h3>Sloppy Quorum 與 Hinted Handoff</h3>
  <p>在網路分區時，系統可能無法聯繫到承載某個 key 的節點。Sloppy Quorum 允許暫時使用環上其他節點接受寫入。</p>
  <pre data-lang="text"><code class="language-text">Sloppy Quorum（寬鬆法定人數）：

場景：
  Key K 的 N=3 副本應在 Node A, B, C
  但 Node A 暫時無法聯繫（網路分區）

Strict Quorum：
  → 等待 Node A 恢復，或返回寫入失敗
  → 可用性降低

Sloppy Quorum：
  → 允許寫入到「備用」節點 Node D（環上的下一個節點）
  → 寫入時，Node D 知道這份資料「臨時代管」（稱為 Hint）
  → Node A 恢復後，Node D 將臨時資料「移交」給 Node A

Hinted Handoff（提示移交）實作：
  Node D 儲存：{
    key: K,
    value: V,
    timestamp: T,
    hint_for: "Node-A",    ← 標記這是代管 Node A 的資料
    hint_expires_at: T+24h ← Hint 的過期時間
  }

  Node A 恢復上線後：
  1. 廣播「我恢復了」（透過 Gossip）
  2. Node D 偵測到，發送 Handoff 請求：「這些是你的資料」
  3. Node A 接收並確認
  4. Node D 刪除臨時資料

代價：Sloppy Quorum 放鬆了一致性保證，
      可能讀取不到剛寫入的資料（因為讀取可能命中舊節點）
      這是可用性（Availability）和一致性（Consistency）的取捨</code></pre>

  <h3>Anti-entropy Sync（反熵同步）</h3>
  <pre data-lang="text"><code class="language-text">問題：Hinted Handoff 只能解決短暫離線的情況。
      如果一個節點長時間離線，或直接失效後換新機器，
      如何讓新節點追上最新資料？

解決：Anti-entropy Sync（後台持續同步）

Merkle Tree 同步機制：
  1. 每個節點對自己負責的 key-value 建立 Merkle Tree
     （一種雜湊樹，根節點的雜湊代表所有資料的指紋）

  2. 定期與副本節點比較 Merkle Tree 的根雜湊
     → 相同：資料一致，無需同步
     → 不同：二分查找差異範圍，只同步有差異的葉節點

  3. 找到差異後，只傳輸不同的 key-value 對（增量同步）

效率：
  比全量掃描快得多（不需要逐一比較所有 key）
  Cassandra 使用此機制定期執行 "repair" 操作</code></pre>

  <callout-box type="info" title="AWS DynamoDB 的 Quorum 設計">
    <p>DynamoDB 使用 N=3 的複製因子，在同一個 AWS 地區的 3 個可用區（Availability Zone）各放一個副本。預設讀取是最終一致性（R=1），可選強一致性讀取（R=Quorum）但需要額外費用。強一致性讀取的延遲通常比最終一致性讀取高 50-100ms，但保證讀取到最新的寫入。</p>
  </callout-box>
</section>

<section id="gossip-protocol">
  <h2>Gossip Protocol</h2>
  <p>在去中心化的分散式系統（如 Cassandra、DynamoDB、Riak）中，節點如何知道其他節點的狀態？Gossip Protocol 模仿謠言傳播的方式，以指數級速度將資訊擴散到整個叢集，同時不需要中央協調器。</p>

  <h3>Gossip 協議的傳播模型</h3>
  <pre data-lang="text"><code class="language-text">傳播參數：
  fanout（散播因子）= 3：每輪每個節點向 3 個隨機節點傳播
  interval = 1 秒：每秒 Gossip 一輪

傳播速度分析：
  T=0：1 個節點知道新資訊
  T=1：1 + 3 = 4 個節點知道（新增 3 個）
  T=2：4 + 4×3 = 16 個（但有重複，實際約 10-12）
  T=3：約 30-40 個
  ...

  指數級傳播，約 O(log N) 輪達到全叢集覆蓋
  1000 個節點：約 log₃(1000) ≈ 7 輪 = 7 秒
  10,000 個節點：約 log₃(10000) ≈ 9 輪 = 9 秒

Gossip 的特性：
  - 去中心化：不需要中央節點，任何節點故障不影響傳播
  - 容錯性：訊息透過多路徑傳播，不怕單點丟失
  - 最終收斂：訊息不保證即時送達，但最終所有節點都會收到
  - 低開銷：每個節點只與少數幾個節點通訊（fanout=3）</code></pre>

  <h3>Gossip 協議實作</h3>
  <pre data-lang="typescript"><code class="language-typescript">class GossipNode {
  private membershipTable = new Map&lt;string, NodeInfo&gt;();
  private readonly gossipInterval = 1000;  // 每秒 Gossip 一次
  private readonly GOSSIP_FANOUT = 3;       // 每次隨機選 3 個節點

  async startGossip(): Promise&lt;void&gt; {
    setInterval(async () => {
      await this.gossipRound();
    }, this.gossipInterval);
  }

  private async gossipRound(): Promise&lt;void&gt; {
    // 1. 更新自身的心跳版本號（証明自己還活著）
    const selfInfo = this.membershipTable.get(this.nodeId)!;
    selfInfo.heartbeatVersion++;
    selfInfo.lastHeartbeat = Date.now();

    // 2. 隨機選取 fanout 個節點發送 Gossip
    const aliveNodes = [...this.membershipTable.values()]
      .filter(n => n.nodeId !== this.nodeId && n.status !== 'DOWN');

    const targets = this.randomSample(aliveNodes, this.GOSSIP_FANOUT);

    await Promise.allSettled(
      targets.map(target =>
        this.sendGossip(target.nodeId, [...this.membershipTable.values()])
      )
    );
  }

  // 收到其他節點的 Gossip：合併成員表
  onReceiveGossip(senderMembershipTable: NodeInfo[]): void {
    for (const receivedInfo of senderMembershipTable) {
      const localInfo = this.membershipTable.get(receivedInfo.nodeId);

      if (!localInfo) {
        // 發現新節點，加入成員表
        this.membershipTable.set(receivedInfo.nodeId, receivedInfo);
        this.onNodeJoin(receivedInfo.nodeId);
      } else if (receivedInfo.heartbeatVersion > localInfo.heartbeatVersion) {
        // 收到更新的版本，更新本地表
        this.membershipTable.set(receivedInfo.nodeId, receivedInfo);
      }
      // 如果版本號相同或更舊，忽略（保持本地版本）
    }
  }
}</code></pre>

  <h3>失敗偵測（Phi Accrual Failure Detector）</h3>
  <p>比簡單的超時更精確，Phi Accrual 基於歷史心跳間隔的統計分佈來計算故障可能性，輸出一個連續的「懷疑值（phi）」而非二元的存活/故障判斷。</p>
  <pre data-lang="typescript"><code class="language-typescript">// Phi Accrual Failure Detector（Cassandra 使用此演算法）
class PhiAccrualFailureDetector {
  private heartbeatHistory: number[] = [];  // 歷史心跳間隔（毫秒）
  private lastHeartbeat: number = Date.now();
  private readonly WINDOW = 1000;  // 保留最近 1000 個心跳間隔
  private readonly THRESHOLD = 8;  // Phi 超過此值視為故障

  recordHeartbeat(): void {
    const now = Date.now();
    const interval = now - this.lastHeartbeat;

    this.heartbeatHistory.push(interval);
    if (this.heartbeatHistory.length > this.WINDOW) {
      this.heartbeatHistory.shift();  // 移除最舊的記錄
    }

    this.lastHeartbeat = now;
  }

  // 計算 Phi 值：越大表示越可能故障
  phi(): number {
    if (this.heartbeatHistory.length &lt; 10) return 0;  // 資料不足，不判斷

    const timeSinceLast = Date.now() - this.lastHeartbeat;
    const mean = this.mean(this.heartbeatHistory);
    const std = Math.max(this.stddev(this.heartbeatHistory), 1);  // 避免除以 0

    // 使用指數分佈模型（心跳間隔通常近似指數分佈）
    const y = (timeSinceLast - mean) / std;
    const phi = -Math.log10(Math.exp(-y * 1.0604) / (1 + Math.exp(-y * 1.0604)));

    return Math.max(0, phi);
  }

  isDown(): boolean {
    return this.phi() > this.THRESHOLD;
  }

  isSuspected(): boolean {
    return this.phi() > this.THRESHOLD * 0.5;  // 超過閾值一半時「懷疑」
  }

  private mean(data: number[]): number {
    return data.reduce((a, b) => a + b, 0) / data.length;
  }

  private stddev(data: number[]): number {
    const avg = this.mean(data);
    const variance = data.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / data.length;
    return Math.sqrt(variance);
  }
}

// 在 Gossip 中整合 Phi Accrual
class GossipWithPhiDetector extends GossipNode {
  private detectors = new Map&lt;string, PhiAccrualFailureDetector&gt;();

  detectFailures(): void {
    for (const [nodeId, info] of this.membershipTable) {
      if (nodeId === this.nodeId) continue;

      const detector = this.detectors.get(nodeId);
      if (!detector) continue;

      if (detector.isDown()) {
        if (info.status !== 'DOWN') {
          info.status = 'DOWN';
          info.heartbeatVersion++;
          this.onNodeDown(nodeId);
        }
      } else if (detector.isSuspected()) {
        if (info.status === 'UP') {
          info.status = 'SUSPECTED';
        }
      }
    }
  }
}</code></pre>

  <h3>節點成員管理（SWIM Protocol）</h3>
  <pre data-lang="text"><code class="language-text">SWIM（Scalable Weakly-consistent Infection-style Membership）協議：

SWIM 改進了純 Gossip 的故障偵測，分為兩個部分：

1. 故障偵測（Failure Detection）：
   - 每個週期，Node A 隨機選取一個成員（Node B）發送 Ping
   - 如果 Node B 在超時前回應 Ack，標記為存活
   - 如果沒有 Ack，Node A 向 k 個其他節點發送 Ping-Request
     （請求它們代為 Ping Node B）
   - 如果仍無回應，Node B 被標記為可能故障

2. 成員傳播（Membership Dissemination）：
   - 使用 Gossip（Piggyback）傳播成員狀態變化
   - 每個 Ping/Ack 訊息都攜帶一小部分成員狀態更新（Piggyback）
   - 避免了獨立的 Gossip 輪次，更高效

SWIM vs 純 Gossip 的比較：
  純 Gossip：每個節點主動廣播心跳，訊息量 O(N)
  SWIM：直接 Ping 特定節點，訊息量 O(1) 每個節點
  → SWIM 更可擴展，適合大型叢集

業界採用：
  HashiCorp Memberlist 實作了 SWIM（Consul, Nomad 使用）
  Akka Cluster（Java/Scala 分散式框架）使用改進版 Gossip
  Cassandra 使用 Gossip + Phi Accrual</code></pre>

  <callout-box type="info" title="Gossip 的傳播特性">
    <p>Gossip Protocol 的收斂時間是 O(log N)，N=1000 個節點只需要約 7 輪就能讓所有節點知曉新資訊。每輪約 1 秒，所以整個叢集約 7 秒收斂。代價是輕微的網路開銷（每節點每秒發送少量 Gossip 訊息）和最終一致性（而非強一致性）。在需要即時一致性的場景（如選主），需要使用更強的協議（Raft、Paxos）。</p>
  </callout-box>
</section>

<section id="vector-clock">
  <h2>Vector Clock 衝突解決</h2>
  <p>在 AP 系統中（如 DynamoDB、Riak），同一個 key 可能在不同節點被同時更新，產生衝突（Conflict）。如何偵測衝突並正確解決，是分散式系統中最困難的問題之一。</p>

  <h3>為什麼需要 Vector Clock？</h3>
  <pre data-lang="text"><code class="language-text">問題：僅憑時間戳（Timestamp）無法正確判斷因果關係
  原因：不同伺服器的時鐘可能不一致（NTP 同步誤差可達毫秒）

範例：
  T=100: Client A 在 Node 1 寫入 x=1
  T=98:  Client B（時鐘慢了 3ms）在 Node 2 寫入 x=2

  按時間戳：x=1（T=100）比 x=2（T=98）更新 → x=1 獲勝？
  但實際上：如果 x=2 是在看到 x=1 之後的更新，就應該 x=2 獲勝
  → 時間戳無法正確判斷因果關係

Vector Clock 解決方案：使用邏輯時鐘追蹤因果關係
  不依賴物理時鐘，而是用每個節點的操作計數來表示順序</code></pre>

  <h3>Vector Clock 的具體示例（3 個節點的衝突場景）</h3>
  <pre data-lang="text"><code class="language-text">系統有 3 個節點：A, B, C
Vector Clock 格式：[A的版本號, B的版本號, C的版本號]

初始狀態：
  Key "user:profile" = "Alice", VC = [0, 0, 0]

Step 1：Client 1 在 Node A 更新 → 名字改為 "Alice Smith"
  Node A 的 VC 變為 [1, 0, 0]
  資料：{"name": "Alice Smith", VC: [1,0,0]}

Step 2：Client 2 讀到 Step 1 的結果，在 Node B 更新 → 改為 "Alice Chen"
  Client 2 帶著 [1,0,0] 發請求給 Node B
  Node B 的 VC：合併 [1,0,0] 後遞增自己 → [1, 1, 0]
  資料：{"name": "Alice Chen", VC: [1,1,0]}

Step 3（並行！）：
  同時，Client 3 讀到的是 Step 1 的結果（因網路延遲未看到 Step 2），
  在 Node C 更新 → 改為 "Alice Wang"
  Client 3 帶著 [1,0,0] 發請求給 Node C
  Node C 的 VC：合併 [1,0,0] 後遞增自己 → [1, 0, 1]
  資料：{"name": "Alice Wang", VC: [1,0,1]}

衝突偵測：
  比較 [1,1,0] 和 [1,0,1]：
  A：相等（都是 1）
  B：[1,1,0] 的 B=1 > [1,0,1] 的 B=0  ← 前者更新
  C：[1,1,0] 的 C=0 < [1,0,1] 的 C=1  ← 後者更新

  結論：兩個 VC 互相不可比（並行事件）→ 衝突！
  需要人工或自動合併（兩個版本都應保留）

因果關係判斷規則：
  VC1 "happens-before" VC2：VC1 的每個元素 ≤ VC2，且至少有一個嚴格 <
  [1,1,0] happens-before [2,1,0]（A 的版本 1 < 2）
  [1,1,0] 和 [1,0,1] 是並行（concurrent）</code></pre>

  <h3>Vector Clock 實作</h3>
  <pre data-lang="typescript"><code class="language-typescript">type VectorClock = Record&lt;string, number&gt;;

class VectorClockService {
  // 更新自己節點的版本號
  increment(clock: VectorClock, nodeId: string): VectorClock {
    return {
      ...clock,
      [nodeId]: (clock[nodeId] ?? 0) + 1,
    };
  }

  // 合併兩個 Vector Clock（取每個節點的最大值）
  merge(vc1: VectorClock, vc2: VectorClock): VectorClock {
    const allNodes = new Set([...Object.keys(vc1), ...Object.keys(vc2)]);
    const merged: VectorClock = {};
    for (const node of allNodes) {
      merged[node] = Math.max(vc1[node] ?? 0, vc2[node] ?? 0);
    }
    return merged;
  }

  // 判斷因果關係：vc1 是否 happens-before vc2
  happensBefore(vc1: VectorClock, vc2: VectorClock): boolean {
    const allNodes = new Set([...Object.keys(vc1), ...Object.keys(vc2)]);
    let hasStrictlyLess = false;

    for (const node of allNodes) {
      const v1 = vc1[node] ?? 0;
      const v2 = vc2[node] ?? 0;
      if (v1 > v2) return false;         // vc1 不可能 happen before vc2
      if (v1 &lt; v2) hasStrictlyLess = true;
    }

    return hasStrictlyLess;  // 需要至少一個嚴格 &lt;
  }

  // 判斷是否有衝突（並行事件）
  isConflict(vc1: VectorClock, vc2: VectorClock): boolean {
    return !this.happensBefore(vc1, vc2) && !this.happensBefore(vc2, vc1);
  }
}

// 衝突解決策略
class ConflictResolver {
  // 策略 1：Last-Write-Wins（LWW）—— 最簡單但可能丟資料
  resolveByLWW(versions: VersionedValue[]): VersionedValue {
    return versions.reduce((latest, current) =>
      (current.physicalTimestamp ?? 0) > (latest.physicalTimestamp ?? 0)
        ? current
        : latest
    );
    // 取捨：簡單、高效能，但在時鐘不準確時可能選錯版本，導致資料遺失
  }

  // 策略 2：Merge（適用特定資料類型，如 Set、Counter）
  resolveSetByMerge(versions: VersionedValue[]): VersionedValue {
    // Set 的合併：取所有版本的 Union（安全，不丟失任何元素）
    const mergedSet = new Set(
      versions.flatMap(v => JSON.parse(v.value) as string[])
    );
    const mergedClock = versions.reduce(
      (acc, v) => vcService.merge(acc, v.vectorClock),
      {} as VectorClock
    );
    return {
      value: JSON.stringify([...mergedSet]),
      vectorClock: mergedClock,
    };
    // 使用場景：用戶的標籤、購物車（商品集合）
  }

  // 策略 3：Client-side Resolution（返回所有衝突版本給應用層）
  // Amazon DynamoDB、Riak 的做法
  async resolveByClient(
    key: string,
    versions: VersionedValue[]
  ): Promise&lt;VersionedValue&gt; {
    // 返回多個版本，由應用程式決定如何合併
    // Amazon 購物車的例子：合併兩個購物車（取 Union，不刪除商品）
    // 即使用戶可能只想要其中一個版本，合併至少不會讓用戶「丟失」商品
    const mergedValue = await applicationLayer.mergeConflicts(key, versions);
    return mergedValue;
  }
}</code></pre>

  <h3>Last-Write-Wins 的取捨</h3>
  <pre data-lang="text"><code class="language-text">Last-Write-Wins（LWW）的問題：

場景：
  T=100ms: Node A 寫入 x="重要資料"
  T=99ms:  Node B 寫入 x="覆蓋資料"（時鐘稍慢）

  LWW 結果：x="重要資料"（因為 T=100 > T=99）

但如果用戶意圖是：
  先有 x="重要資料"（被用戶 A 設定）
  後來用戶 B 看到後決定改成 x="覆蓋資料"

  用戶 B 的更新應該獲勝，但 LWW 卻選了用戶 A 的版本（因時鐘誤差）

LWW 的適用場景（可以接受偶發的資料遺失）：
  - 快取（Cache）：偶爾返回舊值可接受
  - 用戶最後一次登入時間：寫入比精確性更重要
  - 高頻寫入的計數器（如點讚數）：偶爾誤差可接受

不適用 LWW 的場景：
  - 金融交易：不能丟失任何一筆
  - 用戶資料修改：不能讓用戶的更新被「靜默」覆蓋
  - 訂單狀態：狀態機的每個轉換都必須被記錄</code></pre>

  <h3>CRDT 簡介（Conflict-free Replicated Data Types）</h3>
  <pre data-lang="text"><code class="language-text">CRDT（衝突自由複製資料型別）：

設計原則：對資料結構的設計加以限制，
          使得任何並行更新都可以自動合併，不需要人工處理衝突。

常見 CRDT 類型：

1. G-Counter（只增計數器）：
   每個節點維護一個本地計數器，只能遞增
   合併規則：取每個節點的最大值
   [A:5, B:3, C:2] merge [A:4, B:6, C:2] = [A:5, B:6, C:2]
   總計 = sum = 13
   使用場景：點讚數、瀏覽量

2. LWW-Element-Set（最後寫入勝出集合）：
   每個元素有時間戳，合併時保留時間戳較大的版本
   使用場景：用戶標籤（最終一致的集合）

3. OR-Set（可觀察移除集合）：
   每個元素有唯一 ID（而非時間戳）
   加入操作：為元素生成唯一 token
   移除操作：移除特定 token
   合併規則：只有「加入沒有被移除」的元素才存在
   優點：正確處理並行的加入和移除操作
   使用場景：協同文件的多人同時編輯

業界採用：
  Redis：提供 CRDT 資料結構（Redis Enterprise）
  Riak：內建 CRDT 支援（Counter, Set, Map, Register）
  Cassandra：提供 Counter 類型（G-Counter CRDT）
  協作工具（Notion, Figma）：使用自定義 CRDT 實現多人協同編輯</code></pre>

  <callout-box type="tip" title="向量時鐘在面試中的應用">
    <p>在面試中，提到 Vector Clock 時務必清楚說明：(1) 它解決的是因果追蹤問題，而非時鐘同步問題；(2) 它能偵測衝突，但需要額外的解決策略；(3) 在許多實際系統中，LWW 加上 AWS TrueTime（Google Spanner 也有類似機制，提供有界的時鐘誤差）可以大幅簡化衝突問題；(4) CRDT 是另一條路，透過設計資料結構本身來消除衝突，在協同編輯場景特別有價值。</p>
  </callout-box>
</section>
`,
} satisfies ChapterContent;
