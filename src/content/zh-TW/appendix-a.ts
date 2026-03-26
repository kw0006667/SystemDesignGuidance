import type { ChapterContent } from '../../types.js';

export default {
  title: '附錄 A：系統設計面試攻略',
  content: `
<section id="interview-framework">
  <h2>面試框架與時間分配</h2>
  <p>系統設計面試不是考你背答案，而是評估你解決模糊問題的思考過程。面試官更在乎你「如何思考」，而非你能不能說出某個特定的技術名詞。一個常見的失敗模式是：候選人跳過需求釐清，直接開始畫架構圖——這讓面試官認為你習慣在不充分理解問題的情況下就動手解決。本附錄提供一套可直接應用的面試框架和時間管理策略。</p>

  <h3>PEDALS 框架（適用系統設計）</h3>
  <p>PEDALS 是一個結構化的系統設計面試框架，幫助你不遺漏任何關鍵面向：</p>
  <table>
    <thead>
      <tr><th>字母</th><th>英文</th><th>中文</th><th>關鍵問題</th><th>常見遺漏</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>P</td>
        <td>Problem</td>
        <td>問題定義</td>
        <td>這個系統要解決什麼問題？對誰？</td>
        <td>沒有確認核心用例，過度聚焦邊緣功能</td>
      </tr>
      <tr>
        <td>E</td>
        <td>Estimation</td>
        <td>規模估算</td>
        <td>QPS、儲存、頻寬、DAU 各是多少？</td>
        <td>只估計 QPS，忘記儲存增長和頻寬成本</td>
      </tr>
      <tr>
        <td>D</td>
        <td>Data model</td>
        <td>資料模型</td>
        <td>需要哪些資料實體？如何儲存？讀寫比？</td>
        <td>選擇資料庫時不說明原因</td>
      </tr>
      <tr>
        <td>A</td>
        <td>API design</td>
        <td>API 設計</td>
        <td>對外暴露哪些 API？輸入輸出是什麼？</td>
        <td>只說「有個 POST /create」，沒有具體參數</td>
      </tr>
      <tr>
        <td>L</td>
        <td>Low-level design</td>
        <td>詳細設計</td>
        <td>核心元件如何實作？演算法是什麼？</td>
        <td>只說「用快取」，不說快取策略和失效機制</td>
      </tr>
      <tr>
        <td>S</td>
        <td>Scalability</td>
        <td>可擴展性</td>
        <td>如何處理 10x 的流量？瓶頸在哪？</td>
        <td>等待面試官追問，不主動識別擴展挑戰</td>
      </tr>
    </tbody>
  </table>

  <h3>45 分鐘面試的完整時間框架</h3>
  <p>45 分鐘是最常見的系統設計面試長度。以下是每個階段的目標、最佳實踐和常見錯誤：</p>

  <table>
    <thead>
      <tr><th>時段</th><th>時長</th><th>階段名稱</th><th>目標</th><th>最佳實踐</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>0–5 分</td>
        <td>5 分鐘</td>
        <td><strong>需求釐清</strong></td>
        <td>確認功能邊界、使用者、規模、限制條件</td>
        <td>問 3–5 個有深度的問題；明確說出「今天我們重點討論的功能是 X 和 Y」</td>
      </tr>
      <tr>
        <td>5–15 分</td>
        <td>10 分鐘</td>
        <td><strong>容量估算</strong></td>
        <td>估算 DAU、QPS、儲存、頻寬，找出規模量級</td>
        <td>大聲說出計算過程；用取整數字（100M DAU 而非 97.3M）；得出「結論性數字」（如「需要 20 台 API 伺服器」）</td>
      </tr>
      <tr>
        <td>15–35 分</td>
        <td>20 分鐘</td>
        <td><strong>核心設計</strong></td>
        <td>畫出高層架構圖，深入 1–2 個核心元件</td>
        <td>先畫全貌圖（30 秒），再選最重要的部分深入；主動說「我先設計 X，因為這是最難的部分」</td>
      </tr>
      <tr>
        <td>35–45 分</td>
        <td>10 分鐘</td>
        <td><strong>深入探討</strong></td>
        <td>討論 Trade-off、擴展性、可靠性、邊緣案例</td>
        <td>主動提出設計的不足；說明「如果流量增加 10 倍，我會這樣演進」；預測面試官的追問並提前回答</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="tip" title="如何引導面試官的對話方向">
    面試是雙向對話，不是單向展示。以下話術可以幫助你掌握節奏：<br/>
    - 「我打算先設計 X，然後討論 Y 和 Z，這樣的順序您覺得可以嗎？」（確認焦點）<br/>
    - 「我現在有兩個方向可以深入：A 或 B。您對哪個更感興趣？」（讓面試官感受到你的主動性）<br/>
    - 「這部分我暫時先設計一個簡單版本，後面再討論如何優化，可以嗎？」（管理時間）<br/>
    - 「我注意到時間還剩 10 分鐘，我想確保覆蓋到擴展性的部分。」（主動時間管理）
  </callout-box>

  <h3>需求釐清的 10 個必問問題</h3>
  <p>面試開始後的 5 分鐘，問對問題比任何架構決策都重要。以下清單涵蓋了大多數系統設計題目的關鍵維度：</p>

  <table>
    <thead>
      <tr><th>#</th><th>問題</th><th>目的</th><th>答案如何影響設計</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>「主要的使用者是誰？核心使用情境是什麼？」</td>
        <td>理解問題邊界和優先功能</td>
        <td>決定哪些功能必須在 45 分鐘內覆蓋</td>
      </tr>
      <tr>
        <td>2</td>
        <td>「預期的 DAU 或 MAU 是多少？未來 3 年的增長目標？」</td>
        <td>規模感知</td>
        <td>決定是否需要分散式架構，還是單機就夠</td>
      </tr>
      <tr>
        <td>3</td>
        <td>「讀寫比例大約是多少？是讀多寫少還是寫多讀少？」</td>
        <td>影響資料庫和快取設計</td>
        <td>讀多 → 強調 Read Replica 和快取；寫多 → 強調分片和非同步處理</td>
      </tr>
      <tr>
        <td>4</td>
        <td>「有延遲要求嗎？例如 p99 要求 &lt;100ms？」</td>
        <td>影響架構選擇</td>
        <td>嚴格延遲要求 → 不能用非同步處理；需要記憶體快取</td>
      </tr>
      <tr>
        <td>5</td>
        <td>「資料一致性要求是強一致性還是最終一致性？」</td>
        <td>CAP 定理取捨</td>
        <td>強一致性 → 複雜的分散式事務；最終一致性 → 更高可用性</td>
      </tr>
      <tr>
        <td>6</td>
        <td>「需要支援哪些平台（Web、Mobile、第三方 API）？」</td>
        <td>影響 API 設計和客戶端策略</td>
        <td>Mobile 優先 → 需要離線支援；第三方 API → 需要 SDK 和版本控制</td>
      </tr>
      <tr>
        <td>7</td>
        <td>「是否有地理分布需求（全球用戶或特定 Region）？」</td>
        <td>影響基礎設施設計</td>
        <td>全球用戶 → CDN、Multi-Region 部署、資料主權問題</td>
      </tr>
      <tr>
        <td>8</td>
        <td>「有特殊的安全性或合規要求嗎（GDPR、HIPAA）？」</td>
        <td>影響資料儲存和傳輸設計</td>
        <td>HIPAA → 加密、審計日誌必需；GDPR → 資料刪除 API</td>
      </tr>
      <tr>
        <td>9</td>
        <td>「系統的可用性要求是多少（99.9% 還是 99.99%）？」</td>
        <td>影響冗餘設計成本</td>
        <td>99.99% = 每年約 52 分鐘停機；需要多 AZ 熱備份</td>
      </tr>
      <tr>
        <td>10</td>
        <td>「我們今天要優先深入哪 1–2 個最核心的功能？」</td>
        <td>和面試官對齊焦點，管理時間</td>
        <td>防止在次要功能上花太多時間，確保覆蓋面試官最關心的部分</td>
      </tr>
    </tbody>
  </table>

  <h3>容量估算快速模板</h3>
  <p>在面試中使用固定的估算模板，可以讓計算過程清晰且不遺漏關鍵數字：</p>

  <pre data-lang="python"><code class="language-python">
# 面試用容量估算模板（可以在白板上直接套用）

def capacity_estimation_template(
    dau: int,                        # Daily Active Users
    requests_per_user_per_day: int,  # 每人每天的請求次數
    avg_object_size_bytes: int,      # 每個物件的平均大小
    read_write_ratio: float,         # 讀：寫 = 10 表示 10:1
    retention_years: int,            # 資料保留年數
    peak_multiplier: float = 10,     # 峰值係數（通常 5–10x）
) -> dict:

    # ====== 第一步：QPS 計算 ======
    SECONDS_PER_DAY = 86_400  # 記住這個數字（或近似為 10 萬）

    total_requests_per_day = dau * requests_per_user_per_day
    avg_qps = total_requests_per_day / SECONDS_PER_DAY
    peak_qps = avg_qps * peak_multiplier

    write_qps = peak_qps / (1 + read_write_ratio)
    read_qps  = peak_qps - write_qps

    # ====== 第二步：儲存計算 ======
    writes_per_day = dau * (requests_per_user_per_day / (1 + read_write_ratio))
    storage_per_day_bytes = writes_per_day * avg_object_size_bytes
    total_storage_bytes   = storage_per_day_bytes * 365 * retention_years
    total_storage_with_replication = total_storage_bytes * 3  # 3 副本

    # ====== 第三步：頻寬計算 ======
    bandwidth_bps = peak_qps * avg_object_size_bytes * 8  # 轉換為 bits

    return {
        "平均 QPS":     f"{avg_qps:,.0f}",
        "峰值 QPS":     f"{peak_qps:,.0f}",
        "寫入 QPS":     f"{write_qps:,.0f}",
        "讀取 QPS":     f"{read_qps:,.0f}",
        "每日新增儲存":  f"{storage_per_day_bytes / 1e9:.1f} GB",
        "總儲存（含副本）": f"{total_storage_with_replication / 1e12:.1f} TB",
        "峰值頻寬":      f"{bandwidth_bps / 1e9:.1f} Gbps",
    }

# 示例：設計 Twitter-like 系統
result = capacity_estimation_template(
    dau=100_000_000,            # 1 億 DAU
    requests_per_user_per_day=100,  # 每人每天發 10 條、讀 90 條
    avg_object_size_bytes=500,  # 一條推文約 500 bytes
    read_write_ratio=9,         # 讀寫比 9:1
    retention_years=5,
    peak_multiplier=10,
)
# 輸出：峰值 QPS ≈ 115,740；5年總儲存（含副本）≈ 8.2 TB
  </code></pre>

  <h3>核心設計的「由粗到細」策略</h3>
  <p>進入核心設計階段後，採用「由粗到細」的順序：先在 2 分鐘內畫出系統全貌，再選最重要的部分深入。這樣能確保即使時間不夠，面試官也能看到你對整個系統的掌握。</p>

  <ol>
    <li><strong>Level 0（2 分鐘）</strong>：在白板上畫出最簡單的架構：用戶端 → API → 資料庫。這是所有系統的基礎。</li>
    <li><strong>Level 1（5 分鐘）</strong>：加入核心元件：Load Balancer、快取、訊息佇列、CDN。說明各元件的作用和資料流。</li>
    <li><strong>Level 2（10 分鐘）</strong>：選擇 1–2 個最重要或最複雜的元件深入設計，說明具體的演算法和資料模型。</li>
    <li><strong>Level 3（5 分鐘）</strong>：討論擴展性、可靠性、監控、部署。這是 Senior 候選人和 Mid-level 的分水嶺。</li>
  </ol>

  <h3>如何主動展示 Senior 思維</h3>
  <p>Senior 候選人和 Mid-level 候選人最大的差異，不在於知道更多技術，而在於主動性和全局觀：</p>

  <table>
    <thead>
      <tr><th>維度</th><th>Mid-level 的表現</th><th>Senior 的表現</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>Trade-off</td>
        <td>等面試官問「為什麼選 X」才說明</td>
        <td>主動說「我在 A 和 B 之間考慮了，最終選 A 因為...在我們的場景下 B 的缺點 X 無法接受」</td>
      </tr>
      <tr>
        <td>非功能性需求</td>
        <td>只關注功能實作</td>
        <td>主動說「除了功能性需求，我想確認我們的 SLA：目標 99.99% 可用性，p99 延遲 100ms」</td>
      </tr>
      <tr>
        <td>失敗情境</td>
        <td>設計「理想情況下」的架構</td>
        <td>主動說「如果快取節點失效，我設計了這樣的降級策略...」</td>
      </tr>
      <tr>
        <td>監控</td>
        <td>不提或只說「加 Logging」</td>
        <td>說出具體的監控指標：「我會監控 p99 延遲、快取命中率、資料庫連線池使用率，並在 X 時觸發 PagerDuty」</td>
      </tr>
      <tr>
        <td>成本意識</td>
        <td>不考慮成本</td>
        <td>說「這個設計每月大約 $X，主要成本在 Y，如果需要節省可以通過 Z 來優化」</td>
      </tr>
      <tr>
        <td>演進策略</td>
        <td>設計一個「最終狀態」架構</td>
        <td>說「今天先用 Monolith 快速上線，當 QPS 超過 1000 時再拆分 X 為獨立服務」</td>
      </tr>
    </tbody>
  </table>

  <h3>結束前的總結技巧</h3>
  <p>在面試的最後 2 分鐘，花時間做一個簡短的總結。這不僅讓面試官留下清晰的印象，也顯示你具備架構師的全局視野：</p>

  <pre data-lang="python"><code class="language-python">
# 結束總結的話術模板（約 90 秒）

summary_template = """
「讓我用 1 分鐘快速總結這個設計：

【核心架構】
我設計了一個 [系統名稱]，核心元件包括：
[元件 A]（負責 X）、[元件 B]（負責 Y）、[元件 C]（負責 Z）。

【關鍵設計決策】
我做了三個重要的設計決策：
1. 選擇 [技術 A] 而非 [技術 B]，因為在我們的場景下 [理由]。
2. 採用 [非同步/同步] 處理 [X 功能]，以 [解決什麼問題]。
3. 使用 [分片策略] 來確保在 [規模] 下的擴展性。

【已知限制與未來演進】
目前的設計有兩個已知限制：
1. [限制 A]——如果業務需要，可以通過 [方案] 解決。
2. [限制 B]——這是一個已知的 Trade-off，我們接受 [代價] 換取 [好處]。

如果時間允許，我還想深入討論 [X 部分]。您有特別想追問的方向嗎？」
"""
  </code></pre>

  <callout-box type="tip" title="面試的黃金沉默法則">
    在問完需求問題後，給自己 60–90 秒的沉默思考時間，整理思路後再開口。面試官完全接受這種「思考停頓」，比倉促給出錯誤架構要好得多。可以說「讓我先想一下整體架構方向」，然後在草稿紙上畫出初步的元件圖。沉默是自信的表現，而非不確定。
  </callout-box>
</section>

<section id="common-followups">
  <h2>常見追問與應答策略</h2>
  <p>面試官的追問是刻意的探索，目的是測試你思考的深度和廣度。準備好這些常見追問，能讓你不被打亂節奏。最重要的心態是：追問不是攻擊，而是邀請你展示更深的思考。</p>

  <h3>五大類高頻追問及應答框架</h3>

  <h4>1. Scalability 追問：「如何從 1,000 QPS 擴展到 1,000,000 QPS？」</h4>
  <p>這是最常見的追問，考驗水平擴展思維。標準答題框架：識別瓶頸 → 水平擴展 → 引入快取 → 分片</p>

  <table>
    <thead>
      <tr><th>規模</th><th>系統瓶頸</th><th>解決方案</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>1K QPS</strong></td>
        <td>單台伺服器可以處理</td>
        <td>單機部署，垂直擴展（更大的機器）</td>
      </tr>
      <tr>
        <td><strong>10K QPS</strong></td>
        <td>單台資料庫開始成為瓶頸</td>
        <td>加入 Load Balancer，水平擴展 API 層；加入 Redis 快取減少資料庫壓力</td>
      </tr>
      <tr>
        <td><strong>100K QPS</strong></td>
        <td>資料庫寫入成為瓶頸；快取命中率需要提升</td>
        <td>資料庫主從分離（Read Replica）；引入訊息佇列非同步化寫入；分層快取（L1本地 + L2 Redis Cluster）</td>
      </tr>
      <tr>
        <td><strong>1M QPS</strong></td>
        <td>單一資料庫節點的寫入能力上限；單一 Region 的網路延遲</td>
        <td>資料庫水平分片（Sharding）；引入 CDN；Multi-Region 部署；考慮最終一致性</td>
      </tr>
    </tbody>
  </table>

  <p><strong>回答話術示範：</strong>「讓我從識別瓶頸開始。1K QPS 時，瓶頸通常在 API 層——水平加機器就能解決。到了 10K，資料庫開始成為瓶頸，我會引入 Read Replica 和 Redis 快取，把大部分讀請求從資料庫卸載。到 100K，我需要考慮寫入分片。到 1M，可能需要 Multi-Region 部署和最終一致性的資料模型。每個階段都有不同的代價和複雜度，關鍵是不要過早優化。」</p>

  <h4>2. Reliability 追問：「如果資料庫當機怎麼辦？」</h4>
  <p>標準答題框架：先說影響 → 說防禦措施 → 說恢復策略</p>

  <pre data-lang="python"><code class="language-python">
# 資料庫故障應對的三層防禦設計

DATABASE_FAILURE_RESPONSE = {

    # 第一層：偵測（Discovery）
    "偵測機制": {
        "Health Check": "每 5 秒對資料庫發送 SELECT 1，超過 3 次失敗觸發警報",
        "Circuit Breaker": "連續 5 次失敗後自動熔斷，避免雪崩效應",
        "告警": "PagerDuty 通知，SLA 要求 5 分鐘內響應"
    },

    # 第二層：防禦（Defense）
    "降級策略": {
        "讀取快取": "優先從 Redis 讀取 Stale Cache，允許短暫讀到舊資料",
        "降級回應": "對非核心功能返回預設值（如推薦列表返回空）",
        "Circuit Breaker": "熔斷後直接返回錯誤，而非繼續等待逾時",
        "寫入緩衝": "將寫入操作放入本地佇列，資料庫恢復後重放"
    },

    # 第三層：恢復（Recovery）
    "恢復策略": {
        "Primary 故障": "RDS Multi-AZ 自動 Failover（約 30–60 秒）；DNS 切換到 Standby",
        "資料庫損壞": "從最近的 Snapshot 恢復（RTO 取決於資料量）",
        "網路分區": "切換到 Read Replica 繼續提供讀取服務",
        "驗證恢復": "Failover 後自動執行 Smoke Test，確認寫入和讀取均正常"
    }
}
  </code></pre>

  <h4>3. Consistency 追問：「如何保證資料一致性？」</h4>
  <p>標準答題框架：明確一致性等級 → 說明對應的技術方案 → 說明適用場景</p>

  <table>
    <thead>
      <tr><th>一致性等級</th><th>技術方案</th><th>適用場景</th><th>代價</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>強一致性（Strong）</strong></td>
        <td>2PC（兩階段提交）、Raft 共識、XA Transaction</td>
        <td>金融轉帳、庫存扣減、訂單狀態</td>
        <td>高延遲、低可用性（節點故障時系統不可寫）</td>
      </tr>
      <tr>
        <td><strong>線性一致性（Linearizable）</strong></td>
        <td>ZooKeeper、etcd、AWS DynamoDB（強一致讀）</td>
        <td>分散式鎖、Leader 選舉、配置中心</td>
        <td>較高延遲，但比 2PC 更高效</td>
      </tr>
      <tr>
        <td><strong>讀己之寫（Read-your-writes）</strong></td>
        <td>寫後讀路由到同一節點；使用版本號或時間戳路由</td>
        <td>社交媒體（發文後立即看到自己的帖子）</td>
        <td>路由複雜度增加；需要 Session 粘性</td>
      </tr>
      <tr>
        <td><strong>最終一致性（Eventual）</strong></td>
        <td>非同步複製、CRDTs、Gossip Protocol</td>
        <td>DNS 更新、社交媒體動態、電商商品描述</td>
        <td>可能讀到舊資料，需要 UI 設計配合</td>
      </tr>
    </tbody>
  </table>

  <h4>4. Security 追問：「如何防止濫用？」</h4>

  <table>
    <thead>
      <tr><th>攻擊類型</th><th>防禦方案</th><th>實作重點</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>API 濫用 / DDoS</td>
        <td>Rate Limiting（Token Bucket 或 Sliding Window）</td>
        <td>按 IP、User ID、API Key 多層限流；超出限制回傳 429</td>
      </tr>
      <tr>
        <td>未授權存取</td>
        <td>JWT + Refresh Token；OAuth 2.0</td>
        <td>Access Token 短期（15 分鐘）；Refresh Token 長期但可撤銷；Token 在 Redis 黑名單</td>
      </tr>
      <tr>
        <td>資料洩漏</td>
        <td>欄位級加密、TLS 傳輸加密、最小權限原則</td>
        <td>PII 欄位（如密碼、信用卡）必須加密儲存；IAM 角色只給必要權限</td>
      </tr>
      <tr>
        <td>SQL Injection</td>
        <td>Parameterized Query、ORM</td>
        <td>絕不拼接 SQL 字串；WAF 第一道過濾</td>
      </tr>
      <tr>
        <td>合規審計</td>
        <td>Audit Log（不可篡改）</td>
        <td>記錄所有敏感操作（誰在何時做了什麼）；日誌送往獨立存儲（如 CloudWatch Logs）</td>
      </tr>
    </tbody>
  </table>

  <h4>5. Cost 追問：「這個方案多貴？」</h4>
  <p>標準回答框架：說明主要成本驅動因素 → 給出量級估算 → 說明優化方向</p>

  <pre data-lang="python"><code class="language-python">
# 面試時的成本估算話術模板

COST_ESTIMATION_EXAMPLE = """
「讓我快速估算一下這個設計的月費：

主要成本項目：
1. 計算（API + Worker）：10 台 m5.xlarge = ~$1,400/月（On-demand）
   → 如果用 Reserved Instance：$840/月（節省 40%）

2. 資料庫（Aurora PostgreSQL）：db.r5.xlarge Multi-AZ = ~$700/月

3. 儲存（S3 + 5年日誌）：估算 100TB/年增長，分層後約 $300/月

4. 網路（CloudFront + Egress）：100TB/月 ≈ $850/月（有 CDN 比沒有省 70%）

合計：約 $3,500–$4,000/月（初期）

最大的優化方向：
- LLM API（如果有的話）通常是增長最快的成本，需要模型路由和快取
- 把穩定負載轉為 Reserved Instance，可再省 30%

這個估算是量級粗估，實際會在架構評審時用 Infracost 做精確計算。」
"""
  </code></pre>

  <h3>如何誠實面對知識盲點</h3>
  <p>面試官最討厭的不是「不知道」，而是「假裝知道」。誠實面對盲點，並展示你的思考框架，往往得分比謊稱熟悉更高：</p>

  <table>
    <thead>
      <tr><th>情況</th><th>錯誤應對</th><th>正確應對</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>不熟悉某個技術（如 Kafka Streams）</td>
        <td>「Kafka Streams 我用過，它可以...」（然後說錯）</td>
        <td>「Kafka Streams 我沒有深入使用過，但我知道它是流處理框架。在這個場景中，我可能會選 Flink，因為我更熟悉它的 State 管理機制。」</td>
      </tr>
      <tr>
        <td>不確定某個數字（如 Redis 的最大連線數）</td>
        <td>隨便說一個數字</td>
        <td>「我不記得確切的預設值，但 Redis 的連線數是可配置的，在設計中我會確認這個上限並設定適當的連線池大小。」</td>
      </tr>
      <tr>
        <td>遇到完全不熟悉的系統設計題目</td>
        <td>沉默或說「這個我沒設計過」</td>
        <td>「我沒有直接設計過 X，但讓我從第一原理來思考：這個系統的核心挑戰是 Y，我會從 Z 角度來分解...」</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="warning" title="面試常見失分點">
    1. <strong>跳過需求直接畫架構</strong>：面試官認為你不善於處理模糊問題。<br/>
    2. <strong>沒有容量估算就做設計決策</strong>：說「需要加快取」但不說為什麼（QPS 是多少？快取命中率能降低多少資料庫壓力？）。<br/>
    3. <strong>只描述元件，不解釋資料流</strong>：說「有個資料庫」但不說資料如何從用戶請求流到資料庫，再到回應。<br/>
    4. <strong>過度設計</strong>：10 人的初創公司的系統，設計成 Netflix 的架構。要根據規模選擇合適的複雜度。<br/>
    5. <strong>防禦性思維</strong>：面試官提出質疑時，死守自己的設計不接受批評。正確做法是「謝謝您提出這點，您說的 X 確實是個問題，讓我想想如何解決...」<br/>
    6. <strong>忽略非功能性需求</strong>：設計了完整的功能，但完全沒提到可用性、延遲、監控、安全性。
  </callout-box>
</section>

<section id="level-expectations">
  <h2>Entry → Senior → Staff 層級期望差異</h2>
  <p>不同職級的面試，考察的維度和深度有顯著差異。了解自己面試的職級期望，才能做出合適的回答。更重要的是，了解「比自己高一個層級」的期望，可以幫助你在面試中展現超出預期的思維深度。</p>

  <h3>五個層級的完整對比矩陣</h3>
  <table>
    <thead>
      <tr><th>能力維度</th><th>Entry（0–2年）</th><th>Junior（2–4年）</th><th>Mid（4–6年）</th><th>Senior（6–9年）</th><th>Staff（9年+）</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>需求分析深度</strong></td>
        <td>能問出基本的規模問題（DAU、QPS）</td>
        <td>能問出功能邊界和優先順序</td>
        <td>能問出非功能需求（延遲、可用性）和業務約束</td>
        <td>主動識別隱含需求（如合規、安全、成本目標）</td>
        <td>能從業務目標反推技術需求；識別哪些需求可能未來改變</td>
      </tr>
      <tr>
        <td><strong>設計視野</strong></td>
        <td>設計單一服務或功能模組</td>
        <td>設計包含資料庫和快取的完整服務</td>
        <td>設計分散式系統，考慮服務間依賴</td>
        <td>設計跨多個服務的系統，考慮組織邊界</td>
        <td>設計平台級基礎設施，影響整個工程組織</td>
      </tr>
      <tr>
        <td><strong>Trade-off 識別</strong></td>
        <td>在追問下能說出 1–2 個 Trade-off</td>
        <td>主動說出主要 Trade-off，但可能遺漏邊緣案例</td>
        <td>主動提出多個 Trade-off，能說明在具體場景下的選擇依據</td>
        <td>主動識別並量化 Trade-off（例如：「方案 A 多花 $200/月，但可以減少 X 天的開發時間」）</td>
        <td>能從長期演進視角評估 Trade-off（如「現在選 A 技術，但 2 年後可能需要遷移到 B」）</td>
      </tr>
      <tr>
        <td><strong>非功能性需求</strong></td>
        <td>被問到才能回答可用性問題</td>
        <td>主動提到需要快取和資料庫備份</td>
        <td>主動設計監控、告警、降級策略</td>
        <td>主動設計完整的可靠性工程：SLO、Error Budget、Runbook</td>
        <td>設計組織級的可靠性框架；推動 SRE 文化；考慮多租戶 SLA 隔離</td>
      </tr>
      <tr>
        <td><strong>設計決策說服力</strong></td>
        <td>能說出「因為這樣比較快」類的理由</td>
        <td>能說出技術原理（如「LSM-tree 對寫入優化」）</td>
        <td>能用數據支撐（「根據我們的 QPS 估算，Redis 可以處理 95% 的讀請求，減少 DB 壓力」）</td>
        <td>能從多維度（技術、成本、運維、風險）全面論證</td>
        <td>能從業務影響（上市時間、工程師效率、技術債）角度論證</td>
      </tr>
      <tr>
        <td><strong>追問應對</strong></td>
        <td>需要引導和提示才能回答追問</td>
        <td>能回答追問，但有時需要停頓思考</td>
        <td>能流暢回應追問，且追問與追問之間有一致性（不自相矛盾）</td>
        <td>能預測追問並提前回答；追問時能分層深入（先說結論，再說細節）</td>
        <td>能引導追問方向；能用追問展示對業界最佳實踐的深度理解</td>
      </tr>
    </tbody>
  </table>

  <h3>各層級的「失分」模式</h3>

  <h4>Entry Level（0–2 年）常見失分</h4>
  <ul>
    <li><strong>不懂容量估算</strong>：無法估算 QPS 或儲存需求，或估算結果明顯不合理（如「每秒 10 億次請求」）。</li>
    <li><strong>資料庫選擇無依據</strong>：說「用 MongoDB」但無法解釋為什麼不用 PostgreSQL，也不知道兩者的差異。</li>
    <li><strong>無法解釋基本概念</strong>：被問到「為什麼需要快取」時，只說「因為比較快」，無法說出「降低資料庫 QPS」「提升讀取延遲」等具體原因。</li>
  </ul>
  <p><strong>如何往 Junior 思維提升：</strong>在設計每個元件時，都問自己「為什麼需要這個？沒有它會怎樣？」</p>

  <h4>Junior Level（2–4 年）常見失分</h4>
  <ul>
    <li><strong>忘記非功能性需求</strong>：設計了完整的功能，但完全沒考慮故障情境。被問「資料庫掛了怎麼辦」時才開始思考。</li>
    <li><strong>技術選型不考慮場景</strong>：每次都說「用 Redis」，不管是否真的需要。對不同 Redis 資料結構（String/Hash/ZSet）的適用場景不清楚。</li>
    <li><strong>過度依賴單一解決方案</strong>：「所有問題都能用 Kafka 解決。」</li>
  </ul>
  <p><strong>如何往 Mid 思維提升：</strong>設計完成後，主動問自己「如果這個元件掛了，整個系統會怎樣？」並為每個關鍵元件設計降級策略。</p>

  <h4>Mid Level（4–6 年）常見失分</h4>
  <ul>
    <li><strong>知道問題但缺乏深度</strong>：說「需要分片」但不知道如何設計 Shard Key，也不知道跨分片查詢的挑戰。</li>
    <li><strong>設計缺乏可觀測性</strong>：設計了系統但沒有提監控。被問「出問題你怎麼 debug」時答不上來。</li>
    <li><strong>只考慮技術，不考慮運維</strong>：設計了複雜的 Event-Driven 架構，但沒考慮部署策略、升級路徑、Runbook。</li>
  </ul>
  <p><strong>如何往 Senior 思維提升：</strong>在設計結束時，主動說「為了讓這個系統可以健康運作，我會加入以下監控指標和告警：...」</p>

  <h4>Senior Level（6–9 年）常見失分</h4>
  <ul>
    <li><strong>過度工程化</strong>：把每個中等規模的問題都設計成 Netflix 規模的解決方案，不考慮成本和工程師維護負擔。</li>
    <li><strong>技術視角太重，業務視角太輕</strong>：設計了完美的技術架構，但沒有考慮「這樣做需要多少工程師時間？上市時間是多少？」</li>
    <li><strong>無法清晰說明演進路徑</strong>：只設計了「最終狀態」，沒有說明如何從現有系統安全地遷移到新架構。</li>
  </ul>
  <p><strong>如何往 Staff 思維提升：</strong>問自己「其他團隊也有相同的問題嗎？我的設計能抽象成一個通用的平台供多個團隊使用嗎？」</p>

  <h4>Staff Level（9 年+）的期望</h4>
  <ul>
    <li><strong>跨組織影響力</strong>：設計的系統能提升整個工程組織的效率，而非只解決一個團隊的問題。例如設計一個通用的限流服務，讓所有團隊都能使用。</li>
    <li><strong>技術方向引導</strong>：能識別組織在未來 2–3 年會遇到的技術瓶頸，並提前設計演進路徑。</li>
    <li><strong>工程師體驗（DX）設計</strong>：考慮其他工程師如何使用你設計的系統，包括文件、SDK、除錯工具的易用性。</li>
    <li><strong>業務風險管理</strong>：能識別技術決策對業務的潛在風險（如「這個單點依賴可能在下次大促時成為瓶頸」），並主動提出緩解方案。</li>
  </ul>

  <h3>如何在面試中展現更高層級的思維</h3>

  <table>
    <thead>
      <tr><th>目標層級</th><th>具體展現方式</th><th>話術示例</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>Entry → Junior</td>
        <td>每個技術選擇都說出「為什麼」</td>
        <td>「我選擇 PostgreSQL 而非 MongoDB，因為我們有複雜的 JOIN 需求和 ACID 事務要求。」</td>
      </tr>
      <tr>
        <td>Junior → Mid</td>
        <td>主動說出降級策略和故障情境</td>
        <td>「我的設計中有個潛在的 SPOF：Redis 節點。如果 Redis 失效，我會讓服務降級到直接讀取資料庫，但會加入熔斷器防止雪崩。」</td>
      </tr>
      <tr>
        <td>Mid → Senior</td>
        <td>加入監控、成本、部署維度</td>
        <td>「這個設計的月費大約 $X，其中 Y 是最大的成本項目。部署上我會用 Blue-Green Deployment，確保零停機升級。監控方面，我會追蹤 p99 延遲、快取命中率和資料庫連線池使用率。」</td>
      </tr>
      <tr>
        <td>Senior → Staff</td>
        <td>提出通用化和組織影響</td>
        <td>「這個限流服務的設計可以抽象成一個通用的 Rate Limiting Platform，讓公司所有 API 都能使用，避免每個團隊重複實作。我會設計一個自助式介面，讓業務團隊可以自己配置限流策略。」</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="info" title="面試後的成長策略">
    無論面試結果如何，每次系統設計面試都是學習機會：<br/>
    1. <strong>面試後立即記錄</strong>：在 30 分鐘內寫下面試題目、你的回答、面試官的追問和提示。記憶在幾小時後就會開始衰退。<br/>
    2. <strong>事後研究</strong>：查閱相關的公司技術部落格（Airbnb Engineering、Uber Engineering、Meta Engineering、AWS Architecture Blog）了解真實的系統設計決策。<br/>
    3. <strong>模擬面試</strong>：找同事或使用 Pramp / interviewing.io 進行模擬練習，習慣在壓力下清晰表達。特別要練習大聲說出思考過程（Think Aloud）。<br/>
    4. <strong>建立知識地圖</strong>：為每個系統設計主題建立筆記，記錄「設計決策點」「典型 Trade-off」和「面試中常見的追問」。<br/>
    5. <strong>閱讀系統設計書籍</strong>：《Designing Data-Intensive Applications》（DDIA）是必讀書，涵蓋了面試中 80% 的核心概念。
  </callout-box>
</section>
`,
} satisfies ChapterContent;
