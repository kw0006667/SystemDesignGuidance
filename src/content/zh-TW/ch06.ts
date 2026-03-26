import type { ChapterContent } from '../../types.js';

export default {
  title: '資料庫設計與選型',
  content: `
<section id="sql-vs-nosql">
  <h2>關聯式 vs 非關聯式資料庫</h2>
  <p>
    在系統設計面試中，「你會選擇 SQL 還是 NoSQL？」是高頻問題。
    正確答案從來不是「SQL 比 NoSQL 好」或相反——而是<strong>根據你的資料模型、存取模式、一致性需求，選擇最合適的工具</strong>。
  </p>
  <arch-diagram src="./diagrams/ch06-database-design.json" caption="資料庫選型全景：從關聯式到各類 NoSQL，不同資料庫針對不同存取模式做了各自的設計取捨"></arch-diagram>

  <h3>關聯式資料庫（RDBMS）的核心特性</h3>
  <p>
    關聯式資料庫（如 PostgreSQL、MySQL）的設計哲學是：資料有<strong>嚴格的結構（Schema）</strong>，
    表格之間透過外鍵（Foreign Key）建立關係，並以 SQL 語言查詢。
  </p>
  <ul>
    <li><strong>ACID 保證：</strong>原子性、一致性、隔離性、持久性（詳見 ACID vs BASE 小節）</li>
    <li><strong>結構化資料：</strong>每一行都有固定的欄位，欄位類型嚴格定義；Schema 在寫入前就必須確定</li>
    <li><strong>靈活查詢：</strong>SQL 支援複雜的 JOIN、聚合、視窗函數、子查詢</li>
    <li><strong>成熟生態：</strong>ORM、資料庫遷移工具、備份方案、監控工具都非常完善</li>
    <li><strong>垂直擴展為主：</strong>傳統上以更強的機器應對更高負載；水平分片（Sharding）複雜度高</li>
  </ul>

  <h3>NoSQL 資料庫的核心特性</h3>
  <p>
    NoSQL（Not Only SQL）並非單一技術，而是一個大家族，共同特點是：
    放棄部分 ACID 保證，換取<strong>水平擴展能力、靈活的資料模型、或極致的讀寫效能</strong>。
  </p>
  <ul>
    <li><strong>Schema-less：</strong>文件資料庫（如 MongoDB）允許每一條記錄有不同的欄位，Schema 可以演進</li>
    <li><strong>水平擴展：</strong>設計上就支援 Sharding（分片），可輕易擴展到 PB 級資料</li>
    <li><strong>針對特定模式優化：</strong>鍵值存儲、圖資料庫、時間序列資料庫各有最佳化場景</li>
    <li><strong>最終一致性為主：</strong>犧牲強一致性換取高可用性和分區容忍性（CAP 定理的取捨）</li>
  </ul>

  <h3>真實世界的選型案例</h3>
  <table>
    <thead>
      <tr>
        <th>公司 / 產品</th>
        <th>資料庫選擇</th>
        <th>原因</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Facebook（用戶資料）</td>
        <td>MySQL（分片）</td>
        <td>用戶資料需要強一致性、複雜關聯查詢；透過大量分片達到水平擴展</td>
      </tr>
      <tr>
        <td>Twitter（推文存儲）</td>
        <td>MySQL + Cassandra</td>
        <td>MySQL 存核心用戶資料；Cassandra 存 Timeline（寫入密集、時序存取）</td>
      </tr>
      <tr>
        <td>Instagram</td>
        <td>PostgreSQL</td>
        <td>強一致性、複雜查詢；PostGIS 擴充支援地理位置</td>
      </tr>
      <tr>
        <td>Netflix（觀看歷史）</td>
        <td>Cassandra</td>
        <td>每用戶的觀看記錄是典型的寬欄存取模式；全球多 DC 部署</td>
      </tr>
      <tr>
        <td>Uber（行程資料）</td>
        <td>MySQL → Schemaless（自研 Cassandra 封裝）</td>
        <td>早期用 MySQL，規模化後遷移到 NoSQL 以支援更高寫入 QPS</td>
      </tr>
      <tr>
        <td>LinkedIn（社交圖）</td>
        <td>Espresso（自研）+ Voldemort（KV）</td>
        <td>社交關係圖需要超高 QPS 的點查詢；自研 KV 存儲以控制底層</td>
      </tr>
      <tr>
        <td>Discord（訊息存儲）</td>
        <td>Cassandra → ScyllaDB</td>
        <td>訊息是典型的時序寫入；後來遷移到 ScyllaDB（C++ 重寫的 Cassandra，更低延遲）</td>
      </tr>
    </tbody>
  </table>

  <h3>選擇決策樹</h3>
  <table>
    <thead>
      <tr>
        <th>如果你的需求是...</th>
        <th>建議選擇</th>
        <th>關鍵理由</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>需要複雜 JOIN 和事務（金融、訂單）</td>
        <td>PostgreSQL / MySQL</td>
        <td>ACID、SQL 的表達力、成熟的事務支援</td>
      </tr>
      <tr>
        <td>資料 Schema 頻繁變動、結構不固定</td>
        <td>MongoDB</td>
        <td>Schema-less 文件存儲，易於迭代</td>
      </tr>
      <tr>
        <td>需要極高讀寫 QPS（> 100K）、簡單 Key-Value 存取</td>
        <td>Redis / DynamoDB</td>
        <td>O(1) 操作，記憶體存儲，毫秒級延遲</td>
      </tr>
      <tr>
        <td>時間序列資料（監控、IoT、股價）</td>
        <td>InfluxDB / TimescaleDB</td>
        <td>針對時序寫入和範圍查詢優化的壓縮和索引</td>
      </tr>
      <tr>
        <td>社交網絡（關係、最短路徑）</td>
        <td>Neo4j / Amazon Neptune</td>
        <td>多跳圖遍歷比 SQL 遞迴 JOIN 快幾個數量級</td>
      </tr>
      <tr>
        <td>全文搜索（電商搜尋、日誌分析）</td>
        <td>Elasticsearch / OpenSearch</td>
        <td>倒排索引、相關性評分、模糊匹配</td>
      </tr>
      <tr>
        <td>龐大時序或稀疏欄位（IoT、分析）</td>
        <td>Cassandra / HBase</td>
        <td>LSM-Tree 寫入優化、寬欄模型、水平擴展到 PB 級</td>
      </tr>
    </tbody>
  </table>

  <h3>混合使用策略（Polyglot Persistence）</h3>
  <p>
    現代大型系統幾乎都採用混合資料庫策略，針對不同的資料特性使用最適合的資料庫：
  </p>
  <pre data-lang="text"><code class="language-text">典型電商系統的 Polyglot Persistence 架構：

用戶帳號、訂單、支付記錄
  → PostgreSQL（ACID 事務、複雜查詢）

商品目錄（每種商品有不同屬性）
  → MongoDB（Schema-less，靈活屬性）

商品搜索、全文搜尋
  → Elasticsearch（倒排索引、相關性評分）

購物車、Session、限流計數器
  → Redis（低延遲 KV，TTL 管理）

用戶行為日誌、點擊流
  → Cassandra（寫入密集，時序存取）

商品推薦的社交關係圖
  → Neo4j（好友購買了什麼）

系統監控指標、業務 KPI
  → InfluxDB / Prometheus（時序資料，聚合查詢）</code></pre>

  <callout-box type="tip" title="面試回答技巧：不要只選一種">
    在系統設計面試中，說出「我會使用 PostgreSQL 存用戶和訂單，Redis 做快取，
    Elasticsearch 做商品搜索」比單純說「我選 MySQL」更能展現你對各種資料庫特性的理解。
    每個選擇都應該能說出明確的理由。
  </callout-box>
</section>

<section id="database-types">
  <h2>各類型資料庫適用場景</h2>
  <p>
    深入了解每種資料庫類型的設計哲學和代表產品的差異，
    能讓你在面試中自信地說出「我選擇 X 而不是 Y 是因為...」。
  </p>

  <h3>關聯式資料庫（Relational）</h3>
  <p><strong>代表：</strong>PostgreSQL、MySQL、SQLite、Oracle、SQL Server</p>
  <p><strong>核心優勢：</strong>表達力強的查詢語言（SQL）、ACID 事務、成熟的索引機制（B-tree、Hash）</p>
  <p><strong>典型場景：</strong>電商訂單系統、銀行帳務、ERP、用戶認證系統</p>
  <pre data-lang="sql"><code class="language-sql">-- SQL 的強大：複雜多表 JOIN + 視窗函數
SELECT
  u.name,
  COUNT(o.id) AS order_count,
  SUM(o.total) AS revenue,
  RANK() OVER (ORDER BY SUM(o.total) DESC) AS revenue_rank
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.created_at > '2024-01-01'
GROUP BY u.id, u.name
HAVING COUNT(o.id) > 5
ORDER BY revenue DESC
LIMIT 100;</code></pre>

  <h4>PostgreSQL vs MySQL 關鍵差異</h4>
  <table>
    <thead>
      <tr>
        <th>特性</th>
        <th>PostgreSQL</th>
        <th>MySQL (InnoDB)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>JSONB 支援</td>
        <td>原生支援，可建索引</td>
        <td>JSON 欄位，功能較弱</td>
      </tr>
      <tr>
        <td>全文搜索</td>
        <td>內建 tsvector，可不用 Elasticsearch</td>
        <td>FULLTEXT 索引，功能有限</td>
      </tr>
      <tr>
        <td>地理空間</td>
        <td>PostGIS 擴充，工業級 GIS</td>
        <td>基本地理函數</td>
      </tr>
      <tr>
        <td>複製</td>
        <td>Streaming Replication（WAL）</td>
        <td>Binlog Replication，Group Replication</td>
      </tr>
      <tr>
        <td>分區表</td>
        <td>宣告式分區（Range/List/Hash）</td>
        <td>Range/List/Hash/Key 分區</td>
      </tr>
      <tr>
        <td>生態</td>
        <td>學術和技術社群為主</td>
        <td>Web 開發最廣泛使用，雲端服務支援最好</td>
      </tr>
    </tbody>
  </table>

  <h3>文件資料庫（Document）</h3>
  <p><strong>代表：</strong>MongoDB、CouchDB、Firestore</p>
  <p><strong>核心優勢：</strong>以 JSON/BSON 文件存儲，Schema 彈性；適合巢狀結構資料</p>
  <p><strong>典型場景：</strong>內容管理系統（CMS）、商品目錄（每種商品有不同屬性）、用戶個人檔案</p>
  <pre data-lang="javascript"><code class="language-javascript">// 文件可以有不同的結構（同一個 collection 裡）
// 商品 A（筆電）
{
  "_id": "prod_123",
  "name": "MacBook Pro",
  "category": "laptop",
  "specs": {
    "cpu": "M3 Pro",
    "ram": "18GB",
    "storage": "512GB SSD",
    "display": "14.2 inch Liquid Retina XDR"
  },
  "tags": ["apple", "laptop", "premium"]
}

// 商品 B（T-Shirt）—— 完全不同的 Schema
{
  "_id": "prod_456",
  "name": "Plain White Tee",
  "category": "apparel",
  "variants": [
    { "size": "S", "color": "white", "stock": 100 },
    { "size": "M", "color": "white", "stock": 50 }
  ],
  "materials": ["100% cotton"]
}</code></pre>

  <h4>MongoDB vs DynamoDB（文件存儲的兩種選擇）</h4>
  <table>
    <thead>
      <tr>
        <th>特性</th>
        <th>MongoDB</th>
        <th>DynamoDB</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>部署模式</td>
        <td>自托管 或 MongoDB Atlas（SaaS）</td>
        <td>AWS 完全托管（Serverless 選項）</td>
      </tr>
      <tr>
        <td>查詢靈活性</td>
        <td>豐富的查詢語言、聚合管道</td>
        <td>主要依賴 Primary Key + GSI，查詢有限制</td>
      </tr>
      <tr>
        <td>Schema</td>
        <td>完全 Schema-free</td>
        <td>需要定義 Partition Key（必填），其他彈性</td>
      </tr>
      <tr>
        <td>事務支援</td>
        <td>多文件事務（v4.0+）</td>
        <td>跨 Table 事務（v2018+），但有性能代價</td>
      </tr>
      <tr>
        <td>擴展</td>
        <td>需手動配置分片</td>
        <td>自動無限水平擴展（Serverless 模式）</td>
      </tr>
      <tr>
        <td>適合場景</td>
        <td>需要複雜查詢、自托管、不想綁定雲服務商</td>
        <td>AWS 生態、超高 QPS、Serverless 架構</td>
      </tr>
    </tbody>
  </table>

  <h3>鍵值資料庫（Key-Value）</h3>
  <p><strong>代表：</strong>Redis、Memcached、DynamoDB（也是 KV）、RocksDB</p>
  <p><strong>核心優勢：</strong>O(1) 讀寫、極高吞吐量；Redis 還提供豐富的資料結構（List、Set、Sorted Set、Hash）</p>
  <p><strong>典型場景：</strong>Session 存儲、快取層、排行榜（Sorted Set）、分散式鎖、Rate Limiting 計數器</p>
  <pre data-lang="python"><code class="language-python"># Redis 豐富資料結構的實際應用

# 1. 排行榜（Sorted Set）：分數 + 成員，O(log N) 插入和查詢
redis.zadd("leaderboard:game:1", {"player:alice": 9850})
redis.zadd("leaderboard:game:1", {"player:bob": 7200})
top_10 = redis.zrevrange("leaderboard:game:1", 0, 9, withscores=True)

# 2. 計數器 / Rate Limiter（String INCR）
current = redis.incr(f"rate_limit:{user_id}:{current_minute}")
redis.expire(f"rate_limit:{user_id}:{current_minute}", 60)
if current > 100:
    raise TooManyRequestsError

# 3. 分散式鎖（SET NX EX）
lock = redis.set("lock:order:123", "1", nx=True, ex=30)

# 4. 發布/訂閱（Pub/Sub）
redis.publish("notifications", json.dumps({"user_id": "u1", "msg": "order shipped"}))

# 5. 地理位置（GEO）：儲存和查詢附近的店家
redis.geoadd("stores", [121.5, 25.0, "taipei_store"])
nearby = redis.geodist("stores", "taipei_store", "target", unit="km")</code></pre>

  <h3>寬欄資料庫（Wide-Column / Column-Family）</h3>
  <p><strong>代表：</strong>Apache Cassandra、HBase、Google Bigtable</p>
  <p><strong>核心優勢：</strong>設計上就支援 Petabyte 級水平分片；列族（Column Family）設計讓稀疏資料存儲高效；
  寫入效能極強（LSM-Tree 架構）</p>
  <p><strong>典型場景：</strong>即時聊天訊息存儲（每個對話一個 Partition Key）、
  IoT 傳感器資料、廣告點擊日誌、Netflix 觀看歷史</p>

  <h4>Cassandra 資料模型：以查詢驅動的設計思路</h4>
  <pre data-lang="sql"><code class="language-sql">-- Cassandra CQL：設計 Table 前先想「我要如何查詢這份資料？」

-- 查詢需求：「給定 user_id，取得最近 N 條訊息，按時間倒序」
-- → Partition Key = user_id（決定資料在哪個節點）
-- → Clustering Key = message_time DESC（決定節點內的排序）

CREATE TABLE messages_by_user (
  user_id     UUID,
  message_time TIMESTAMP,
  message_id  UUID,
  content     TEXT,
  sender_id   UUID,
  PRIMARY KEY (user_id, message_time, message_id)
) WITH CLUSTERING ORDER BY (message_time DESC);

-- 高效查詢：直接命中一個 Partition
SELECT * FROM messages_by_user
WHERE user_id = 'u-123'
LIMIT 20;</code></pre>

  <callout-box type="info" title="Cassandra 的資料模型哲學">
    設計 Cassandra Table 時，要反轉傳統 SQL 的思維：
    不是先設計資料模型再設計查詢，而是<strong>先確定查詢模式，再設計 Table</strong>。
    每個查詢模式通常需要一個對應的 Table，因為 Cassandra 不支援 JOIN 和任意 WHERE 過濾。
    一個業務可能需要 3 個不同的 Table 來支援 3 種不同的查詢模式，資料冗余是可接受的代價。
  </callout-box>

  <h3>搜索引擎（Search Engine）</h3>
  <p><strong>代表：</strong>Elasticsearch、OpenSearch、Apache Solr</p>
  <p><strong>核心優勢：</strong>倒排索引（Inverted Index）支援全文搜索；
  高效的模糊匹配、相關性評分（TF-IDF / BM25）</p>
  <p><strong>典型場景：</strong>電商商品搜尋、日誌分析（ELK Stack）、全站搜尋</p>
  <pre data-lang="json"><code class="language-json">// Elasticsearch DSL 查詢範例：多條件商品搜尋
{
  "query": {
    "bool": {
      "must": [
        { "match": { "name": "wireless headphone" }}
      ],
      "filter": [
        { "range": { "price": { "gte": 50, "lte": 300 }}},
        { "term": { "in_stock": true }}
      ],
      "should": [
        { "term": { "brand": "Sony" }},
        { "term": { "brand": "Apple" }}
      ]
    }
  },
  "sort": [
    { "_score": "desc" },
    { "sold_count": "desc" }
  ]
}</code></pre>
  <callout-box type="warning" title="Elasticsearch 不是主資料庫">
    Elasticsearch 不保證強一致性，不適合存儲主要業務資料。
    正確的使用模式是：PostgreSQL 或 MongoDB 作為 Source of Truth，
    透過 CDC（Change Data Capture）或應用層雙寫，
    將資料同步到 Elasticsearch 用於搜索。
    不要把訂單、用戶資料存在 Elasticsearch 裡。
  </callout-box>

  <h3>時間序列資料庫（Time-Series）</h3>
  <p><strong>代表：</strong>InfluxDB、TimescaleDB（PostgreSQL 擴充）、Prometheus、VictoriaMetrics</p>
  <p><strong>核心優勢：</strong>針對時間戳+指標值的寫入和範圍查詢做了深度優化；
  自動資料降採樣（Downsampling）和資料保留策略（Retention Policy）；
  壓縮率極高（時序資料通常有規律，壓縮比可達 10:1）</p>
  <pre data-lang="sql"><code class="language-sql">-- InfluxDB Flux 查詢：過去 1 小時 CPU 使用率，每 5 分鐘平均值
from(bucket: "monitoring")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu" and r.host == "server-1")
  |> aggregateWindow(every: 5m, fn: mean, createEmpty: false)
  |> yield(name: "mean_cpu")</code></pre>
</section>

<section id="acid-vs-base">
  <h2>ACID vs BASE</h2>
  <p>
    ACID 和 BASE 是兩種截然不同的資料庫一致性保證哲學，分別代表了關聯式資料庫和 NoSQL 資料庫的核心設計取捨。
    理解它們需要具體的例子，而不只是背縮寫。
  </p>

  <h3>ACID 的四個特性（具體範例）</h3>
  <table>
    <thead>
      <tr>
        <th>屬性</th>
        <th>英文</th>
        <th>含義</th>
        <th>具體範例</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>原子性</td>
        <td>Atomicity</td>
        <td>事務中的所有操作要麼全部成功，要麼全部失敗回滾</td>
        <td>A 轉帳給 B：「A 扣款 1000」和「B 入帳 1000」是一個原子操作，不能只做一半</td>
      </tr>
      <tr>
        <td>一致性</td>
        <td>Consistency</td>
        <td>事務前後，資料庫從一個合法狀態轉到另一個合法狀態，所有業務規則保持有效</td>
        <td>帳戶餘額不能為負數（業務約束）；轉帳後 A+B 的總金額必須不變（守恆規則）</td>
      </tr>
      <tr>
        <td>隔離性</td>
        <td>Isolation</td>
        <td>並發事務互不干擾，每個事務感覺自己是獨自運行的</td>
        <td>兩人同時搶最後一張演唱會票，資料庫保證只有一人成功購票，另一人看到「已售罄」</td>
      </tr>
      <tr>
        <td>持久性</td>
        <td>Durability</td>
        <td>事務提交後，資料永久保存，即使系統隨後崩潰也不會遺失</td>
        <td>支付成功後即使伺服器立刻斷電，重啟後訂單和付款記錄仍然存在（透過 WAL/Redo Log 保證）</td>
      </tr>
    </tbody>
  </table>
  <pre data-lang="sql"><code class="language-sql">-- ACID 事務範例：銀行轉帳（PostgreSQL）
BEGIN TRANSACTION;

  -- 從 A 帳戶扣款
  UPDATE accounts
  SET balance = balance - 1000
  WHERE id = 'A' AND balance >= 1000;  -- 檢查餘額充足（一致性約束）

  -- 若 A 餘額不足，或更新影響行數為 0，則 ROLLBACK
  -- 若繼續執行：
  UPDATE accounts
  SET balance = balance + 1000
  WHERE id = 'B';

COMMIT;
-- 兩個 UPDATE 同時成功，或同時失敗（Atomicity）</code></pre>

  <h3>隔離等級（Isolation Levels）</h3>
  <p>
    ACID 的「隔離性（I）」不是非黑即白的——資料庫提供四個隔離等級，
    等級越高，一致性越強，但並發效能越低（更多鎖競爭）。
  </p>
  <table>
    <thead>
      <tr>
        <th>隔離等級</th>
        <th>解決的問題</th>
        <th>仍可能出現的問題</th>
        <th>典型應用</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Read Uncommitted（最低）</td>
        <td>—</td>
        <td>Dirty Read、Non-repeatable Read、Phantom Read</td>
        <td>幾乎不用（資料不可靠）</td>
      </tr>
      <tr>
        <td>Read Committed</td>
        <td>Dirty Read</td>
        <td>Non-repeatable Read、Phantom Read</td>
        <td>PostgreSQL 預設；Oracle 預設</td>
      </tr>
      <tr>
        <td>Repeatable Read</td>
        <td>Dirty Read、Non-repeatable Read</td>
        <td>Phantom Read</td>
        <td>MySQL InnoDB 預設</td>
      </tr>
      <tr>
        <td>Serializable（最高）</td>
        <td>所有並發問題</td>
        <td>—</td>
        <td>金融轉帳、庫存扣減（強一致性場景）</td>
      </tr>
    </tbody>
  </table>
  <pre data-lang="text"><code class="language-text">三種並發問題解釋：

Dirty Read（髒讀）：
  事務 A 讀到了事務 B 尚未提交的資料。
  若 B 回滾，A 讀到的資料就不存在了。
  例：A 看到 B 的轉帳（1000 元已從帳戶扣除但未入帳），
      B 因網路問題 ROLLBACK，A 看到的是「幻覺」。

Non-repeatable Read（不可重複讀）：
  同一事務內，兩次讀取同一行，結果不同。
  例：A 第一次讀到商品價格 100，B 修改為 150 並提交，
      A 第二次讀到 150。同一事務內資料不一致。

Phantom Read（幻讀）：
  同一事務內，兩次查詢同一條件，第二次多了（或少了）幾行。
  例：A 查詢 balance > 1000 的帳戶有 5 個，
      B 新增了一個 balance=2000 的帳戶並提交，
      A 再次查詢，結果變成 6 個。出現了「幻影」新記錄。</code></pre>

  <h3>BASE 的三個特性</h3>
  <p>BASE 是 NoSQL 系統放棄部分 ACID 後的特性描述，名字本身就是對 ACID 的幽默對比（acid 是酸，base 是鹼）：</p>
  <table>
    <thead>
      <tr>
        <th>屬性</th>
        <th>英文</th>
        <th>含義</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>基本可用</td>
        <td>Basically Available</td>
        <td>系統保證可用性，即使部分節點故障也能返回回應（可能是過時資料或部分資料）</td>
      </tr>
      <tr>
        <td>軟狀態</td>
        <td>Soft State</td>
        <td>系統狀態可能隨時間改變，即使沒有外部輸入（因為資料複製正在進行中，節點間的資料尚未同步）</td>
      </tr>
      <tr>
        <td>最終一致性</td>
        <td>Eventually Consistent</td>
        <td>系統保證在足夠長的時間後，所有節點的資料將達到一致狀態（但不保證什麼時候一致）</td>
      </tr>
    </tbody>
  </table>

  <h3>Eventual Consistency 的具體時間含義</h3>
  <p>
    「最終」到底多久？這取決於系統設定，而非一個固定值：
  </p>
  <ul>
    <li><strong>Cassandra（Quorum 讀寫）：</strong>通常幾毫秒到幾百毫秒。
    若寫入用 Quorum（過半節點確認），讀取也用 Quorum，則可以保證讀到最新資料（即「Tunable Consistency」可達到強一致性）</li>
    <li><strong>DynamoDB（最終一致性模式）：</strong>通常 1 秒以內；強一致性讀取（ConsistentRead=true）則保證立刻最新</li>
    <li><strong>DNS 傳播：</strong>幾分鐘到 48 小時（取決於各地 Resolver 的 TTL 設定）</li>
    <li><strong>網路故障場景：</strong>若一個 Cassandra 節點從網路隔離了 5 分鐘，
    在它重新連線後，複製延遲可能高達 5 分鐘</li>
  </ul>

  <callout-box type="info" title="設計系統時，明確你能接受的最大不一致視窗">
    不同業務對不一致的容忍度截然不同：
    電商庫存（庫存扣減必須精確，用 ACID）vs
    社交媒體點讚數（差幾個沒關係，用 Eventual Consistency 提高吞吐量）vs
    用戶個人資料（更新後 1 秒內看到新資料即可接受）。
    明確這個「最大不一致視窗」（Inconsistency Window），才能選對資料庫。
  </callout-box>
</section>

<section id="sharding-replication">
  <h2>Sharding 與 Read Replica</h2>
  <p>
    單台資料庫伺服器的容量和效能終究有限。突破單機限制有兩個主要手段：
    <strong>Replication（複製）</strong>解決讀取瓶頸和高可用問題，
    <strong>Sharding（分片）</strong>解決寫入和儲存瓶頸。
  </p>

  <h3>Read Replica（讀取副本）</h3>
  <p>
    建立一個或多個從資料庫（Replica），主資料庫（Primary）負責所有寫入，
    讀取可以分散到多個 Replica。
  </p>
  <pre data-lang="text"><code class="language-text">架構：
  Write  →  Primary DB ──非同步複製──→ Replica 1（讀取）
                        ──非同步複製──→ Replica 2（讀取）
                        ──非同步複製──→ Replica 3（用於分析查詢，不影響線上）

效果：
  - 讀取 QPS 可線性擴展（3 個 Replica → 讀取能力約提升 3 倍）
  - 主庫專注寫入，效能提升
  - Replica 3 可承接複雜的分析查詢（OLAP），不影響線上流量（OLTP）</code></pre>

  <h4>複製延遲（Replication Lag）問題</h4>
  <pre data-lang="text"><code class="language-text">問題場景：
  T0: 用戶更新個人資料（寫入 Primary）
  T1: Primary 確認寫入成功，向用戶返回 200 OK
  T2: 用戶立即刷新頁面，讀取請求路由到 Replica 1
  T3: Replica 1 的複製延遲 100ms，尚未收到最新資料
  結果：用戶看到自己剛才的修改沒有生效（實際上已寫入 Primary）

典型延遲範圍：
  - 正常情況：< 100ms（幾乎察覺不到）
  - 高負載：100ms～幾秒
  - 網路問題：幾秒到幾分鐘
  - 極端情況（Replica 落後太多）：可能被標記為「Not in Sync」

解決方法：
  1. 讀自己的寫（Read Your Own Writes）：
     用戶的讀取請求在寫入後的 N 秒內，強制路由到 Primary
  2. 單調讀（Monotonic Read）：
     同一用戶的請求永遠路由到同一個 Replica（不會一次讀到新資料，下次讀到舊資料）
  3. 同步複製（Synchronous Replication）：
     Primary 等待至少一個 Replica 確認後才回應寫入
     代價：寫入延遲增加（等待最慢的 Replica）</code></pre>
  <callout-box type="warning" title="複製延遲（Replication Lag）">
    非同步複製（Async Replication）意味著 Replica 的資料可能略落後於 Primary（通常毫秒級，網路故障時可能更長）。
    若應用不能容忍讀取到過時資料（如「剛寫入的資料必須立刻讀到」），
    應讀取 Primary，或使用同步複製（會增加寫入延遲）。
    AWS Aurora 的半同步複製是個好的折衷方案。
  </callout-box>

  <h3>Primary-Replica Failover 流程</h3>
  <pre data-lang="text"><code class="language-text">自動 Failover 流程（以 AWS RDS Multi-AZ 為例）：

正常狀態：
  Primary（AZ-1） ←─── 同步複製 ───→ Standby（AZ-2）
  所有讀寫 → Primary

Primary 發生故障：
  1. RDS 監控偵測到 Primary 無回應（通常 1～2 分鐘）
  2. 觸發 Failover：Standby 提升為新 Primary
  3. DNS 記錄更新（cluster endpoint 指向新 Primary）
  4. 應用程式重新連線（通常 1～2 分鐘的服務中斷）

手動 Failover（計劃維護）：
  1. 等待所有飛行中的事務完成
  2. 阻止新的寫入請求
  3. 確認 Replica Lag = 0（完全同步）
  4. 切換 Primary 角色
  5. 開放寫入請求

注意事項：
  - 舊 Primary 重啟後以 Replica 身份加入，而非搶回 Primary
  - 應用程式需要重試邏輯：Failover 期間的請求會失敗，需要 Retry with Backoff</code></pre>

  <h3>Sharding（分片 / 分庫）</h3>
  <p>
    將資料水平切割，分散到多台資料庫伺服器，每台只負責一部分資料（一個 Shard）。
    這讓寫入和儲存可以水平擴展。
  </p>

  <h4>Sharding 策略詳細對比</h4>
  <table>
    <thead>
      <tr>
        <th>策略</th>
        <th>原理</th>
        <th>優點</th>
        <th>缺點</th>
        <th>適用場景</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Range-based（範圍分片）</td>
        <td>按 Key 的值範圍分片（如 user_id 1-100萬 → Shard 1）</td>
        <td>範圍查詢效率高；資料局部性好</td>
        <td>熱點問題（新資料集中在最後一個 Shard）</td>
        <td>時序資料（按時間分片）；有明確分片邊界的場景</td>
      </tr>
      <tr>
        <td>Hash-based（雜湊分片）</td>
        <td>hash(key) % N 決定分片</td>
        <td>資料分布均勻，避免熱點</td>
        <td>範圍查詢需掃描所有 Shard；增減 Shard 時大量遷移</td>
        <td>隨機存取模式；避免熱點的場景</td>
      </tr>
      <tr>
        <td>Directory-based（目錄分片）</td>
        <td>維護一張「Key → Shard ID」的查找表</td>
        <td>最靈活；可動態調整 Key 到 Shard 的映射</td>
        <td>目錄服務成為單點瓶頸；增加查找延遲</td>
        <td>需要動態遷移資料；複雜的分片邏輯</td>
      </tr>
      <tr>
        <td>Consistent Hashing（一致性雜湊）</td>
        <td>Hash Ring 上的順時針查找</td>
        <td>增減 Shard 時只遷移少量資料（1/N）</td>
        <td>原始實現分布可能不均（需要虛擬節點修正）</td>
        <td>分散式快取；頻繁增減節點的場景</td>
      </tr>
    </tbody>
  </table>

  <h4>Hash-based Sharding 範例</h4>
  <pre data-lang="text"><code class="language-text">Shard = hash(user_id) % 4

user_id=1   → hash=1837 → 1837 % 4 = 1 → Shard 1
user_id=2   → hash=9834 → 9834 % 4 = 2 → Shard 2
user_id=3   → hash=4521 → 4521 % 4 = 1 → Shard 1
user_id=4   → hash=7263 → 7263 % 4 = 3 → Shard 3

問題：從 4 個 Shard 增加到 5 個 Shard
  hash(user_id) % 4 → hash(user_id) % 5
  大量 user_id 的映射改變 → 需要大量資料遷移！
  這就是為什麼建議使用 Consistent Hashing</code></pre>

  <h3>Sharding 帶來的挑戰</h3>
  <ul>
    <li><strong>跨片 JOIN：</strong>原本一個 SQL 查詢能做的，Sharding 後需要查多個 Shard 然後在應用層合併；
    這大幅增加了應用層的複雜度</li>
    <li><strong>跨片事務：</strong>ACID 事務很難在多個 Shard 間保證，需要分散式事務（兩階段提交 2PC），
    但 2PC 有效能問題和可用性問題（Coordinator 掛掉就卡住）</li>
    <li><strong>全局唯一 ID：</strong>原本資料庫自動遞增的 ID 在多 Shard 環境下會衝突，
    需要全局 ID 方案（UUID、Twitter Snowflake ID、Shopify 的 Sharding Key 前綴）</li>
    <li><strong>資料重平衡（Rebalancing）：</strong>當某個 Shard 過熱，需要分裂並遷移資料，
    過程複雜且需要不停服</li>
  </ul>
  <callout-box type="tip" title="Sharding 是最後手段">
    Sharding 帶來巨大的操作複雜度。在考慮 Sharding 前，先用這些方式延後需求：
    垂直擴展（換更強的機器）→ 加 Read Replica（分散讀取）→ 加快取（減少 DB 讀取）→
    資料歸檔（把舊資料移到冷存儲）。
    Facebook 的 MySQL 在 Web 1.0 時期能服務數億用戶，靠的是大量 Read Replica 而非 Sharding。
    只有這些都不夠了，才真正需要 Sharding。
  </callout-box>
</section>

<section id="index-design">
  <h2>Database Index 設計原則</h2>
  <p>
    索引是資料庫效能優化中最重要也最常被濫用的工具。
    一個缺失的索引能讓查詢從 1ms 變成 10 秒；
    過多的索引能讓寫入效能下降 50% 並佔用大量磁碟空間。
    理解索引的底層機制，才能做出正確的設計決策。
  </p>

  <h3>B-tree Index vs Hash Index</h3>
  <table>
    <thead>
      <tr>
        <th>特性</th>
        <th>B-tree Index（B+ Tree）</th>
        <th>Hash Index</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>資料結構</td>
        <td>平衡樹，葉節點按鍵值有序排列</td>
        <td>雜湊表，鍵值 → 行位置的直接映射</td>
      </tr>
      <tr>
        <td>等值查詢（=）</td>
        <td>O(log N)</td>
        <td>O(1)（平均）</td>
      </tr>
      <tr>
        <td>範圍查詢（&gt;、&lt;、BETWEEN）</td>
        <td>高效支援（葉節點有序連結）</td>
        <td>不支援（Hash 後順序打亂）</td>
      </tr>
      <tr>
        <td>排序（ORDER BY）</td>
        <td>可利用索引順序，避免額外排序</td>
        <td>不支援</td>
      </tr>
      <tr>
        <td>前綴匹配（LIKE 'abc%'）</td>
        <td>支援</td>
        <td>不支援</td>
      </tr>
      <tr>
        <td>適合場景</td>
        <td>通用（99% 的場景都用 B-tree）</td>
        <td>只有等值查詢、無需排序的場景（如記憶體 Hash 表）</td>
      </tr>
      <tr>
        <td>MySQL / PostgreSQL 預設</td>
        <td>是（預設索引類型）</td>
        <td>MySQL Memory Engine；PostgreSQL 的 HASH 索引（不常用）</td>
      </tr>
    </tbody>
  </table>
  <pre data-lang="sql"><code class="language-sql">-- 這些查詢都能利用 B-tree index on (email)
SELECT * FROM users WHERE email = 'alice@example.com';    -- 等值查詢
SELECT * FROM users WHERE email > 'b' ORDER BY email;     -- 範圍 + 排序
SELECT * FROM users WHERE email LIKE 'alice%';            -- 前綴匹配（有效）

-- 這些查詢無法有效利用 B-tree index
SELECT * FROM users WHERE email LIKE '%example.com';      -- 全表掃描！（% 開頭）
SELECT * FROM users WHERE LOWER(email) = 'alice@x.com';   -- 函數阻止索引使用
-- 解法：建立 Expression Index
CREATE INDEX idx_lower_email ON users (LOWER(email));</code></pre>

  <h3>複合索引與最左前綴原則</h3>
  <p>
    複合索引（Composite Index）是對多個欄位建立的索引。理解<strong>最左前綴原則（Leftmost Prefix Rule）</strong>
    對於正確使用複合索引至關重要：
  </p>
  <pre data-lang="sql"><code class="language-sql">-- 建立複合索引（country, age, email）
CREATE INDEX idx_country_age_email ON users (country, age, email);

-- ✅ 可以使用此索引（從最左邊的欄位開始，連續匹配）
WHERE country = 'TW'
WHERE country = 'TW' AND age = 25
WHERE country = 'TW' AND age BETWEEN 20 AND 30
WHERE country = 'TW' AND age = 25 AND email = 'alice@example.com'

-- ❌ 無法有效使用此索引（沒有從 country 開始）
WHERE age = 25                      -- 跳過了 country，需要全表掃描
WHERE email = 'alice@example.com'   -- 跳過了 country 和 age

-- ⚠️ 部分使用（只用索引的前綴）
WHERE country = 'TW' AND email = 'alice@example.com'
-- country 部分有效，但 age 被跳過，email 部分需要回表過濾</code></pre>

  <h4>複合索引欄位順序設計原則</h4>
  <ul>
    <li><strong>等值條件在前，範圍條件在後：</strong>
    <code>(country, status, created_at)</code> 比 <code>(created_at, country, status)</code> 更好，
    因為 <code>created_at BETWEEN '2024-01-01' AND '2024-12-31'</code> 是範圍查詢，
    放在最後才能讓前面的等值條件充分利用索引</li>
    <li><strong>選擇性（Selectivity）高的欄位在前：</strong>
    把「能過濾最多行」的欄位放最前面，讓索引掃描的範圍最小</li>
    <li><strong>考慮 ORDER BY 和 GROUP BY：</strong>如果常用 <code>ORDER BY age</code>，
    把 <code>age</code> 放在索引靠後的位置，可以避免排序操作</li>
  </ul>

  <h3>慢查詢分析方法（EXPLAIN 使用指南）</h3>
  <pre data-lang="sql"><code class="language-sql">-- PostgreSQL：EXPLAIN ANALYZE 詳細執行計劃
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.name, COUNT(o.id)
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.country = 'TW'
GROUP BY u.id, u.name
ORDER BY COUNT(o.id) DESC
LIMIT 10;

/*
輸出範例解讀：
  Sort  (cost=1234.56..1234.60 rows=10 width=36)
        (actual time=45.234..45.236 rows=10 loops=1)
    ->  HashAggregate  (cost=...) (actual time=43.100..44.200 rows=500)
          ->  Hash Join  (cost=...) (actual time=0.123..40.456 rows=10000)
                ->  Index Scan using idx_country on users
                      (actual time=0.012..5.234 rows=3000)        ← 使用了索引 ✅
                      Index Cond: (country = 'TW')
                ->  Seq Scan on orders                             ← 全表掃描 ❌
                      (actual time=0.003..25.678 rows=100000)
                      Filter: ...

關鍵指標：
  cost=X..Y: X=返回第一行的成本, Y=返回所有行的成本（越小越好）
  actual time: 實際執行時間（毫秒）
  rows: 實際返回行數
  Seq Scan: 全表掃描（如果行數很多，這是問題所在）
  Index Scan: 使用索引（好）
  Buffers: hit=N（從快取讀）, read=N（從磁碟讀，越少越好）
*/

-- 在發現 orders 表全表掃描後，建立缺失的索引
CREATE INDEX idx_orders_user_id ON orders (user_id);
-- 再次 EXPLAIN，看到 Index Scan on orders，時間從 25ms → 0.1ms</code></pre>

  <h3>索引設計的黃金規則</h3>
  <ol>
    <li><strong>為頻繁的 WHERE、JOIN ON、ORDER BY 欄位建立索引</strong></li>
    <li><strong>高基數（Cardinality）欄位更值得建索引：</strong>
    <code>email</code>（幾乎唯一）比 <code>gender</code>（只有 2-3 個值）更適合建索引；
    基數低的欄位，資料庫可能直接選擇全表掃描而不用索引</li>
    <li><strong>避免在寫入頻繁的欄位上建太多索引：</strong>每次 INSERT/UPDATE/DELETE 都需要更新所有相關索引；
    10 個索引 = 每次寫入需要更新 10 個 B-tree</li>
    <li><strong>使用覆蓋索引（Covering Index）消除回表：</strong>如果索引包含查詢所需的所有欄位，
    就不需要再去主表撈資料（回表操作），可大幅提升查詢速度</li>
  </ol>
  <pre data-lang="sql"><code class="language-sql">-- 覆蓋索引範例：查詢只需要 name 和 age
CREATE INDEX idx_email_name_age ON users (email, name, age);

-- 這個查詢完全不需要回表（index 已包含所有需要的欄位）
SELECT name, age FROM users WHERE email = 'alice@example.com';
-- EXPLAIN 輸出中看到：Index Only Scan（PostgreSQL）/ Using index（MySQL）

-- 沒有覆蓋索引的情況：
SELECT name, age, address FROM users WHERE email = 'alice@example.com';
-- address 不在索引中 → 需要回表（Index Scan + fetch from heap）
-- 解法：把 address 也加入索引，但索引體積變大，需要權衡</code></pre>

  <h3>過多 Index 的代價</h3>
  <pre data-lang="text"><code class="language-text">假設 users 表有 10 個索引，每天寫入 100 萬筆記錄：

每次 INSERT：
  - 寫入主表（heap）：1 次磁碟寫入
  - 更新 10 個 B-tree 索引：10 次（可能更多，因為 B-tree 可能需要分裂重平衡）
  - 實際磁碟 I/O 放大：10x 以上

問題：
  1. 寫入 QPS 顯著下降（測試過：從 10 個索引到 2 個索引，INSERT 速度提升 3 倍）
  2. 磁碟空間：每個索引可能佔用主表 20%～50% 的空間
     10 個索引 → 索引總大小可能是主表的 3-5 倍
  3. 查詢計劃器（Query Planner）需要選擇用哪個索引，索引越多，選擇代價越高

最佳實踐：
  - 定期審查未使用的索引（PostgreSQL: pg_stat_user_indexes）
  - 移除重複索引（如同時有 (a) 和 (a,b) 兩個索引，(a) 通常可以移除）
  - 建索引前先 EXPLAIN，確認真的需要這個索引</code></pre>

  <callout-box type="tip" title="EXPLAIN 是你的好朋友">
    在任何懷疑有效能問題的查詢前加上 <code>EXPLAIN ANALYZE</code>（PostgreSQL）
    或 <code>EXPLAIN</code>（MySQL），就能看到查詢計劃：
    是否使用了索引、掃描了多少列（rows）、每個步驟的成本。
    定期審查慢查詢日誌（Slow Query Log：PostgreSQL 的 <code>log_min_duration_statement</code>；
    MySQL 的 <code>slow_query_log</code>）並對其 EXPLAIN 分析，是資料庫維運的基本功。
    性能問題 80% 都能透過加上正確的索引解決。
  </callout-box>
</section>
`,
} satisfies ChapterContent;
