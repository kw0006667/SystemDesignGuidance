import type { ChapterContent } from '../../types.js';

export default {
  title: '一致性與分散式事務',
  content: `
<section id="cap-deep-dive">
  <h2>CAP Theorem 深度解析</h2>
  <p>
    CAP 定理由 Eric Brewer 於 2000 年在 PODC 會議的 Keynote 中提出，
    隨後由 Gilbert 和 Lynch 在 2002 年正式證明。
    它描述了分散式系統在三個特性上無法同時滿足：
    <strong>一致性（Consistency）</strong>、
    <strong>可用性（Availability）</strong>、
    <strong>分區容忍性（Partition Tolerance）</strong>。
  </p>

  <h3>三個 CAP 特性的精確定義</h3>
  <p>許多工程師對 CAP 的理解是模糊的，精確定義至關重要：</p>
  <ul>
    <li><strong>C（Consistency）：</strong>這裡的 Consistency 是指
    <em>線性一致性（Linearizability）</em>，而非資料庫 ACID 中的 Consistency。
    意即：每次讀取都能得到最新的寫入值，或返回錯誤。系統行為如同只有一個副本。</li>
    <li><strong>A（Availability）：</strong>每個非故障節點收到的請求都必須得到回應
    （可以不是最新資料，但必須回應，不能返回錯誤或超時）。</li>
    <li><strong>P（Partition Tolerance）：</strong>即使系統節點之間的網路出現任意訊息遺失或延遲，
    系統仍然能繼續運作。</li>
  </ul>

  <h3>為什麼 Partition Tolerance 是強制選項？</h3>
  <p>在真實的分散式系統中，網路分區（Network Partition）是無法避免的物理現實。節點之間的網路可能因為：</p>
  <ul>
    <li>網路硬體故障（交換器、路由器、光纖失效）</li>
    <li>資料中心間的連線中斷（光纜被挖斷的案例並非罕見）</li>
    <li>網路壅塞導致封包遺失（丟包即等效於短暫分區）</li>
    <li>跨雲或跨地區部署的延遲激增（超過請求超時時間）</li>
  </ul>
  <p>
    因此，放棄 Partition Tolerance 意味著只能在單機上執行——
    因為任何多節點系統都必須假設節點間可能通訊失敗。
    <strong>真正的選擇是：當分區發生時，你選擇保留 Consistency 還是 Availability。</strong>
  </p>

  <callout-box type="info" title="CAP 定理的精確表述">
    CAP 定理應更精確地理解為：「在分區發生期間，系統必須選擇是要拒絕部分請求（保留 C，犧牲 A）
    還是返回可能不一致的資料（保留 A，犧牲 C）。」
    分區未發生時，系統可以同時提供 C 和 A，這正是大多數時間系統的實際行為。
    CAP 只在分區這個極端情況下才強制二選一。
  </callout-box>

  <h3>各大資料庫的 CAP 分類表</h3>
  <table>
    <thead>
      <tr>
        <th>資料庫 / 系統</th>
        <th>CAP 類型</th>
        <th>分區時行為</th>
        <th>典型用途</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>ZooKeeper / etcd</td>
        <td>CP</td>
        <td>拒絕讀寫，直到 Quorum 恢復</td>
        <td>分散式協調、Leader Election、配置中心</td>
      </tr>
      <tr>
        <td>HBase</td>
        <td>CP</td>
        <td>受影響的 Region 暫時不可用</td>
        <td>強一致性的大規模資料儲存</td>
      </tr>
      <tr>
        <td>PostgreSQL（主從）</td>
        <td>CP（Sync Replica）/ AP（Async）</td>
        <td>取決於複製模式配置</td>
        <td>關聯式資料庫，預設 CP</td>
      </tr>
      <tr>
        <td>Cassandra</td>
        <td>AP（可調）</td>
        <td>仍接受讀寫，可能返回過時資料</td>
        <td>高寫入吞吐量、多地區部署</td>
      </tr>
      <tr>
        <td>DynamoDB</td>
        <td>AP（預設）/ CP（強一致性讀）</td>
        <td>最終一致（預設）或強一致（額外費用）</td>
        <td>AWS 生態的鍵值/文件儲存</td>
      </tr>
      <tr>
        <td>MongoDB（Multi-member RS）</td>
        <td>CP（預設）</td>
        <td>Primary 失聯時，Secondary 拒絕寫入</td>
        <td>文件資料庫，靈活 Schema</td>
      </tr>
      <tr>
        <td>Redis（Sentinel）</td>
        <td>AP（非同步複製）</td>
        <td>仍提供服務，Failover 期間可能遺失少量資料</td>
        <td>快取、Session、排行榜</td>
      </tr>
      <tr>
        <td>CockroachDB / Google Spanner</td>
        <td>CP（使用 Raft/TrueTime）</td>
        <td>分區節點暫時不可用</td>
        <td>全球分散式 SQL，強一致性</td>
      </tr>
    </tbody>
  </table>

  <h3>PACELC 定理：超越 CAP 的完整框架</h3>
  <p>
    CAP 定理只描述了「分區發生時」的取捨，但忽略了一個重要問題：
    <strong>即使沒有分區，強一致性也需要付出延遲代價</strong>。
    Daniel Abadi 在 2012 年提出 PACELC 模型來補充這個盲點：
  </p>
  <pre data-lang="text"><code class="language-text">PACELC 全稱：
  P（Partition）→ A（Availability）C（Consistency）
  E（Else，無分區時）→ L（Latency）C（Consistency）

解讀：
  如果發生網路分區（P），系統在可用性（A）和一致性（C）之間選擇；
  否則（E），在延遲（L）和一致性（C）之間選擇。

各系統的 PACELC 分類：
  系統               分區時       無分區時    說明
  DynamoDB           PA          EL         優先低延遲和可用性
  Cassandra          PA          EL         可調整，預設最終一致性
  BigTable / HBase   PC          EC         即使無分區也優先一致性
  Google Spanner     PC          EC         TrueTime 保證外部一致性
  RIAK               PA          EL         AP 系統，最終一致性
  Megastore          PC          EC         Google 廣告資料庫</code></pre>
  <p>
    PACELC 的實際意義：即使你的系統沒有遇到網路分區（大多數時候如此），
    強一致性仍然需要等待多數節點確認（Quorum），導致寫入延遲更高。
    Google Spanner 使用 TrueTime（原子鐘 + GPS）來最小化這個延遲，
    但跨地區的強一致性寫入仍然需要 ~100ms 的全球 RTT。
  </p>

  <h3>Amazon Dynamo 論文的設計哲學</h3>
  <p>
    Amazon Dynamo（2007 年論文，不是現在的 DynamoDB）的設計選擇代表了 AP 系統思想的里程碑。
    在面對 CAP 的取捨時，Dynamo 的工程師做出了以下明確選擇：
  </p>
  <ul>
    <li><strong>優先 Availability：</strong>「購物車必須隨時可以添加商品，即使系統部分不可用。
    短暫的不一致（如商品重複出現）比完全無法操作更可接受。」</li>
    <li><strong>最終一致性 + 衝突解決：</strong>使用向量時鐘（Vector Clock）追蹤衝突，
    最終由客戶端或自動合併策略解決衝突。</li>
    <li><strong>可調整的一致性（Tunable Consistency）：</strong>讀寫操作可以指定需要多少節點確認（W / R），
    讓開發者在一致性和可用性之間按需調整。
    當 W + R > N 時，可以保證讀到最新寫入（Quorum）。</li>
  </ul>

  <callout-box type="tip" title="CP 還是 AP？先問業務問題">
    選擇 CP 還是 AP 不是技術決定，而是業務決定：
    「短暫看到舊資料，業務上可接受嗎？」
    帳戶餘額（不可接受）→ CP；
    用戶個人資料（數秒過時可接受）→ AP；
    訂單確認（不可接受）→ CP；
    社群媒體動態（數秒過時可接受）→ AP；
    庫存數量（視業務而定，超賣的代價是什麼？）。
  </callout-box>
</section>

<section id="consistency-models">
  <h2>一致性模型全譜系</h2>
  <p>
    一致性並非非黑即白，而是一個從強到弱的連續光譜。
    理解各種一致性模型，有助於在設計時選擇「恰好夠用」的一致性保證——
    過強的一致性帶來不必要的延遲，過弱的一致性可能導致業務邏輯錯誤。
  </p>

  <h3>線性一致性（Linearizability）</h3>
  <p>
    最強的一致性保證，也稱為「外部一致性（External Consistency）」或「強一致性（Strong Consistency）」。
    系統的行為如同只有一個副本，所有操作都即時生效：
    寫入成功後，任何後續讀取（無論從哪個節點、任何客戶端）都必須看到該寫入。
  </p>
  <pre data-lang="text"><code class="language-text">線性一致性示意：
T=0: Client A 寫入 x=1
T=1: Client B 讀取 x → 必須返回 1（因為 T=1 > T=0）
T=2: Client C 讀取 x → 必須返回 1

反例（違反線性一致性的系統）：
T=0: Client A 成功寫入 x=1 到 Primary
T=1: Client B 從 Replica 讀取 x → 返回 0（Replica 尚未同步）
→ 這就是非同步複製資料庫的常見情況

實現線性一致性的技術：
  - Raft / ZAB（ZooKeeper）共識演算法
  - 2PC（兩階段提交）
  - Paxos
  - Google TrueTime（Spanner 的獨特方案）</code></pre>

  <p>
    代價：需要跨節點協調，每次寫入需等待 Quorum（N/2+1 個節點）確認。
    在跨地區部署中，延遲可達數百毫秒。
  </p>

  <h3>序列一致性（Sequential Consistency）</h3>
  <p>
    比線性一致性稍弱。所有操作的執行結果與某個全局循序執行順序一致，
    且每個程序的操作順序與程式碼順序相同，但<strong>不保證全域時間順序</strong>。
  </p>
  <pre data-lang="text"><code class="language-text">線性一致性 vs 序列一致性的區別：

線性一致性：操作的生效時間必須在其發生的真實時間之後。
            Client A 在 T=1 寫入，Client B 在 T=2 讀取，必須看到 A 的寫入。

序列一致性：有一個「邏輯順序」讓所有操作看起來是序列執行的，
            但這個邏輯順序不必與真實時鐘對齊。
            允許：Client B 在 T=2 讀取 x，但讀到 T=0 時的舊值，
            只要所有節點看到相同的「序列」就行。

→ 序列一致性在多處理器 CPU 快取中常見，效能更好但語意更複雜</code></pre>

  <h3>因果一致性（Causal Consistency）</h3>
  <p>
    有因果關係的操作必須按順序被所有節點看到，沒有因果關係的操作可以亂序。
    因果性比序列性更弱但比最終一致性更強，在實踐中是一個很有吸引力的平衡點。
  </p>
  <pre data-lang="text"><code class="language-text">因果關係的三個來源：
  1. 讀後寫（Read-after-write）：Client 讀了 x=5，然後寫了 y=x+1，
     那「y=6」依賴於「x=5」，有因果關係。
  2. 寫後讀：同一 Client 先寫 x=5，再讀 x，必須看到 x=5。
  3. 外部通訊：Client A 告訴 Client B「我剛寫了 x=5」，
     B 之後讀 x，應該能看到 5。

實現工具：Vector Clock（向量時鐘）
  每個節點維護一個向量 [n1_counter, n2_counter, n3_counter]
  表示「我知道 n1 的第 k1 個事件、n2 的第 k2 個事件...」
  透過比較向量，系統可以判斷兩個操作是否有因果關係。

因果一致性的應用：
  Facebook 的 TAO（Twitter 也類似）使用因果一致性：
  用戶刪除了一則評論，同一個用戶的後續查詢必須看到已刪除，
  但其他用戶可能短暫仍看到（無因果關係）。</code></pre>

  <h3>最終一致性（Eventual Consistency）與 Redis 案例</h3>
  <p>
    如果停止寫入，系統最終（Eventually）會達到一致狀態。
    但在收斂期間，不同節點可能返回不同版本的資料。
    這是最弱但也最具擴展性的保證。
  </p>
  <p>
    以 <strong>Redis Sentinel 模式</strong>為例說明最終一致性：
  </p>
  <pre data-lang="text"><code class="language-text">Redis Sentinel 架構（非同步複製）：

Primary（東京）←─ 非同步複製（延遲 1-5ms）─→ Replica（大阪）
     │                                              │
Client A 寫入 key="session:user1", value="logged_in"
     │
     │ 非同步複製傳播中...
     │
Client B 立即從 Replica 讀取 key="session:user1"
     └─→ 可能返回 nil！（複製尚未完成）

1 ms 後，Replica 收到複製資料
     └─→ Client C 讀取 key="session:user1" → "logged_in" ✓

→ 這就是最終一致性：Client B 的讀取在「最終收斂前」發生，看到了舊資料。
  實際延遲通常 &lt; 1ms（同機房），但在網路問題時可能數秒。

應對策略：
  1. 重要讀取指定從 Primary 讀（犧牲效能換一致性）
     redis.get("session:user1", target="primary")
  2. Read-your-writes：寫入後的讀取有短暫延遲（如 50ms 後再讀）
  3. 接受最終一致性：Session 驗證失敗讓用戶重新登入，業務上可接受</code></pre>

  <h3>最終一致性的重要子類型</h3>
  <table>
    <thead>
      <tr>
        <th>子類型</th>
        <th>保證</th>
        <th>典型實現</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Read-your-writes</td>
        <td>你一定能讀到自己剛才的寫入，但其他人不一定</td>
        <td>寫後讀導向 Primary；帶版本號的讀取</td>
      </tr>
      <tr>
        <td>Monotonic reads</td>
        <td>同一客戶端不會讀到「比之前更舊的資料」（時間不後退）</td>
        <td>Session 綁定到特定 Replica</td>
      </tr>
      <tr>
        <td>Monotonic writes</td>
        <td>同一客戶端的寫入按程式順序執行</td>
        <td>寫入序列化 / 版本號</td>
      </tr>
      <tr>
        <td>Writes follow reads</td>
        <td>讀取後的寫入，必定在讀取基礎上進行（因果一致性的子集）</td>
        <td>Vector Clock</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="tip" title="面試技巧：一致性模型的選擇邏輯">
    面試時，先問清楚業務是否能容忍短暫的不一致：
    購物車、用戶偏好設定 → 最終一致性（接受短暫過時）；
    帳戶餘額、訂單確認 → 線性一致性或序列一致性（不能有錯誤）；
    社群動態 Feed → 因果一致性（你看到的回覆必定在原文之後）；
    監控指標 → 最終一致性（幾秒的延遲可接受）。
    不同業務場景對一致性的要求是不同的，同一個系統中不同資料也可以有不同的一致性級別。
  </callout-box>
</section>

<section id="saga-pattern">
  <h2>Saga Pattern：分散式事務的實用解法</h2>
  <p>
    在微服務架構中，一個業務事務往往跨越多個服務，每個服務有自己的資料庫。
    傳統的兩階段提交（2PC）雖然能保證強一致性，
    但鎖定時間長（所有參與者持鎖等待協調者指令）、吞吐量低、
    且協調者（Coordinator）成為單點故障。
    <strong>Saga Pattern</strong> 是解決跨服務事務的主流方案。
  </p>

  <h3>Saga 的核心思想</h3>
  <p>
    將一個分散式事務分解為一系列<strong>本地事務（Local Transaction）</strong>，
    每個本地事務都是 ACID 的，且有對應的
    <strong>補償事務（Compensating Transaction）</strong>。
    如果其中一個步驟失敗，就依序執行前面所有步驟的補償事務來「語意回滾」。
  </p>

  <callout-box type="warning" title="Saga 不是 ACID 事務">
    Saga 只能保證最終一致性，不能保證隔離性（Isolation）。
    在兩個步驟之間，其他事務可能看到中間狀態（如：訂單已建立但尚未完成支付）。
    這稱為「語意鎖（Semantic Lock）」問題。
    如果業務無法容忍此中間狀態，需要額外的「預留（Reserve）」機制：
    如先「預扣庫存」（而非直接扣減），事務完成後才正式扣除。
  </callout-box>

  <h3>補償事務的設計原則</h3>
  <p>補償事務不是簡單地「撤銷」原操作，而是達到語意上等效的結果：</p>
  <table>
    <thead>
      <tr>
        <th>原操作</th>
        <th>補償操作</th>
        <th>注意事項</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>建立訂單（PENDING 狀態）</td>
        <td>將訂單狀態更新為 CANCELLED</td>
        <td>不刪除訂單記錄，保留審計軌跡</td>
      </tr>
      <tr>
        <td>扣款 $100</td>
        <td>退款 $100</td>
        <td>退款需要冪等（避免重複退款）</td>
      </tr>
      <tr>
        <td>預留庫存 10 件</td>
        <td>釋放庫存預留 10 件</td>
        <td>區分「預留」和「實際扣減」</td>
      </tr>
      <tr>
        <td>建立運送單</td>
        <td>取消運送單</td>
        <td>若已發貨，需觸發退貨流程（更複雜）</td>
      </tr>
    </tbody>
  </table>

  <h3>方案一：Choreography（編舞式）詳細實現</h3>
  <p>每個服務監聽事件並決定下一步動作，服務之間透過事件互相觸發，沒有中央協調者。</p>
  <pre data-lang="text"><code class="language-text">電商下單 Saga（Choreography，事件驅動）：

1. OrderService 建立訂單（status=PENDING）
   → 發布 OrderCreated 事件到 Kafka topic: order-events

2. PaymentService 訂閱 order-events
   → 收到 OrderCreated → 嘗試扣款
   → 扣款成功 → 發布 PaymentProcessed 事件
   → 扣款失敗（餘額不足）→ 發布 PaymentFailed 事件

3. InventoryService 訂閱 order-events
   → 收到 PaymentProcessed → 嘗試預留庫存
   → 庫存充足 → 發布 InventoryReserved 事件
   → 庫存不足 → 發布 InventoryReservationFailed 事件

4. ShippingService 訂閱 order-events
   → 收到 InventoryReserved → 建立運送單
   → 發布 ShipmentScheduled 事件

5. OrderService 訂閱 order-events
   → 收到 ShipmentScheduled → 更新訂單為 CONFIRMED ✓

補償流程（InventoryReservationFailed）：
PaymentService 訂閱 InventoryReservationFailed
  → 執行退款補償 → 發布 PaymentRefunded

OrderService 訂閱 PaymentRefunded
  → 更新訂單為 CANCELLED

補償流程（PaymentFailed）：
OrderService 直接訂閱 PaymentFailed
  → 更新訂單為 FAILED（無需退款，因為支付從未成功）</code></pre>

  <h3>方案二：Orchestration（編排式）完整實現</h3>
  <p>一個中央協調者（Orchestrator / Saga State Machine）明確指揮每個步驟，知道整個事務的狀態。</p>

  <arch-diagram src="./diagrams/ch12-saga-orchestration.json" caption="Saga Orchestration Pattern：Order Service 作為協調者，依序呼叫 Payment、Inventory、Shipping 服務，任一步驟失敗時觸發補償事務鏈。"></arch-diagram>

  <pre data-lang="typescript"><code class="language-typescript">// Saga Orchestrator 的完整實現

enum SagaStatus {
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  COMPENSATING = 'COMPENSATING',
  FAILED = 'FAILED',
}

interface SagaStep {
  name: string;
  execute: (ctx: OrderContext) => Promise&lt;void&gt;;
  compensate: (ctx: OrderContext) => Promise&lt;void&gt;;
}

interface OrderContext {
  orderId: string;
  userId: string;
  items: Array&lt;{ productId: string; quantity: number; price: number }&gt;;
  totalAmount: number;
  paymentId?: string;      // 執行後填入
  reservationId?: string;  // 執行後填入
  shipmentId?: string;     // 執行後填入
}

class PlaceOrderSaga {
  private readonly steps: SagaStep[] = [
    {
      name: 'processPayment',
      execute: async (ctx) => {
        const result = await paymentService.charge({
          userId: ctx.userId,
          amount: ctx.totalAmount,
          orderId: ctx.orderId,
        });
        ctx.paymentId = result.paymentId;
      },
      compensate: async (ctx) => {
        if (ctx.paymentId) {
          await paymentService.refund({ paymentId: ctx.paymentId });
        }
      },
    },
    {
      name: 'reserveInventory',
      execute: async (ctx) => {
        const result = await inventoryService.reserve({
          items: ctx.items,
          orderId: ctx.orderId,
        });
        ctx.reservationId = result.reservationId;
      },
      compensate: async (ctx) => {
        if (ctx.reservationId) {
          await inventoryService.releaseReservation({ reservationId: ctx.reservationId });
        }
      },
    },
    {
      name: 'scheduleShipment',
      execute: async (ctx) => {
        const result = await shippingService.schedule({
          orderId: ctx.orderId,
          reservationId: ctx.reservationId!,
        });
        ctx.shipmentId = result.shipmentId;
      },
      compensate: async (ctx) => {
        if (ctx.shipmentId) {
          await shippingService.cancel({ shipmentId: ctx.shipmentId });
        }
      },
    },
  ];

  async execute(ctx: OrderContext): Promise&lt;{ success: boolean; error?: string }&gt; {
    const completedSteps: SagaStep[] = [];

    // 正向執行
    for (const step of this.steps) {
      try {
        await this.persistSagaState(ctx.orderId, SagaStatus.RUNNING, step.name);
        await step.execute(ctx);
        completedSteps.push(step);
      } catch (error) {
        // 步驟失敗，開始補償
        await this.persistSagaState(ctx.orderId, SagaStatus.COMPENSATING, step.name);
        await this.compensate(ctx, completedSteps);
        return { success: false, error: \`Step '\${step.name}' failed: \${error.message}\` };
      }
    }

    await this.persistSagaState(ctx.orderId, SagaStatus.COMPLETED, 'done');
    return { success: true };
  }

  private async compensate(ctx: OrderContext, completedSteps: SagaStep[]): Promise&lt;void&gt; {
    // 逆序執行補償事務
    for (const step of [...completedSteps].reverse()) {
      try {
        await step.compensate(ctx);
      } catch (compensationError) {
        // 補償失敗！需要人工介入或重試
        await this.alertOperations(\`補償步驟 '\${step.name}' 失敗，需要人工介入\`, ctx);
      }
    }
    await this.persistSagaState(ctx.orderId, SagaStatus.FAILED, 'compensated');
  }

  private async persistSagaState(orderId: string, status: SagaStatus, currentStep: string) {
    await db.query(
      \`UPDATE saga_instances SET status=$1, current_step=$2, updated_at=NOW()
       WHERE saga_id=$3\`,
      [status, currentStep, orderId]
    );
  }
}</code></pre>

  <h3>Choreography vs Orchestration 詳細對比</h3>
  <table>
    <thead>
      <tr>
        <th>維度</th>
        <th>Choreography（編舞）</th>
        <th>Orchestration（編排）</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>耦合程度</td>
        <td>低（服務只知道事件，不知道誰處理）</td>
        <td>較高（Orchestrator 知道所有服務）</td>
      </tr>
      <tr>
        <td>可觀測性</td>
        <td>差（事務狀態分散在各服務的日誌中）</td>
        <td>好（Orchestrator 有完整的狀態視圖）</td>
      </tr>
      <tr>
        <td>補償邏輯複雜度</td>
        <td>高（補償事件的鏈條難以追蹤）</td>
        <td>低（補償邏輯集中在 Orchestrator）</td>
      </tr>
      <tr>
        <td>新增步驟</td>
        <td>容易（訂閱現有事件，不影響其他服務）</td>
        <td>需修改 Orchestrator</td>
      </tr>
      <tr>
        <td>測試難度</td>
        <td>高（需要完整的事件流測試）</td>
        <td>低（可以單獨測試 Orchestrator 邏輯）</td>
      </tr>
      <tr>
        <td>適用規模</td>
        <td>步驟較少（3-5個）、事件流程線性</td>
        <td>步驟較多（5個以上）、有複雜的條件分支</td>
      </tr>
    </tbody>
  </table>

  <h3>Saga 的持久化策略（Outbox Pattern）</h3>
  <p>
    Saga 的一個常見問題：如何保證「本地事務提交」和「發布事件」的原子性？
    如果先提交事務後發布失敗，事件遺失；如果先發布後提交失敗，事件虛發。
    解決方案是 <strong>Outbox Pattern</strong>：
  </p>
  <pre data-lang="sql"><code class="language-sql">-- 在同一個本地事務中，既更新業務表，又插入事件到 outbox 表
BEGIN TRANSACTION;

INSERT INTO orders (order_id, user_id, status, amount)
VALUES ('ord-123', 'user-1', 'PENDING', 100.00);

-- 事件也寫入同一個資料庫的 outbox 表（在同一事務中）
INSERT INTO outbox_events (event_id, aggregate_id, event_type, payload, created_at)
VALUES (
  gen_random_uuid(),
  'ord-123',
  'OrderCreated',
  '{"orderId":"ord-123","amount":100.00}',
  NOW()
);

COMMIT;

-- 獨立的 Outbox Processor 輪詢 outbox 表，發布未處理的事件到 Kafka
-- SELECT * FROM outbox_events WHERE processed = false ORDER BY created_at LIMIT 100;
-- 發布成功後標記為已處理</code></pre>
</section>

<section id="distributed-lock">
  <h2>Distributed Lock：Redis Redlock 演算法</h2>
  <p>
    分散式鎖用於確保同一時間只有一個節點可以執行某個操作：
    防止重複扣款、保護庫存的讀-改-寫操作、確保排程任務只執行一次、
    維護分散式系統中的臨界區（Critical Section）。
  </p>

  <h3>單節點 Redis 鎖的問題</h3>
  <pre data-lang="bash"><code class="language-bash"># 基本 Redis 鎖（原子操作：只在不存在時設置，並設定 TTL）
SET lock:order:123 "server-1:pid:12345" NX PX 30000
# NX = 只在不存在時設置（原子性，避免競態條件）
# PX 30000 = 30000 毫秒（30 秒）後自動過期

# 釋放鎖（需要用 Lua 腳本確保原子性：檢查 + 刪除）
# 不能直接 DEL，否則可能刪除別人的鎖</code></pre>
  <p>單節點方案的三大問題：</p>
  <ul>
    <li><strong>問題一（Replica Failover）：</strong>Redis Primary 接受鎖請求後立即故障，
    非同步複製尚未完成，Replica 晉升為 Primary 後鎖消失，
    另一個客戶端可以獲得相同的鎖 → 兩個客戶端同時認為自己持有鎖。</li>
    <li><strong>問題二（GC Pause / Process Pause）：</strong>客戶端 A 獲得鎖，
    然後因 Java GC Stop-the-World 暫停了 35 秒，鎖的 TTL（30 秒）已過期，
    客戶端 B 獲得了鎖，兩者同時在臨界區執行。</li>
    <li><strong>問題三（Clock Skew）：</strong>Redis 伺服器的時鐘跳變可能導致 TTL 提前或延後過期。</li>
  </ul>

  <h3>Redlock 演算法詳細步驟</h3>
  <p>
    Redlock 使用 <strong>N 個完全獨立的 Redis 節點</strong>（推薦 5 個，不是 Replica），
    需要在多數節點（≥ N/2 + 1 = 3 個）獲得鎖才算成功，且總獲取時間必須遠小於 TTL。
  </p>
  <pre data-lang="text"><code class="language-text">Redlock 演算法步驟（5 個獨立 Redis 節點）：

準備：
  N = 5（獨立節點數）
  Quorum = 3（N/2 + 1）
  TTL = 30000ms（鎖的有效期）
  clock_drift_factor = 0.01（時鐘漂移因子）

步驟 1：記錄開始時間
  start_time = current_time_ms()

步驟 2：生成唯一 token
  token = uuid4()（每次獲取鎖都用新的 token）

步驟 3：依序在所有 N 個節點上嘗試獲取鎖
  for each Redis node:
    SET resource_name token NX PX ttl
    （每個節點的超時時間應遠小於 TTL，如 TTL/N/5 = 1000ms）
    記錄成功的節點數 acquired_count

步驟 4：計算有效鎖時間
  elapsed = current_time_ms() - start_time
  drift = TTL * clock_drift_factor + 2  // 時鐘漂移補償
  validity_time = TTL - elapsed - drift

步驟 5：判斷是否成功
  if acquired_count >= quorum AND validity_time > 0:
    成功！持有鎖，有效期 = validity_time
  else:
    失敗！在所有節點上釋放鎖（即使未成功獲取的節點也要嘗試釋放）
    等待隨機時間後重試（避免多個客戶端同時重試的活鎖）

釋放鎖：
  在所有節點執行 Lua 腳本（原子性）：
  if get(key) == token then del(key) end
  （只刪除自己的鎖，避免刪除別人的鎖）</code></pre>

  <pre data-lang="python"><code class="language-python">import time
import uuid
import redis

class Redlock:
    UNLOCK_SCRIPT = """
    if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('del', KEYS[1])
    else
        return 0
    end
    """

    def __init__(self, redis_nodes: list[dict]):
        self.nodes = [redis.Redis(**cfg, socket_timeout=0.1) for cfg in redis_nodes]
        self.quorum = len(self.nodes) // 2 + 1

    def acquire(self, resource: str, ttl_ms: int) -> dict | None:
        token = str(uuid.uuid4())
        start = time.monotonic()
        acquired_count = 0

        for node in self.nodes:
            try:
                if node.set(resource, token, nx=True, px=ttl_ms):
                    acquired_count += 1
            except redis.RedisError:
                pass  # 節點故障，繼續嘗試其他節點

        elapsed_ms = (time.monotonic() - start) * 1000
        drift = ttl_ms * 0.01 + 2  # 1% 漂移 + 2ms 固定補償
        validity_time = ttl_ms - elapsed_ms - drift

        if acquired_count >= self.quorum and validity_time > 0:
            return {"token": token, "validity_ms": validity_time}
        else:
            self.release(resource, token)  # 清理已獲取的鎖
            return None

    def release(self, resource: str, token: str) -> None:
        for node in self.nodes:
            try:
                node.eval(self.UNLOCK_SCRIPT, 1, resource, token)
            except redis.RedisError:
                pass

# 使用範例
redlock = Redlock([
    {"host": "redis-1", "port": 6379},
    {"host": "redis-2", "port": 6379},
    {"host": "redis-3", "port": 6379},
    {"host": "redis-4", "port": 6379},
    {"host": "redis-5", "port": 6379},
])

lock = redlock.acquire("order:charge:123", ttl_ms=30000)
if lock:
    try:
        process_payment()  # 臨界區
    finally:
        redlock.release("order:charge:123", lock["token"])</code></pre>

  <callout-box type="danger" title="Redlock 的爭議：Martin Kleppmann 的批評">
    分散式系統專家 Martin Kleppmann 在 2016 年撰文指出，Redlock 仍然無法解決 GC Pause 問題：
    即使在多數節點上獲得了鎖，客戶端仍可能因 GC Stop-the-World 在持有鎖期間暫停，
    鎖 TTL 過期後另一個客戶端獲得鎖，兩者同時執行臨界區。
    <br/><br/>
    真正安全的方案是 <strong>Fencing Token</strong>：每次獲取鎖時，鎖服務返回一個單調遞增的整數 token。
    後端服務（如資料庫）記錄見過的最大 token，拒絕攜帶比當前最大 token 更小的 token 的請求。
    即使客戶端因 GC Pause 延遲到達，帶著過期的舊 token 的請求也會被拒絕。
    <br/><br/>
    結論：Redlock 對於「最多一次（At Most Once）」的語意足夠，但不適合需要嚴格互斥的場景。
  </callout-box>

  <h3>ZooKeeper 實現分散式鎖（強一致性方案）</h3>
  <p>
    對於需要更強保證的場景，應使用基於 Raft/ZAB 共識演算法的 ZooKeeper 或 etcd，
    它們是 CP 系統，天然提供強一致性的鎖原語：
  </p>
  <pre data-lang="python"><code class="language-python">from kazoo.client import KazooClient
from kazoo.recipe.lock import Lock

# ZooKeeper 分散式鎖（基於 ZAB 共識演算法，CP 保證）
zk = KazooClient(hosts='zk1:2181,zk2:2181,zk3:2181')
zk.start()

lock = zk.Lock("/locks/order-123", "server-1")

# ZooKeeper 鎖的工作原理：
# 1. 在 /locks/order-123/ 下建立臨時順序節點（Ephemeral Sequential）
#    如：/locks/order-123/lock-0000000001
# 2. 如果是最小序號的節點，即獲得鎖
# 3. 否則，Watch 前一個節點，等待其刪除（避免 Herd Effect）
# 4. 持有鎖的客戶端崩潰時，臨時節點自動刪除，下一個等待者獲得鎖

with lock:  # context manager 自動獲取和釋放鎖
    # 臨界區：ZK 保證此時只有一個客戶端在這裡執行
    process_payment()

# 使用 etcd（Raft 共識，適合 Kubernetes 環境）
import etcd3

client = etcd3.client(host='etcd-1', port=2379)
lock = client.lock('order:123', ttl=30)

with lock:
    process_payment()</code></pre>

  <table>
    <thead>
      <tr>
        <th>特性</th>
        <th>Redis Redlock</th>
        <th>ZooKeeper / etcd</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>一致性模型</td>
        <td>AP（弱保證）</td>
        <td>CP（強一致性，Raft/ZAB）</td>
      </tr>
      <tr>
        <td>GC Pause 安全性</td>
        <td>不安全（需 Fencing Token）</td>
        <td>相對安全（Session 過期自動釋放）</td>
      </tr>
      <tr>
        <td>延遲</td>
        <td>低（Redis 操作極快）</td>
        <td>中（需要 Quorum 確認）</td>
      </tr>
      <tr>
        <td>適用場景</td>
        <td>快取、冪等性保護、低風險互斥</td>
        <td>Leader Election、關鍵資源互斥、嚴格一次語意</td>
      </tr>
    </tbody>
  </table>
</section>

<section id="idempotency">
  <h2>Idempotency Key 設計模式</h2>
  <p>
    冪等性（Idempotency）是指同一操作執行一次或多次的效果完全相同。
    在分散式系統中，網路重試是常見且必要的（見第 10 章分散式謬論），
    因此每個<strong>寫入操作</strong>都應設計為冪等的，否則重試會帶來重複副作用。
  </p>

  <h3>為什麼需要冪等性？典型的重複扣款場景</h3>
  <ol>
    <li>客戶端發送支付請求 → 伺服器</li>
    <li>伺服器處理成功（扣款 $100），<strong>但在發送回應前網路斷線</strong></li>
    <li>客戶端收到 TCP 超時，<strong>認為請求失敗，進行重試</strong></li>
    <li>伺服器再次收到請求，<strong>再次扣款 $100</strong></li>
    <li>用戶被重複扣款！</li>
  </ol>
  <p>
    解決方案：客戶端在初次發送請求前生成唯一的 <strong>Idempotency Key</strong>，
    每次重試都使用相同的 Key。
    伺服器記錄已處理的 Key 及其結果，重複請求直接返回之前的結果。
  </p>

  <h3>Idempotency Key 的設計方案</h3>
  <table>
    <thead>
      <tr>
        <th>設計方案</th>
        <th>生成方式</th>
        <th>適用場景</th>
        <th>優缺點</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>UUID v4（隨機）</td>
        <td>客戶端在「提交」動作發生時生成</td>
        <td>通用場景（支付、訂單）</td>
        <td>實現簡單；每次請求唯一；需要客戶端配合</td>
      </tr>
      <tr>
        <td>請求指紋（Request Fingerprint）</td>
        <td>對關鍵請求參數做 Hash（如 SHA256(userId + amount + timestamp)）</td>
        <td>無法修改客戶端時（第三方接入）</td>
        <td>服務端自動推導；但 Hash 碰撞風險（雖極低）</td>
      </tr>
      <tr>
        <td>業務語意 Key</td>
        <td>業務唯一識別符（如 orderId + "charge"）</td>
        <td>業務流程中的特定操作</td>
        <td>語意清晰；但需要業務設計支持</td>
      </tr>
    </tbody>
  </table>

  <h3>完整的服務端冪等性實作</h3>
  <pre data-lang="typescript"><code class="language-typescript">// POST /api/payments
// 要求客戶端提供 Idempotency-Key header（UUID v4）

async function processPayment(req: Request, res: Response): Promise&lt;void&gt; {
  const idempotencyKey = req.headers['idempotency-key'] as string;

  if (!idempotencyKey || !isValidUUID(idempotencyKey)) {
    res.status(400).json({
      error: 'INVALID_IDEMPOTENCY_KEY',
      message: 'Idempotency-Key header 必須是有效的 UUID v4'
    });
    return;
  }

  // Phase 1：查詢快取（Redis，TTL 24 小時）
  const cacheKey = \`idem:payment:\${idempotencyKey}\`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    // 命中快取：返回之前的結果，HTTP 狀態碼也需要和第一次一樣
    const { statusCode, body } = JSON.parse(cached);
    res.status(statusCode).json(body);
    return;
  }

  // Phase 2：防並發——使用分散式鎖防止同一 Key 的並發請求同時執行
  const lockKey = \`lock:idem:\${idempotencyKey}\`;
  const lock = await redlock.acquire(lockKey, 30000);
  if (!lock) {
    // 鎖被佔用：說明相同 Key 的請求正在處理中
    res.status(409).json({
      error: 'REQUEST_IN_PROGRESS',
      message: '相同的 Idempotency-Key 請求正在處理中，請稍後查詢結果'
    });
    return;
  }

  try {
    // Phase 3：Double-check（獲取鎖後再查一次，防止鎖競爭期間快取被寫入）
    const cached2 = await redis.get(cacheKey);
    if (cached2) {
      const { statusCode, body } = JSON.parse(cached2);
      res.status(statusCode).json(body);
      return;
    }

    // Phase 4：執行實際業務邏輯
    let responseStatus: number;
    let responseBody: object;

    try {
      const result = await paymentGateway.charge({
        amount: req.body.amount,
        currency: req.body.currency,
        userId: req.user.id,
      });
      responseStatus = 200;
      responseBody = { paymentId: result.id, status: 'SUCCESS', amount: result.amount };
    } catch (paymentError) {
      responseStatus = 402;
      responseBody = { error: 'PAYMENT_FAILED', message: paymentError.message };
    }

    // Phase 5：快取結果（無論成功失敗，都快取，避免重試時重複執行）
    await redis.setex(cacheKey, 86400, JSON.stringify({
      statusCode: responseStatus,
      body: responseBody,
    }));

    res.status(responseStatus).json(responseBody);
  } finally {
    await redlock.release(lockKey, lock.token);
  }
}</code></pre>

  <h3>冪等的業務層設計</h3>
  <p>除了 Redis 快取層，還應在資料庫層加一道防線，形成雙重保護：</p>
  <pre data-lang="sql"><code class="language-sql">-- 資料庫層：唯一約束防止重複插入（最後一道防線）
CREATE TABLE payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key   VARCHAR(100) UNIQUE NOT NULL,  -- 唯一約束！
  user_id           UUID NOT NULL,
  amount            DECIMAL(10, 2) NOT NULL,
  currency          CHAR(3) NOT NULL DEFAULT 'TWD',
  status            VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
  gateway_txn_id    VARCHAR(100),  -- 第三方支付的交易 ID
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入時使用 ON CONFLICT 處理重複 Key
INSERT INTO payments (idempotency_key, user_id, amount, currency, status)
VALUES ($1, $2, $3, $4, 'COMPLETED')
ON CONFLICT (idempotency_key)
DO UPDATE SET updated_at = NOW()  -- 幂等更新（no-op）
RETURNING id, status, created_at;</code></pre>

  <h3>支付場景的冪等性完整保證</h3>
  <p>
    支付場景的冪等性需要考慮三個層次，缺一不可：
  </p>
  <ol>
    <li><strong>API 層：</strong>Idempotency Key + Redis 快取，
    確保重複的 API 請求返回相同結果，且不觸發業務邏輯的重複執行</li>
    <li><strong>資料庫層：</strong>Unique Constraint 作為最後防線，
    即使 Redis 快取因 TTL 過期或 Failover 失效，資料庫也能阻止重複插入</li>
    <li><strong>第三方閘道層：</strong>向支付閘道（如 Stripe、綠界）傳遞唯一的交易參考號，
    閘道本身也會在其側保證冪等性</li>
  </ol>

  <callout-box type="tip" title="Idempotency Key 的生命週期管理">
    Idempotency Key 不應永久保存，推薦保留 24-48 小時。
    原因：重試通常在幾秒到幾分鐘內發生，超過 24 小時的「重試」通常是 Bug 或攻擊。
    保留太久會佔用大量 Redis 記憶體和資料庫空間。
    <br/><br/>
    重要建議：Idempotency Key 應由客戶端在「用戶點擊提交按鈕」的瞬間生成（而非每次網路請求時生成）。
    這樣即使因網路超時觸發多次 HTTP 請求，它們都攜帶相同的 Key，
    服務器能正確識別為同一次用戶操作。
  </callout-box>

  <h3>HTTP 方法的天然冪等性</h3>
  <pre data-lang="text"><code class="language-text">HTTP 方法的冪等性與安全性：

方法      冪等性  安全性  說明
GET       ✓       ✓      多次讀取結果相同，不改變狀態
HEAD      ✓       ✓      同 GET，只返回 header
OPTIONS   ✓       ✓      查詢伺服器支援的方法
PUT       ✓       ✗      多次覆蓋，最終狀態相同（整體替換）
DELETE    ✓       ✗      多次刪除，第一次成功後其餘返回 404（也算冪等）
POST      ✗       ✗      每次可能建立新資源（需要 Idempotency Key 實現冪等）
PATCH     ✗       ✗      取決於操作語意：
                          PATCH { "increment": 1 } → 不冪等（每次 +1）
                          PATCH { "set_value": 10 } → 冪等（最終都是 10）

→ 設計 RESTful API 時，POST 和特定 PATCH 需要特別處理冪等性</code></pre>
</section>
`,
} satisfies ChapterContent;
