# 系統設計實戰手冊

此 README 依照目前專案內容整理所有 Part、Chapter 與 Section，並附上每個 Section 的簡介。Section 標題與簡介以實際內文為準。

## 內容總覽

### Part 1：基礎建設篇

#### 什麼是系統設計？

- **系統設計 vs 物件導向設計**
  當面試官說「請設計一個 Instagram」或「請設計一個分散式快取系統」，他問的不是你會不會寫程式， 而是你能否在模糊的需求下，做出合理的架構決策。這就是系統設計（Syste…
- **Functional vs Non-Functional 需求**
  每一道系統設計題的第一步，應該是釐清需求。需求分為兩大類： 功能性需求（Functional Requirements）描述系統「做什麼」； 非功能性需求（Non-Functi…
- **CAP Theorem 深度解析**
  CAP 定理由電腦科學家 Eric Brewer 在 2000 年提出，是理解分散式系統本質的核心概念。 它指出，一個分散式系統不可能同時完全滿足以下三個特性：
- **SLA / SLO / SLI 的差異與實務應用**
  這三個縮寫在工程師的日常對話中頻繁出現，卻常被混用。理解它們的層次關係， 是設計高可用系統、建立健康工程文化的基礎：

#### 容量估算與規模思考

- **估算的基本思維**
  容量估算（Capacity Estimation）是系統設計面試中的必考環節，也是工程師日常工作的核心能力。 估算不是要你算出精確答案——它的目的是讓你的設計決策有數字依據，並…
- **QPS、儲存與頻寬估算**
  三個最常見的估算維度是：每秒查詢數（QPS）、儲存量（Storage）、和頻寬（Bandwidth）。 它們各自影響不同的系統設計決策：QPS 決定伺服器與快取規模，儲存量決定…
- **每位工程師都應該知道的延遲數字**
  Jeff Dean（Google 傑出工程師）整理的「每個工程師都應該記住的延遲數字」， 是系統設計思考的基石。這些數字告訴你：在整條請求鏈路上，哪一段是瓶頸， 以及為什麼特定…
- **Traffic Pattern 分析**
  不同的流量模式需要不同的系統設計應對策略。理解你的流量形狀， 是選擇正確架構的前提。同一個系統在不同時間、不同事件觸發下，可能展現截然不同的流量模式。

#### 網路基礎與通訊協定

- **HTTP/1.1 → HTTP/2 → HTTP/3 演進**
  HTTP（HyperText Transfer Protocol）自 1991 年問世以來，歷經三次重大版本演進。 每一次演進都是為了解決前一版本的效能瓶頸，理解這個脈絡， 能…
- **TCP vs UDP 的選擇邏輯**
  TCP 和 UDP 是傳輸層的兩大主角。選擇哪一個，取決於你的應用更在乎可靠性還是低延遲。 理解兩者的差異，是設計即時系統、遊戲、串流服務的基礎。
- **REST vs GraphQL vs gRPC**
  現代系統中最常見的三種 API 範式，各有其設計哲學和適用場景。 面試中，面試官可能問你：「為什麼選擇 REST 而不是 gRPC？」 你需要能清楚說明取捨。
- **即時通訊協定：WebSocket / SSE / Long Polling**
  傳統 HTTP 是「請求-回應」模式：客戶端發問、伺服器回答，然後連線關閉。 但許多現代應用需要伺服器主動推送資料（即時通知、聊天室、股票報價、AI 串流輸出）。 這催生了三種…

### Part 2：核心元件篇

#### 負載平衡器（Load Balancer）

- **為什麼需要負載平衡？**
  想像你的服務一開始只有一台伺服器，每秒可以處理 1,000 個請求。隨著用戶增長， 請求量到了 3,000 QPS——單台伺服器無法負荷，怎麼辦？
- **L4 vs L7 Load Balancer**
  負載平衡器依據它「看得到」哪一層的資訊來決定路由，分為 L4（傳輸層）和 L7（應用層）兩種。 這個差別決定了 LB 的智慧程度和效能開銷。
- **常見演算法**
  Load Balancer 如何決定將請求送到哪一台伺服器？不同的演算法有不同的行為， 選錯演算法可能導致部分伺服器過載、用戶會話中斷等問題。
- **Active-Active vs Active-Passive**
  生產環境中，Load Balancer 本身不能是單點故障。業界有兩種主流的高可用模式， 以及全球層面的流量管理方案。

#### 快取系統（Caching）

- **快取的本質與層次**
  快取的本質是一個簡單的交換：用空間換時間。 把計算代價高昂、或位置遙遠的資料，複製一份到更快更近的地方。 快取是現代系統效能優化中最有效的手段之一—— 一個設計良好的快取層，可…
- **Cache-aside / Read-through / Write-through / Write-behind**
  快取與資料庫之間的資料同步策略，決定了一致性、延遲和複雜度的取捨。 四種主流策略各有適用場景，理解它們的差異是系統設計面試的核心考點。
- **Cache Invalidation 三大策略**
  電腦科學中有一句名言：「計算機科學中只有兩件難事：快取失效（Cache Invalidation）和命名。」 快取失效是難以完美解決的問題，但理解三種主要的失效策略，能讓你做出…
- **LRU / LFU / TTL 淘汰策略**
  當快取容量已滿，需要決定淘汰哪個 Key 來給新資料騰出空間。 不同的淘汰策略對命中率有顯著影響，選錯策略可能導致熱點資料不斷被驅逐。
- **Cache Stampede 與 Cache Penetration 防禦**
  快取系統在高流量場景中有三個著名的陷阱，不了解這些問題可能導致快取系統反而拖垮整個服務。 每個陷阱的成因和解法都不同，需要分別理解。

#### 資料庫設計與選型

- **關聯式 vs 非關聯式資料庫**
  在系統設計面試中，「你會選擇 SQL 還是 NoSQL？」是高頻問題。 正確答案從來不是「SQL 比 NoSQL 好」或相反——而是根據你的資料模型、存取模式、一致性需求，選擇…
- **各類型資料庫適用場景**
  深入了解每種資料庫類型的設計哲學和代表產品的差異， 能讓你在面試中自信地說出「我選擇 X 而不是 Y 是因為...」。
- **ACID vs BASE**
  ACID 和 BASE 是兩種截然不同的資料庫一致性保證哲學，分別代表了關聯式資料庫和 NoSQL 資料庫的核心設計取捨。 理解它們需要具體的例子，而不只是背縮寫。
- **Sharding 與 Read Replica**
  單台資料庫伺服器的容量和效能終究有限。突破單機限制有兩個主要手段： Replication（複製）解決讀取瓶頸和高可用問題， Sharding（分片）解決寫入和儲存瓶頸。
- **Database Index 設計原則**
  索引是資料庫效能優化中最重要也最常被濫用的工具。 一個缺失的索引能讓查詢從 1ms 變成 10 秒； 過多的索引能讓寫入效能下降 50% 並佔用大量磁碟空間。 理解索引的底層機…

#### 訊息佇列與事件驅動架構

- **同步 vs 非同步通訊的取捨**
  當服務 A 需要觸發服務 B 的操作，有兩種根本不同的通訊模式： 同步（Synchronous）和非同步（Asynchronous）。 選擇錯誤的模式，可能讓一個服務的故障蔓延…
- **Message Queue vs Event Streaming**
  「訊息佇列」這個詞在業界常被混用，但嚴格來說，訊息佇列（Message Queue） 和事件串流（Event Streaming）是兩種不同的模式，有根本性的設計差異。
- **Kafka vs RabbitMQ vs SQS**
  Kafka 由 LinkedIn 開發，是現代資料架構的骨幹。核心概念：
- **At-least-once / Exactly-once Delivery**
  訊息交付語義（Delivery Semantics）是訊息系統設計中最微妙的部分。 理解三種語義的區別，能讓你選擇正確的方案。
- **Dead Letter Queue 與 Backpressure**
  訊息系統投入生產後，兩個必須提前設計的機制是： 處理消費失敗的 DLQ，以及防止消費者過載的 Backpressure。

#### 物件儲存與 CDN

- **Block / File / Object Storage 差異**
  雲端儲存有三種根本不同的抽象層次，分別對應不同的應用場景。 在系統設計中選錯儲存類型，可能導致高昂的成本、效能瓶頸或維運困難。
- **S3/Blob Storage 設計哲學**
  AWS S3 是物件儲存的事實標準，其背後的設計哲學深刻影響了無數系統。 理解 S3 的設計原則，能幫助你避免誤用並充分利用其特性。
- **CDN Push vs Pull 模式**
  CDN（Content Delivery Network）是分布在全球各地的快取伺服器網絡（稱為 Edge Node 或 PoP，Point of Presence）。 用戶請…
- **Pre-signed URL 安全設計**
  在設計檔案上傳/下載功能時，有一個常見的錯誤方案：讓用戶的上傳請求先打到後端伺服器， 再由後端轉存到 S3。這樣做會：

#### 搜尋系統設計

- **倒排索引原理**
  搜尋系統的核心資料結構是倒排索引（Inverted Index）。 理解它的工作原理，是設計任何搜索功能的基礎。 「倒排」的意思是：傳統資料庫是從文件→詞彙，而倒排索引是從詞彙…
- **Tokenization / Stemming / Stop Words**
  原始文字在建立倒排索引前，需要經過一系列的文字處理（Text Processing）步驟， 讓不同形式的相關詞彙都能被搜索到。
- **TF-IDF vs BM25 評分機制**
  找到包含關鍵字的文件只是搜索的第一步。接下來要解決的是： 如何排名（Ranking）——哪些文件最相關？ TF-IDF 和 BM25 是兩種主流的相關性評分演算法。
- **Elasticsearch 架構**
  Elasticsearch 是目前最流行的分散式搜尋引擎，廣泛用於電商搜索、日誌分析（ELK Stack）、 和全站搜尋功能。理解其架構，能幫助你在系統設計中正確評估 ES 的…
- **Typeahead / Autocomplete 思路**
  搜索框的自動補全（Autocomplete / Typeahead）是現代搜索體驗的標配功能。 用戶輸入「sys」時，自動建議「system design」、「syscall」…

### Part 3：架構設計篇

#### 單體 vs 微服務架構

- **Monolith 不是壞事**
  近十年來，微服務（Microservices）幾乎成了「現代架構」的代名詞。 許多工程師默認微服務是更好的選擇，單體（Monolith）是需要被「重構掉」的遺留系統。 這是一個…
- **何時拆分服務？**
  Martin Fowler 說過一句名言：「不要以微服務作為新項目的起點。 從單體開始，等你理解了系統的邊界，再拆分。」 那麼，何時是拆分的正確時機？
- **Strangler Fig Pattern**
  如何將現有的單體系統遷移到微服務，而不做「一次性大重構」（Big Bang Migration， 幾乎都以失敗告終）？答案是 Strangler Fig Pattern（絞殺榕…
- **Service Mesh 與 API Gateway**
  微服務架構中，有兩個常被混淆但角色截然不同的基礎設施元件： API Gateway（面向外部流量）和 Service Mesh（面向內部服務間通訊）。 理解兩者的定位差異，是設…
- **分散式系統的 Fallacies**
  1994 年，Sun Microsystems 的工程師 Peter Deutsch（後來 L Peter Deutsch 整理完整版， James Gosling 等人也有貢…

#### 高可用性設計（High Availability）

- **99.9% vs 99.99% 的現實意義**
  「五個 9 的可用性」聽起來令人印象深刻，但它在現實中意味著什麼？ 理解 SLA 背後的數學，才能做出務實的高可用設計決策。 更重要的是，理解「為什麼每多一個 9 都需要數倍的…
- **冗餘（Redundancy）設計**
  冗餘是高可用的核心手段：消除系統中的所有「單點故障（Single Point of Failure, SPOF）」。 每一個 SPOF 都是系統可用性的天花板——無論其他部分設…
- **Circuit Breaker Pattern**
  Circuit Breaker（熔斷器）Pattern 源自電路的保險絲設計哲學： 當電路過載時，保險絲熔斷，保護整個電路系統不受損壞。 在軟體中，熔斷器保護服務不因下游故障而…
- **Bulkhead Pattern**
  Bulkhead（防水艙壁）Pattern 的名字來自船舶設計： 現代船隻被分隔成多個密閉艙室，即使一個艙室進水，其他艙室仍然完好， 船隻不會沉沒。鐵達尼號沉沒的一個原因就是防…
- **Graceful Degradation 與流量整形**
  高可用設計中，面對故障有兩種截然不同的哲學： 優雅降級（Graceful Degradation）和快速失敗（Fail Fast）。 兩者都是正確的，適用於不同的場景。 理解何…

#### 一致性與分散式事務

- **CAP Theorem 深度解析**
  CAP 定理由 Eric Brewer 於 2000 年在 PODC 會議的 Keynote 中提出， 隨後由 Gilbert 和 Lynch 在 2002 年正式證明。 它描…
- **一致性模型全譜系**
  一致性並非非黑即白，而是一個從強到弱的連續光譜。 理解各種一致性模型，有助於在設計時選擇「恰好夠用」的一致性保證—— 過強的一致性帶來不必要的延遲，過弱的一致性可能導致業務邏輯…
- **Saga Pattern：分散式事務的實用解法**
  在微服務架構中，一個業務事務往往跨越多個服務，每個服務有自己的資料庫。 傳統的兩階段提交（2PC）雖然能保證強一致性， 但鎖定時間長（所有參與者持鎖等待協調者指令）、吞吐量低、…
- **Distributed Lock：Redis Redlock 演算法**
  分散式鎖用於確保同一時間只有一個節點可以執行某個操作： 防止重複扣款、保護庫存的讀-改-寫操作、確保排程任務只執行一次、 維護分散式系統中的臨界區（Critical Secti…
- **Idempotency Key 設計模式**
  冪等性（Idempotency）是指同一操作執行一次或多次的效果完全相同。 在分散式系統中，網路重試是常見且必要的（見第 10 章分散式謬論）， 因此每個寫入操作都應設計為冪等…

#### API 設計最佳實踐

- **RESTful 設計原則**
  REST（Representational State Transfer）是 Roy Fielding 在 2000 年博士論文中提出的架構風格。 REST 不是規格（Spec…
- **Pagination：Offset vs Cursor-based**
  分頁是 API 設計中最常見也最容易出錯的功能。 選擇合適的分頁策略對效能和資料一致性有重大影響， 不同的使用場景需要不同的分頁策略。
- **Rate Limiting：演算法與分散式實現**
  Rate Limiting（速率限制）保護系統免於過載， 也是 API 商業化的基礎（不同定價計劃有不同的 API 配額）。 選擇正確的限流演算法取決於你對「突發流量（Burs…
- **API 版本管理策略**
  當 API 需要做破壞性變更時（Breaking Change），版本管理策略決定了如何在不影響現有客戶端的情況下演進 API。 不良的版本管理會導致客戶端崩潰，良好的版本管理…
- **Webhook 設計：安全、可靠、可維運**
  Webhook 是「反向 API」——當事件發生時，伺服器主動推送 HTTP POST 通知給客戶端， 而非客戶端輪詢（Polling）。 廣泛用於支付通知（Stripe、Pa…

#### 安全性設計

- **Authentication vs Authorization**
  Authentication（認證）和 Authorization（授權）是安全系統的兩個基礎概念，常被混淆，但代表截然不同的問題。認證解答「你是誰？」，授權解答「你能做什麼？…
- **JWT vs Session Token 的取捨**
  這是現代 Web 應用最常見的安全架構決策之一，兩種方案各有適用場景。理解底層機制比背誦優缺點更重要。
- **OAuth 2.0 / OIDC 流程設計**
  OAuth 2.0 是「授權委託」協定——允許第三方應用在有限範圍內存取用戶資源，而無需分享密碼。OIDC（OpenID Connect）在 OAuth 2.0 之上增加了身份…
- **SQL Injection / XSS / CSRF 防禦**
  OWASP Top 10 中長期存在的三種攻擊，每個工程師都必須徹底理解防禦機制。這裡不只介紹攻擊原理，更重視可實際部署的防禦代碼。
- **Zero Trust Architecture**
  傳統安全模型基於「城堡護城河」思維：假設內網是安全的，外部是危險的。Zero Trust 徹底推翻此假設：「永不信任，始終驗證（Never Trust, Always Veri…

### Part 4：實戰場景篇

#### 設計短網址服務（URL Shortener）

- **需求分析與容量估算**
  短網址服務（如 bit.ly、TinyURL）看似簡單，卻涵蓋了高讀寫比、快取設計、資料一致性等系統設計核心概念。在面試中，從需求分析到容量估算的完整框架，往往比架構本身更能展…
- **Base62 編碼與短碼生成策略**
  生成短碼是短網址服務的核心挑戰。短碼需要足夠短、全球唯一、高效生成、且不可預測（可選）。有多種方案，每種都有不同的取捨。
- **301 vs 302 Redirect 與 URL 管理**
  HTTP 狀態碼的選擇看似微小，卻對系統行為、分析準確性、SEO 和業務靈活性有重大影響。這是面試中常考的細節。
- **Analytics 資料收集架構**
  分析功能需要在不影響重定向延遲的前提下，收集每次點擊的詳細資訊。這是一個典型的「寫入路徑解耦（Write Path Decoupling）」設計，也是 Lambda / Kap…

#### 設計通知系統（Notification System）

- **Push / Email / SMS 多渠道抽象**
  現代通知系統需要支援多種渠道（Push Notification、Email、SMS、In-App），每個渠道有不同的延遲特性、費用和可靠性。好的設計應該讓業務邏輯與傳送細節完…
- **優先級佇列設計**
  不同類型的通知有截然不同的時效性要求：安全警告（帳號異常登入）必須秒級送達，而行銷推播可以延遲幾分鐘甚至幾小時。使用優先級佇列確保緊急通知不被普通通知阻塞。
- **防止重複通知（Deduplication）**
  在分散式系統中，由於重試機制和 At-least-once 投遞保證，同一個通知可能被多次投遞。沒有去重機制的通知系統，用戶可能收到重複的推播，嚴重損害用戶體驗。
- **DLQ 重試機制與可靠性設計**
  通知系統的可靠性要求：即使下游服務（FCM、SendGrid、SMS 供應商）暫時不可用，通知也不應該丟失。可靠性不只是技術問題，還包括監控、告警和運維流程。

#### 設計社群媒體動態牆（News Feed）

- **Fan-out on Write vs Fan-out on Read**
  動態牆（News Feed）系統的核心問題是：當用戶 A 發布一篇貼文，如何讓 A 的所有追蹤者（followers）在自己的動態牆上看到這篇貼文？這個「擴散」過程稱為 Fan…
- **Celebrity 問題（Hotspot User）處理**
  擁有數百萬追蹤者的名人帳號（如 Elon Musk 有 1.7 億 Twitter 追蹤者）在 Fan-out on Write 模式下會造成嚴重的「寫入風暴」。這不是邊緣案例…
- **Timeline 混合策略完整設計**
  即使不考慮名人問題，生產環境中的 Feed 系統需要同時考慮多個維度的優化：非活躍用戶的資源節省、Feed 的排序算法、Cursor-based 分頁等。混合策略的完整設計遠比…
- **計數器服務（Counter Service）**
  社群媒體中的計數器（按讚數、評論數、分享數、觀看數）面臨極高的讀寫壓力。計數器設計的核心取捨是：精確性 vs 速度——完全精確的計數需要強一致性，代價是高延遲；近似計數可以極高…

#### 設計即時聊天系統（Chat System）

- **WebSocket 連線管理**
  即時聊天系統的核心挑戰是雙向通訊。HTTP 是請求-回應模型，客戶端必須主動發起請求才能收到資料。WebSocket 建立了持久的雙向連線，讓伺服器可以主動推送訊息給客戶端。
- **訊息儲存：HBase vs Cassandra**
  聊天訊息是典型的時序資料（Time-Series Data）：大量小型寫入、按時間範圍查詢、舊資料很少更新。選擇合適的儲存引擎對效能至關重要。
- **已讀回執（Read Receipt）設計**
  已讀回執讓發送者知道接收者是否看到了訊息（WhatsApp 的雙打勾、藍色打勾）。這個功能看似簡單，但在規模化後設計挑戰很大。
- **線上狀態（Presence）服務**
  線上狀態顯示（「小明正在輸入中...」、「最後上線：3 分鐘前」）需要以低延遲處理大量的心跳訊號。Presence 服務本質上是一個高吞吐量的分散式狀態機。
- **群組聊天 Fan-out 策略**
  群組聊天的訊息需要送達所有成員，當群組規模增大時，Fan-out 策略需要相應調整。Fan-out 本質上是「一寫多讀」問題的取捨：在寫入時就推送給所有人（Fan-out on…

#### 設計影片串流系統（Video Streaming）

- **影片上傳與轉碼 Pipeline**
  影片串流系統（如 YouTube、Netflix）的後端複雜度遠超一般 API。一段 4K 影片可能達到 50GB，需要轉碼成多種解析度和格式，再分散到全球 CDN。讓我們從上…
- **Adaptive Bitrate Streaming（HLS/DASH）**
  自適應碼率串流（ABR）根據用戶的網路狀況，動態調整影片品質。網路好時播 1080p，網路差時自動降到 360p，確保流暢播放不卡頓。
- **影片儲存分層策略（Hot/Warm/Cold）**
  YouTube 有超過 800 萬小時的影片，但 80% 的觀看集中在最近上傳的 20% 影片（Power Law 分佈）。儲存分層策略根據存取頻率，將影片放置在不同成本的儲存…
- **播放進度同步設計**
  「上次看到第 35 分 42 秒，下次繼續」是影片平台的基本功能，但在多設備、高頻更新場景下需要謹慎設計。

#### 設計分散式任務排程系統（Job Scheduler）

- **Cron-like 排程設計**
  任務排程系統（Job Scheduler）是現代分散式系統的基礎設施，用於執行定時任務（如每日報表、資料備份、Email 行銷活動）和延遲任務（如訂單超時取消、通知延遲發送）。
- **分散式 Leader Election**
  任務排程系統最大的挑戰之一是：如何確保在有多個排程節點的情況下，每個任務只被執行一次？這需要 Leader Election（領導者選舉）機制。
- **任務狀態機設計**
  每個任務從建立到完成都會經歷一系列狀態轉換。清晰的狀態機設計確保系統能夠正確處理失敗、重試和超時情況。
- **任務依賴圖（DAG）設計**
  複雜的工作流通常包含多個有依賴關係的任務。例如「每日資料 ETL 流程」需要先完成資料提取，再進行轉換，最後才能載入。這種依賴關係用有向無環圖（DAG, Directed Ac…

#### 設計搜尋自動補全（Typeahead Search）

- **Trie 資料結構與分散式實作**
  Typeahead Search（自動補全）是搜尋引擎的基礎功能：用戶輸入「sys」時，立即顯示「system design」、「syscall」、「syslog」等建議。這個…
- **搜尋詞頻統計 Pipeline**
  Trie 中儲存的詞頻需要定期從真實的搜尋日誌中更新。這是一個典型的大資料批次處理（Batch Processing）或串流處理（Stream Processing）問題。
- **個人化補全 vs 全局補全**
  全局補全返回對所有用戶最受歡迎的建議，個人化補全則結合用戶的歷史搜尋記錄，返回對這個用戶最相關的建議。
- **熱門詞彙快取策略**
  自動補全系統對延遲要求極高——用戶每輸入一個字符，系統就需要在 100ms 以內返回建議（否則用戶已經繼續輸入了）。多層快取是達到這個目標的關鍵。

#### 設計分散式鍵值儲存（Key-Value Store）

- **Consistent Hashing 實作**
  分散式 Key-Value Store（如 Dynamo、Cassandra、Redis Cluster）的核心問題是：如何將資料分配到多個節點，同時在節點增減時盡量減少資料遷…
- **資料複製策略（Quorum）**
  為了保證高可用性和容錯性，資料需要複製到多個節點。Quorum（法定人數）機制在一致性和可用性之間提供了靈活的取捨。
- **Gossip Protocol**
  在去中心化的分散式系統（如 Cassandra、DynamoDB、Riak）中，節點如何知道其他節點的狀態？Gossip Protocol 模仿謠言傳播的方式，以指數級速度將資…
- **Vector Clock 衝突解決**
  在 AP 系統中（如 DynamoDB、Riak），同一個 key 可能在不同節點被同時更新，產生衝突（Conflict）。如何偵測衝突並正確解決，是分散式系統中最困難的問題之…

### Part 5：Multi-Agentic 篇

#### AI Agent 系統設計基礎

- **什麼是 AI Agent？**
  AI Agent 是一種能夠自主感知環境、做出推理決策、並執行行動以達成目標的系統。與傳統的確定性服務（Deterministic Service）不同，AI Agent 的行…
- **ReAct 框架思想**
  ReAct（Reason + Act）是目前最廣泛使用的 Agent 推理框架，由 Yao et al. (2022) 提出。它交錯進行「推理軌跡（Reasoning Trac…
- **Agent Memory 四種類型**
  一個設計完善的 Agent 系統需要管理四種不同性質的記憶，每種記憶有不同的儲存機制、存取速度和生命週期。這個分類借鑒了認知科學對人類記憶系統的研究。
- **Tool Use / Function Calling 設計模式**
  Tool Use（或稱 Function Calling）是讓 LLM 能夠呼叫外部功能的機制。LLM 本身無法執行程式碼或存取網路，但透過 Function Calling，…

#### Multi-Agent 協作架構模式

- **為什麼需要 Multi-Agent？**
  單一 Agent 在面對複雜、長鏈任務時會遭遇根本性的瓶頸。理解這些瓶頸，是設計 Multi-Agent 系統的起點。
- **Orchestrator-Worker Pattern**
  Orchestrator-Worker（指揮者-工作者）是最常見的 Multi-Agent 架構模式，類似軟體工程中的 Master-Worker 或 Fan-out 模式。O…
- **Pipeline Pattern（管道模式）**
  Pipeline Pattern 是最適合「輸出即輸入」場景的 Multi-Agent 架構：Agent A 的輸出直接成為 Agent B 的輸入，形成線性或分支的處理流程。…
- **Agent 間通訊協定設計**
  Agent 間的通訊設計直接影響系統的可維護性和擴展性。良好的通訊協定應該能夠支援同步呼叫（Orchestrator 等待 Worker 結果）和非同步事件（Agent 完成任…

#### Agent 記憶與知識系統設計

- **RAG（Retrieval-Augmented Generation）架構**
  RAG 是解決 LLM 知識時效性問題的核心技術。LLM 的訓練資料有截止日期，且無法包含企業的私有知識。RAG 透過在生成回應前先檢索相關文件，讓 LLM 能夠利用最新的、特…
- **向量資料庫選型與設計**
  向量資料庫是 RAG 系統的核心儲存元件，負責存放文件的 embedding 向量並支援高效的近似最近鄰搜尋（ANN, Approximate Nearest Neighbor…
- **Chunking 策略**
  Chunking（文件分塊）是 RAG 系統性能的關鍵因素，直接影響召回率和精確率。一個反直覺的發現是：更小的 chunk 通常有更高的搜尋精確率（因為語意更集中），但需要搭配…
- **Hybrid Search：向量 + 關鍵字**
  純向量搜尋（Dense Retrieval）在語意理解上表現優異，但對精確關鍵字匹配（如產品型號 "iPhone 15 Pro Max"、API 函式名稱、特定日期）效果較差。…

#### Agent 工具系統（Tool Ecosystem）設計

- **Tool Registry 設計**
  Tool Registry（工具登錄表）是 Agent 工具生態系統的核心元件，負責管理所有可用工具的元數據、版本、存取控制和動態發現。沒有 Registry，隨著工具數量增長…
- **Tool Schema 標準化（OpenAPI）**
  工具 Schema 定義了 LLM 如何理解和呼叫工具。良好的 Schema 設計能顯著提升 LLM 選擇正確工具的準確率，差的 Schema 設計是 Agent 出錯的常見原…
- **Human-in-the-loop 設計**
  Human-in-the-loop（HITL）是指在 Agent 執行流程中，將特定決策點暫停，等待人類確認後再繼續。這對於高風險、不可逆的操作至關重要。設計良好的 HITL…
- **MCP（Model Context Protocol）規範**
  MCP（Model Context Protocol）是 Anthropic 在 2024 年提出的開放標準，旨在建立 AI 模型與外部資料源、工具之間的通用介面。MCP 的目…

#### Multi-Agent 任務規劃與執行引擎

- **Task Decomposition 策略**
  任務分解（Task Decomposition）是 Multi-Agent 系統的起點。當一個高層任務（如「分析競爭對手並產出市場報告」）被提交給系統時，需要先將其分解為具體、…
- **DAG 任務編排引擎**
  DAG（Directed Acyclic Graph，有向無環圖）任務編排引擎負責管理任務的執行順序和並行化。它是 Multi-Agent 系統的「作業系統調度器」，需要在最大…
- **Dynamic vs Static Planning**
  在設計 Multi-Agent 任務規劃系統時，一個關鍵決策是：應該「先規劃好整個計畫再執行（Plan-then-Execute）」，還是「邊執行邊調整計畫（ReAct / D…
- **人工介入點（Checkpoint）設計**
  Checkpoint 是在 Agent 執行流程中預設的「暫停點」，讓人類在關鍵決策點審查並確認是否繼續。良好的 Checkpoint 設計是 Agent 系統可信度的核心：它…

#### Multi-Agent 系統的可靠性設計

- **Agent 輸出驗證（Guardrails）**
  Guardrails（護欄）是 Multi-Agent 系統可靠性的第一道防線。由於 LLM 輸出本質上是不確定的，任何關鍵操作前都需要對 Agent 的輸出進行嚴格驗證，確保…
- **Hallucination 偵測策略**
  Hallucination（幻覺）是指 LLM 生成了看起來合理但實際上不正確的資訊。在 Agent 系統中，幻覺的危害尤其嚴重：Agent 可能基於錯誤的「事實」執行後續的不…
- **Token Budget 管理與成本控制**
  在 Multi-Agent 系統中，多個 Agent 並行執行 LLM 呼叫，成本可能急速增長。一個沒有成本控制機制的系統，可能因為 Agent 進入無限循環、Context…
- **Agent 行為稽核日誌**
  稽核日誌（Audit Trail）是 Multi-Agent 系統的「黑盒子」，記錄 Agent 的每一個動作和決策。在生產環境中，稽核日誌不只是除錯工具，更是合規要求、安全分…

#### 實戰：設計 AI 驅動的客服系統

- **整體架構設計**
  AI 驅動的客服系統是目前最廣泛落地的 Multi-Agent 應用場景之一。本章以「設計一個能處理 10,000 QPS、支援多語言、具備自動升級人工機制的 AI 客服系統」…
- **Intent Routing 設計**
  Intent Routing 是 AI 客服系統的核心功能。準確的意圖識別是後續一切的基礎——錯誤的路由意味著使用者被送到了錯誤的 Agent，浪費時間且使用者體驗差。
- **對話狀態管理**
  在 AI 客服系統中，使用者可能與多個不同的 Agent 交互，Agent 之間需要共享完整的對話上下文，確保不讓使用者重複說明問題。
- **升級人工客服的觸發條件**
  決定「何時升級到人工客服」是 AI 客服系統中最微妙的設計決策。升級太多浪費人工資源，升級太少會讓使用者在應該得到幫助時陷入困境。

#### 實戰：設計 AI 程式碼審查系統

- **整體架構設計**
  AI 程式碼審查系統是 Multi-Agent 技術在工程效率工具中的代表性應用。本章設計目標：「建立一個能夠在開發者提交 PR 時自動觸發，在 3 分鐘內完成多維度代碼審查，…
- **並行審查 Agent 設計**
  每個審查 Agent 專注於一個特定的審查維度，使用針對性調教的 System Prompt 和工具集，避免通用 Agent 在每個維度都「半桶水」的問題。
- **Synthesis Agent 合併意見**
  Synthesis Agent 的任務是將多個審查 Agent 的輸出整合為一個連貫、無重複、優先排序的最終審查報告。這是整個系統中最需要 LLM 能力的步驟。
- **GitHub PR 整合設計**
  與 GitHub 的整合涉及 Webhook 接收、多個 API 的協同使用、速率限制管理、以及避免 Spam Comments 等工程細節。

### Part 6：工程卓越篇

#### 可觀測性設計（Observability）

- **Logging / Metrics / Tracing 三位一體**
  可觀測性（Observability）是指系統能夠從外部輸出（日誌、指標、追蹤）推斷其內部狀態的能力。一個具備高度可觀測性的系統，工程師可以在不修改程式碼的情況下，快速診斷生產…
- **Structured Logging 設計原則**
  結構化日誌（Structured Logging）使用固定的 JSON 格式記錄日誌，而非自由格式的字串。這讓日誌可以被機器高效解析、查詢和分析，是現代分散式系統的必備實踐。
- **Distributed Tracing（OpenTelemetry）**
  分散式追蹤讓你能夠追蹤一個請求在多個微服務之間的完整旅程。OpenTelemetry（OTel）是目前業界最廣泛採用的可觀測性標準，它提供了統一的 SDK 和語意約定，讓你的追…
- **SLO / Error Budget 監控**
  SLO（Service Level Objective）是團隊對服務可靠性的內部目標，是 SLA（Service Level Agreement）的基礎。Error Budge…
- **AI Agent 的可觀測性挑戰**
  傳統的可觀測性工具設計用於確定性系統，而 AI Agent 引入了新的可觀測性挑戰：LLM 呼叫的非確定性、長鏈推理的中間狀態、Token 使用成本追蹤，以及幻覺率的量化等。

#### 部署策略與 CI/CD

- **Blue-Green Deployment**
  Blue-Green Deployment（藍綠部署）透過同時維護兩個完全相同的生產環境，實現零停機部署和快速回滾。任何時候，只有一個環境在對外提供服務（稱為「active」）…
- **Canary Release（金絲雀發布）**
  Canary Release 透過逐步增加新版本的流量比例，在真實生產流量中驗證新版本的健康狀況，而不是像 Blue-Green 那樣一次性切換全部流量。名稱來自礦工帶金絲雀進…
- **Feature Flags 設計**
  Feature Flags（功能開關）讓你能夠在不重新部署的情況下控制功能的開啟/關閉，是現代 CI/CD 的核心能力之一。Feature Flags 解耦了「程式碼部署」和「…
- **Database Migration 安全策略**
  資料庫遷移是 CI/CD 中最危險的操作之一。一次錯誤的 Schema 變更可能導致長時間的服務中斷，甚至資料損失。安全的資料庫遷移需要遵循「向後相容優先」的原則。
- **Rollback 機制設計**
  Rollback（回滾）是部署出錯時的「緊急逃生門」。好的 Rollback 設計應該讓工程師能夠在 5 分鐘內恢復服務到上一個已知良好狀態。

#### 成本最佳化設計

- **計算、儲存、網路的成本模型**
  雲端成本的失控是許多成長期公司面臨的共同問題。當系統從 MVP 成長到百萬用戶規模，工程師往往驚訝地發現雲端帳單已經超過了整個工程團隊的薪資。在架構設計階段就考慮成本模型，比事…
- **冷熱資料分層儲存策略**
  資料隨著時間老化，存取頻率通常呈現冪律分布——最近的 5% 的資料佔了 90% 的存取量。冷熱分層儲存就是利用這個特性，將資料自動遷移到成本更低的儲存層級。在 S3 的各個儲存…
- **LLM 成本控制策略**
  LLM API 費用往往是 AI 系統中增長最快的成本項目。隨著業務規模擴大，如果不加以控制，LLM 費用可能很快超過基礎設施的總費用。一個月活 100 萬用戶的 AI 應用，…
- **Spot vs Reserved Instance 選擇**
  AWS EC2 提供三種計費模式：On-demand（隨需）、Reserved（預留）、Spot（競價）。選擇正確的計費模式，可以在相同工作負載下節省 60–90% 的計算成本…

### 附錄

#### 附錄 A：系統設計面試攻略

- **面試框架與時間分配**
  系統設計面試不是考你背答案，而是評估你解決模糊問題的思考過程。面試官更在乎你「如何思考」，而非你能不能說出某個特定的技術名詞。一個常見的失敗模式是：候選人跳過需求釐清，直接開始…
- **常見追問與應答策略**
  面試官的追問是刻意的探索，目的是測試你思考的深度和廣度。準備好這些常見追問，能讓你不被打亂節奏。最重要的心態是：追問不是攻擊，而是邀請你展示更深的思考。
- **Entry → Senior → Staff 層級期望差異**
  不同職級的面試，考察的維度和深度有顯著差異。了解自己面試的職級期望，才能做出合適的回答。更重要的是，了解「比自己高一個層級」的期望，可以幫助你在面試中展現超出預期的思維深度。

#### 附錄 B：常用工具與技術棧速查

- **各場景推薦技術選型**
  系統設計面試中，面試官期望你能快速選出適合場景的技術工具，並給出有依據的理由。本附錄提供按使用場景分類的技術選型速查表，覆蓋 10 大類別，幫助你在面試中做出快速、有依據的技術…
- **容量估算速查卡**
  面試時快速估算是關鍵能力。以下速查卡整理了最常用的數字，建議熟記。在面試中，估算的「量級正確」比「精確」更重要——差一個數量級是問題，差 2 倍可以接受。
- **系統設計 25 個核心 Trade-off 速查表**
  每個系統設計決策都涉及 Trade-off。以下是最常被問到的 25 個 Trade-off，每個都附上決策框架：選 A 的信號（何時應該選 A）和選 B 的信號（何時應該選…
