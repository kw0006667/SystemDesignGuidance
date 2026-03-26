import type { ChapterContent } from '../../types.js';

export default {
  title: '單體 vs 微服務架構',
  content: `
<section id="monolith-vs-microservices">
  <h2>Monolith 不是壞事</h2>
  <p>
    近十年來，微服務（Microservices）幾乎成了「現代架構」的代名詞。
    許多工程師默認微服務是更好的選擇，單體（Monolith）是需要被「重構掉」的遺留系統。
    這是一個危險的誤解。
  </p>
  <p>
    事實上，大量成功的產品在相當長的時間裡都是以單體架構運行的。
    GitHub、Shopify、Basecamp 都曾長期使用單體架構，並在業務成長到相當規模後才進行拆分。
    選擇架構的標準應該是「當前業務階段與團隊規模的最佳解」，而非追隨潮流。
  </p>

  <arch-diagram src="./diagrams/ch10-monolith-microservices.json" caption="Monolith 與 Microservices 架構對比：單體架構所有模組共用一個部署單元與資料庫；微服務架構每個服務獨立部署，各自擁有資料庫，透過 API Gateway 對外暴露。"></arch-diagram>

  <h3>Monolith 架構的完整優勢分析</h3>
  <p><strong>單體架構的優勢在小規模系統中是壓倒性的：</strong></p>
  <ul>
    <li><strong>開發速度快：</strong>所有代碼在一個 Codebase，跨模組呼叫就是函數呼叫。
    不需要定義 API 契約、處理網路錯誤、管理服務版本。
    一個新功能從需求到上線，在單體中可能只需要一天，在微服務中可能需要一週——
    光是搭建新服務的 CI/CD 管道、服務發現配置、監控接入就需要大量時間。</li>
    <li><strong>除錯簡單：</strong>一個請求的完整 Stack Trace 在一個 Log，
    不需要跨多個服務追蹤 Trace ID。在微服務中，一個失敗的請求可能需要在 5 個服務的 Log 中
    拼湊完整的錯誤鏈路。</li>
    <li><strong>事務簡單：</strong>資料庫事務（ACID）在單體中天然支援；
    微服務中需要 Saga Pattern 等複雜機制，且只能提供最終一致性而非強一致性。</li>
    <li><strong>部署簡單：</strong>一個應用部署一次，不需要管理數十個服務的獨立部署管道。
    微服務的部署複雜度是線性甚至指數級增加的。</li>
    <li><strong>效能好：</strong>函數呼叫的延遲是奈秒（ns）級，本地記憶體存取是微秒（µs）級，
    而網路呼叫最少也是毫秒（ms）級——跨資料中心可達數十毫秒。
    這意味著微服務的每一次跨服務呼叫都有至少 10 萬倍的延遲代價。</li>
    <li><strong>測試簡單：</strong>單體的整合測試可以完整覆蓋業務流程；
    微服務需要 Mock 多個外部服務，或搭建完整的測試環境（成本極高）。</li>
    <li><strong>本地開發便利：</strong>開發者可以在筆電上啟動整個系統；
    微服務系統啟動可能需要 Docker Compose 管理 20 個容器，佔用大量本地資源。</li>
  </ul>

  <callout-box type="info" title="StackOverflow 的架構啟示">
    StackOverflow 是全球最大的技術問答社群，長期支撐著數以千萬計的每日請求（最高峰每月超過 10 億次頁面瀏覽），
    卻只使用了寥寥幾台高規格的 Windows Server 和 SQL Server——
    在某個時間點，整個網站只運行在 9 台前端伺服器和 4 台資料庫伺服器上。
    他們的 CTO 曾公開說：「我們選擇讓架構簡單，讓機器更強，而非引入分散式複雜性。」
    這是「垂直擴展（Scale Up）」優先的典型案例：在確認需要水平擴展前，先嘗試用更強的硬體解決問題。
    不是每個公司都需要 Google 的架構。
  </callout-box>

  <h3>Monolith 的真正問題：規模後的痛苦</h3>
  <p>單體架構確實有侷限，但問題<strong>通常只在特定規模後才出現</strong>，常見觸發點如下：</p>
  <ul>
    <li><strong>部署耦合（Deployment Coupling）：</strong>
    當團隊人數超過 50-100 人時，同一個部署管道成為瓶頸。
    100 個工程師的改動都在同一個 Codebase，一個人引入的 Bug 可能阻擋所有人的上線計畫。
    一個月的 Sprint 結束時，所有功能都在搶同一個上線視窗。</li>
    <li><strong>擴展困難（Scaling Inefficiency）：</strong>
    只有某個功能需要更多資源（如影片轉碼 CPU 密集，但訂單管理 CPU 閒置），
    但整個應用只能一起擴展，造成資源浪費。
    極端情況下，一個不重要的功能模組消耗了 70% 的 CPU，
    卻無法獨立擴展或降級。</li>
    <li><strong>技術棧綁定（Technology Lock-in）：</strong>
    如果系統是 Java 單體，某個模組需要 Python 的機器學習庫，
    就必須在 Java 中呼叫外部 Python 進程，或整個系統加入 Python 支援，架構扭曲。</li>
    <li><strong>程式碼腐化（Code Rot）：</strong>
    百萬行的 Codebase 中，模組之間的邊界容易被無意識地打破——
    工程師「臨時借用」另一個模組的私有函數，多次之後邊界消失，形成大泥球（Big Ball of Mud）。</li>
    <li><strong>上線風險集中：</strong>
    每次部署都是全量部署，一個小功能的上線可能影響到看似無關的模組。
    線上事故的影響範圍是整個系統，而非單一服務。</li>
  </ul>

  <h3>微服務的真實代價清單</h3>
  <p>微服務不是免費的午餐，它以操作複雜度換取擴展靈活性。在決定採用微服務前，請仔細評估以下代價：</p>

  <table>
    <thead>
      <tr>
        <th>代價類別</th>
        <th>具體問題</th>
        <th>所需解決方案</th>
        <th>估計工程成本</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>網路通訊</td>
        <td>服務間呼叫需處理延遲、超時、重試、熔斷</td>
        <td>Circuit Breaker、Retry Policy、Timeout</td>
        <td>高</td>
      </tr>
      <tr>
        <td>資料一致性</td>
        <td>跨服務事務無法使用 ACID</td>
        <td>Saga Pattern、Outbox Pattern、最終一致性</td>
        <td>非常高</td>
      </tr>
      <tr>
        <td>基礎設施</td>
        <td>需要服務發現、負載平衡、API Gateway</td>
        <td>Kubernetes、Consul、AWS ALB</td>
        <td>中到高</td>
      </tr>
      <tr>
        <td>可觀測性</td>
        <td>跨服務的問題追蹤極其困難</td>
        <td>分散式追蹤（Jaeger/Zipkin）、集中日誌（ELK）</td>
        <td>高</td>
      </tr>
      <tr>
        <td>測試</td>
        <td>整合測試需 Mock 或啟動多個服務</td>
        <td>Contract Testing（Pact）、測試環境管理</td>
        <td>高</td>
      </tr>
      <tr>
        <td>CI/CD</td>
        <td>每個服務需要獨立的部署管道</td>
        <td>成熟的 DevOps 文化、容器化（Docker/K8s）</td>
        <td>高</td>
      </tr>
      <tr>
        <td>服務間契約</td>
        <td>API 版本升級需要向後相容，否則打破其他服務</td>
        <td>API 版本管理策略、Consumer-Driven Contract</td>
        <td>中</td>
      </tr>
      <tr>
        <td>本地開發</td>
        <td>開發者需在本機啟動相關的依賴服務</td>
        <td>Docker Compose、Service Stub、開發環境規範</td>
        <td>中</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="warning" title="微服務的「分散式系統稅」">
    採用微服務後，你不是在「消除複雜度」，而是在「轉移複雜度」——
    從業務邏輯的複雜度轉移到基礎設施和分散式系統的複雜度。
    根據 Sam Newman（《Building Microservices》作者）的經驗，
    一個 10 人的工程團隊採用微服務後，可能有 3-4 人的工作量是在維護基礎設施，
    而非開發業務功能。這是否值得，取決於你的業務規模和成長速度。
  </callout-box>

  <h3>架構決策的務實框架</h3>
  <p>
    在評估是否採用微服務時，可以用以下數字作為參考基準（這些是業界的粗略共識，
    非硬性規則）：
  </p>
  <ul>
    <li><strong>少於 10 人的工程團隊：</strong>幾乎不應採用微服務，管理開銷佔比過大</li>
    <li><strong>10-50 人的工程團隊：</strong>可考慮「模組化單體（Modular Monolith）」，
    保持部署簡單的同時維護清晰的模組邊界</li>
    <li><strong>50+ 人的工程團隊，且有明確的獨立擴展需求：</strong>微服務開始物有所值</li>
    <li><strong>100+ 人的工程團隊，多個產品線：</strong>微服務幾乎是必要的</li>
  </ul>
</section>

<section id="when-to-split">
  <h2>何時拆分服務？</h2>
  <p>
    Martin Fowler 說過一句名言：「不要以微服務作為新項目的起點。
    從單體開始，等你理解了系統的邊界，再拆分。」
    那麼，何時是拆分的正確時機？
  </p>

  <h3>拆分的合理觸發條件</h3>
  <table>
    <thead>
      <tr>
        <th>觸發條件</th>
        <th>說明</th>
        <th>範例</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>獨立擴展需求</td>
        <td>某個模組需要比其他模組多 10 倍的資源</td>
        <td>影片轉碼模組需要 GPU，但訂單模組不需要</td>
      </tr>
      <tr>
        <td>獨立部署週期</td>
        <td>某個模組需要非常頻繁的部署，不能因其他模組的問題而阻塞</td>
        <td>A/B 測試的推薦系統每天更新模型，主服務只週更</td>
      </tr>
      <tr>
        <td>技術棧差異</td>
        <td>某個模組需要不同的技術棧</td>
        <td>Python ML 模型服務 vs Java 主服務</td>
      </tr>
      <tr>
        <td>團隊組織邊界</td>
        <td>Conway's Law：系統架構往往反映組織溝通結構</td>
        <td>不同產品線的團隊各自維護獨立服務</td>
      </tr>
      <tr>
        <td>安全邊界隔離</td>
        <td>支付等敏感模組需要獨立的安全審查和存取控制</td>
        <td>PCI DSS 合規的支付服務必須與其他服務隔離</td>
      </tr>
      <tr>
        <td>故障隔離需求</td>
        <td>某個模組的故障不應影響核心業務</td>
        <td>通知服務故障不應影響訂單下單流程</td>
      </tr>
    </tbody>
  </table>

  <h3>Conway's Law 與反向 Conway Maneuver</h3>
  <p>
    Conway's Law（康威定律）是 1967 年由 Melvin Conway 提出的觀察：
    <em>「任何設計系統（廣義的）的組織，都會產生一個設計，其結構與該組織的溝通結構相同。」</em>
  </p>
  <p>
    換句話說，如果你有三個團隊，你可能最終會得到三個服務。
    這不是壞事——服務邊界應該反映組織的實際溝通模式，因為跨邊界的協作成本（溝通、API 協商）
    應該與組織結構的溝通成本對齊。
  </p>
  <p>
    <strong>反向 Conway Maneuver（Inverse Conway Maneuver）</strong>：
    如果你想要特定的系統架構，先調整組織結構。
    Netflix、Amazon 都是先按業務能力（Business Capability）重組團隊，
    再讓服務自然地沿著團隊邊界形成。
  </p>
  <pre data-lang="text"><code class="language-text">電商平台的組織與服務邊界對齊範例：

組織結構：                    對應服務邊界：
┌─────────────────────┐       ┌─────────────────────┐
│ 商品團隊（5人）       │──────│ Product Service      │
│ 訂單團隊（8人）       │──────│ Order Service        │
│ 支付團隊（6人）       │──────│ Payment Service      │
│ 用戶增長團隊（7人）   │──────│ User / Auth Service  │
│ 物流團隊（4人）       │──────│ Shipping Service     │
└─────────────────────┘       └─────────────────────┘

每個團隊「擁有」自己的服務，負責設計、開發、運維（You build it, you run it）</code></pre>

  <h3>領域驅動設計（DDD）的 Bounded Context</h3>
  <p>
    拆分微服務最難的問題不是技術，而是「如何劃定邊界」。
    拆錯了，服務之間呼叫頻繁（chatty services），反而比單體更慢更脆弱。
    <strong>領域驅動設計（Domain-Driven Design, DDD）</strong>的
    <strong>Bounded Context（限界上下文）</strong>提供了劃定邊界的系統性方法。
  </p>
  <p>
    每個 Bounded Context 定義了一個特定的業務子域，在其內部有自己的語言（Ubiquitous Language）、
    資料模型和規則。同一個概念在不同 Bounded Context 中可能有不同的含義：
  </p>

  <pre data-lang="text"><code class="language-text">「用戶（User）」在不同 Bounded Context 的含義：

訂單 Context（Order BC）：
  User = { userId, shippingAddress, orderHistory }
  關心的是：用戶的收貨地址、歷史訂單

支付 Context（Payment BC）：
  User = { userId, billingAddress, paymentMethods, creditScore }
  關心的是：用戶的帳單資訊、信用評分

推薦 Context（Recommendation BC）：
  User = { userId, browsedCategories, purchaseHistory, preferences }
  關心的是：用戶的行為偏好

→ 這三個 Context 中的「User」是不同的物件，應維護在各自的服務中，
  而非共用一個巨大的 User 資料模型</code></pre>

  <h3>識別 Bounded Context 的實踐方法</h3>
  <p><strong>Event Storming（事件風暴）</strong>是 DDD 中識別邊界最有效的工具：</p>
  <ol>
    <li>召集業務人員和工程師，用橙色便利貼列出所有業務事件（Domain Events），如「訂單已建立」、「支付已完成」</li>
    <li>用藍色便利貼標記觸發這些事件的命令（Commands），如「建立訂單」、「處理支付」</li>
    <li>識別自然形成的事件群組——這些群組通常就是 Bounded Context 的邊界</li>
    <li>標記需要跨群組的事件流，這些跨界點就是服務間的整合點</li>
  </ol>

  <h3>何時不應該拆分的信號</h3>
  <p>以下信號表明現在還不是拆分的時機：</p>
  <ul>
    <li><strong>邊界不清晰：</strong>你無法清楚說明每個服務的責任邊界，
    或者兩個「不同的服務」在業務邏輯上高度耦合</li>
    <li><strong>頻繁的跨服務聯合查詢：</strong>業務查詢需要同時關聯 3 個以上服務的資料，
    強行拆分後需要複雜的資料聚合層</li>
    <li><strong>沒有 DevOps 能力：</strong>團隊還沒有 CI/CD 自動化、容器化經驗，
    先搞定這些基礎設施再考慮拆分</li>
    <li><strong>主要問題不是部署耦合：</strong>如果你的痛苦主要來自程式碼品質問題，
    拆成微服務只是把爛程式碼分散到多個服務，問題依然存在</li>
    <li><strong>業務領域尚未穩定：</strong>早期新創公司業務模型每週在變，
    這時候拆分的邊界很可能是錯的，反而增加重構成本</li>
  </ul>

  <callout-box type="warning" title="過度拆分的反模式：Nano-services 與 Distributed Monolith">
    <strong>Nano-services：</strong>拆分粒度太細（每個函數一個服務）會導致服務數量爆炸、
    跨服務呼叫頻繁、部署和監控成本遠超收益。
    一個好的微服務應該能在 2 週內被一個 3-5 人的小團隊完整理解和重寫。
    <br/><br/>
    <strong>Distributed Monolith（分散式單體）：</strong>更常見也更危險的反模式——
    名義上是微服務，但服務之間緊密耦合，必須同時部署所有服務，
    也就是說你得到了微服務的所有複雜度，卻沒有得到任何好處。
    識別特徵：「更新 A 服務必須同時更新 B 和 C 服務才能上線。」
  </callout-box>
</section>

<section id="strangler-fig">
  <h2>Strangler Fig Pattern</h2>
  <p>
    如何將現有的單體系統遷移到微服務，而不做「一次性大重構」（Big Bang Migration，
    幾乎都以失敗告終）？答案是 <strong>Strangler Fig Pattern（絞殺榕模式）</strong>。
  </p>
  <p>
    名字來源於絞殺榕（Strangler Fig Tree）：一種從宿主樹的頂端開始生長的寄生植物，
    逐漸向下包裹宿主樹，最終宿主樹完全被新樹取代而枯死。
    新服務逐漸「包裹」並取代舊系統，最終讓舊系統自然退出歷史舞台。
  </p>

  <h3>Big Bang Migration 為什麼幾乎都失敗</h3>
  <p>
    Big Bang Migration 的思路是：先暫停新功能開發，用幾個月時間把整個系統重寫成微服務，
    再一次性切換。這個方案的問題在於：
  </p>
  <ul>
    <li><strong>風險集中：</strong>切換那一刻，整個系統是全新的，任何問題都無法快速定位和回滾</li>
    <li><strong>業務知識遺失：</strong>重寫過程中，大量「隱性知識」（為什麼有這個奇怪的邏輯？）
    因為找不到作者而被遺失，導致舊系統的 Bug 在新系統中重新出現</li>
    <li><strong>時間難以估算：</strong>重寫總是比預期耗時，業務無法等待長達 6 個月不上新功能</li>
    <li><strong>目標移動：</strong>重寫期間業務需求繼續變化，新系統剛完成時已經落後舊系統 6 個月的功能</li>
  </ul>

  <h3>Strangler Fig 的完整實施步驟</h3>
  <pre data-lang="text"><code class="language-text">起點：所有流量 → 單體應用（Legacy Monolith）

第一步：在單體前面加一層 Facade（通常是 API Gateway 或 Nginx）
  ├─ 這一步不改變任何業務邏輯，只是加一個透明代理
  ├─ 確保 Facade 通過所有現有測試
  └─ 流量：Client → API Gateway → 單體應用（100% 流量）

第二步：抽取第一個服務（選擇風險最低的模組）
  ├─ 建議從「邊緣功能」開始，如通知服務、報表服務
  ├─ 避免第一個就拆「核心業務」（訂單、支付）
  └─ 流量：Client → API Gateway → /notifications/* → 新通知服務
                               → /* 其他       → 單體應用

第三步：逐步遷移更多功能（每次只遷移一個）
  ├─ 每次遷移後，至少穩定運行 2 週再繼續
  ├─ 建立「遷移指標」：流量成功率、P99 延遲、錯誤率
  └─ 流量：Client → API Gateway → /auth/*     → 認證服務
                               → /orders/*   → 訂單服務
                               → /products/* → 商品服務
                               → /* 剩餘     → 單體應用（越來越小）

最終：單體應用業務邏輯為零，可以關閉
  └─ 流量：Client → API Gateway → 各微服務（全部）</code></pre>

  <h3>資料庫遷移策略</h3>
  <p>
    資料庫解耦是 Strangler Fig 最困難的部分，常被低估。
    建議按照以下三個階段進行，而非一步到位：
  </p>
  <ol>
    <li><strong>第一階段：共用資料庫（Shared Database）</strong>
    <br/>新服務和舊單體共用同一個資料庫。這讓服務邏輯可以獨立部署，但資料模型仍然耦合。
    可以快速上線，且事務仍然可以 ACID。</li>
    <li><strong>第二階段：Anti-Corruption Layer（防腐層）</strong>
    <br/>新服務不直接讀寫舊資料庫，而是透過防腐層（通常是一個內部 API 或事件流）
    存取資料，為將來的分離做準備。</li>
    <li><strong>第三階段：獨立資料庫 + 資料同步</strong>
    <br/>新服務有自己的資料庫，初期與舊資料庫雙向同步（Change Data Capture, CDC），
    待確認一致後，切斷同步，舊系統中的該表格廢棄。</li>
  </ol>

  <callout-box type="tip" title="選擇第一個拆分目標的原則">
    選擇「邊緣服務」而非「核心服務」作為起點：
    理想的第一個目標是功能邊界清晰、對業務影響小（出錯也不會造成大損失）、
    資料模型相對獨立（不需要頻繁和其他模組聯查）的模組。
    通知服務、用戶偏好設定服務、報表服務通常是很好的起點。
    訂單服務、支付服務應該等到有了充分的拆分經驗後再處理。
  </callout-box>

  <h3>Branch by Abstraction 的對比</h3>
  <p>
    <strong>Branch by Abstraction</strong> 是另一種漸進式遷移方式，更適合重構現有模組而非提取新服務。
    其步驟如下：
  </p>
  <ol>
    <li>在現有程式碼調用處引入抽象層（介面 / 抽象類別）</li>
    <li>所有調用者改為透過介面調用，行為不變</li>
    <li>新增介面的新實現（新的服務客戶端）</li>
    <li>使用 Feature Flag 控制哪些請求走新實現</li>
    <li>逐步將流量從舊實現切到新實現（1% → 10% → 50% → 100%）</li>
    <li>流量全切到新實現後，刪除舊實現</li>
  </ol>
  <p>
    與 Strangler Fig 的區別：Branch by Abstraction 在應用內部進行，不需要 API Gateway 路由；
    Strangler Fig 在基礎設施層（反向代理）進行路由切換，對應用透明。
    兩者可以結合使用。
  </p>

  <h3>遷移風險管理</h3>
  <ul>
    <li><strong>保持雙寫（Dual Write）：</strong>關鍵資料遷移期間，同時寫入舊系統和新服務，
    用對比工具驗證一致性後再切讀流量</li>
    <li><strong>Shadow Mode（影子模式）：</strong>新服務接收真實請求但不返回結果，
    對比新舊系統的輸出差異，在不影響用戶的情況下驗證新服務</li>
    <li><strong>Feature Flag 控制：</strong>使用功能開關控制流量比例，
    可以快速回滾到單體，無需重新部署</li>
    <li><strong>設定可接受的誤差率：</strong>定義什麼情況下自動回滾
    （如：新服務錯誤率超過 1%，自動將流量切回單體）</li>
  </ul>
</section>

<section id="service-mesh">
  <h2>Service Mesh 與 API Gateway</h2>
  <p>
    微服務架構中，有兩個常被混淆但角色截然不同的基礎設施元件：
    <strong>API Gateway</strong>（面向外部流量）和 <strong>Service Mesh</strong>（面向內部服務間通訊）。
    理解兩者的定位差異，是設計微服務基礎設施的關鍵。
  </p>

  <h3>API Gateway：南北向流量的守門人</h3>
  <p>
    API Gateway 處理外部客戶端（瀏覽器、手機 App、第三方合作夥伴）進入系統的流量，
    這種流量方向稱為「南北向（North-South）流量」。
    它是系統的單一入口點（Single Entry Point），承擔多種橫切關注點（Cross-cutting Concerns）：
  </p>
  <ul>
    <li><strong>認證與授權：</strong>驗證 JWT Token、OAuth 2.0 流程、API Key 驗證</li>
    <li><strong>速率限制（Rate Limiting）：</strong>保護後端服務不被濫用</li>
    <li><strong>請求路由：</strong>將 /api/users → 用戶服務，/api/orders → 訂單服務</li>
    <li><strong>SSL 終止：</strong>解密 HTTPS，後端服務間可以使用 HTTP（降低 CPU 消耗）</li>
    <li><strong>請求/回應轉換：</strong>協定轉換（REST → gRPC）、回應聚合（BFF Pattern）</li>
    <li><strong>日誌與監控：</strong>所有入口請求的統一記錄</li>
    <li><strong>Canary Release：</strong>將 10% 的流量導到新版本</li>
  </ul>
  <p><strong>代表產品：</strong>AWS API Gateway、Kong、Nginx Plus、Apigee、Traefik、Envoy（用於 API Gateway）</p>

  <h3>Service Mesh：東西向流量的管理者</h3>
  <p>
    Service Mesh 處理微服務之間的通訊，稱為「東西向（East-West）流量」。
    它的核心思想是：將服務間通訊的橫切關注點（熔斷、重試、超時、追蹤、流量控制、mTLS）
    從應用程式碼中抽離，下沉到基礎設施層（Sidecar Proxy），讓開發者專注業務邏輯。
  </p>

  <h3>Sidecar Pattern 詳解</h3>
  <p>
    Service Mesh 的核心實現方式是 Sidecar Pattern：
    每個微服務 Pod 旁邊自動注入一個 Proxy 容器（通常是 Envoy）。
    服務之間的所有通訊都先通過 Sidecar，應用程式本身完全無感知：
  </p>
  <pre data-lang="text"><code class="language-text">Kubernetes Pod 內：
┌─────────────────────────────────────────┐
│  Pod                                    │
│  ┌─────────────────┐  ┌──────────────┐ │
│  │  App Container  │  │ Envoy Sidecar│ │
│  │  (業務程式)      │←→│  (Proxy)     │ │
│  │  Port: 8080     │  │  Port: 15001 │ │
│  └─────────────────┘  └──────┬───────┘ │
└──────────────────────────────┼─────────┘
                                │
                          所有進出流量
                          都通過此處

Sidecar 透明處理（應用程式無感知）：
  ✓ 熔斷（Circuit Breaker）
  ✓ 重試（Retry）和超時（Timeout）
  ✓ mTLS 加密（服務間雙向 TLS）
  ✓ 分散式追蹤（傳播 Trace ID / Span ID）
  ✓ 流量遷移（Canary Release：10% 流量到 v2）
  ✓ 負載平衡（加權輪詢、一致性雜湊）
  ✓ 健康檢查和熔斷
  ✓ 指標收集（Prometheus 格式）</code></pre>

  <h3>Istio 架構：Control Plane vs Data Plane</h3>
  <p>以 Istio（最廣泛使用的 Service Mesh）為例，架構分為兩層：</p>
  <pre data-lang="text"><code class="language-text">Control Plane（控制平面）：
  istiod（整合了 Pilot + Citadel + Galley）
  ├─ Pilot：將路由規則、服務發現資訊推送給所有 Envoy Sidecar
  ├─ Citadel：管理 mTLS 憑證，自動頒發和輪換
  └─ Galley：驗證配置

Data Plane（資料平面）：
  每個服務旁的 Envoy Sidecar（實際處理流量）

配置透過 Kubernetes CRD（自訂資源）管理：

VirtualService（流量路由規則）：
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: order-service
spec:
  http:
  - match:
    - headers:
        x-user-segment:
          exact: "beta"
    route:
    - destination:
        host: order-service
        subset: v2      # beta 用戶進入 v2
  - route:
    - destination:
        host: order-service
        subset: v1
      weight: 90        # 90% 流量進入 v1
    - destination:
        host: order-service
        subset: v2
      weight: 10        # 10% 流量進入 v2（Canary）</code></pre>

  <h3>Service Discovery：Consul vs Kubernetes DNS</h3>
  <p>
    微服務需要動態發現彼此的位置（IP 會隨容器重啟而改變），
    Service Discovery 解決這個問題。常見方案：
  </p>
  <table>
    <thead>
      <tr>
        <th>方案</th>
        <th>適用場景</th>
        <th>特點</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Kubernetes 內建 DNS</td>
        <td>所有服務都在同一個 K8s Cluster</td>
        <td>零配置，service-name.namespace.svc.cluster.local 自動可用</td>
      </tr>
      <tr>
        <td>Consul</td>
        <td>多 K8s Cluster、混合雲、非容器化服務</td>
        <td>跨環境服務發現、健康檢查、KV 存儲、支援非 K8s 環境</td>
      </tr>
      <tr>
        <td>AWS Cloud Map</td>
        <td>全 AWS 環境</td>
        <td>與 ECS/EKS/Lambda 深度整合，支援 DNS 和 API 兩種查詢</td>
      </tr>
      <tr>
        <td>Eureka（Netflix OSS）</td>
        <td>Java 生態、Spring Cloud</td>
        <td>AP 系統，重視可用性；但 Netflix 已逐漸轉向 K8s</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="tip" title="API Gateway vs Service Mesh：不是二選一">
    API Gateway 和 Service Mesh 解決的問題不同，應該同時使用：
    API Gateway 處理「外部請求進入系統」的問題（認證、路由、限流）；
    Service Mesh 處理「系統內部服務間通訊」的問題（熔斷、追蹤、mTLS）。
    它們是互補的，而非替代關係。
    在小規模系統中，可以只有 API Gateway；Service Mesh 只有當微服務數量超過 10-20 個時才考慮引入。
  </callout-box>

  <callout-box type="warning" title="Service Mesh 的引入成本">
    Service Mesh 帶來強大的能力，但也有明顯代價：
    每個請求都需要通過 Sidecar Proxy，增加延遲（通常 1-5ms，在 P99 可達 10ms+）；
    每個 Sidecar 消耗約 50-100MB 記憶體和少量 CPU；
    整個系統的複雜度大幅增加，排查問題需要理解 Istio 的多層抽象。
    <strong>只有當你的微服務數量超過 10-20 個，且手動管理重試/熔斷/mTLS 已成負擔時，才考慮引入 Service Mesh。</strong>
  </callout-box>
</section>

<section id="distributed-fallacies">
  <h2>分散式系統的 Fallacies</h2>
  <p>
    1994 年，Sun Microsystems 的工程師 Peter Deutsch（後來 L Peter Deutsch 整理完整版，
    James Gosling 等人也有貢獻）列出了開發分散式系統時工程師最常犯的 8 個錯誤假設——
    <strong>分散式系統的八大謬論（8 Fallacies of Distributed Computing）</strong>。
    30 年後的今天，這些謬論仍然每天都在傷害生產系統。
    每一個大型線上事故的背後，幾乎都能找到這 8 個謬論中的某一個。
  </p>

  <h3>謬論 1：網路是可靠的（The network is reliable）</h3>
  <p>
    這是最常見也最危險的假設。工程師在本地開發時，服務呼叫幾乎從不失敗，
    很容易形成「網路呼叫必然成功」的肌肉記憶。
    但在生產環境中，網路丟包、交換器故障、資料中心網路分區是日常：
  </p>
  <ul>
    <li>AWS 的 EC2 實例之間的網路丟包率有時高達 0.01%（聽起來很小，但每 10000 次呼叫就有一次失敗）</li>
    <li>跨可用區的網路比同可用區延遲高 2-5ms，且偶爾出現短暫的高延遲峰值</li>
    <li>Load Balancer 的連線重置（RST）可能在正常請求中途發生</li>
  </ul>
  <p><strong>防禦設計：</strong>重試機制（帶指數退避和抖動）、冪等性設計、Circuit Breaker</p>
  <pre data-lang="python"><code class="language-python">import time
import random

def call_with_retry(func, max_retries=3, base_delay=1.0):
    """帶指數退避和隨機抖動的重試機制"""
    for attempt in range(max_retries):
        try:
            return func()
        except (NetworkError, TimeoutError) as e:
            if attempt == max_retries - 1:
                raise  # 最後一次嘗試仍失敗，向上拋出
            # 指數退避：1s → 2s → 4s，加入隨機抖動避免 Thundering Herd
            delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
            time.sleep(delay)

# 謬論 1 的關鍵點：每個外部呼叫都必須設定 Timeout！
def call_payment_api(amount: float):
    return requests.post(
        "http://payment-service/charge",
        json={"amount": amount},
        timeout=5.0  # ← 沒有這一行，掛掉的 payment-service 可以無限佔用你的執行緒
    )</code></pre>

  <h3>謬論 2：延遲是零（Latency is zero）</h3>
  <p>
    本地函數呼叫的延遲約 0.1 µs（奈秒到微秒級）。
    同一資料中心的網路呼叫約 0.5-2ms。
    跨可用區約 2-10ms。
    跨地區（如台灣到美國）約 150-200ms RTT。
    這個差距從 0.1µs 到 200ms，相差 200 萬倍。
  </p>
  <p>
    當一個 API 背後有 5 個串聯的微服務呼叫，每個呼叫 P50 延遲 5ms，
    P99 延遲 50ms，那整個 API 的 P99 延遲就可能達到 250ms+，
    而開發者在本地測試時從未遇到這個問題。
  </p>
  <p><strong>防禦設計：</strong>非同步通訊（Message Queue）、批次請求（Batching）、
  快取熱點資料（減少遠端呼叫次數）、並行呼叫不互相依賴的服務</p>
  <pre data-lang="python"><code class="language-python">import asyncio

# 謬論 2 的應對：並行化獨立的遠端呼叫，而非串行
async def get_product_page(product_id: str) -> dict:
    # 錯誤做法（串行）：總延遲 = 30ms + 20ms + 25ms = 75ms
    # product = await get_product(product_id)  # 30ms
    # reviews = await get_reviews(product_id)  # 20ms
    # inventory = await get_inventory(product_id)  # 25ms

    # 正確做法（並行）：總延遲 ≈ max(30ms, 20ms, 25ms) = 30ms
    product, reviews, inventory = await asyncio.gather(
        get_product(product_id),
        get_reviews(product_id),
        get_inventory(product_id),
    )
    return {"product": product, "reviews": reviews, "inventory": inventory}</code></pre>

  <h3>謬論 3：頻寬是無限的（Bandwidth is infinite）</h3>
  <p>
    頻寬不僅有限，而且昂貴，尤其在雲端環境中：
    AWS 在同一可用區內的流量免費，但跨可用區的流量收費約 $0.01/GB，
    流出到網際網路的流量約 $0.08-$0.09/GB。
    一個產生大量跨 AZ 流量的服務設計，可能每月產生數萬美元的意外帳單。
  </p>
  <p><strong>防禦設計：</strong>資料壓縮（gzip/zstd）、分頁（Pagination）避免大 Payload、
  GraphQL 讓客戶端只請求需要的欄位、CDN 減少源站流量</p>

  <h3>謬論 4：網路是安全的（The network is secure）</h3>
  <p>
    預設信任內部網路是歷史上最大的安全錯誤之一。
    「內網流量是安全的」的假設導致了大量橫向移動（Lateral Movement）攻擊：
    攻擊者一旦入侵任何一個服務，就可以在整個內網自由移動。
  </p>
  <p><strong>防禦設計：</strong>
    mTLS（Service Mesh 提供，服務間雙向認證和加密）、
    Zero Trust Network（任何請求都需要驗證，不論來源是內網還是外網）、
    最小權限原則（每個服務只能存取它需要的資源）
  </p>

  <h3>謬論 5：網路拓撲不變（Topology doesn't change）</h3>
  <p>
    雲端環境中，服務的 IP 地址隨時會變（容器重啟、Auto-scaling、節點更換）。
    硬編碼 IP 地址是導致脆弱系統的常見原因。
  </p>
  <p><strong>防禦設計：</strong>Service Discovery（Kubernetes DNS、Consul）、
  健康檢查（Load Balancer 自動移除不健康節點）、DNS-based 服務定位</p>

  <h3>謬論 6：只有一個管理員（There is one administrator）</h3>
  <p>
    在微服務架構中，訂單服務由 Team A 維護，支付服務由 Team B 維護，
    兩個團隊的發布計畫、API 變更策略可能不協調。
    Team B 更新了 API 的回應格式，可能在不知情的情況下打破 Team A 的服務。
  </p>
  <p><strong>防禦設計：</strong>API 版本管理（確保向後相容）、Consumer-Driven Contract Testing（Pact）、
  API 變更的溝通機制（破壞性變更需提前通知）</p>

  <h3>謬論 7：傳輸成本是零（Transport cost is zero）</h3>
  <p>
    網路呼叫不是免費的：序列化/反序列化有 CPU 成本，網路傳輸有延遲和頻寬成本，
    雲端跨 AZ 流量有金錢成本。
    一個設計不當的微服務，可能在處理一個業務請求時產生幾十次內部服務呼叫，
    累積的延遲和成本遠超預期。
  </p>
  <p><strong>防禦設計：</strong>邊緣計算（將計算移近使用者）、
  CDN 減少源站請求、避免跨 AZ 頻繁呼叫（盡量讓相互依賴的服務部署在同一 AZ）</p>

  <h3>謬論 8：網路是同質的（The network is homogeneous）</h3>
  <p>
    現代系統中，不同服務可能使用不同的語言（Java、Go、Python、Node.js）、
    不同的通訊協定（REST、gRPC、AMQP）、不同的資料格式（JSON、Protobuf、Avro）。
    假設所有服務都使用同一套技術棧是不現實的。
  </p>
  <p><strong>防禦設計：</strong>定義清晰的 API 契約（OpenAPI Spec、Protobuf Schema）、
  使用 Schema Registry（Confluent Schema Registry）管理 Avro/Protobuf Schema 的演進、
  Content-Type Negotiation</p>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>謬論（錯誤假設）</th>
        <th>現實中的代價</th>
        <th>核心防禦設計</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>網路是可靠的</td>
        <td>無 Timeout 導致執行緒池耗盡，系統癱瘓</td>
        <td>Timeout + Retry + Circuit Breaker</td>
      </tr>
      <tr>
        <td>2</td>
        <td>延遲是零</td>
        <td>N+1 呼叫問題，P99 延遲爆炸</td>
        <td>並行化、批次查詢、快取</td>
      </tr>
      <tr>
        <td>3</td>
        <td>頻寬是無限的</td>
        <td>雲端流量成本意外飆高</td>
        <td>壓縮、分頁、CDN</td>
      </tr>
      <tr>
        <td>4</td>
        <td>網路是安全的</td>
        <td>內網被攻擊者橫向移動</td>
        <td>mTLS、Zero Trust</td>
      </tr>
      <tr>
        <td>5</td>
        <td>網路拓撲不變</td>
        <td>IP 變更導致服務找不到對方</td>
        <td>Service Discovery、DNS</td>
      </tr>
      <tr>
        <td>6</td>
        <td>只有一個管理員</td>
        <td>團隊間 API 變更相互打破</td>
        <td>API 版本管理、Contract Testing</td>
      </tr>
      <tr>
        <td>7</td>
        <td>傳輸成本是零</td>
        <td>大量微服務呼叫累積高延遲與費用</td>
        <td>邊緣計算、避免跨 AZ 頻繁呼叫</td>
      </tr>
      <tr>
        <td>8</td>
        <td>網路是同質的</td>
        <td>不同語言/協定無法互操作</td>
        <td>OpenAPI、Protobuf、Schema Registry</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="danger" title="最危險的謬論：網路可靠性（謬論 1）">
    許多生產事故源於「假設下游服務必然回應」。
    當下游服務回應緩慢時，上游的 Thread Pool 被佔滿等待，導致整個系統癱瘓——
    這稱為「連鎖故障（Cascading Failure）」。
    <br/><br/>
    典型事故場景：支付服務因資料庫壓力開始回應緩慢（5 秒），
    訂單服務的所有執行緒都在等待支付服務回應，
    訂單服務開始無法回應購物車服務，
    購物車服務執行緒池耗盡，
    最終整個系統因一個服務的緩慢而全面癱瘓。
    <br/><br/>
    <strong>防禦的第一步：每個外部呼叫都必須設定 Timeout（超時時間）。
    這是防止 Cascading Failure 的最基本、最廉價、最重要的保護措施。</strong>
  </callout-box>
</section>
`,
} satisfies ChapterContent;
