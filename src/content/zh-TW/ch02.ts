import type { ChapterContent } from '../../types.js';

export default {
  title: '容量估算與規模思考',
  content: `
<section id="estimation-basics">
  <h2>估算的基本思維</h2>
  <p>
    容量估算（Capacity Estimation）是系統設計面試中的必考環節，也是工程師日常工作的核心能力。
    估算不是要你算出精確答案——它的目的是<strong>讓你的設計決策有數字依據</strong>，並在溝通時建立共識。
  </p>
  <p>
    物理學家費米（Enrico Fermi）有一種著名的估算技巧，後人稱為「費米估算（Fermi Estimation）」：
    透過已知的基本數字，用乘除法快速得出合理的量級答案，而不需要精確計算。
    系統設計的容量估算本質上相同——你需要的不是精確值，而是「量級正確」。
  </p>

  <h3>費米估算法：從已知推未知</h3>
  <p>費米估算的核心技巧是：<strong>把大問題分解成若干已知的小問題，相乘得出答案</strong>。</p>
  <p>經典例子：「台北市有多少個鋼琴調音師？」</p>
  <pre data-lang="text"><code class="language-text">費米估算：台北市的鋼琴調音師數量
=================================
台北市人口：270 萬人
平均家庭人數：3 人 → 90 萬個家庭
擁有鋼琴的家庭比例（估算）：5% → 4.5 萬架鋼琴
商業場所（學校、琴行）鋼琴數量：民宅的 20% → 約 9,000 架
總鋼琴數量：4.5 萬 + 0.9 萬 ≈ 5.4 萬架

每架鋼琴每年調音次數：1 次
每位調音師每天調音數量：3 架，工作 250 天/年 → 750 架/年

所需調音師數量 = 54,000 / 750 ≈ 72 人

→ 量級答案：台北大約有數十位鋼琴調音師（現實：約 50-100 位）</code></pre>

  <h3>系統設計的快速心算技巧</h3>
  <p>面試中需要快速心算，以下是幾個常用的簡化技巧：</p>
  <table>
    <thead>
      <tr>
        <th>技巧</th>
        <th>說明</th>
        <th>範例</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>一天 ≈ 10 萬秒</td>
        <td>86,400 ≈ 10<sup>5</sup>，方便計算 QPS</td>
        <td>1 億次操作/天 ÷ 10 萬秒 ≈ 1,000 QPS</td>
      </tr>
      <tr>
        <td>1 GB ≈ 10 億 bytes</td>
        <td>用十進位（10<sup>9</sup>）而非精確的 2<sup>30</sup></td>
        <td>每條記錄 100 bytes，1 億條 = 10 GB</td>
      </tr>
      <tr>
        <td>讀寫比通常 10:1 或以上</td>
        <td>大多數系統讀遠多於寫</td>
        <td>1,000 Write QPS → 10,000 Read QPS</td>
      </tr>
      <tr>
        <td>峰值 ≈ 平均 × 3</td>
        <td>保守的峰值倍數估算</td>
        <td>平均 1,000 QPS → 峰值設計 3,000 QPS</td>
      </tr>
      <tr>
        <td>壓縮比約 3:1</td>
        <td>文字資料壓縮後約縮小到 1/3</td>
        <td>100 GB 文字 → 壓縮後 ~33 GB</td>
      </tr>
    </tbody>
  </table>

  <h3>估算的基本單位：2 的冪次方</h3>
  <p>記住這些數字，讓你在白板前能快速心算：</p>
  <table>
    <thead>
      <tr>
        <th>次方</th>
        <th>近似值</th>
        <th>完整名稱</th>
        <th>縮寫</th>
        <th>常見場景</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>2<sup>10</sup></td><td>1 千（1,000）</td><td>Kilobyte</td><td>KB</td><td>一封電子郵件</td></tr>
      <tr><td>2<sup>20</sup></td><td>1 百萬（1,000,000）</td><td>Megabyte</td><td>MB</td><td>一張高解析照片</td></tr>
      <tr><td>2<sup>30</sup></td><td>10 億（10<sup>9</sup>）</td><td>Gigabyte</td><td>GB</td><td>一部 HD 電影</td></tr>
      <tr><td>2<sup>40</sup></td><td>1 兆（10<sup>12</sup>）</td><td>Terabyte</td><td>TB</td><td>1 TB 硬碟</td></tr>
      <tr><td>2<sup>50</sup></td><td>1000 兆（10<sup>15</sup>）</td><td>Petabyte</td><td>PB</td><td>Facebook 每日資料量</td></tr>
    </tbody>
  </table>

  <h3>時間單位速查</h3>
  <table>
    <thead>
      <tr><th>時間單位</th><th>秒數（近似）</th><th>換算記憶技巧</th></tr>
    </thead>
    <tbody>
      <tr><td>1 分鐘</td><td>60 秒</td><td>—</td></tr>
      <tr><td>1 小時</td><td>3,600 秒</td><td>60 × 60</td></tr>
      <tr><td>1 天</td><td>86,400 秒（≈ 10<sup>5</sup>）</td><td>24 × 3,600</td></tr>
      <tr><td>1 個月</td><td>2,592,000 秒（≈ 2.5 × 10<sup>6</sup>）</td><td>30 × 86,400</td></tr>
      <tr><td>1 年</td><td>31,536,000 秒（≈ 3 × 10<sup>7</sup>）</td><td>365 × 86,400</td></tr>
    </tbody>
  </table>

  <h3>常用數字速查表</h3>
  <table>
    <thead>
      <tr>
        <th>常數</th>
        <th>值</th>
        <th>用途</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>全球網路用戶</td><td>~50 億</td><td>估算全球服務規模上限</td></tr>
      <tr><td>全球智慧型手機用戶</td><td>~40 億</td><td>行動優先服務的規模基準</td></tr>
      <tr><td>平均 HTTP Request 大小</td><td>~1 KB</td><td>API 頻寬估算</td></tr>
      <tr><td>平均 API Response 大小</td><td>~5-10 KB</td><td>讀取頻寬估算</td></tr>
      <tr><td>SHA-256 Hash 大小</td><td>32 bytes</td><td>URL 縮短、去重</td></tr>
      <tr><td>UUID 大小</td><td>16 bytes（128 bits）</td><td>分散式 ID 儲存成本</td></tr>
      <tr><td>一般關聯式資料庫 Row</td><td>100-500 bytes</td><td>資料庫儲存估算</td></tr>
      <tr><td>Redis 連線數上限（單機）</td><td>~10,000</td><td>連線池設計參考</td></tr>
      <tr><td>PostgreSQL 最大 QPS（單機）</td><td>~5,000-10,000</td><td>資料庫擴展決策點</td></tr>
    </tbody>
  </table>

  <callout-box type="tip" title="估算的精神：量級正確比精確值重要">
    估算時不需要算到小數點。重點是量級（Order of Magnitude）是否正確：
    10 QPS、100 QPS、1,000 QPS、10,000 QPS 是四個截然不同的系統設計挑戰。
    估算錯一倍（例如算出 1,000 QPS 但實際是 2,000 QPS）通常可以接受，
    但錯十倍就會導致設計完全錯誤。面試官關注的是你的思考邏輯，而非精確答案。
  </callout-box>
</section>

<section id="qps-storage-bandwidth">
  <h2>QPS、儲存與頻寬估算</h2>
  <p>
    三個最常見的估算維度是：每秒查詢數（QPS）、儲存量（Storage）、和頻寬（Bandwidth）。
    它們各自影響不同的系統設計決策：QPS 決定伺服器與快取規模，儲存量決定資料庫選型，頻寬決定 CDN 需求。
  </p>
  <arch-diagram src="./diagrams/ch02-capacity-estimation.json" caption="容量估算的三個維度：QPS 驅動計算層設計、儲存量驅動資料層設計、頻寬驅動網路層設計"></arch-diagram>

  <h3>互動式容量試算</h3>
  <p>調整下方參數，即時看到不同規模下的系統需求：</p>
  <capacity-calc
    data-label="社群媒體貼文系統"
    data-default-dau="10000000"
    data-write-per-user="2"
    data-read-per-user="10"
    data-avg-record-bytes="500">
  </capacity-calc>

  <h3>案例一：Instagram 容量估算</h3>
  <p>設計 Instagram 照片分享功能，假設：</p>
  <pre data-lang="text"><code class="language-text">基本假設：
  DAU = 1 億用戶
  每位用戶每天上傳 0.05 張照片（即 1/20 用戶每天上傳 1 張）
  每位用戶每天瀏覽 20 張照片
  每張照片原圖大小：3 MB，縮圖（thumbnail）：100 KB

QPS 計算：
  寫入 QPS = 1 億 × 0.05 / 86,400 ≈ 58 Write QPS
  讀取 QPS = 1 億 × 20 / 86,400 ≈ 23,148 Read QPS
  峰值讀取 QPS = 23,148 × 3 ≈ 70,000 Read QPS
  讀寫比 = 23,148 / 58 ≈ 400:1 → 典型的讀多寫少系統

儲存計算：
  每天新照片數 = 58 × 86,400 ≈ 500 萬張
  每天原圖儲存 = 500 萬 × 3 MB = 15 TB / 天
  每天縮圖儲存 = 500 萬 × 100 KB = 500 GB / 天
  5 年原圖儲存 = 15 TB × 365 × 5 ≈ 27 PB
  5 年縮圖儲存 = 500 GB × 365 × 5 ≈ 900 TB

頻寬計算：
  讀取頻寬（假設每次請求回傳 10 張縮圖）：
  每次請求大小 = 10 × 100 KB = 1 MB
  峰值頻寬 = 70,000 QPS × 1 MB = 70 GB/s
  → 必須使用 CDN！直接從原始伺服器服務是不可能的。

架構決策推導：
  ✓ 照片原圖 → 物件儲存（AWS S3 / GCS）
  ✓ 縮圖 → CDN 快取（CloudFront / Akamai）
  ✓ 照片元資料（URL、用戶ID等）→ 關聯式資料庫（MySQL）
  ✓ 用戶 Feed 快取 → Redis / Memcached
  ✓ 高讀取 QPS → Read Replica × 多個</code></pre>

  <h3>案例二：Twitter 容量估算</h3>
  <pre data-lang="text"><code class="language-text">基本假設：
  DAU = 1 億用戶
  每位用戶每天發 2 則推文（寫）
  每位用戶每天讀 100 則時間軸內容（讀）
  每則推文：文字（140 bytes）+ 元資料（160 bytes）= 300 bytes
  10% 的推文含媒體（圖片平均 200 KB）

QPS 計算：
  寫入 QPS = 1 億 × 2 / 86,400 ≈ 2,315 Write QPS
  峰值寫入 QPS ≈ 7,000 Write QPS
  讀取 QPS = 1 億 × 100 / 86,400 ≈ 115,741 Read QPS
  峰值讀取 QPS ≈ 350,000 Read QPS
  讀寫比 = 115,741 / 2,315 ≈ 50:1

儲存計算：
  推文文字：每天 = 2,315 × 86,400 × 300 bytes ≈ 60 GB / 天
  媒體檔案：每天 = 2,315 × 10% × 86,400 × 200 KB ≈ 4 TB / 天
  5 年文字：60 GB × 365 × 5 ≈ 109 TB
  5 年媒體：4 TB × 365 × 5 ≈ 7.3 PB

頻寬計算：
  讀取頻寬 = 350,000 QPS × 103 KB（每次回傳 10 則含縮圖）≈ 36 GB/s

架構決策推導：
  ✓ 推文資料 → MySQL（時序資料，需支援 Sharding by Tweet ID）
  ✓ 用戶關係（Follow/Follower）→ 圖資料庫 或 關聯式資料庫
  ✓ Timeline 快取 → Redis（以用戶 ID 為 Key 的 Sorted Set）
  ✓ Fan-out 服務 → 非同步訊息佇列（Kafka）
  ✓ 熱門推文（Trending）→ 獨立快取層</code></pre>

  <h3>案例三：YouTube 容量估算</h3>
  <pre data-lang="text"><code class="language-text">基本假設：
  DAU = 5 億用戶
  每位用戶每天觀看 5 支影片（讀）
  每分鐘上傳 500 小時的影片（寫）
  每支影片平均時長：7 分鐘
  原始影片大小：1 GB/小時 = 700 MB（7 分鐘）
  轉碼後多解析度：原始大小 × 3（720p、1080p、4K）= 2.1 GB

上傳 QPS 計算：
  每分鐘上傳 500 小時 = 30,000 秒的影片
  上傳 QPS（以影片計）= 500 小時 × 60 分鐘/小時 / 60 秒 ≈ 500 影片/分鐘

儲存計算：
  每分鐘新增原始影片：500 小時 × 1 GB = 500 GB / 分鐘
  每天新增原始影片：500 GB × 60 × 24 ≈ 720 TB / 天
  每天儲存（含轉碼）：720 TB × 3 ≈ 2.16 PB / 天
  1 年儲存：2.16 PB × 365 ≈ 788 PB ≈ 0.8 EB

讀取頻寬：
  每天觀看 = 5 億 × 5 影片 × 7 分鐘 × 60 秒 ≈ 1.05 兆秒的影片觀看
  頻寬（假設 1080p = 5 Mbps）= 5 億 × 5 / 86,400 × 5 Mbps ≈ 145 Tbps（峰值）

架構決策推導：
  ✓ 影片儲存 → 分散式物件儲存（GCS 或自建 Colossus）
  ✓ 轉碼 → 大規模非同步工作佇列（轉碼是 CPU 密集任務）
  ✓ 影片串流 → 全球 CDN，就近快取熱門影片
  ✓ 影片元資料 → 關聯式資料庫 + 搜尋引擎（Elasticsearch）
  ✓ 推薦系統 → 離線 ML 模型，結果存入 Redis</code></pre>

  <callout-box type="info" title="Peak vs Average 的重要性">
    系統設計要針對<strong>峰值（Peak）</strong>而非平均值設計容量。通常峰值是平均值的 2～5 倍，
    例如新聞事件爆發、跨年夜、雙十一等。如果你只按平均 QPS 設計，系統在峰值時必然崩潰。
    在估算時，乘以 3x 峰值係數是常見的保守作法。
  </callout-box>

  <h3>從估算到架構決策的轉換矩陣</h3>
  <table>
    <thead>
      <tr>
        <th>估算結果</th>
        <th>觸發的架構決策</th>
        <th>具體方案</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>讀取 QPS &gt; 10,000</td>
        <td>需要快取層</td>
        <td>Redis Cluster / Memcached</td>
      </tr>
      <tr>
        <td>寫入 QPS &gt; 5,000</td>
        <td>單一資料庫節點不夠</td>
        <td>分片（Sharding）或 NoSQL</td>
      </tr>
      <tr>
        <td>儲存 &gt; 1 TB</td>
        <td>需要分散式儲存</td>
        <td>HDFS、S3、GCS</td>
      </tr>
      <tr>
        <td>媒體檔案 &gt; 10 TB</td>
        <td>需要 CDN</td>
        <td>CloudFront、Akamai</td>
      </tr>
      <tr>
        <td>讀寫比 &gt; 10:1</td>
        <td>讀寫分離</td>
        <td>Primary + Read Replica</td>
      </tr>
      <tr>
        <td>跨洲際用戶</td>
        <td>多區域部署</td>
        <td>Multi-region Active-Active</td>
      </tr>
    </tbody>
  </table>
</section>

<section id="latency-numbers">
  <h2>每位工程師都應該知道的延遲數字</h2>
  <p>
    Jeff Dean（Google 傑出工程師）整理的「每個工程師都應該記住的延遲數字」，
    是系統設計思考的基石。這些數字告訴你：在整條請求鏈路上，哪一段是瓶頸，
    以及為什麼特定的架構選擇能帶來大幅效能提升。
  </p>

  <h3>Jeff Dean 延遲數字完整表（2023 年更新版）</h3>
  <table>
    <thead>
      <tr>
        <th>操作</th>
        <th>延遲</th>
        <th>相對倍數（以 L1 快取為基準）</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>L1 快取存取</td>
        <td>0.5 ns</td>
        <td>1×</td>
      </tr>
      <tr>
        <td>分支預測失誤（Branch Misprediction）</td>
        <td>5 ns</td>
        <td>10×</td>
      </tr>
      <tr>
        <td>L2 快取存取</td>
        <td>7 ns</td>
        <td>14×</td>
      </tr>
      <tr>
        <td>Mutex 鎖定/解鎖</td>
        <td>25 ns</td>
        <td>50×</td>
      </tr>
      <tr>
        <td>主記憶體（RAM）存取</td>
        <td>100 ns</td>
        <td>200×</td>
      </tr>
      <tr>
        <td>1KB 資料 Zippy 壓縮</td>
        <td>3,000 ns = 3 μs</td>
        <td>6,000×</td>
      </tr>
      <tr>
        <td>在 1Gbps 網路上發送 1KB</td>
        <td>10,000 ns = 10 μs</td>
        <td>20,000×</td>
      </tr>
      <tr>
        <td>SSD 隨機讀取（4KB）</td>
        <td>150,000 ns = 150 μs</td>
        <td>300,000×</td>
      </tr>
      <tr>
        <td>從記憶體循序讀取 1MB</td>
        <td>250,000 ns = 250 μs</td>
        <td>500,000×</td>
      </tr>
      <tr>
        <td>同資料中心來回（RTT）</td>
        <td>500,000 ns = 0.5 ms</td>
        <td>1,000,000×</td>
      </tr>
      <tr>
        <td>從 SSD 循序讀取 1MB</td>
        <td>1,000,000 ns = 1 ms</td>
        <td>2,000,000×</td>
      </tr>
      <tr>
        <td>硬碟（HDD）尋道時間（Seek）</td>
        <td>10,000,000 ns = 10 ms</td>
        <td>20,000,000×</td>
      </tr>
      <tr>
        <td>從硬碟循序讀取 1MB</td>
        <td>20,000,000 ns = 20 ms</td>
        <td>40,000,000×</td>
      </tr>
      <tr>
        <td>封包跨大西洋來回（加州⇄荷蘭 RTT）</td>
        <td>150,000,000 ns = 150 ms</td>
        <td>300,000,000×</td>
      </tr>
    </tbody>
  </table>

  <h3>儲存媒體的速度對比</h3>
  <table>
    <thead>
      <tr>
        <th>儲存類型</th>
        <th>隨機讀取延遲</th>
        <th>循序讀取吞吐量</th>
        <th>相對成本（每 GB）</th>
        <th>適合用途</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>CPU 暫存器</td>
        <td>&lt; 1 ns</td>
        <td>TB/s 級</td>
        <td>極高</td>
        <td>CPU 運算中間值</td>
      </tr>
      <tr>
        <td>L1/L2 快取（SRAM）</td>
        <td>1-10 ns</td>
        <td>數百 GB/s</td>
        <td>極高</td>
        <td>CPU 快取（自動管理）</td>
      </tr>
      <tr>
        <td>主記憶體（DRAM）</td>
        <td>~100 ns</td>
        <td>~50 GB/s</td>
        <td>高（$3-5/GB）</td>
        <td>作業系統、應用程式、Redis</td>
      </tr>
      <tr>
        <td>NVMe SSD</td>
        <td>~70 μs</td>
        <td>~7 GB/s</td>
        <td>中（$0.1-0.2/GB）</td>
        <td>資料庫主要儲存</td>
      </tr>
      <tr>
        <td>SATA SSD</td>
        <td>~150 μs</td>
        <td>~550 MB/s</td>
        <td>低（$0.05-0.1/GB）</td>
        <td>一般應用伺服器</td>
      </tr>
      <tr>
        <td>HDD（機械硬碟）</td>
        <td>~10 ms</td>
        <td>~150 MB/s</td>
        <td>極低（$0.01-0.02/GB）</td>
        <td>冷資料歸檔、備份</td>
      </tr>
      <tr>
        <td>物件儲存（S3）</td>
        <td>~1-5 ms（首位元組）</td>
        <td>~100 MB/s</td>
        <td>極低（$0.023/GB/月）</td>
        <td>媒體文件、靜態資源</td>
      </tr>
    </tbody>
  </table>

  <h3>延遲數字如何驅動設計決策</h3>
  <ul>
    <li>
      <strong>記憶體比磁碟快 10 萬倍：</strong>這就是為什麼 Redis 快取能把 API 延遲從 10ms 降到 0.1ms。
      任何需要低延遲的資料，都應該考慮放在記憶體中。Redis 的讀取延遲約 0.1ms，
      而 PostgreSQL 的磁碟查詢（無快取）約 10-100ms——差距 100-1000 倍。
    </li>
    <li>
      <strong>網路 I/O 比本地記憶體慢 1,000 倍：</strong>微服務之間的呼叫代價不小。
      頻繁的跨服務呼叫（chatty communication）是效能殺手，應盡量批次處理（batching）。
      一個「微服務調用鏈」有 10 次跨服務請求，光是網路延遲就累積 5-10ms。
    </li>
    <li>
      <strong>SSD 比 HDD 快 100 倍（隨機讀取）：</strong>現代資料庫（PostgreSQL、MySQL）部署在 SSD 上，
      IOPS 從 HDD 的 100-200 IOPS 提升到 NVMe 的 500,000+ IOPS。設計 IOPS 密集的工作負載時，優先考慮 SSD。
    </li>
    <li>
      <strong>跨洲際延遲是 150ms：</strong>台灣用戶連到歐洲伺服器，光是一次 RTT 就消耗 150ms。
      這就是 CDN 和 Edge Computing 存在的理由——把靜態資源和計算推近用戶。
    </li>
  </ul>

  <h3>延遲預算分析（Latency Budget Analysis）</h3>
  <p>
    設計 API 時，可以對每個步驟進行「延遲預算分析」，找出優化重點：
  </p>
  <pre data-lang="text"><code class="language-text">API 請求的延遲分解（目標：P99 &lt; 200ms）

1. DNS 查詢：~1 ms（可被本地 DNS 快取消除）
2. TCP 三次握手：~1 RTT = 20 ms（同地區）
3. TLS 握手：~1-2 RTT = 20-40 ms（可用 TLS Session Resume 降至 0.5 RTT）
4. Load Balancer 轉發：~0.5 ms
5. App Server 處理：
   a. 讀取 Redis 快取：0.1-1 ms
   b. Cache Miss → 查詢 PostgreSQL：5-20 ms
   c. 業務邏輯計算：1-5 ms
6. 序列化 JSON 回應：0.1-1 ms
7. 網路傳輸回客戶端：~5 ms（同地區）

總計（快取命中）：~30-70 ms ✓
總計（快取未命中）：~50-100 ms ✓（仍在預算內）

關鍵發現：
  - TLS 握手佔比最大，可用 HTTP/2 + Session Reuse 優化
  - 資料庫查詢是主要變數，快取命中率每提高 10%，P99 改善約 15ms</code></pre>

  <callout-box type="tip" title="建立你的「直覺延遲感」">
    優秀的系統設計師對延遲有一種直覺感。當有人說「讀 Redis 很快」，你腦中應該立刻出現「0.1-1ms」；
    當有人說「資料庫查詢」，你應該想到「1-10ms」。這種直覺感讓你在設計時，
    能快速評估某個方案的延遲是否可接受，而不需要每次都去查資料。
  </callout-box>
</section>

<section id="traffic-patterns">
  <h2>Traffic Pattern 分析</h2>
  <p>
    不同的流量模式需要不同的系統設計應對策略。理解你的流量形狀，
    是選擇正確架構的前提。同一個系統在不同時間、不同事件觸發下，可能展現截然不同的流量模式。
  </p>

  <h3>均勻流量 vs 突發流量</h3>
  <table>
    <thead>
      <tr>
        <th>流量類型</th>
        <th>特徵</th>
        <th>典型場景</th>
        <th>應對策略</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>均勻流量（Uniform）</td>
        <td>全天分布平均，無明顯峰谷</td>
        <td>B2B API、批次處理任務</td>
        <td>固定容量規劃（Reserved Instance）</td>
      </tr>
      <tr>
        <td>日間高峰（Diurnal）</td>
        <td>白天高、深夜低，呈正弦波形</td>
        <td>大多數消費者應用</td>
        <td>Auto-scaling 根據時間預測</td>
      </tr>
      <tr>
        <td>突發流量（Bursty）</td>
        <td>平時低、突然飆升（如新聞、促銷）</td>
        <td>電商大促、現場活動、Breaking News</td>
        <td>預熱機制、速率限制、排隊系統</td>
      </tr>
      <tr>
        <td>季節性流量（Seasonal）</td>
        <td>特定時間週期性高峰</td>
        <td>電商（雙十一）、報稅系統（4 月）</td>
        <td>提前擴容計劃、容量預購</td>
      </tr>
      <tr>
        <td>全球分散流量（Global）</td>
        <td>隨時區不同，高峰在不同時間出現</td>
        <td>全球性產品（Netflix、Google）</td>
        <td>多區域部署、流量路由到就近節點</td>
      </tr>
    </tbody>
  </table>

  <h3>不同業務的流量模式分析</h3>

  <h3>社群媒體（Instagram/Twitter）</h3>
  <pre data-lang="text"><code class="language-text">流量特徵：
  - 強烈的日間規律（早通勤、午休、晚餐後 = 三個峰值）
  - 突發事件（新聞、名人動態）導致瞬間峰值 10-100 倍
  - 地理分布跟隨時區移動

峰值估算（以台灣為例）：
  - 平日峰值：晚間 9-11 PM（平均流量 × 3-5 倍）
  - 重大事件（選舉開票日）：平均 × 50 倍
  - 設計容量目標：處理正常峰值 × 5（留餘量）

應對策略：
  - Auto-scaling 預設在 8 PM 提前 30 分鐘擴容
  - Twitter 的「Thundering Herd」問題：名人發文後，
    數百萬粉絲的 Feed 需要同時更新 → 使用訊息佇列平滑化</code></pre>

  <h3>電商平台（雙十一 / Black Friday）</h3>
  <pre data-lang="text"><code class="language-text">流量特徵：
  - 活動開始瞬間（零點/整點）出現最大峰值
  - 峰值持續 30-60 分鐘後逐漸平緩
  - 支付系統是關鍵瓶頸（強一致性要求）

峰值估算：
  - 阿里巴巴雙十一 2023：零點交易峰值 ~58 萬筆/秒
  - 一般電商：節日峰值是平日的 50-200 倍

應對策略：
  1. 提前 2 週進行容量壓測，確認峰值承載能力
  2. 庫存扣減使用 Redis 原子操作（DECR）+ 非同步落庫
  3. 訂單系統啟動「降級策略」：暫停非核心功能（推薦、歷史記錄）
  4. 虛擬等待室（Virtual Queue）：超過 QPS 上限的請求進入排隊
  5. 活動前 1 小時「預熱」CDN 快取，把靜態頁面推至邊緣節點</code></pre>

  <h3>視訊串流（Netflix / YouTube）</h3>
  <pre data-lang="text"><code class="language-text">流量特徵：
  - 帶寬密集型（每個連線佔用 5-25 Mbps）
  - 高度可預測的日間高峰（晚間 8-11 PM）
  - Netflix 在北美高峰時段佔整體網際網路流量的 ~15%

峰值估算（Netflix 北美）：
  - 全美約 7,000 萬訂閱戶，高峰同時在線 ~15-20%
  - 同時連線數：約 1,000-1,400 萬
  - 頻寬需求：1,000 萬 × 5 Mbps（SD）= 50 Tbps

應對策略：
  - Open Connect（Netflix 自建 CDN）直接部署在 ISP 機房
  - 熱門影片在高峰前預先推到邊緣節點快取
  - Adaptive Bitrate Streaming（ABR）：根據頻寬動態調整畫質
  - 使用 UDP-based QUIC 改善弱網下的串流體驗</code></pre>

  <h3>突發流量的設計挑戰</h3>
  <p>
    假設你設計了一個抽獎活動頁面，平時 QPS 為 100，但活動開始瞬間預計有 50,000 人同時湧入。
    這種 500x 的瞬間流量倍增，對系統的各個層次都是挑戰：
  </p>
  <ul>
    <li><strong>應用層：</strong>Auto-scaling 需要時間（通常 1-3 分鐘），無法應對瞬間突增。需要預熱（Pre-warming）。</li>
    <li><strong>資料庫層：</strong>連線池（Connection Pool）滿了會直接拒絕請求。需要限流（Rate Limiting）保護。</li>
    <li><strong>快取層：</strong>快取預先載入（Cache Warming）可以避免所有請求同時打到資料庫。</li>
    <li><strong>排隊機制：</strong>讓用戶進入虛擬等待室（Virtual Queue），平滑地釋放流量。</li>
  </ul>

  <h3>全球流量分佈的設計考量</h3>
  <p>如果你的產品有全球用戶，必須考慮時區對流量的影響：</p>
  <pre data-lang="text"><code class="language-text">全球流量時區分析範例（以一天 24 小時為例）

UTC 00:00-06:00（台灣 08:00-14:00）：
  亞洲用戶（台灣、日本、韓國）處於工作高峰
  歐洲用戶剛起床（使用量開始上升）
  美國用戶在睡眠（使用量最低）
  → 亞太區伺服器負載高

UTC 12:00-18:00（台灣 20:00-02:00）：
  美國東岸用戶處於工作高峰
  歐洲用戶在下班後休閒
  亞洲用戶在夜間（使用量下降）
  → 美東區伺服器負載高

設計啟示：
  - 採用 Multi-region Active-Active 架構，各區域獨立服務
  - 使用 Anycast DNS 或 GeoDNS 把用戶導向最近的區域
  - 跨區域資料複製延遲需納入設計（通常 50-150ms）
  - 「Follow the Sun」資料庫：寫入流量根據時間自動切換 Primary 所在區域</code></pre>

  <h3>用「漏斗模型」分析瓶頸</h3>
  <p>
    系統的最終 QPS 受限於鏈路中最細的瓶頸。分析方式：
  </p>
  <pre data-lang="text"><code class="language-text">用戶請求 → Load Balancer → App Server → Cache → DB

每層容量（假設）：
  Load Balancer：100,000 QPS
  App Server（10 台 × 2,000 QPS）：20,000 QPS  ← 瓶頸
  Redis Cache：80,000 QPS
  PostgreSQL：5,000 QPS（若 Cache Miss 率 10% → 2,000 QPS 到 DB）

→ 瓶頸在 App Server 層，需要水平擴展或優化單機吞吐量

優化選項：
  1. 水平擴展 App Server（加到 20 台）→ 容量翻倍至 40,000 QPS
  2. 提高快取命中率（90% → 98%）→ DB 壓力從 2,000 降至 400 QPS
  3. 異步非阻塞框架（Node.js/Golang）→ 單機 QPS 從 2,000 提升至 10,000</code></pre>

  <callout-box type="warning" title="長尾效應（Long Tail）">
    流量分析時要注意長尾效應：少數熱門資源（熱點 Key）可能佔據絕大部分請求。
    例如，全球 1% 的 YouTube 影片貢獻了 90% 的觀看次數。
    這些熱點需要特別的快取策略（多層快取、本地快取），否則單一快取節點也可能成為瓶頸。
    在 Redis 中，如果一個 Key 每秒被請求 100,000 次，即使是 Redis 也可能因為單點熱點而限速。
    解法是：把熱點 Key 複製到多個 Redis 節點，用隨機後綴分散請求（Hot Key Sharding）。
  </callout-box>

  <h3>容量估算的完整流程（面試模板）</h3>
  <ol>
    <li>確認 DAU（日活用戶數）與 MAU（月活用戶數）</li>
    <li>估算每個用戶的讀寫行為（次數 × 資料大小）</li>
    <li>計算平均 QPS = (DAU × 操作次數) / 86,400</li>
    <li>計算峰值 QPS = 平均 × 3（保守估算）</li>
    <li>計算每日儲存增量 = Write QPS × 86,400 × 每筆資料大小</li>
    <li>估算 5 年總儲存量</li>
    <li>計算頻寬需求 = 讀取 QPS × 每次回應大小</li>
    <li>根據以上數字，決定架構層次（是否需要快取、CDN、分片）</li>
    <li>識別全球流量分佈，決定是否需要多區域部署</li>
    <li>估算成本（作為架構選擇的參考）</li>
  </ol>

  <callout-box type="tip" title="估算後的自我驗證">
    估算完成後，做一個「常識檢查」：你估算的 QPS 數字合理嗎？如果一個功能需要 100 萬台伺服器，
    可能你的估算哪裡出了問題，或者問題規模需要重新確認。現實中的大型系統，
    通常運行在數百至數千台伺服器上（Google、Facebook 等超大規模除外）。
  </callout-box>
</section>
`,
} satisfies ChapterContent;
