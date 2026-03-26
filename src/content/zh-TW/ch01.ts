import type { ChapterContent } from '../../types.js';

export default {
  title: '什麼是系統設計？',
  content: `
<section id="what-is-system-design">
  <h2>系統設計 vs 物件導向設計</h2>
  <p>
    當面試官說「請設計一個 Instagram」或「請設計一個分散式快取系統」，他問的不是你會不會寫程式，
    而是你能否在模糊的需求下，做出合理的架構決策。這就是<strong>系統設計（System Design）</strong>的核心。
  </p>
  <p>
    許多工程師容易把系統設計與物件導向設計（OOD, Object-Oriented Design）混淆。兩者雖然都在談「設計」，
    但關注的層次截然不同：
  </p>
  <table>
    <thead>
      <tr>
        <th>面向</th>
        <th>物件導向設計（OOD）</th>
        <th>系統設計（System Design）</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>關注層次</td>
        <td>類別、介面、模式（Class level）</td>
        <td>服務、資料庫、網路（System level）</td>
      </tr>
      <tr>
        <td>典型問題</td>
        <td>設計一個停車場類別</td>
        <td>設計一個停車場訂位系統</td>
      </tr>
      <tr>
        <td>考察重點</td>
        <td>SOLID 原則、Design Pattern</td>
        <td>可靠性、可擴展性、延遲、成本</td>
      </tr>
      <tr>
        <td>輸出產物</td>
        <td>UML 類別圖</td>
        <td>架構圖、API 設計、容量估算</td>
      </tr>
      <tr>
        <td>執行環境</td>
        <td>單一程序（Process）</td>
        <td>多機器、多資料中心</td>
      </tr>
    </tbody>
  </table>
  <p>
    系統設計面試的本質，是一場<strong>工程決策對話</strong>。面試官想了解的是：你在面對 Trade-off 時，
    能否清楚說明取捨的理由。沒有標準答案，但有說服力強弱之分。
  </p>
  <arch-diagram src="./diagrams/ch01-system-overview.json" caption="一個典型 Web 應用的系統設計全景圖：從用戶端、CDN、Load Balancer、應用伺服器、快取層到資料庫層"></arch-diagram>

  <h3>為什麼工程師需要學系統設計？</h3>
  <p>系統設計的能力，決定了一個工程師能否晉升到 Senior 甚至 Staff 層級。以下是幾個現實場景：</p>
  <ul>
    <li><strong>新功能規劃：</strong>產品說要做「即時通知」，你需要評估用 WebSocket、SSE 還是 Long Polling，並估算伺服器負載。</li>
    <li><strong>系統瓶頸排查：</strong>資料庫查詢變慢，是要加 Index、讀寫分離，還是引入快取？每個選擇都有成本。</li>
    <li><strong>跨團隊協作：</strong>你的服務需要呼叫支付服務，如何設計 API 契約、處理逾時與重試？</li>
    <li><strong>成本控制：</strong>S3 儲存費用暴增，是否要調整資料生命週期策略？</li>
  </ul>

  <h3>系統設計面試的 6 步驟框架</h3>
  <p>
    面對一道系統設計題，許多人不知道從哪裡開始。下面是一個在 45-60 分鐘內高效展示設計能力的結構化流程：
  </p>
  <table>
    <thead>
      <tr>
        <th>步驟</th>
        <th>行動</th>
        <th>建議時間</th>
        <th>目的</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1. 釐清需求</td>
        <td>主動提問，確認功能範圍與規模</td>
        <td>5 分鐘</td>
        <td>避免設計偏題</td>
      </tr>
      <tr>
        <td>2. 容量估算</td>
        <td>估算 QPS、儲存量、頻寬</td>
        <td>5 分鐘</td>
        <td>驅動後續架構選擇</td>
      </tr>
      <tr>
        <td>3. 高層架構</td>
        <td>畫出主要服務、資料庫、快取的關係</td>
        <td>10 分鐘</td>
        <td>建立全局觀</td>
      </tr>
      <tr>
        <td>4. 深入設計</td>
        <td>針對 1-2 個核心模組詳細說明</td>
        <td>15 分鐘</td>
        <td>展示深度</td>
      </tr>
      <tr>
        <td>5. 識別瓶頸</td>
        <td>主動提出 SPOF 和效能瓶頸</td>
        <td>10 分鐘</td>
        <td>展示系統性思維</td>
      </tr>
      <tr>
        <td>6. 總結 Trade-off</td>
        <td>回顧設計決策，說明取捨</td>
        <td>5 分鐘</td>
        <td>展示工程判斷力</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="tip" title="主動引導，而非被動等待">
    系統設計面試不是考試——它更像一場協作設計討論。面試官希望你主動說出你的思考過程、主動發現問題、主動提出取捨。
    沉默地畫圖是最常見的扣分行為。邊畫邊說：「我選擇用 NoSQL 是因為……，但這樣的代價是……」。
  </callout-box>

  <h3>以 Instagram 為例：完整的拆解流程</h3>
  <p>讓我們把 6 步驟框架套用到「設計 Instagram 照片分享功能」這道題目：</p>

  <h3>步驟一：釐清需求</h3>
  <p>先問面試官以下問題，縮小設計範圍：</p>
  <ul>
    <li>核心功能是什麼？（上傳照片、瀏覽動態、追蹤用戶、按讚留言）</li>
    <li>規模有多大？（DAU 1 億，每天 500 萬張照片上傳）</li>
    <li>是否需要全文搜尋？標籤功能？（先不做）</li>
    <li>延遲要求？（照片載入 P99 &lt; 2 秒）</li>
    <li>是否需要全球部署？（是，亞洲和歐美都有用戶）</li>
  </ul>

  <h3>步驟二：容量估算</h3>
  <pre data-lang="text"><code class="language-text">DAU：1 億用戶
每個用戶每天：瀏覽 20 張照片（讀），上傳 0.05 張（寫）

寫入 QPS：1 億 × 0.05 / 86,400 ≈ 58 Write QPS
讀取 QPS：1 億 × 20 / 86,400 ≈ 23,148 Read QPS → 峰值 ~70,000 QPS

每張照片：平均 3 MB（原圖）+ 縮圖 100 KB
每日新增儲存：500 萬 × 3 MB = 15 TB / 天
5 年儲存：15 TB × 365 × 5 ≈ 27 PB（只計原圖）

→ 需要 Object Storage（S3）+ CDN</code></pre>

  <h3>步驟三：高層架構</h3>
  <p>Instagram 的主要服務可以拆分為：</p>
  <ul>
    <li><strong>Upload Service：</strong>接收照片上傳請求，將原圖存入 S3，觸發非同步縮圖工作。</li>
    <li><strong>Feed Service：</strong>組裝用戶的動態時間軸，從快取或資料庫讀取追蹤者的最新貼文。</li>
    <li><strong>User Service：</strong>管理用戶資料、追蹤關係。</li>
    <li><strong>Media CDN：</strong>全球加速照片的讀取請求，減少原始伺服器負載。</li>
  </ul>

  <h3>步驟四：深入設計—動態時間軸（Feed）</h3>
  <p>Feed 系統的核心挑戰是「Fan-out」問題：當一個有 100 萬粉絲的用戶發佈貼文，如何讓 100 萬人的時間軸更新？</p>
  <table>
    <thead>
      <tr>
        <th>策略</th>
        <th>寫入時</th>
        <th>讀取時</th>
        <th>適合對象</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Fan-out on Write（推模式）</td>
        <td>發佈時立即更新所有粉絲的 Feed 快取</td>
        <td>直接讀快取，極快</td>
        <td>一般用戶（粉絲數 &lt; 10 萬）</td>
      </tr>
      <tr>
        <td>Fan-out on Read（拉模式）</td>
        <td>只儲存原始貼文</td>
        <td>讀取時即時合併追蹤者的貼文</td>
        <td>名人帳號（百萬粉絲）</td>
      </tr>
      <tr>
        <td>混合模式（Hybrid）</td>
        <td>一般用戶用推、名人用拉</td>
        <td>混合讀取</td>
        <td>Instagram 實際採用的策略</td>
      </tr>
    </tbody>
  </table>

  <h3>步驟五：識別瓶頸與改善方案</h3>
  <ul>
    <li><strong>SPOF：</strong>MySQL 單一 Primary 節點 → 增加 Read Replica，使用 Multi-AZ 部署。</li>
    <li><strong>熱點照片：</strong>爆紅照片的 CDN 命中率應達 99%+，否則 Origin 伺服器會被打垮。</li>
    <li><strong>大用戶 Fan-out：</strong>Kylie Jenner 有 2 億粉絲，若用推模式需要 2 億次快取寫入，必須改用混合模式。</li>
  </ul>

  <callout-box type="tip" title="學習建議">
    學系統設計不要死背答案。每道題目背後都有「為什麼選這個方案」的思考脈絡。建議同時閱讀真實公司的 Engineering Blog（Uber、Airbnb、Stripe 等），理解他們遇到了什麼問題、如何解決，遠比背誦架構圖有效。
  </callout-box>
</section>

<section id="functional-nonfunctional">
  <h2>Functional vs Non-Functional 需求</h2>
  <p>
    每一道系統設計題的第一步，應該是釐清需求。需求分為兩大類：
    <strong>功能性需求（Functional Requirements）</strong>描述系統「做什麼」；
    <strong>非功能性需求（Non-Functional Requirements）</strong>描述系統「做得多好」。
  </p>
  <p>
    在面試中，一個常見的誤區是：工程師花了大量時間討論功能需求（「要能上傳照片」「要能按讚」），
    卻跳過非功能性需求。然而，NFR 才是真正決定架構複雜度的因素。
    一個支援 1,000 個用戶的系統和支援 1 億個用戶的系統，設計完全不同。
  </p>

  <h3>功能性需求的分析方法</h3>
  <p>功能性需求（FR）描述系統的行為，通常可以用以下方式提取：</p>
  <ul>
    <li><strong>User Story 格式：</strong>「身為一個用戶，我希望能夠上傳照片，以便分享給追蹤者。」</li>
    <li><strong>API 端點列表：</strong>直接列出需要哪些 API（POST /photos, GET /feed, PUT /follow）</li>
    <li><strong>核心流程圖：</strong>繪製用戶行為的主要流程（上傳 → 縮圖處理 → CDN 分發 → 出現在粉絲 Feed）</li>
  </ul>
  <p>面試技巧：主動把 FR 分為「必做（Must Have）」和「可選（Nice to Have）」，讓面試官確認優先順序：</p>
  <pre data-lang="text"><code class="language-text">必做功能（核心 MVP）：
  - 用戶可以上傳照片（含標題）
  - 用戶可以追蹤其他用戶
  - 用戶可以看到追蹤者的照片動態（Feed）
  - 用戶可以對照片按讚

可選功能（後期迭代）：
  - 故事（Story，24 小時到期）
  - 標記好友
  - 直播
  - 商業廣告系統</code></pre>

  <h3>非功能性需求（Non-Functional Requirements）</h3>
  <p>這些通常是工程師在面試中容易忽略的部分，卻往往決定了整體架構選擇：</p>
  <table>
    <thead>
      <tr>
        <th>類型</th>
        <th>典型問題</th>
        <th>影響的設計決策</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>可靠性（Reliability）</td>
        <td>允許多少資料遺失？</td>
        <td>RPO/RTO、資料備份策略</td>
      </tr>
      <tr>
        <td>可用性（Availability）</td>
        <td>需要幾個 9 的 SLA？</td>
        <td>冗餘設計、跨 AZ 部署</td>
      </tr>
      <tr>
        <td>可擴展性（Scalability）</td>
        <td>日活用戶（DAU）是多少？預計成長多快？</td>
        <td>Sharding、Load Balancer、Auto-scaling</td>
      </tr>
      <tr>
        <td>延遲（Latency）</td>
        <td>P99 延遲需要低於多少？</td>
        <td>CDN、快取、資料庫索引</td>
      </tr>
      <tr>
        <td>一致性（Consistency）</td>
        <td>允許 Eventual Consistency 嗎？</td>
        <td>資料庫選型（SQL vs NoSQL）</td>
      </tr>
      <tr>
        <td>安全性（Security）</td>
        <td>是否有合規要求（GDPR）？</td>
        <td>加密、存取控制、稽核日誌</td>
      </tr>
      <tr>
        <td>可維護性（Maintainability）</td>
        <td>團隊規模？部署頻率？</td>
        <td>微服務 vs 單體、CI/CD 架構</td>
      </tr>
      <tr>
        <td>成本效益（Cost）</td>
        <td>月預算上限？</td>
        <td>Self-hosted vs Cloud、Storage Tier</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="warning" title="面試常見錯誤">
    面試時許多人急著畫架構圖，跳過需求釐清。這會導致你設計了一個「高可用的照片分享系統」，
    但面試官其實只想看你如何設計「一天只有 1000 次請求的內部管理工具」。每個問題的答案差很遠。
    <strong>至少花 5 分鐘問清楚需求。</strong>
  </callout-box>

  <h3>如何量化 NFR：從模糊到精確</h3>
  <p>非功能性需求必須量化，才能驅動設計決策。模糊的「系統要快」沒有意義，要說：</p>
  <table>
    <thead>
      <tr>
        <th>模糊描述</th>
        <th>量化後的 NFR</th>
        <th>設計影響</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>「系統要快」</td>
        <td>P95 API 延遲 &lt; 200ms，P99 &lt; 500ms</td>
        <td>需要快取層，避免每次查詢資料庫</td>
      </tr>
      <tr>
        <td>「系統要穩」</td>
        <td>可用性 99.9%（每月最多 43 分鐘停機）</td>
        <td>多 AZ 部署、Load Balancer、Health Check</td>
      </tr>
      <tr>
        <td>「系統要能擴展」</td>
        <td>支援 1 億 DAU，峰值 QPS 50,000</td>
        <td>水平擴展、Sharding 策略</td>
      </tr>
      <tr>
        <td>「訊息要即時」</td>
        <td>訊息遞送延遲 &lt; 500ms（P99）</td>
        <td>WebSocket，而非 HTTP Polling</td>
      </tr>
      <tr>
        <td>「不能丟資料」</td>
        <td>RPO = 0（零資料遺失）</td>
        <td>同步複製，犧牲部分寫入效能</td>
      </tr>
    </tbody>
  </table>

  <h3>NFR 的相互衝突</h3>
  <p>許多 NFR 之間存在根本性的張力，必須明確做出取捨：</p>
  <ul>
    <li><strong>一致性 vs 可用性：</strong>強一致性（如銀行轉帳）通常需要犧牲部分可用性（分區時拒絕請求）。</li>
    <li><strong>延遲 vs 持久性：</strong>同步寫入多個副本（高持久性）會增加寫入延遲。</li>
    <li><strong>成本 vs 效能：</strong>把所有資料放進 Redis 延遲最低，但成本十倍於磁碟儲存。</li>
    <li><strong>安全性 vs 易用性：</strong>多因素驗證提高安全性，但增加登入摩擦。</li>
  </ul>

  <callout-box type="info" title="實際案例：Instagram 的 NFR 取捨">
    Instagram 的動態 Feed 是 AP 系統（高可用、允許最終一致性）。當你追蹤某人，你可能要等幾秒才能看到他們的新貼文——這是可接受的最終一致性。
    但照片本身的 URL 不能錯誤（否則照片讀不到），這部分必須維持強一致性。
    <strong>同一個系統的不同部分，可以有不同的一致性需求。</strong>
  </callout-box>

  <h3>將 NFR 整理為設計約束（Design Constraints）</h3>
  <p>在面試的早期，將量化後的 NFR 寫在白板一角，作為設計過程中的參考基準：</p>
  <pre data-lang="text"><code class="language-text">設計約束（Design Constraints）
================================
規模：1 億 DAU，峰值 QPS 70,000
延遲：Feed 載入 P99 &lt; 1 秒
可用性：99.9%（每月 43 分鐘停機預算）
一致性：動態 Feed 允許最終一致性（5 秒內）
儲存：預估每天新增 15 TB，5 年 ~27 PB
法規：GDPR 合規（歐洲用戶資料不離開歐盟）</code></pre>
  <p>這些具體數字，將在下一章的容量估算中扮演關鍵角色。</p>
</section>

<section id="cap-theorem-intro">
  <h2>CAP Theorem 深度解析</h2>
  <p>
    CAP 定理由電腦科學家 Eric Brewer 在 2000 年提出，是理解分散式系統本質的核心概念。
    它指出，一個分散式系統<strong>不可能同時完全滿足</strong>以下三個特性：
  </p>
  <ul>
    <li><strong>C（Consistency，一致性）：</strong>每次讀取都能取得最新寫入的資料，或得到錯誤。所有節點在同一時間看到相同的資料。</li>
    <li><strong>A（Availability，可用性）：</strong>每個請求都能收到（非錯誤的）回應，但不保證是最新資料。系統永遠可以回應。</li>
    <li><strong>P（Partition Tolerance，分區容忍性）：</strong>即使網路分區（部分節點無法通訊），系統仍可運作。</li>
  </ul>

  <callout-box type="info" title="現實中的 P 不是選項">
    在實際的分散式系統中，網路分區（Network Partition）是無可避免的現實——伺服器會斷線、資料中心會失去連線、交換機會重啟。
    根據 Amazon 的內部數據，即使在同一資料中心，每年也會發生數次網路中斷事件。
    因此 P（分區容忍性）通常是<strong>必須接受</strong>的條件，真正的選擇只在 C 和 A 之間。
  </callout-box>

  <h3>CP vs AP 系統的實際例子</h3>
  <table>
    <thead>
      <tr>
        <th>類型</th>
        <th>特性</th>
        <th>代表系統</th>
        <th>適用場景</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>CP 系統</td>
        <td>網路分區時拒絕服務，保證資料一致性</td>
        <td>HBase、Zookeeper、etcd、MongoDB（預設）</td>
        <td>金融交易、分散式鎖、設定中心</td>
      </tr>
      <tr>
        <td>AP 系統</td>
        <td>網路分區時仍然回應，允許暫時資料不一致</td>
        <td>Cassandra、DynamoDB、CouchDB</td>
        <td>購物車、社群動態、DNS</td>
      </tr>
      <tr>
        <td>CA 系統</td>
        <td>假設網路從不分區（單機或緊密耦合叢集）</td>
        <td>單機 PostgreSQL、MySQL</td>
        <td>單節點、不跨 AZ 的小型系統</td>
      </tr>
    </tbody>
  </table>

  <h3>深入：DynamoDB（AP）vs ZooKeeper（CP）的設計哲學</h3>

  <h3>DynamoDB 的 AP 設計</h3>
  <p>
    Amazon DynamoDB 基於 2007 年發表的 Dynamo 論文，是 AP 系統的典範。其核心設計選擇：
  </p>
  <ul>
    <li><strong>最終一致性讀取（Eventually Consistent Reads）：</strong>預設情況下，DynamoDB 讀取可能返回稍舊的資料（通常在 1 秒內達到一致）。代價是更高的讀取吞吐量和更低的延遲。</li>
    <li><strong>強一致性讀取（Strongly Consistent Reads）：</strong>可選，但吞吐量減半，延遲翻倍，且若 Leader 節點不可用則請求失敗。</li>
    <li><strong>向量時鐘（Vector Clock）：</strong>Dynamo 使用向量時鐘解決衝突，當兩個節點同時收到對同一鍵的寫入時，記錄版本歷史，由應用層決定如何合併。</li>
    <li><strong>Quorum 寫入：</strong>預設 W（寫入確認節點數）+ R（讀取節點數）&gt; N（總副本數），確保讀寫重疊。</li>
  </ul>
  <pre data-lang="text"><code class="language-text">DynamoDB Quorum 設定範例（N=3 個副本）：
  R=1, W=1：最高可用性，最終一致（任一節點回應即可）
  R=2, W=2：平衡模式（預設）
  R=3, W=3：強一致性，但最低可用性

規則：若 R + W > N，保證讀取到最新寫入（強一致）
範例：N=3, R=2, W=2 → 2+2=4 > 3 ✓ 強一致</code></pre>

  <h3>ZooKeeper 的 CP 設計</h3>
  <p>
    ZooKeeper 是 CP 系統的代表，被 Kafka、HDFS、HBase 等系統用作「分散式協調服務」（設定中心、Leader 選舉、分散式鎖）。
    其核心設計選擇：
  </p>
  <ul>
    <li><strong>ZAB 協議（ZooKeeper Atomic Broadcast）：</strong>類似 Paxos，確保所有節點以相同順序處理操作。這保證了線性一致性（Linearizability）。</li>
    <li><strong>Leader-Follower 架構：</strong>所有寫入必須經過 Leader，並等待多數（Quorum）Follower 確認後才返回成功。若 Leader 不可用，系統暫停服務直到選出新 Leader。</li>
    <li><strong>分區時拒絕：</strong>若 ZooKeeper 節點無法達成 Quorum（例如 5 個節點中 3 個無法通訊），系統寧可返回錯誤，也不返回可能過期的資料。</li>
  </ul>

  <callout-box type="warning" title="為什麼不能用 ZooKeeper 儲存用戶資料？">
    ZooKeeper 的強一致性是有代價的：它的吞吐量很低（通常 &lt; 10,000 次寫入/秒），且不適合儲存大量資料（每個節點的資料大小有 1MB 限制）。
    它的設計目標是「協調」（少量關鍵狀態的強一致），而非「儲存」（大量資料的高吞吐）。
    把用戶資料放進 ZooKeeper 是一個嚴重的反模式。
  </callout-box>

  <h3>以電商購物車為例</h3>
  <p>
    Amazon 的購物車使用 AP 設計（基於 Dynamo 的論文）。若網路分區發生，兩個節點可能同時收到
    「加入商品 A」的操作，最終合併時會出現購物車有兩個商品 A 的情況。
    Amazon 認為，<strong>顧客看到「多一件」遠比「系統無法使用」好</strong>——這就是 AP 的典型業務取捨。
  </p>
  <p>
    相反，銀行轉帳必須是 CP 設計。你的帳戶扣款與對方入帳之間，不能因為網路問題而出現「雙方都扣款」
    或「雙方都入帳」的不一致狀態，即使系統暫時不可用也要保證資料正確。
  </p>

  <h3>PACELC：超越 CAP 的延伸定理</h3>
  <p>
    CAP 定理只描述了<strong>網路分區發生時</strong>的取捨。但現實中，網路分區相對罕見；
    更常見的問題是：即使在<strong>正常狀況下</strong>，如何在低延遲和強一致性之間做選擇？
  </p>
  <p>
    Daniel Abadi 在 2012 年提出 <strong>PACELC 定理</strong>，補充了這個維度：
  </p>
  <pre data-lang="text"><code class="language-text">PACELC = PAC + ELC

P → 發生 Partition（分區）時：
  A：選 Availability（AP 系統）
  C：選 Consistency（CP 系統）

E → Else（正常運作時）：
  L：選 Latency（低延遲，允許最終一致）
  C：選 Consistency（強一致，接受更高延遲）</code></pre>
  <table>
    <thead>
      <tr>
        <th>系統</th>
        <th>分區時</th>
        <th>正常時</th>
        <th>PACELC 分類</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>DynamoDB（預設）</td>
        <td>選 A</td>
        <td>選 L（低延遲）</td>
        <td>PA/EL</td>
      </tr>
      <tr>
        <td>Cassandra</td>
        <td>選 A</td>
        <td>選 L</td>
        <td>PA/EL</td>
      </tr>
      <tr>
        <td>ZooKeeper / etcd</td>
        <td>選 C</td>
        <td>選 C（強一致）</td>
        <td>PC/EC</td>
      </tr>
      <tr>
        <td>Google Spanner</td>
        <td>選 C</td>
        <td>選 C（使用 TrueTime）</td>
        <td>PC/EC</td>
      </tr>
      <tr>
        <td>MongoDB（預設）</td>
        <td>選 C</td>
        <td>選 L</td>
        <td>PC/EL</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="tip" title="面試中如何談 CAP/PACELC">
    面試官問「你會選什麼資料庫？」時，不要只說「我選 Cassandra 因為高可用」。
    更好的回答是：「這個場景下用戶動態資料允許最終一致性，我選 Cassandra（PA/EL）。
    但對於庫存扣減，我需要強一致性，會選 PostgreSQL 搭配分散式鎖。」
    展示你理解不同資料庫背後的 CAP/PACELC 取捨，這才是 Senior 水準的回答。
  </callout-box>
</section>

<section id="sla-slo-sli">
  <h2>SLA / SLO / SLI 的差異與實務應用</h2>
  <p>
    這三個縮寫在工程師的日常對話中頻繁出現，卻常被混用。理解它們的層次關係，
    是設計高可用系統、建立健康工程文化的基礎：
  </p>

  <h3>三層定義</h3>
  <table>
    <thead>
      <tr>
        <th>縮寫</th>
        <th>全名</th>
        <th>白話定義</th>
        <th>誰負責</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>SLI</strong></td>
        <td>Service Level Indicator</td>
        <td>實際測量的指標（數字）</td>
        <td>工程師（監控系統）</td>
      </tr>
      <tr>
        <td><strong>SLO</strong></td>
        <td>Service Level Objective</td>
        <td>對 SLI 設定的目標（內部承諾）</td>
        <td>工程團隊</td>
      </tr>
      <tr>
        <td><strong>SLA</strong></td>
        <td>Service Level Agreement</td>
        <td>對外的法律承諾（通常附違約賠償）</td>
        <td>法務、業務團隊</td>
      </tr>
    </tbody>
  </table>

  <h3>具體範例：一個 API 服務的三層關係</h3>
  <ul>
    <li><strong>SLI：</strong>過去 30 天內，HTTP 2xx 回應占所有回應的比例 = <code>99.95%</code>（這是你監控系統測量出來的真實數字）</li>
    <li><strong>SLO：</strong>成功率須維持在 <code>≥ 99.9%</code>（內部目標，比 SLI 的實際值低，留有誤差空間）</li>
    <li><strong>SLA：</strong>向客戶承諾 <code>99.5%</code> 可用性，若低於此則賠償 10% 月費（對外合約）</li>
  </ul>

  <callout-box type="info" title="為什麼 SLO 要比 SLA 嚴格？">
    SLO 設定得比 SLA 嚴格，是為了留下「錯誤預算（Error Budget）」。若 SLA 承諾 99.5%，
    而你的 SLO 設為 99.9%，那麼在兩者之間的空間，工程師可以用來做系統升級、測試實驗，
    或消化技術債，而不會觸犯對客戶的承諾。
  </callout-box>

  <h3>設計良好的 SLI 指標</h3>
  <p>SLI 是整個體系的基礎，必須謹慎設計。一個好的 SLI 應該能真實反映用戶體驗：</p>
  <table>
    <thead>
      <tr>
        <th>SLI 類型</th>
        <th>計算方式</th>
        <th>適用服務</th>
        <th>設計注意事項</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>可用性（Availability）</td>
        <td>成功請求數 / 總請求數</td>
        <td>所有服務</td>
        <td>排除已知的健康檢查、爬蟲流量</td>
      </tr>
      <tr>
        <td>延遲（Latency）</td>
        <td>P50、P95、P99 回應時間</td>
        <td>同步 API</td>
        <td>使用 Percentile，而非平均值</td>
      </tr>
      <tr>
        <td>吞吐量（Throughput）</td>
        <td>每秒處理的請求數（QPS）</td>
        <td>批次處理系統</td>
        <td>峰值吞吐量 vs 持續吞吐量</td>
      </tr>
      <tr>
        <td>錯誤率（Error Rate）</td>
        <td>5xx 回應 / 總回應</td>
        <td>後端 API</td>
        <td>區分客戶端錯誤（4xx）和伺服器錯誤（5xx）</td>
      </tr>
      <tr>
        <td>正確性（Correctness）</td>
        <td>回傳正確結果的比例</td>
        <td>搜尋、推薦系統</td>
        <td>需要 Golden Dataset 驗證</td>
      </tr>
      <tr>
        <td>新鮮度（Freshness）</td>
        <td>資料更新到可見的延遲時間</td>
        <td>資料管道、快取系統</td>
        <td>直接影響用戶感知的資料即時性</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="warning" title="避免使用平均延遲">
    平均延遲（Average Latency）是個危險的指標。如果你有 99% 的請求在 10ms 完成，
    但 1% 的請求花了 10 秒，平均值可能看起來很漂亮，但真實用戶體驗很糟糕。
    <strong>永遠用 P95 或 P99 來衡量延遲。</strong>
    Google 研究顯示，最慢的 1% 用戶往往是最重要的用戶（例如高負載情境下的大客戶）。
  </callout-box>

  <h3>Error Budget 計算實例</h3>
  <p>
    Error Budget 是一個由 Google SRE 提出的概念，它把「允許出錯的空間」具體化為可管理的資源。
    計算方式：
  </p>
  <pre data-lang="text"><code class="language-text">Error Budget 計算
==================
SLO = 99.9%（月可用性目標）
Error Budget = 1 - 99.9% = 0.1%

一個月（30 天）= 43,200 分鐘
允許停機時間 = 43,200 × 0.1% = 43.2 分鐘 / 月

情境一：月初一次 30 分鐘事故
  剩餘 Error Budget = 43.2 - 30 = 13.2 分鐘
  → 仍可進行小型部署，但需謹慎

情境二：月初一次 50 分鐘事故
  剩餘 Error Budget = 43.2 - 50 = -6.8 分鐘（已超支）
  → SLO 破標！必須凍結非緊急上線，啟動 Post-mortem
  → 通知業務團隊，評估是否觸發 SLA 賠償條款

情境三：全月零事故
  剩餘 Error Budget = 43.2 分鐘（全數剩餘）
  → 可以進行一次有風險的大型架構遷移</code></pre>

  <h3>燃燒率（Burn Rate）概念</h3>
  <p>
    單純看剩餘 Error Budget 不夠，你還需要了解「消耗速度」。
    <strong>燃燒率（Burn Rate）</strong>衡量 Error Budget 消耗的速率，用以提前預警：
  </p>
  <pre data-lang="text"><code class="language-text">燃燒率定義：
  Burn Rate = 1（正常）表示以恰好能在月底耗盡預算的速度消耗
  Burn Rate > 1 表示消耗過快，會提前耗盡預算

範例（SLO = 99.9%）：
  若系統可用性降至 99%（錯誤率 = 1%）：
  Burn Rate = 1% / 0.1% = 10

  這意味著 Error Budget 會在 43.2 分鐘 / 10 = 4.3 分鐘 內耗盡！
  → 需要立即介入，這是 P1 事故等級

Google SRE 建議的告警閾值：
  Burn Rate &gt; 14.4 → 1 小時內耗盡 → 立即 Page On-call
  Burn Rate &gt; 6   → 6 小時內耗盡 → Slack 告警，需關注
  Burn Rate &gt; 1   → 預算會在月底前耗盡 → 週報追蹤</code></pre>

  <h3>SLI/SLO 與 Incident 管理的關係</h3>
  <p>SLO 是 Incident 分級管理的客觀依據，讓工程師避免主觀判斷「嚴不嚴重」：</p>
  <table>
    <thead>
      <tr>
        <th>事故等級</th>
        <th>觸發條件</th>
        <th>回應方式</th>
        <th>燃燒率對應</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>P1（Critical）</td>
        <td>1 小時內 Error Budget 將耗盡</td>
        <td>立即 Page On-call，啟動 War Room</td>
        <td>Burn Rate &gt; 14.4</td>
      </tr>
      <tr>
        <td>P2（High）</td>
        <td>6 小時內 Error Budget 將耗盡</td>
        <td>On-call 工程師介入，通知管理層</td>
        <td>Burn Rate &gt; 6</td>
      </tr>
      <tr>
        <td>P3（Medium）</td>
        <td>月底前 Error Budget 將耗盡</td>
        <td>下週優先處理，追蹤修復進度</td>
        <td>Burn Rate &gt; 1</td>
      </tr>
      <tr>
        <td>P4（Low）</td>
        <td>正常範圍內波動</td>
        <td>日常技術債管理</td>
        <td>Burn Rate ≤ 1</td>
      </tr>
    </tbody>
  </table>

  <h3>Error Budget Policy：讓制度保護工程師</h3>
  <p>
    Error Budget 最大的價值，是提供一個<strong>客觀的決策機制</strong>，讓工程師不需要在「快速迭代」
    和「保持穩定」之間靠直覺做判斷。以下是一個典型的 Error Budget Policy：
  </p>
  <pre data-lang="text"><code class="language-text">Error Budget Policy 範例
==========================
當 Error Budget 剩餘 &gt; 50%：
  - 可以正常進行功能上線
  - 可以做架構重構和技術實驗
  - 鼓勵風險性測試（如 Chaos Engineering）

當 Error Budget 剩餘 10%-50%：
  - 只有已充分測試的功能可以上線
  - 暫停非緊急的架構變更
  - 加強監控覆蓋率

當 Error Budget 剩餘 &lt; 10%：
  - 凍結所有非緊急上線（需 VP 審批例外）
  - 工程師專注於可靠性改善
  - 更新 Runbook，加強 On-call 訓練

當 Error Budget 超支（&lt; 0%）：
  - 上月的 SLA 可能違約，通知客戶成功團隊
  - 強制召開 Post-mortem
  - 下個月所有新功能上線需要額外審查</code></pre>

  <callout-box type="tip" title="Error Budget 的文化意義">
    Error Budget 最深遠的影響不是技術上的，而是文化上的。它讓開發團隊和 SRE 團隊有共同的「語言」來討論風險：
    不是「這次上線安不安全」（主觀），而是「我們還有多少 Error Budget」（客觀）。
    當 PM 問「為什麼不能現在上線」，工程師可以說「我們的 Error Budget 只剩 5 分鐘了」——
    這是任何人都能理解的答案。
  </callout-box>
</section>
`,
} satisfies ChapterContent;
