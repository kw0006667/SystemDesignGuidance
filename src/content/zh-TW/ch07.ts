import type { ChapterContent } from '../../types.js';

export default {
  title: '訊息佇列與事件驅動架構',
  content: `
<section id="sync-vs-async">
  <h2>同步 vs 非同步通訊的取捨</h2>
  <p>
    當服務 A 需要觸發服務 B 的操作，有兩種根本不同的通訊模式：
    <strong>同步（Synchronous）</strong>和<strong>非同步（Asynchronous）</strong>。
    選擇錯誤的模式，可能讓一個服務的故障蔓延到整個系統。
  </p>
  <h3>同步通訊：直接呼叫，等待回應</h3>
  <pre data-lang="text"><code class="language-text">流程：
用戶下單 → 訂單服務 ──HTTP POST──→ 庫存服務（等待...）
                     ←── 200 OK ───
                 ──HTTP POST──→ 支付服務（等待...）
                 ←── 200 OK ───
                 ──HTTP POST──→ 通知服務（等待...）
                 ←── 200 OK ───
→ 回應用戶（總延遲 = 三個服務延遲之和）</code></pre>
  <ul>
    <li><strong>優點：</strong>簡單直觀、立即知道結果、方便除錯</li>
    <li><strong>缺點：</strong>
      <ul>
        <li>任一下游服務故障 → 上游失敗（緊密耦合）</li>
        <li>下游服務慢 → 上游也慢（延遲累積）</li>
        <li>高流量時，下游成為瓶頸</li>
      </ul>
    </li>
  </ul>
  <h3>非同步通訊：發出事件，繼續處理</h3>
  <pre data-lang="text"><code class="language-text">流程：
用戶下單 → 訂單服務 → 寫入訊息佇列（10ms）→ 立即回應用戶「訂單已受理」

後台（非同步）：
  庫存服務 ←── 消費訊息 ──
  支付服務 ←── 消費訊息 ──（並行執行）
  通知服務 ←── 消費訊息 ──</code></pre>
  <ul>
    <li><strong>優點：</strong>解耦（下游故障不影響上游）、可降低峰值壓力（佇列緩衝）、
    下游可並行處理</li>
    <li><strong>缺點：</strong>複雜度增加、難以追蹤完整請求流程、
    最終一致性（用戶下單後不是立即扣庫存）</li>
  </ul>
  <h3>選擇指南</h3>
  <table>
    <thead>
      <tr>
        <th>場景</th>
        <th>建議</th>
        <th>理由</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>用戶等待查詢結果（搜索、讀取資料）</td>
        <td>同步</td>
        <td>用戶需要立即回應</td>
      </tr>
      <tr>
        <td>下單後寄送確認信</td>
        <td>非同步</td>
        <td>Email 可以稍遲，不影響用戶體驗</td>
      </tr>
      <tr>
        <td>影片上傳後轉碼</td>
        <td>非同步</td>
        <td>轉碼費時，同步會 timeout</td>
      </tr>
      <tr>
        <td>支付確認（必須即時）</td>
        <td>同步</td>
        <td>用戶需要知道是否成功</td>
      </tr>
      <tr>
        <td>資料庫資料同步到搜索引擎</td>
        <td>非同步（CDC + MQ）</td>
        <td>允許輕微延遲，不應影響主流程</td>
      </tr>
    </tbody>
  </table>

  <h3>同步 vs 非同步的工程影響</h3>
  <p>
    選擇同步或非同步，不只是「哪個快」的問題，而是對整個系統可靠性和可觀測性的根本設計決策。
    以下從工程角度對比兩者的深層影響：
  </p>
  <table>
    <thead>
      <tr>
        <th>工程面向</th>
        <th>同步系統</th>
        <th>非同步系統</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>錯誤傳播</td>
        <td>下游錯誤直接傳回呼叫者，堆疊清晰</td>
        <td>錯誤發生在消費者，需另外設計告警和 DLQ</td>
      </tr>
      <tr>
        <td>分散式追蹤</td>
        <td>同一個 Trace ID 貫穿整個呼叫鏈（較簡單）</td>
        <td>需要在訊息 Header 中傳遞 Trace ID，工具支援要求較高</td>
      </tr>
      <tr>
        <td>資料一致性</td>
        <td>若多個操作在一個事務中，可保強一致性</td>
        <td>最終一致性；需處理訊息重試帶來的重複消費</td>
      </tr>
      <tr>
        <td>測試難度</td>
        <td>單元測試和整合測試較直觀</td>
        <td>需要 Embedded Broker 或 Test Container 模擬訊息佇列</td>
      </tr>
      <tr>
        <td>部署順序</td>
        <td>下游必須先就緒，否則上游請求失敗</td>
        <td>可以先部署上游，消費者後上線；訊息在佇列中等待</td>
      </tr>
      <tr>
        <td>系統韌性</td>
        <td>單點故障會導致連鎖失敗（Cascading Failure）</td>
        <td>下游故障不影響上游，消費者可以獨立重啟恢復</td>
      </tr>
    </tbody>
  </table>

  <h3>Circuit Breaker 在同步系統的必要性</h3>
  <p>
    同步系統中，若下游服務開始變慢（例如資料庫查詢超時從 10ms 變成 3000ms），
    呼叫它的上游服務的 Thread 會被阻塞。當流量持續時，Thread Pool 會耗盡，
    最終整個上游服務也陷入無響應——這就是<strong>連鎖失敗（Cascading Failure）</strong>。
  </p>
  <p>
    <strong>Circuit Breaker（斷路器）</strong>是解決連鎖失敗的標準模式，
    類比電路中的保險絲：當下游持續失敗時，自動「斷開電路」，不再繼續呼叫：
  </p>
  <pre data-lang="text"><code class="language-text">Circuit Breaker 三種狀態：

CLOSED（閉合，正常）──→ 錯誤率 > 閾值（如 50%）──→ OPEN（斷開）
                                                        │
                                                        ↓ 等待冷卻時間（如 30 秒）
                                                   HALF-OPEN（半開）
                                                        │
                               測試請求成功 ←──────────┤
                                    │                   │ 測試請求失敗
                                    ↓                   ↓
                                 CLOSED               OPEN

OPEN 狀態：所有請求立即失敗（Fail Fast），不等待下游超時
           → 上游立即收到錯誤，可以走降級邏輯（返回快取結果或預設值）</code></pre>
  <pre data-lang="python"><code class="language-python">import pybreaker
import requests

# 使用 pybreaker 庫實現斷路器
breaker = pybreaker.CircuitBreaker(
    fail_max=5,           # 連續 5 次失敗後開路
    reset_timeout=30,     # 30 秒後嘗試半開
)

@breaker
def call_inventory_service(order_id: str) -> dict:
    response = requests.post(
        "http://inventory-service/reserve",
        json={"order_id": order_id},
        timeout=2.0
    )
    response.raise_for_status()
    return response.json()

def process_order(order_id: str):
    try:
        result = call_inventory_service(order_id)
        return {"status": "reserved", "data": result}
    except pybreaker.CircuitBreakerError:
        # Circuit 是 OPEN 狀態，走降級邏輯
        return {"status": "pending", "message": "庫存服務暫時不可用，稍後確認"}
    except Exception as e:
        return {"status": "error", "message": str(e)}</code></pre>
  <callout-box type="warning" title="Circuit Breaker 不是銀彈">
    Circuit Breaker 只是保護上游不被拖垮，並不能讓下游自動恢復。
    Circuit Breaker 觸發時，你的系統實際上是在「假裝正常運作」——
    返回降級結果，但用戶的實際操作可能沒有完成。
    因此必須配合：1) 告警立即通知 On-call 工程師；2) 降級邏輯要經過業務確認；
    3) HALF-OPEN 狀態的測試請求邏輯要小心設計，避免過早恢復導致再次崩潰。
  </callout-box>

  <h3>非同步改造的步驟</h3>
  <p>
    將一個已有的同步系統改造為非同步，需要謹慎規劃，避免業務中斷。
    以下是一個經過驗證的遷移步驟：
  </p>
  <pre data-lang="text"><code class="language-text">改造目標：訂單服務同步呼叫通知服務 → 改為非同步

Step 1：在訂單服務中同時做兩件事（Dual Write）
  - 原本：呼叫通知服務 API
  - 改為：呼叫通知服務 API（保留）+ 同時寫入 MQ（新增）
  - 目的：確保 MQ 訊息格式正確，通知服務驗收

Step 2：通知服務開始消費 MQ（但同時保留 API 端點）
  - 通知服務接收 MQ 訊息，驗證業務邏輯無誤
  - 此時通知服務同時接受 API 呼叫和 MQ 訊息（可能重複，需冪等處理）

Step 3：觀察一段時間（幾天到幾週）
  - 監控 MQ 消費是否正常（無積壓、無 DLQ 增長）
  - 對比 API 呼叫量和 MQ 消費量，確認一致

Step 4：關閉同步 API 呼叫
  - 訂單服務不再直接呼叫通知服務 API
  - 只透過 MQ 觸發通知

Step 5：（可選）廢棄通知服務的 API 端點</code></pre>
  <callout-box type="tip" title="遷移期間的冪等處理">
    在 Step 2 和 Step 3 期間，通知服務可能同時收到 API 呼叫和 MQ 訊息，
    導致重複寄送通知。必須在通知服務中實作冪等去重（以 order_id 為去重 Key，
    記錄「已寄送」狀態到 Redis 或資料庫），確保同一個訂單只寄送一次通知。
  </callout-box>
</section>

<section id="message-queue-vs-streaming">
  <h2>Message Queue vs Event Streaming</h2>
  <p>
    「訊息佇列」這個詞在業界常被混用，但嚴格來說，訊息佇列（Message Queue）
    和事件串流（Event Streaming）是兩種不同的模式，有根本性的設計差異。
  </p>
  <h3>訊息佇列（Message Queue）模式</h3>
  <p>
    訊息佇列適合<strong>任務分發</strong>場景：一個任務（訊息）被一個 Worker 消費後，
    就從佇列中移除，不再存在。如同郵件信箱：讀完一封信，信就沒了。
  </p>
  <ul>
    <li>訊息被消費後刪除（消費具破壞性）</li>
    <li>通常每條訊息只被一個 Consumer 處理</li>
    <li>支援優先級佇列、延遲佇列等功能</li>
    <li>代表：RabbitMQ、AWS SQS、ActiveMQ</li>
  </ul>

  <h3>事件串流（Event Streaming）模式</h3>
  <p>
    事件串流適合<strong>事件發布訂閱</strong>場景：事件寫入後永久保存（直到設定的保留期）。
    多個不同的消費者群組可以獨立讀取同一份事件歷史，各自維護自己的消費偏移量（Offset）。
    如同報紙：報紙印出來後，任何人都可以讀，讀完報紙還在。
  </p>
  <ul>
    <li>訊息持久化存儲（消費不刪除）</li>
    <li>多個 Consumer Group 可以各自獨立消費</li>
    <li>支援回放（Replay）——從任意時間點重新消費</li>
    <li>超高吞吐量（Kafka 可達每秒數百萬條）</li>
    <li>代表：Apache Kafka、AWS Kinesis、Apache Pulsar</li>
  </ul>
  <table>
    <thead>
      <tr>
        <th>面向</th>
        <th>Message Queue</th>
        <th>Event Streaming</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>消費語義</td>
        <td>消費後刪除（破壞性）</td>
        <td>消費後保留（非破壞性）</td>
      </tr>
      <tr>
        <td>多消費者</td>
        <td>競爭消費（一條訊息給其中一個）</td>
        <td>廣播消費（每個 Consumer Group 都收到）</td>
      </tr>
      <tr>
        <td>訊息保留</td>
        <td>消費後或過期後刪除</td>
        <td>按設定保留（如 7 天，甚至永久）</td>
      </tr>
      <tr>
        <td>回放（Replay）</td>
        <td>不支援</td>
        <td>支援（從指定 Offset 開始）</td>
      </tr>
      <tr>
        <td>典型吞吐量</td>
        <td>萬 QPS 級</td>
        <td>百萬 QPS 級</td>
      </tr>
      <tr>
        <td>適用場景</td>
        <td>任務佇列、工作流程觸發</td>
        <td>事件日誌、資料管道、微服務解耦</td>
      </tr>
    </tbody>
  </table>

  <h3>Kafka vs Traditional MQ 的核心差異</h3>
  <p>
    很多工程師在需要「訊息系統」時直觀地選擇 RabbitMQ，但隨著規模增長而痛苦地遷移到 Kafka。
    理解兩者的核心差異，能幫助你在系統設計初期做出正確選擇：
  </p>
  <table>
    <thead>
      <tr>
        <th>設計決策</th>
        <th>Traditional MQ（如 RabbitMQ）</th>
        <th>Kafka</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>儲存模型</td>
        <td>訊息存在 Broker 記憶體/磁碟；消費後刪除，節省空間</td>
        <td>訊息持久化在磁碟 Log；消費不刪除，按 TTL 保留</td>
      </tr>
      <tr>
        <td>消費者管理</td>
        <td>Broker 追蹤每個訊息是否被 ACK（Broker-centric）</td>
        <td>Consumer 自己追蹤 Offset（Consumer-centric），Broker 無需知道誰消費了什麼</td>
      </tr>
      <tr>
        <td>擴展性</td>
        <td>增加 Consumer 可以分擔任務，但 Broker 是瓶頸</td>
        <td>增加 Partition 和 Consumer 幾乎線性擴展</td>
      </tr>
      <tr>
        <td>訊息順序</td>
        <td>單一 Queue 內有序，但多 Worker 競爭消費後無序</td>
        <td>同一 Partition 內嚴格有序；透過 Key 分區保證相關訊息有序</td>
      </tr>
      <tr>
        <td>Replay 能力</td>
        <td>不支援（消費後刪除）</td>
        <td>完整支援；可從任意時間點或 Offset 重新消費</td>
      </tr>
    </tbody>
  </table>

  <h3>Consumer Group 概念</h3>
  <p>
    Kafka 的 Consumer Group 是其最強大的設計之一。同一個 Topic 的訊息，
    可以被多個 Consumer Group 各自獨立消費，互不干擾：
  </p>
  <pre data-lang="text"><code class="language-text">Topic: order-created（3 個 Partition）

Producer 寫入訊息 → Partition 0, 1, 2

Consumer Group: payment-service（處理支付）
  Consumer P1 → 讀取 Partition 0
  Consumer P2 → 讀取 Partition 1
  Consumer P3 → 讀取 Partition 2
  各自維護 Offset，例如：P0=150, P1=148, P2=152

Consumer Group: analytics-service（資料分析）
  Consumer A1 → 讀取 Partition 0, 1, 2（只有一個 Consumer）
  維護獨立 Offset：P0=89, P1=91, P2=88
  （analytics 比 payment 慢，但完全不影響 payment 的消費進度）

Consumer Group: notification-service（寄送通知）
  Consumer N1 → 讀取 Partition 0
  Consumer N2 → 讀取 Partition 1, 2（2個 Consumer 分配3個 Partition）</code></pre>
  <callout-box type="info" title="Consumer 數量不能超過 Partition 數量">
    在同一個 Consumer Group 中，Kafka 的分配規則是每個 Partition 最多只能被一個 Consumer 消費。
    因此若一個 Topic 有 3 個 Partition，第 4 個 Consumer 加入後會閒置（Idle），無法分配到任何 Partition。
    規劃 Partition 數量時要考慮未來的 Consumer 擴展需求。
  </callout-box>

  <h3>Offset 管理</h3>
  <p>
    Offset 是 Kafka Consumer 追蹤「讀到哪裡」的關鍵機制。
    理解 Offset 管理，是避免訊息遺失或重複消費的核心：
  </p>
  <pre data-lang="text"><code class="language-text">Partition 0 的訊息 Log：
  Offset 0: {order_id: "A001", ...}
  Offset 1: {order_id: "A002", ...}
  Offset 2: {order_id: "A003", ...}  ← Consumer 正在處理
  Offset 3: {order_id: "A004", ...}  ← 尚未讀取
  ...

Consumer 的 Committed Offset（已提交到 Kafka 的進度）：2

情境 1：Consumer 在處理 Offset 2 期間崩潰
  重啟後，從 Committed Offset 2 開始重新讀取
  → At-least-once（訊息 A003 可能被重複處理）

情境 2：Consumer 在處理 Offset 2 之前就 Commit（Auto Commit 預設行為）
  若處理失敗，Committed Offset 已是 3，重啟後從 3 開始
  → At-most-once（訊息 A003 可能遺失）</code></pre>
  <pre data-lang="python"><code class="language-python">from kafka import KafkaConsumer

# 關閉 Auto Commit，改為手動 Commit（推薦做法）
consumer = KafkaConsumer(
    'order-created',
    bootstrap_servers=['kafka:9092'],
    group_id='payment-service',
    enable_auto_commit=False,   # 關鍵：關閉自動提交
    auto_offset_reset='earliest'
)

for message in consumer:
    try:
        # 先處理業務邏輯
        process_payment(message.value)
        # 成功後才提交 Offset（At-least-once 語義）
        consumer.commit()
    except Exception as e:
        # 處理失敗：不 Commit，讓訊息在下次重試時重新消費
        log_error(e)
        # 根據業務需求決定是否跳過還是重試</code></pre>

  <h3>Event Sourcing 模式</h3>
  <p>
    Kafka 的「訊息永久保留」特性天然支援 <strong>Event Sourcing</strong> 模式：
    系統的狀態不直接存儲（如更新資料庫的一行），而是以一連串的「事件」來記錄所有狀態變化。
    任何時刻都可以從頭重新播放所有事件，重建系統當前狀態。
  </p>
  <pre data-lang="text"><code class="language-text">傳統模式（State-Based）：
  資料庫儲存當前狀態
  users 表：{id: 1, balance: 850, updated_at: ...}
  （無法知道 balance 是如何從 0 變成 850 的）

Event Sourcing 模式（Event-Based）：
  Kafka Topic: account-events
  Offset 0: {type: "AccountCreated",  user_id: 1, balance: 0}
  Offset 1: {type: "MoneyDeposited",  user_id: 1, amount: 1000}
  Offset 2: {type: "MoneyWithdrawn",  user_id: 1, amount: 200}
  Offset 3: {type: "MoneyDeposited",  user_id: 1, amount: 50}
  → 重放所有事件：balance = 0 + 1000 - 200 + 50 = 850

優點：
  - 完整審計日誌（金融合規要求）
  - 可以重建任意時間點的狀態
  - 可以新增新的 Consumer Group 從頭重放歷史事件（例如新業務分析需求）

缺點：
  - 查詢當前狀態需要重放所有事件（通常配合 CQRS 和物化視圖解決）
  - 事件 Schema 的演進需要謹慎管理</code></pre>
  <callout-box type="tip" title="Event Sourcing 的物化視圖">
    實際系統中，Event Sourcing 通常與 CQRS（Command Query Responsibility Segregation）搭配使用：
    「命令端」寫入事件到 Kafka；「查詢端」消費事件並維護物化視圖（Materialized View）到 Redis 或資料庫，
    讓讀取操作無需重放所有事件，直接查詢物化後的當前狀態。
  </callout-box>
</section>

<section id="kafka-rabbitmq-sqs">
  <h2>Kafka vs RabbitMQ vs SQS</h2>
  <arch-diagram src="./diagrams/ch07-message-queue.json" caption="三種訊息系統的架構對比：Kafka 以 Topic/Partition 模型為核心，RabbitMQ 以 Exchange/Queue 模型為核心，SQS 是全託管的雲端服務"></arch-diagram>

  <h3>Apache Kafka 詳細架構</h3>
  <p>
    Kafka 由 LinkedIn 開發，是現代資料架構的骨幹。核心概念：
  </p>
  <ul>
    <li><strong>Topic：</strong>訊息的邏輯分類（如 <code>order-events</code>、<code>user-clicks</code>）</li>
    <li><strong>Partition：</strong>Topic 的水平分片，每個 Partition 是有序的 Append-Only Log</li>
    <li><strong>Producer：</strong>寫入訊息到指定 Partition（可按 Key Hash 或輪詢）</li>
    <li><strong>Consumer Group：</strong>同一 Group 的 Consumer 分工處理不同 Partition；不同 Group 獨立消費</li>
    <li><strong>Offset：</strong>每個 Consumer Group 維護自己在每個 Partition 的消費進度</li>
  </ul>
  <pre data-lang="text"><code class="language-text">Topic: order-events（3 個 Partition）

Producer → Partition 0: [msg1, msg4, msg7, ...]
         → Partition 1: [msg2, msg5, msg8, ...]
         → Partition 2: [msg3, msg6, msg9, ...]

Consumer Group A（訂單處理）：
  Consumer A1 → Partition 0
  Consumer A2 → Partition 1
  Consumer A3 → Partition 2

Consumer Group B（資料分析）：
  Consumer B1 → Partition 0, 1, 2（如果只有一個 Consumer）
  （完全獨立，不影響 Group A 的進度）</code></pre>

  <h3>Kafka Partition、Replication 與 Leader/Follower</h3>
  <p>
    Kafka 的高可用性依賴 Replication（複製）機制。每個 Partition 有一個 Leader 和多個 Follower：
  </p>
  <pre data-lang="text"><code class="language-text">Topic: order-events，Partition 0，Replication Factor = 3

Broker 1（Leader for P0）：[msg1, msg2, msg3, msg4, ...]
Broker 2（Follower）：     [msg1, msg2, msg3, msg4, ...]  ← 同步複製
Broker 3（Follower）：     [msg1, msg2, msg3, ...]        ← 稍微落後（ISR 機制）

所有 Producer 寫入和 Consumer 讀取都走 Leader。
Follower 只做同步，不直接服務讀取請求（與 MySQL Read Replica 不同）。

ISR（In-Sync Replicas）：
  只有與 Leader 同步的 Follower 才在 ISR 列表中。
  Leader 宕機時，從 ISR 中選舉新 Leader（確保不遺失已確認的訊息）。

Producer 的 acks 設定：
  acks=0：不等待任何 ACK（最快，可能遺失）
  acks=1：等 Leader 寫入磁碟即 ACK（預設，Leader 宕機可能遺失）
  acks=all：等所有 ISR 都寫入才 ACK（最安全，延遲最高）</code></pre>
  <callout-box type="info" title="Kafka 3.0+ 移除了對 Zookeeper 的依賴">
    傳統 Kafka（2.x）需要 Zookeeper 來管理 Broker 元數據和 Leader 選舉，
    增加了運維複雜度。Kafka 3.0 引入了 KRaft 模式（Kafka Raft），
    將 Metadata 管理內建到 Kafka 本身，不再需要 Zookeeper。
    這大幅簡化了 Kafka 的部署和維運。
  </callout-box>

  <h3>RabbitMQ 的 Exchange 類型</h3>
  <p>
    RabbitMQ 的核心優勢是靈活的<strong>路由（Routing）</strong>能力。
    訊息不是直接發到 Queue，而是先發到 Exchange，由 Exchange 根據路由規則決定送到哪個 Queue：
  </p>
  <table>
    <thead>
      <tr>
        <th>Exchange 類型</th>
        <th>路由方式</th>
        <th>典型場景</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Direct</td>
        <td>精確匹配 Routing Key（如 "order.paid" → Queue A）</td>
        <td>點對點任務分發，按狀態路由</td>
      </tr>
      <tr>
        <td>Fanout</td>
        <td>廣播到所有綁定的 Queue，忽略 Routing Key</td>
        <td>廣播通知（類似 pub/sub）</td>
      </tr>
      <tr>
        <td>Topic</td>
        <td>模式匹配（* 匹配一個詞，# 匹配多個詞）<br>如 "order.#" 匹配 "order.paid"、"order.shipped"</td>
        <td>按業務類型靈活路由</td>
      </tr>
      <tr>
        <td>Headers</td>
        <td>按訊息 Header 屬性匹配，不用 Routing Key</td>
        <td>需要多維度條件路由的複雜場景</td>
      </tr>
    </tbody>
  </table>
  <pre data-lang="python"><code class="language-python">import pika

connection = pika.BlockingConnection(pika.ConnectionParameters('rabbitmq'))
channel = connection.channel()

# 宣告 Topic Exchange
channel.exchange_declare(exchange='order_events', exchange_type='topic')

# 訂閱所有 order 事件（# 匹配多個詞）
channel.queue_bind(
    exchange='order_events',
    queue='analytics_queue',
    routing_key='order.#'       # 匹配 order.paid, order.shipped, order.cancelled...
)

# 訂閱特定事件
channel.queue_bind(
    exchange='order_events',
    queue='payment_queue',
    routing_key='order.paid'    # 只匹配 order.paid
)

# 發布訊息
channel.basic_publish(
    exchange='order_events',
    routing_key='order.paid',   # payment_queue 和 analytics_queue 都收到
    body=b'{"order_id": "A001", "amount": 299}'
)</code></pre>

  <h3>AWS SQS FIFO vs Standard</h3>
  <p>
    AWS SQS 有兩種完全不同特性的佇列類型，選錯會帶來嚴重問題：
  </p>
  <table>
    <thead>
      <tr>
        <th>特性</th>
        <th>Standard Queue</th>
        <th>FIFO Queue</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>吞吐量</td>
        <td>幾乎無限（每秒數萬訊息）</td>
        <td>300 TPS（不使用 batching）；3,000 TPS（使用 batching）</td>
      </tr>
      <tr>
        <td>訊息順序</td>
        <td>盡力保序（Best-effort），可能亂序</td>
        <td>嚴格先進先出（FIFO），保證順序</td>
      </tr>
      <tr>
        <td>訊息重複</td>
        <td>At-least-once，可能重複</td>
        <td>Exactly-once（5 分鐘去重視窗）</td>
      </tr>
      <tr>
        <td>Message Group</td>
        <td>無</td>
        <td>支援（同一 Group ID 的訊息嚴格有序）</td>
      </tr>
      <tr>
        <td>適用場景</td>
        <td>高吞吐、無順序要求（圖片處理、日誌收集）</td>
        <td>金融交易、訂單狀態流轉（需嚴格順序）</td>
      </tr>
    </tbody>
  </table>
  <pre data-lang="python"><code class="language-python">import boto3

sqs = boto3.client('sqs', region_name='ap-northeast-1')

# FIFO Queue 的訊息發送（需要 MessageGroupId 和 MessageDeduplicationId）
sqs.send_message(
    QueueUrl='https://sqs.ap-northeast-1.amazonaws.com/123/orders.fifo',
    MessageBody='{"order_id": "A001", "event": "payment_completed"}',
    MessageGroupId='order-A001',          # 同一訂單的所有事件在同一 Group，保證有序
    MessageDeduplicationId='pay-A001-v1'  # 5 分鐘內相同 ID 的訊息自動去重
)</code></pre>

  <h3>三者選型矩陣</h3>
  <table>
    <thead>
      <tr>
        <th>選型依據</th>
        <th>選 Kafka</th>
        <th>選 RabbitMQ</th>
        <th>選 SQS</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>吞吐量需求</td>
        <td>超高（每秒百萬級）</td>
        <td>中等（每秒萬級）</td>
        <td>高（Standard 無限）</td>
      </tr>
      <tr>
        <td>訊息回放需求</td>
        <td>是</td>
        <td>否</td>
        <td>否</td>
      </tr>
      <tr>
        <td>多消費者群組</td>
        <td>是（核心功能）</td>
        <td>有限（Fanout Exchange）</td>
        <td>否</td>
      </tr>
      <tr>
        <td>複雜路由</td>
        <td>有限（按 Key 分區）</td>
        <td>是（Exchange 類型豐富）</td>
        <td>否</td>
      </tr>
      <tr>
        <td>運維能力</td>
        <td>需要專業 Kafka 工程師</td>
        <td>中等難度</td>
        <td>零運維（全託管）</td>
      </tr>
      <tr>
        <td>雲端平台</td>
        <td>跨平台、MSK（AWS）</td>
        <td>跨平台、CloudAMQP</td>
        <td>AWS 生態深度整合</td>
      </tr>
    </tbody>
  </table>
  <callout-box type="tip" title="面試答題技巧">
    在面試中被問到「選哪個訊息系統」時，回答框架：
    1) 吞吐量需求（決定 Kafka vs 其他）；
    2) 是否需要多消費者群組獨立消費或訊息回放（決定 Kafka vs MQ）；
    3) 是否需要複雜路由邏輯（決定 RabbitMQ 的優勢）；
    4) 運維能力和雲端平台（決定 SQS vs 自建）。
  </callout-box>

  <h3>三者比較（完整版）</h3>
  <table>
    <thead>
      <tr>
        <th>特性</th>
        <th>Kafka</th>
        <th>RabbitMQ</th>
        <th>AWS SQS</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>最大吞吐量</td>
        <td>每秒數百萬條</td>
        <td>每秒數萬條</td>
        <td>Standard：無限；FIFO：3,000 TPS</td>
      </tr>
      <tr>
        <td>訊息保留</td>
        <td>可設定（預設 7 天）</td>
        <td>消費後刪除</td>
        <td>最多 14 天</td>
      </tr>
      <tr>
        <td>順序保證</td>
        <td>Partition 內有序</td>
        <td>有限支援</td>
        <td>FIFO Queue 嚴格有序</td>
      </tr>
      <tr>
        <td>多消費者組</td>
        <td>完整支援</td>
        <td>有限（Exchange Fanout）</td>
        <td>不支援（每條訊息只給一個 Consumer）</td>
      </tr>
      <tr>
        <td>運維複雜度</td>
        <td>高（需管理 Broker、KRaft/Zookeeper）</td>
        <td>中</td>
        <td>零（全託管）</td>
      </tr>
      <tr>
        <td>最佳使用場景</td>
        <td>大規模事件串流、資料管道</td>
        <td>複雜路由、任務佇列</td>
        <td>AWS 生態內的解耦、Serverless 觸發</td>
      </tr>
    </tbody>
  </table>
</section>

<section id="delivery-guarantees">
  <h2>At-least-once / Exactly-once Delivery</h2>
  <p>
    訊息交付語義（Delivery Semantics）是訊息系統設計中最微妙的部分。
    理解三種語義的區別，能讓你選擇正確的方案。
  </p>

  <h3>At-most-once（最多一次）</h3>
  <p>訊息可能遺失，但不會重複。發出後不確認。</p>
  <ul>
    <li><strong>場景：</strong>可以容忍遺失的場景，如監控指標（漏幾個資料點沒關係）、日誌（偶爾遺失可接受）</li>
    <li><strong>實現：</strong>Producer 發出訊息後不等 ACK；Consumer 消費前先 Commit Offset</li>
  </ul>

  <h3>At-least-once（至少一次）</h3>
  <p>訊息不會遺失，但可能被消費多次（重複）。最常見的語義。</p>
  <ul>
    <li><strong>場景：</strong>不能接受遺失，但業務邏輯已設計為冪等的（如更新商品庫存）</li>
    <li><strong>實現：</strong>Producer 確認訊息已持久化（等待 Broker ACK）；Consumer 消費成功後才 Commit Offset。
    若 Consumer 在消費後、Commit 前崩潰，重啟後會重新消費同一條訊息</li>
  </ul>
  <callout-box type="warning" title="設計冪等操作是關鍵">
    At-least-once 語義要求消費者具備冪等性（Idempotency）：
    同一條訊息被消費多次，效果與消費一次相同。
    例如，「將訂單狀態設為 SHIPPED」是冪等的；
    「庫存減 1」不是冪等的（重複消費會多扣庫存，需要加幂等性 Key 去重）。
  </callout-box>

  <h3>Exactly-once（恰好一次）</h3>
  <p>訊息既不遺失，也不重複。是最難實現的語義。</p>
  <ul>
    <li><strong>場景：</strong>金融交易（每次轉帳只能發生一次）</li>
    <li><strong>Kafka 的實現：</strong>
      Kafka 0.11 引入了 Transactional API，讓 Producer 可以原子性地寫入多個 Partition，
      Consumer 只讀取已提交（Committed）的訊息。
      但真正的 End-to-End Exactly-once 還需要業務層的冪等處理（資料庫的唯一性約束）。
    </li>
    <li><strong>SQS FIFO 的實現：</strong>透過 Deduplication ID，5 分鐘視窗內重複 ID 的訊息自動去重</li>
  </ul>

  <h3>At-least-once vs Exactly-once 的實現機制深入</h3>
  <p>
    「Exactly-once」在分散式系統中是一個備受爭議的概念。
    真正的 Exactly-once 語義需要在整個鏈路（Producer → Broker → Consumer → 下游資料庫）上同時保證，
    這通常意味著分散式事務，代價極高。
    實際工程中，「Exactly-once 效果」通常透過「At-least-once + 冪等處理」來實現：
  </p>
  <pre data-lang="text"><code class="language-text">「Exactly-once 效果」的實現思路：

方案 A：業務層冪等（最常用）
  Consumer 收到訊息 → 以訊息 ID 為 Key 查資料庫是否已處理
  → 未處理：執行業務邏輯 + 記錄「已處理」（原子操作）
  → 已處理：直接跳過（冪等）
  缺點：每條訊息需要額外的 DB 查詢

方案 B：Kafka Transactional Producer（Kafka 內部 Exactly-once）
  適用：Kafka → 處理 → 寫回 Kafka 的 Stream Processing 場景
  不適用：Kafka → 寫入外部資料庫（無法跨系統保證）

方案 C：資料庫唯一約束（最簡單可靠）
  使用 message_id 作為資料庫的 UNIQUE KEY
  重複插入會觸發唯一性衝突，捕獲並忽略
  → 天然冪等，無需額外的「已處理」記錄表</code></pre>

  <h3>冪等性（Idempotency）的重要性</h3>
  <p>
    冪等性是指：對同一操作執行多次，結果與執行一次相同。
    在訊息系統中，冪等消費者是「At-least-once + 可靠系統」的基石。
    以下是設計冪等消費者的幾種常見策略：
  </p>
  <table>
    <thead>
      <tr>
        <th>策略</th>
        <th>實現方式</th>
        <th>適用場景</th>
        <th>注意事項</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>去重表（Deduplication Table）</td>
        <td>資料庫表記錄已處理的 message_id</td>
        <td>通用，最靈活</td>
        <td>需要原子性地「處理 + 記錄」，否則仍有競態條件</td>
      </tr>
      <tr>
        <td>唯一性約束（Unique Constraint）</td>
        <td>業務表加 message_id 欄位，設 UNIQUE INDEX</td>
        <td>訊息對應新增資料庫記錄</td>
        <td>重複插入拋出異常，需捕獲並忽略</td>
      </tr>
      <tr>
        <td>冪等更新（Idempotent Update）</td>
        <td>使用 SET status='shipped' WHERE id=X AND status='packed'（條件更新）</td>
        <td>狀態機流轉</td>
        <td>多次執行影響 0 行，等同於幂等</td>
      </tr>
      <tr>
        <td>Redis 去重（快速去重）</td>
        <td>SET message_id EX 86400 NX（只有第一次才能設定成功）</td>
        <td>高頻短時間去重</td>
        <td>Redis 重啟可能遺失去重記錄，需評估容忍度</td>
      </tr>
    </tbody>
  </table>

  <h3>Kafka 的 Transactional API 示例</h3>
  <p>
    Kafka Transactional API 讓 Producer 可以原子性地寫入多個 Topic/Partition，
    確保要麼全部成功，要麼全部失敗。這在 Kafka Streams 和資料管道中尤其重要：
  </p>
  <pre data-lang="python"><code class="language-python">from kafka import KafkaProducer
from kafka.errors import KafkaError

# 啟用冪等 Producer（自動去重、保序）
producer = KafkaProducer(
    bootstrap_servers=['kafka:9092'],
    enable_idempotence=True,        # 啟用冪等性（自動設 acks=all, retries=MAX）
    transactional_id='order-processor-1'  # 唯一的事務 ID
)

producer.init_transactions()

try:
    producer.begin_transaction()

    # 原子性地寫入兩個 Topic
    producer.send('order-processed', key=b'A001', value=b'{"status": "processed"}')
    producer.send('payment-triggered', key=b'A001', value=b'{"amount": 299}')

    # 同時提交 Consumer 的 Offset（send_offsets_to_transaction）
    # 這保證「消費 + 生產」是原子操作，避免重複消費
    producer.send_offsets_to_transaction(
        {TopicPartition('order-created', 0): OffsetAndMetadata(msg.offset + 1, None)},
        group_id='order-processor'
    )

    producer.commit_transaction()

except KafkaError as e:
    producer.abort_transaction()
    raise</code></pre>
  <pre data-lang="python"><code class="language-python"># 冪等消費範例：使用 message_id 防止重複處理
def process_payment(message: dict):
    message_id = message['message_id']

    # 檢查是否已處理過（資料庫去重）
    if db.exists("SELECT 1 FROM processed_messages WHERE id = %s", message_id):
        print(f"訊息 {message_id} 已處理，跳過")
        return

    # 原子操作：執行業務邏輯 + 記錄已處理
    with db.transaction():
        execute_payment(message['amount'], message['to_account'])
        db.execute("INSERT INTO processed_messages (id) VALUES (%s)", message_id)</code></pre>
</section>

<section id="dlq-backpressure">
  <h2>Dead Letter Queue 與 Backpressure</h2>
  <p>
    訊息系統投入生產後，兩個必須提前設計的機制是：
    處理消費失敗的 DLQ，以及防止消費者過載的 Backpressure。
  </p>

  <h3>Dead Letter Queue（DLQ，死信佇列）</h3>
  <p>
    當訊息消費失敗（如業務邏輯拋出例外、訊息格式錯誤、超過最大重試次數），
    訊息被移入 DLQ，而不是無限重試或靜默丟棄。
  </p>
  <pre data-lang="text"><code class="language-text">正常流程：
  Main Queue → Consumer → 成功 → ACK → 訊息刪除

失敗流程：
  Main Queue → Consumer → 失敗 → 重試 3 次 → 仍失敗
                       → 移入 Dead Letter Queue

DLQ 的後續處理：
  1. 告警通知（Slack / Email）
  2. 人工審查：是業務邏輯 Bug 還是資料問題？
  3. 修復後，將 DLQ 訊息重新放回 Main Queue</code></pre>
  <ul>
    <li><strong>AWS SQS：</strong>可設定 <code>maxReceiveCount</code>，超過次數自動移入 DLQ</li>
    <li><strong>Kafka：</strong>需要手動實現 DLQ 邏輯（消費失敗後寫入另一個 Topic）</li>
    <li><strong>RabbitMQ：</strong>透過 <code>x-dead-letter-exchange</code> 設定</li>
  </ul>
  <callout-box type="tip" title="DLQ 是系統健康的重要指標">
    DLQ 的訊息積壓量是系統的重要告警指標。
    DLQ 突然增長通常意味著：下游依賴服務故障、訊息格式發生 Breaking Change、
    或業務邏輯遇到邊緣案例（Edge Case）。設置 DLQ 的告警是生產環境的必備設定。
  </callout-box>

  <h3>DLQ 監控與處理流程</h3>
  <p>
    DLQ 不只是「訊息的垃圾桶」，而是問題診斷的重要工具。
    一套完整的 DLQ 管理流程包含監控、診斷和重放三個環節：
  </p>
  <pre data-lang="text"><code class="language-text">DLQ 完整管理流程：

1. 監控（Monitoring）
   指標：DLQ 訊息數量、DLQ 增長速率
   告警規則：
     - DLQ 訊息數 > 0 → P3（低優先級）通知，當天內處理
     - DLQ 增長速率 > 100 條/分鐘 → P1（緊急）告警，立即處理
   工具：CloudWatch Alarm（SQS）、Kafka Consumer Lag 監控、Grafana 儀表板

2. 診斷（Diagnosis）
   分析 DLQ 訊息的失敗原因：
   a) 取樣 DLQ 中的訊息，查看訊息內容
   b) 查閱對應時段的 Consumer 日誌（使用 Correlation ID 關聯）
   c) 常見原因分類：
      - Schema 錯誤：訊息格式與 Consumer 期望不符（需更新 Schema 或 Consumer）
      - 業務邏輯錯誤：Edge Case 沒有處理（需修復 Consumer 代碼）
      - 依賴服務不可用：Consumer 呼叫的外部服務臨時故障（可重試）
      - 資料問題：特定訊息的資料存在問題（需人工處理）

3. 重放（Replay）
   修復 Consumer 後，將 DLQ 訊息重新排入 Main Queue：
   - 小量（< 100 條）：手動腳本搬移
   - 大量（> 1000 條）：批次腳本，控制重放速率（避免瞬間衝擊 Consumer）
   - 確認重放結果：監控 Main Queue 消費情況，確認無新 DLQ 增長</code></pre>
  <pre data-lang="python"><code class="language-python">import boto3
import json
import time

sqs = boto3.client('sqs', region_name='ap-northeast-1')

DLQ_URL = 'https://sqs.../orders-dlq'
MAIN_QUEUE_URL = 'https://sqs.../orders'

def replay_dlq_messages(batch_size: int = 10, rate_per_second: int = 5):
    """
    將 DLQ 中的訊息批次重放回主佇列（含速率控制）
    """
    replayed = 0
    while True:
        # 從 DLQ 拉取訊息
        response = sqs.receive_message(
            QueueUrl=DLQ_URL,
            MaxNumberOfMessages=min(batch_size, 10),
            WaitTimeSeconds=5
        )
        messages = response.get('Messages', [])
        if not messages:
            print(f"DLQ 已清空，共重放 {replayed} 條訊息")
            break

        for msg in messages:
            # 重新發送到 Main Queue
            sqs.send_message(
                QueueUrl=MAIN_QUEUE_URL,
                MessageBody=msg['Body']
            )
            # 從 DLQ 刪除（避免重複重放）
            sqs.delete_message(
                QueueUrl=DLQ_URL,
                ReceiptHandle=msg['ReceiptHandle']
            )
            replayed += 1

        # 速率控制：避免瞬間衝擊 Consumer
        time.sleep(len(messages) / rate_per_second)</code></pre>

  <h3>Backpressure（背壓）</h3>
  <p>
    當消費者的處理速度跟不上生產者的發布速度時，訊息在佇列中積壓（Backlog）。
    如果不加控制，積壓會無限增長，最終耗盡記憶體或磁碟。
    Backpressure 是指「讓生產者感知到消費者的過載狀態，並減慢生產速度」的機制。
  </p>
  <p><strong>應對策略：</strong></p>
  <ul>
    <li>
      <strong>速率限制（Rate Limiting）：</strong>限制 Producer 每秒發布的訊息數量。
      當 Consumer 積壓增加，動態降低 Producer 的發布速率。
    </li>
    <li>
      <strong>Consumer 水平擴展：</strong>監控 Consumer Lag（積壓量），自動增加 Consumer 數量
      （但 Consumer 數量不能超過 Kafka Partition 數量）。
    </li>
    <li>
      <strong>流量整形（Traffic Shaping）：</strong>在 Producer 端實現令牌桶（Token Bucket）或漏斗（Leaky Bucket）演算法，
      平滑突發流量。
    </li>
    <li>
      <strong>有界佇列（Bounded Queue）：</strong>設定佇列最大容量，超過後拒絕新訊息（fail-fast）
      或阻塞 Producer，讓系統有時間消化積壓。
    </li>
  </ul>

  <h3>Backpressure 的具體實現：令牌桶（Token Bucket）</h3>
  <p>
    令牌桶演算法是實現平滑速率限制的標準方法。
    桶中定期放入令牌（如每秒放 100 個），每個請求消耗一個令牌；
    若桶中無令牌，請求等待或被拒絕：
  </p>
  <pre data-lang="python"><code class="language-python">import threading
import time
from dataclasses import dataclass, field

@dataclass
class TokenBucket:
    rate: float          # 每秒補充的令牌數
    capacity: float      # 桶的最大容量
    tokens: float = field(init=False)
    last_refill: float = field(init=False)
    lock: threading.Lock = field(default_factory=threading.Lock, init=False)

    def __post_init__(self):
        self.tokens = self.capacity
        self.last_refill = time.monotonic()

    def acquire(self, tokens: float = 1.0) -> bool:
        """
        嘗試獲取令牌，成功返回 True，失敗返回 False（Fail Fast）
        """
        with self.lock:
            now = time.monotonic()
            # 補充令牌（根據時間流逝）
            elapsed = now - self.last_refill
            self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
            self.last_refill = now

            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            return False  # 令牌不足，拒絕請求

# 使用範例：限制 Producer 每秒最多發送 100 條訊息
bucket = TokenBucket(rate=100, capacity=200)  # 允許短暫突發到 200/s

def publish_message(message: dict):
    if not bucket.acquire():
        # 令牌不足：觸發 Backpressure
        # 選項 A：拒絕（Fail Fast）
        raise BackpressureError("訊息發布速率超限，請稍後重試")
        # 選項 B：等待（Blocking，適合批次處理）
        # while not bucket.acquire(): time.sleep(0.01)
    kafka_producer.send('orders', value=message)</code></pre>

  <h3>Backpressure 的具體實現：信號量（Semaphore）</h3>
  <p>
    信號量適合限制「同時進行中的任務數量」，防止 Consumer 同時處理太多訊息導致資源耗盡：
  </p>
  <pre data-lang="python"><code class="language-python">import asyncio

# 限制最多同時處理 50 個訊息（超過的等待）
semaphore = asyncio.Semaphore(50)

async def process_message_with_backpressure(message: dict):
    async with semaphore:  # 獲取信號量，超過 50 個並發時自動等待
        await process_message(message)
        # 離開 with 塊時釋放信號量，允許下一個訊息進入

async def consume_kafka():
    consumer = AIOKafkaConsumer('orders', bootstrap_servers='kafka:9092')
    await consumer.start()
    async for msg in consumer:
        # semaphore 會自動控制並發數，提供天然的 Backpressure
        asyncio.create_task(process_message_with_backpressure(msg.value))</code></pre>

  <h3>Circuit Breaker + Queue 的組合使用</h3>
  <p>
    在實際生產系統中，Circuit Breaker 和訊息佇列經常組合使用，
    形成一個具備「緩衝 + 保護」雙重能力的架構：
  </p>
  <pre data-lang="text"><code class="language-text">組合架構：

[API 服務] ─── 同步呼叫（帶 Circuit Breaker） ──→ [核心支付服務]
    │
    └── 非同步寫入 ──→ [訊息佇列] ──→ [通知/分析等非關鍵服務]

場景 1：支付服務正常
  API 同步呼叫支付服務 → 成功 → 同時發布事件到佇列
  佇列中的事件觸發：寄送收據 Email、更新統計報表、觸發積分計算

場景 2：支付服務開始變慢（Circuit Breaker = CLOSED，但延遲上升）
  Circuit Breaker 記錄失敗次數，還未到閾值
  API 服務感受到延遲上升（響應時間從 50ms 增加到 500ms）
  告警觸發，工程師開始排查

場景 3：支付服務大量失敗（Circuit Breaker = OPEN）
  所有到支付服務的請求立即 Fail Fast
  API 服務返回用戶「服務暫時不可用，請稍後重試」
  非同步佇列不受影響：通知服務、分析服務繼續正常消費
  → 故障隔離：支付服務的故障只影響支付功能，不影響其他非同步流程</code></pre>
  <callout-box type="info" title="訊息佇列作為系統韌性的緩衝層">
    訊息佇列在這個組合架構中扮演「緩衝層」角色：
    即使下游服務（如 Email 服務、統計服務）發生短暫故障，
    訊息會積壓在佇列中，等下游服務恢復後繼續消費，
    不會遺失任何業務事件。這與同步呼叫形成鮮明對比——
    同步呼叫下，下游故障會直接導致整個請求失敗。
  </callout-box>
  <pre data-lang="python"><code class="language-python">import asyncio

async def producer(queue: asyncio.Queue):
    for i in range(1000):
        # 若佇列已滿（maxsize=100），put 會自動阻塞等待
        await queue.put(f"message_{i}")
        print(f"已發布 message_{i}")

async def consumer(queue: asyncio.Queue):
    while True:
        message = await queue.get()
        await asyncio.sleep(0.1)  # 模擬處理時間
        queue.task_done()
        print(f"已處理 {message}")

async def main():
    queue = asyncio.Queue(maxsize=100)  # 有界佇列
    asyncio.create_task(producer(queue))
    asyncio.create_task(consumer(queue))</code></pre>
</section>
`,
} satisfies ChapterContent;
