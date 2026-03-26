import type { ChapterContent } from '../../types.js';

export default {
  title: '快取系統（Caching）',
  content: `
<section id="cache-fundamentals">
  <h2>快取的本質與層次</h2>
  <p>
    快取的本質是一個簡單的交換：<strong>用空間換時間</strong>。
    把計算代價高昂、或位置遙遠的資料，複製一份到更快更近的地方。
    快取是現代系統效能優化中最有效的手段之一——
    一個設計良好的快取層，可以讓 API 延遲從 100ms 降到 1ms，同時讓資料庫的請求量減少 90%。
  </p>
  <arch-diagram src="./diagrams/ch05-cache-hierarchy.json" caption="快取層次架構：從 CPU L1 快取到 CDN 邊緣節點，不同層次有不同的速度與容量取捨"></arch-diagram>

  <h3>快取的層次（Cache Hierarchy）</h3>
  <table>
    <thead>
      <tr>
        <th>層次</th>
        <th>位置</th>
        <th>延遲</th>
        <th>容量</th>
        <th>代表技術</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>L1 / L2 / L3 CPU 快取</td>
        <td>CPU 晶片內</td>
        <td>0.5 ~ 40 ns</td>
        <td>KB ~ MB</td>
        <td>硬體（自動管理）</td>
      </tr>
      <tr>
        <td>記憶體（RAM）</td>
        <td>主機板</td>
        <td>100 ns</td>
        <td>GB</td>
        <td>程式語言物件、JVM Heap</td>
      </tr>
      <tr>
        <td>本地磁碟快取</td>
        <td>本機 SSD</td>
        <td>150 μs</td>
        <td>TB</td>
        <td>作業系統 Page Cache、瀏覽器快取</td>
      </tr>
      <tr>
        <td>應用程式內快取</td>
        <td>程序內記憶體</td>
        <td>&lt; 1 ms</td>
        <td>MB ~ 幾 GB</td>
        <td>Guava Cache、Caffeine（Java）、lru-cache（Node.js）</td>
      </tr>
      <tr>
        <td>分散式快取</td>
        <td>獨立快取伺服器</td>
        <td>1 ~ 5 ms</td>
        <td>GB ~ TB</td>
        <td>Redis、Memcached</td>
      </tr>
      <tr>
        <td>CDN 快取</td>
        <td>邊緣節點（全球分布）</td>
        <td>1 ~ 50 ms</td>
        <td>PB（全網）</td>
        <td>Cloudflare、Akamai、AWS CloudFront</td>
      </tr>
    </tbody>
  </table>

  <h3>各層次詳解與選用時機</h3>

  <h4>應用程式內快取（In-Process Cache）</h4>
  <p>
    應用程式內快取存活在程序的記憶體空間中，存取速度是所有快取層次中最快的（微秒級），
    因為完全不涉及網路或系統呼叫。
  </p>
  <ul>
    <li><strong>何時使用：</strong>快取不會跨請求改變的資料（如設定值、靜態查表）；
    快取計算代價高昂但結果固定的函數返回值（Memoization）；
    作為分散式快取的「二級快取」（L1 本地快取 + L2 Redis）</li>
    <li><strong>限制：</strong>多台伺服器之間的本地快取是各自獨立的，更新一台的快取不會同步到其他機器（快取不一致問題）</li>
    <li><strong>適合：</strong>不可變或極少更新的資料；單台伺服器場景；可接受短暫不一致的場景</li>
  </ul>
  <pre data-lang="typescript"><code class="language-typescript">// Node.js 應用程式內快取範例（使用 lru-cache）
import { LRUCache } from 'lru-cache';

const configCache = new LRUCache&lt;string, object&gt;({
  max: 500,              // 最多 500 個 Key
  ttl: 1000 * 60 * 5,   // 5 分鐘 TTL
});

async function getConfig(key: string): Promise&lt;object&gt; {
  const cached = configCache.get(key);
  if (cached) return cached;

  const config = await db.getConfig(key);
  configCache.set(key, config);
  return config;
}</code></pre>

  <h4>分散式快取（Redis / Memcached）</h4>
  <p>
    分散式快取是獨立的快取服務，所有後端伺服器共享同一份快取資料，解決了本地快取的一致性問題。
    Redis 是目前最流行的選擇，不僅因為它快，更因為它提供了豐富的資料結構。
  </p>
  <ul>
    <li><strong>何時使用：</strong>多台後端伺服器需要共享快取；需要 Session 存儲；需要分散式鎖；需要排行榜（Sorted Set）</li>
    <li><strong>Redis vs Memcached：</strong>Memcached 只支援字串 Key-Value，但多執行緒效能略好於 Redis 的單執行緒模型（Redis 6.0+ 加入 I/O 多執行緒）；
    Redis 支援更豐富的資料結構和持久化，99% 場景選 Redis</li>
  </ul>

  <h4>CDN 快取</h4>
  <p>
    CDN（Content Delivery Network）是地理分布的快取網路，主要用於快取靜態資源（圖片、CSS、JS）
    和可公開的 API 回應，讓全球用戶都能從最近的節點取得資料。
  </p>
  <ul>
    <li><strong>何時使用：</strong>靜態資源（圖片、影片、CSS/JS 檔案）；公開 API 回應（無用戶資料、可共享的資料）；
    計算代價高昂的 HTML 頁面（SSR 頁面快取）</li>
    <li><strong>Cache-Control Header：</strong>透過 HTTP Header 控制 CDN 快取行為：
    <code>Cache-Control: public, max-age=86400, stale-while-revalidate=3600</code></li>
    <li><strong>限制：</strong>不適合包含個人資料的回應；快取失效（Purge）在全球節點可能有延遲</li>
  </ul>

  <h3>快取命中率（Cache Hit Rate）</h3>
  <p>
    快取的效果由命中率（Hit Rate）決定：<code>Hit Rate = 快取命中次數 / 總請求次數</code>。
  </p>
  <ul>
    <li>命中率 95%：每 20 個請求只有 1 個打到資料庫，資料庫負載降低 95%</li>
    <li>命中率 99%：每 100 個請求只有 1 個打到資料庫</li>
    <li>命中率從 99% 提升到 99.9%：資料庫負載從原來的 1% 降到 0.1%，再降低 10 倍</li>
  </ul>
  <p>
    提升命中率的方法：增加快取容量、設計合理的 Key 命名（避免 Key 爆炸）、
    提高快取 TTL（如果業務允許）、
    預熱（Cache Warming）熱門資料、使用合適的淘汰策略。
  </p>
  <callout-box type="info" title="為什麼不把所有資料都快取？">
    快取有三個限制：記憶體成本高（RAM 遠比 SSD 昂貴，每 GB 貴約 10 倍）、
    資料一致性問題（快取和資料庫可能不同步，導致用戶看到過時資料）、
    以及冷啟動問題（剛啟動的快取命中率為零，需要一段時間「暖機」）。
    因此，快取應優先覆蓋「讀多寫少」的熱點資料，而非無差別地快取一切。
  </callout-box>
</section>

<section id="cache-strategies">
  <h2>Cache-aside / Read-through / Write-through / Write-behind</h2>
  <p>
    快取與資料庫之間的資料同步策略，決定了一致性、延遲和複雜度的取捨。
    四種主流策略各有適用場景，理解它們的差異是系統設計面試的核心考點。
  </p>
  <arch-diagram src="./diagrams/ch05-cache-aside.json" caption="Cache-aside（旁路快取）模式：應用程式負責管理快取和資料庫之間的資料流向"></arch-diagram>

  <h3>1. Cache-aside（旁路快取 / Lazy Loading）</h3>
  <p>應用程式負責管理快取。讀取時先查快取，若未命中才去資料庫讀取，然後將結果寫入快取。
  快取的填充是「懶惰的」（Lazy）——只有資料被請求到才會被快取。</p>
  <pre data-lang="python"><code class="language-python">def get_user(user_id: str) -> dict:
    # 1. 先查快取
    cache_key = f"user:{user_id}"
    user = redis.get(cache_key)

    if user is None:
        # 2. Cache Miss：從資料庫讀取
        user = db.query("SELECT * FROM users WHERE id = %s", user_id)
        if user is None:
            # 防止快取穿透：快取空值（TTL 設短一點）
            redis.setex(cache_key, 60, "null")
            return None

        # 3. 寫入快取，TTL 設為 1 小時
        redis.setex(cache_key, 3600, serialize(user))

    return user


def update_user(user_id: str, data: dict):
    # 寫入資料庫
    db.execute("UPDATE users SET ... WHERE id = %s", user_id)

    # 主動讓快取失效（下次讀取時重新載入最新資料）
    redis.delete(f"user:{user_id}")</code></pre>
  <ul>
    <li><strong>優點：</strong>只快取實際被請求的資料，不浪費記憶體；
    快取節點故障不影響服務（降級到資料庫，可用性高）；
    實作最簡單、最靈活，是最常用的模式</li>
    <li><strong>缺點：</strong>冷啟動時 Cache Miss 多，前幾次請求延遲高；
    可能出現資料過時（Stale Data）；
    若快取和資料庫更新之間有競態條件，需要額外處理</li>
    <li><strong>適用：</strong>讀多寫少、資料偶爾更新的場景（用戶個人資料、商品資訊、文章內容）</li>
  </ul>

  <h3>2. Read-through（讀透快取）</h3>
  <p>
    應用程式只與快取互動，快取層負責在 Cache Miss 時自動去資料庫讀取並回填。
    邏輯與 Cache-aside 類似，但快取層對應用程式透明——應用程式不需要知道「快取 Miss 了要去資料庫」。
  </p>
  <pre data-lang="python"><code class="language-python"># Read-through 偽碼：快取層自動處理 DB 回填
class ReadThroughCache:
    def __init__(self, db_loader):
        self.cache = {}
        self.db_loader = db_loader  # 快取層知道如何從 DB 載入

    def get(self, key: str):
        if key not in self.cache:
            # 快取自動從 DB 載入（對應用程式透明）
            value = self.db_loader(key)
            self.cache[key] = value
        return self.cache[key]

# 應用程式只需：
cache = ReadThroughCache(db_loader=lambda k: db.find(k))
user = cache.get("user:123")  # 應用程式不需要知道是否有 Cache Miss</code></pre>
  <ul>
    <li><strong>代表實現：</strong>NHibernate 二級快取、Spring Cache Abstraction、AWS ElastiCache Read-through</li>
    <li><strong>優點：</strong>應用程式碼更簡潔，不需要手動管理快取；快取邏輯集中在快取層</li>
    <li><strong>缺點：</strong>第一次請求（冷啟動）較慢；快取層需要知道如何查詢資料庫（快取與 DB 有耦合）</li>
    <li><strong>適用：</strong>使用框架提供的快取抽象層；希望應用程式碼保持簡潔的場景</li>
  </ul>

  <h3>3. Write-through（寫穿快取）</h3>
  <p>每次寫入資料時，<strong>同時更新快取和資料庫</strong>（先寫快取，再寫資料庫，或並行寫）。
  確保快取始終是最新的資料。</p>
  <pre data-lang="python"><code class="language-python">def update_user(user_id: str, data: dict):
    # 1. 寫入資料庫
    db.execute("UPDATE users SET name=%s, age=%s WHERE id = %s",
               data['name'], data['age'], user_id)

    # 2. 同步更新快取（保持一致）
    cache_key = f"user:{user_id}"
    redis.setex(cache_key, 3600, serialize(data))
    # 注意：若 DB 成功但 Redis 失敗，需要處理這個不一致情況
    # 實務上常用重試機制或接受短暫不一致</code></pre>
  <ul>
    <li><strong>優點：</strong>快取資料始終與資料庫一致（強一致性）；不會有 Stale Data 問題；
    讀取永遠命中（假設寫入後立即讀取）</li>
    <li><strong>缺點：</strong>每次寫入有雙重開銷（寫 DB + 寫 Cache）；
    若快取的資料不常被讀取，白白佔用記憶體（寫入後可能永遠不被讀取）</li>
    <li><strong>適用：</strong>讀寫頻率相近、對一致性要求高的場景（用戶設定、訂單狀態、支付記錄）</li>
  </ul>

  <h3>4. Write-around（繞寫快取）</h3>
  <p>
    Write-around 是 Write-through 的反向策略：<strong>寫入時只寫資料庫，完全不更新快取</strong>。
    快取只在讀取 Miss 時才被填入（類似 Cache-aside 的讀取策略）。
  </p>
  <ul>
    <li><strong>優點：</strong>避免寫入後不久就被淘汰的資料佔用快取空間；
    適合「寫入頻繁但讀取很少」的資料（如日誌、審計記錄）</li>
    <li><strong>缺點：</strong>寫入後的首次讀取一定是 Cache Miss（需要從 DB 載入）</li>
    <li><strong>適用：</strong>資料寫入後很少被立刻讀取；大量一次性寫入的場景</li>
  </ul>

  <h3>5. Write-behind / Write-back（異步寫回）</h3>
  <p>
    寫入時<strong>只更新快取</strong>，非同步批次地將快取資料寫回資料庫。
    類似 CPU L2 快取的 Write-back 策略——先在快取「記帳」，之後批次結算。
  </p>
  <pre data-lang="python"><code class="language-python">import asyncio
from collections import defaultdict

class WriteBehindCache:
    def __init__(self, db, flush_interval=5):
        self.cache = {}
        self.dirty_keys = set()   # 待寫回 DB 的 Key
        self.db = db
        # 每 5 秒批次寫回
        asyncio.create_task(self._flush_loop(flush_interval))

    def write(self, key: str, value):
        self.cache[key] = value
        self.dirty_keys.add(key)  # 標記為 dirty，待寫回

    def read(self, key: str):
        return self.cache.get(key)

    async def _flush_loop(self, interval: int):
        while True:
            await asyncio.sleep(interval)
            if self.dirty_keys:
                await self._flush_to_db()

    async def _flush_to_db(self):
        keys_to_flush = list(self.dirty_keys)
        # 批次寫入 DB（減少 DB 寫入次數）
        batch = {k: self.cache[k] for k in keys_to_flush}
        await self.db.bulk_upsert(batch)
        self.dirty_keys -= set(keys_to_flush)</code></pre>
  <ul>
    <li><strong>優點：</strong>寫入延遲極低（只寫記憶體）；可批次合併寫入，顯著減少資料庫壓力（100 次寫入合併為 1 次）</li>
    <li><strong>缺點：</strong>若快取節點在資料寫回前故障，未持久化的資料遺失；實作複雜，需要處理 Dirty 狀態和 Flush 機制</li>
    <li><strong>適用：</strong>寫入極頻繁但允許少量資料遺失的場景（遊戲分數、計數器、點讚數、即時位置更新）</li>
  </ul>

  <table>
    <thead>
      <tr>
        <th>策略</th>
        <th>一致性</th>
        <th>讀取延遲</th>
        <th>寫入延遲</th>
        <th>資料遺失風險</th>
        <th>實作複雜度</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Cache-aside</td><td>最終一致</td><td>低（命中）/ 高（Miss）</td><td>只寫 DB</td><td>無</td><td>低</td></tr>
      <tr><td>Read-through</td><td>最終一致</td><td>低（命中）/ 中（Miss）</td><td>只寫 DB</td><td>無</td><td>中</td></tr>
      <tr><td>Write-through</td><td>強一致</td><td>低</td><td>中（雙寫）</td><td>無</td><td>中</td></tr>
      <tr><td>Write-around</td><td>最終一致</td><td>低（命中）/ 高（Miss）</td><td>只寫 DB</td><td>無</td><td>低</td></tr>
      <tr><td>Write-behind</td><td>最終一致</td><td>低</td><td>極低（只寫記憶體）</td><td>有（故障時）</td><td>高</td></tr>
    </tbody>
  </table>
</section>

<section id="cache-invalidation">
  <h2>Cache Invalidation 三大策略</h2>
  <p>
    電腦科學中有一句名言：「計算機科學中只有兩件難事：快取失效（Cache Invalidation）和命名。」
    快取失效是難以完美解決的問題，但理解三種主要的失效策略，能讓你做出合理的取捨。
  </p>

  <h3>問題：資料不一致</h3>
  <p>假設：</p>
  <ol>
    <li>用戶 Alice 的資料被快取：<code>redis["user:1"] = {name: "Alice", age: 25}</code></li>
    <li>Alice 更新年齡為 26，資料庫更新成功</li>
    <li>快取沒有立即更新，仍然返回 25</li>
    <li>下一個讀取請求拿到舊資料（Stale Data）</li>
  </ol>

  <h3>策略 1：TTL（Time-To-Live）過期淘汰</h3>
  <p>快取設定一個存活時間，到期後自動失效。下次讀取會重新從資料庫載入。</p>
  <ul>
    <li><strong>優點：</strong>最簡單，不需要主動管理；零額外程式碼</li>
    <li><strong>缺點：</strong>TTL 期間內資料可能過時；TTL 越短，快取效益越低（命中率下降）</li>
  </ul>

  <h4>TTL 設計原則</h4>
  <ul>
    <li><strong>根據資料更新頻率設定：</strong>每天更新一次的資料（如商品價格）→ TTL 1 小時；
    每秒都可能更新的資料（如庫存數量）→ TTL 10 秒或不快取</li>
    <li><strong>加入隨機抖動（Jitter）：</strong>避免大量 Key 同時到期造成快取雪崩：
    <code>TTL = base_ttl + random(0, base_ttl * 0.2)</code></li>
    <li><strong>不同資料不同 TTL：</strong>不要所有資料都用同一個 TTL；
    靜態資料（國家列表）可以 TTL 24 小時，動態資料（用戶餘額）可能需要 5 秒</li>
    <li><strong>滾動 TTL（Sliding TTL）：</strong>每次讀取都重置 TTL，確保活躍資料不會過期
    （Redis 的 <code>GETEX key EX 3600</code> 可以在讀取時更新 TTL）</li>
  </ul>

  <h3>策略 2：事件驅動失效（Event-Driven Invalidation）</h3>
  <p>當資料庫資料更新時，主動刪除或更新對應的快取 Key。</p>
  <pre data-lang="python"><code class="language-python">def update_user(user_id: str, data: dict):
    db.execute("UPDATE users SET age = %s WHERE id = %s",
               data['age'], user_id)

    # 主動刪除快取，下次讀取會重新載入
    redis.delete(f"user:{user_id}")

    # 或直接更新快取（Write-through）
    # redis.setex(f"user:{user_id}", 3600, serialize(data))</code></pre>

  <h4>先刪快取還是先更新 DB？競態條件分析</h4>
  <pre data-lang="text"><code class="language-text">方案 A：先刪快取，再更新 DB（危險）

  時間線：
  T1: 請求 X 刪除快取（user:1 被清除）
  T2: 請求 Y 讀取快取，Cache Miss，從 DB 讀到舊資料（age=25）
  T3: 請求 X 更新 DB（age=26）
  T4: 請求 Y 將舊資料（age=25）寫入快取！
  結果：快取中是錯誤的舊資料，且不知道何時才會被清除

方案 B：先更新 DB，再刪快取（推薦）

  時間線：
  T1: 請求 X 更新 DB（age=26）
  T2: 請求 Y 讀取快取，命中，返回舊快取（age=25）
      ← 這裡有短暫不一致，但很快會被修正
  T3: 請求 X 刪除快取（user:1 被清除）
  T4: 後續請求讀取快取，Cache Miss，從 DB 讀到新資料（age=26）
  結果：短暫不一致（T2 那一刻），但很快收斂

最終一致方案 C：延遲雙刪（Double Delete）

  T1: 刪除快取
  T2: 更新 DB
  T3: 等待 500ms（等所有讀取的「回填」完成）
  T4: 再次刪除快取（確保 T2 前讀到舊資料並回填的那些也被清掉）</code></pre>

  <callout-box type="warning" title="先更新 DB，再刪快取是推薦做法">
    業界推薦「<strong>先更新 DB，再刪除快取</strong>」的模式，
    因為即使第二步（刪快取）失敗，TTL 到期後快取也會自動失效。
    若需要更強的一致性保證，可使用 Redis Lua 腳本原子操作，
    或引入 CDC（Change Data Capture）方案。
  </callout-box>

  <h3>策略 3：CDC（Change Data Capture）</h3>
  <p>
    透過監聽資料庫的 binlog（MySQL）或 WAL（PostgreSQL），捕捉每一筆資料變更，
    並非同步地更新快取。Debezium 是最常見的 CDC 工具。
  </p>
  <pre data-lang="text"><code class="language-text">CDC 架構：

MySQL ──binlog──→ Debezium ──→ Kafka Topic ──→ Cache Updater Service
                                                      ↓
                                               Redis.delete(key)
                                               或
                                               Redis.set(key, new_value)

特性：
  - 應用程式碼不需要手動 delete/update 快取
  - 幾乎實時同步（毫秒級延遲）
  - 支援多個下游消費者（快取、搜索索引、分析系統）同時訂閱</code></pre>
  <ul>
    <li><strong>優點：</strong>應用程式碼不需要手動管理快取（最乾淨的架構）；幾乎實時同步；
    可同時觸發多個系統的更新（快取 + Elasticsearch + 統計系統）</li>
    <li><strong>缺點：</strong>架構更複雜（需要 Kafka、Debezium）；引入額外的運維成本；
    有輕微延遲（毫秒到秒級）</li>
    <li><strong>適用：</strong>多個服務都需要快取同一資料；業務邏輯複雜、難以在所有寫入點手動管理快取的場景</li>
  </ul>

  <h3>Version-based Invalidation（版本化快取失效）</h3>
  <p>
    給每個資料版本加上版本號或時間戳，讀取快取時驗證版本是否仍然有效。
    這對需要強一致性但又想保留快取的場景特別有用。
  </p>
  <pre data-lang="python"><code class="language-python">def get_user_with_version(user_id: str) -> dict:
    cache_key = f"user:{user_id}"
    cached = redis.get(cache_key)

    if cached:
        cached_data = deserialize(cached)
        # 驗證版本：從 DB 查詢最新版本號（輕量查詢）
        current_version = db.query(
            "SELECT updated_at FROM users WHERE id=%s", user_id
        )
        if cached_data['version'] == current_version:
            return cached_data  # 快取仍然有效
        # 版本不一致，快取過時，重新載入

    # 重新從 DB 載入完整資料
    user = db.query("SELECT * FROM users WHERE id=%s", user_id)
    redis.setex(cache_key, 3600, serialize({
        **user,
        'version': user['updated_at']
    }))
    return user</code></pre>
</section>

<section id="cache-eviction">
  <h2>LRU / LFU / TTL 淘汰策略</h2>
  <p>
    當快取容量已滿，需要決定淘汰哪個 Key 來給新資料騰出空間。
    不同的淘汰策略對命中率有顯著影響，選錯策略可能導致熱點資料不斷被驅逐。
  </p>

  <h3>LRU（Least Recently Used，最近最少使用）</h3>
  <p>淘汰最長時間未被存取的資料。核心假設：「最近用過的資料，未來也很可能再次被用到」（時間局部性）。</p>

  <h4>LRU 的標準實現：Doubly Linked List + HashMap</h4>
  <pre data-lang="python"><code class="language-python">class LRUCache:
    """
    O(1) 讀寫的 LRU 快取實現
    核心結構：
      - HashMap: key → Node（O(1) 查詢）
      - Doubly Linked List: 維護存取順序（O(1) 移動節點）
    """

    class Node:
        def __init__(self, key, value):
            self.key = key
            self.value = value
            self.prev = None
            self.next = None

    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache: dict = {}  # key → Node

        # 使用哨兵節點（head, tail），避免邊界條件
        self.head = self.Node(0, 0)  # 最近最常用端
        self.tail = self.Node(0, 0)  # 最近最少用端（淘汰端）
        self.head.next = self.tail
        self.tail.prev = self.head

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        node = self.cache[key]
        self._move_to_front(node)  # 存取後移到最前面
        return node.value

    def put(self, key: int, value: int):
        if key in self.cache:
            node = self.cache[key]
            node.value = value
            self._move_to_front(node)
        else:
            node = self.Node(key, value)
            self.cache[key] = node
            self._add_to_front(node)

            if len(self.cache) > self.capacity:
                # 淘汰最久未使用的（tail.prev）
                lru = self.tail.prev
                self._remove(lru)
                del self.cache[lru.key]

    def _add_to_front(self, node):
        node.prev = self.head
        node.next = self.head.next
        self.head.next.prev = node
        self.head.next = node

    def _remove(self, node):
        node.prev.next = node.next
        node.next.prev = node.prev

    def _move_to_front(self, node):
        self._remove(node)
        self._add_to_front(node)</code></pre>
  <ul>
    <li><strong>時間複雜度：</strong>讀取 O(1)、寫入 O(1)——這是 HashMap + Doubly Linked List 組合的精妙之處</li>
    <li><strong>優點：</strong>直觀、效果好（符合大多數工作負載的時間局部性）、實作相對簡單</li>
    <li><strong>缺點：</strong>無法應對「掃描模式」——一次性掃描大量歷史資料（如全量備份讀取）
    會把所有真正的熱點資料都驅逐出快取，造成命中率暴跌</li>
    <li><strong>適用：</strong>Redis 預設策略之一（<code>allkeys-lru</code>）；大多數一般用途快取場景</li>
  </ul>

  <h3>LFU（Least Frequently Used，最少使用頻率）</h3>
  <p>淘汰存取頻率最低的資料。不同於 LRU 關注「最近性」，LFU 關注「頻率」——保留被請求最多次的資料。</p>
  <pre data-lang="text"><code class="language-text">LFU 內部數據結構：

freq_map: {頻率 → 雙向鏈表（相同頻率的 Key 按 LRU 排序）}
key_map:  {key → (value, 頻率)}
min_freq: 目前最低頻率（淘汰時從這裡找）

操作範例（capacity=3）：
  PUT("A")  → freq["A"]=1, min_freq=1, freq_map={1: [A]}
  PUT("B")  → freq["B"]=1, min_freq=1, freq_map={1: [A,B]}
  PUT("C")  → freq["C"]=1, min_freq=1, freq_map={1: [A,B,C]}
  GET("A")  → freq["A"]=2, min_freq=1, freq_map={1: [B,C], 2: [A]}
  GET("A")  → freq["A"]=3, min_freq=1, freq_map={1: [B,C], 2: [], 3: [A]}
  PUT("D")  → 淘汰：min_freq=1，LRU 端是 B → 淘汰 B
              freq_map={1: [C,D], 3: [A]}</code></pre>
  <ul>
    <li><strong>優點：</strong>對熱點資料保護更好，不會被偶發的一次性掃描驅逐；
    長期熱點資料累積高頻率，幾乎不會被淘汰</li>
    <li><strong>缺點：</strong>新加入的 Key 頻率為 0，容易被立刻淘汰（需要頻率衰減機制——舊的高頻 Key 若最近沒被存取，頻率應逐漸降低）；
    實作比 LRU 複雜；對突然爆紅的資料反應較慢（需要積累頻率）</li>
    <li><strong>適用：</strong>熱點資料長期穩定、不常變化的場景（如商品圖片、熱門文章）</li>
  </ul>

  <h3>LRU vs LFU 對比</h3>
  <table>
    <thead>
      <tr>
        <th>場景</th>
        <th>LRU 表現</th>
        <th>LFU 表現</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>近期存取模式（時間局部性強）</td>
        <td>好</td>
        <td>一般（新資料頻率低）</td>
      </tr>
      <tr>
        <td>長期熱點資料（頻率局部性強）</td>
        <td>一般（可能被近期低頻資料擠出）</td>
        <td>好</td>
      </tr>
      <tr>
        <td>全量掃描（惡意/備份讀取）</td>
        <td>差（熱點全被驅逐）</td>
        <td>好（掃描資料頻率低，不影響熱點）</td>
      </tr>
      <tr>
        <td>突發流量（剛上線的新功能）</td>
        <td>好（最近存取的都保留）</td>
        <td>差（新 Key 頻率低，容易被淘汰）</td>
      </tr>
      <tr>
        <td>實作複雜度</td>
        <td>低</td>
        <td>高</td>
      </tr>
    </tbody>
  </table>

  <h3>TTL（Time-To-Live，存活時間）</h3>
  <p>
    嚴格來說，TTL 是「主動過期」而非淘汰策略，但它常與 LRU/LFU 結合使用。
    Redis 的實際淘汰發生在：TTL 到期主動刪除，或記憶體滿時觸發淘汰策略。
  </p>

  <h3>Redis 的八種淘汰策略</h3>
  <table>
    <thead>
      <tr>
        <th>策略</th>
        <th>說明</th>
        <th>適合場景</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>noeviction</td><td>記憶體滿時拒絕新寫入（返回錯誤）</td><td>不希望任何資料遺失</td></tr>
      <tr><td>allkeys-lru</td><td>在所有 Key 中淘汰最近最少使用的</td><td>一般快取（最常用）</td></tr>
      <tr><td>volatile-lru</td><td>只在有 TTL 的 Key 中做 LRU 淘汰</td><td>混合快取和持久資料</td></tr>
      <tr><td>allkeys-lfu</td><td>在所有 Key 中淘汰使用頻率最低的</td><td>熱點資料穩定的場景</td></tr>
      <tr><td>volatile-lfu</td><td>只在有 TTL 的 Key 中做 LFU 淘汰</td><td>混合場景 + 頻率保護</td></tr>
      <tr><td>allkeys-random</td><td>隨機淘汰任意 Key</td><td>存取模式隨機的場景</td></tr>
      <tr><td>volatile-random</td><td>隨機淘汰有 TTL 的 Key</td><td>較少使用</td></tr>
      <tr><td>volatile-ttl</td><td>優先淘汰剩餘 TTL 最短的 Key</td><td>希望盡快清除即將過期的資料</td></tr>
    </tbody>
  </table>
  <callout-box type="tip" title="選擇 allkeys-lru 通常是最安全的">
    如果你不確定選哪個，<code>allkeys-lru</code> 通常是最好的起點。
    它在記憶體壓力下會淘汰所有 Key（包括沒有 TTL 的），避免系統因為 noeviction 而崩潰。
    生產環境中務必設置 <code>maxmemory</code>（如 <code>maxmemory 4gb</code>）和
    <code>maxmemory-policy allkeys-lru</code>，
    否則 Redis 在記憶體耗盡時會被 OOM Killer 強制終止。
  </callout-box>
</section>

<section id="cache-pitfalls">
  <h2>Cache Stampede 與 Cache Penetration 防禦</h2>
  <p>
    快取系統在高流量場景中有三個著名的陷阱，不了解這些問題可能導致快取系統反而拖垮整個服務。
    每個陷阱的成因和解法都不同，需要分別理解。
  </p>

  <h3>三種問題的快速對比</h3>
  <table>
    <thead>
      <tr>
        <th>問題</th>
        <th>英文名</th>
        <th>成因</th>
        <th>受影響對象</th>
        <th>核心解法</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>快取雪崩</td>
        <td>Cache Stampede / Avalanche</td>
        <td>大量 Key 同時過期，或快取節點整體宕機</td>
        <td>資料庫（被大量請求淹沒）</td>
        <td>TTL 抖動 / 高可用叢集</td>
      </tr>
      <tr>
        <td>快取穿透</td>
        <td>Cache Penetration</td>
        <td>查詢快取和 DB 都不存在的 Key</td>
        <td>資料庫（每次都 Miss 直接打到 DB）</td>
        <td>布隆過濾器 / 快取空值</td>
      </tr>
      <tr>
        <td>快取擊穿</td>
        <td>Cache Breakdown / Hotspot</td>
        <td>單一熱點 Key 在高並發下過期</td>
        <td>資料庫（瞬間大量並發查詢同一個 Key）</td>
        <td>互斥鎖 / 提前續期</td>
      </tr>
    </tbody>
  </table>

  <h3>1. Cache Stampede（快取雪崩 / Thundering Herd）</h3>
  <p>
    <strong>場景：</strong>大量 Key 同時過期（如初始化時設定了相同 TTL），
    導致瞬間大量請求同時打到資料庫，資料庫因此崩潰。
  </p>
  <p><strong>防禦方法 1：TTL 加隨機抖動</strong></p>
  <pre data-lang="python"><code class="language-python">import random

def set_with_jitter(redis, key: str, value, base_ttl: int):
    # 加入 ±20% 的隨機抖動，讓不同 Key 的過期時間分散
    jitter = random.randint(-int(base_ttl * 0.2), int(base_ttl * 0.2))
    ttl = base_ttl + jitter
    redis.setex(key, ttl, value)

# 用法：不再是所有商品 TTL 都剛好 3600 秒
# 而是 2880～4320 秒之間的隨機值
set_with_jitter(redis, "product:1", data, base_ttl=3600)
set_with_jitter(redis, "product:2", data, base_ttl=3600)</code></pre>

  <p><strong>防禦方法 2：互斥鎖（Mutex / Distributed Lock）</strong></p>
  <pre data-lang="python"><code class="language-python">import time

def get_with_mutex(redis, key: str, db_loader) -> dict:
    value = redis.get(key)
    if value:
        return deserialize(value)

    # Cache Miss：嘗試獲取分散式鎖
    lock_key = f"lock:{key}"
    lock_acquired = redis.set(lock_key, "1", nx=True, ex=10)  # NX=只在不存在時設定

    if lock_acquired:
        try:
            # 獲得鎖：去 DB 查詢並回填快取
            value = db_loader(key)
            redis.setex(key, 3600, serialize(value))
            return value
        finally:
            redis.delete(lock_key)
    else:
        # 未獲得鎖：等待後重試（其他請求正在回填）
        time.sleep(0.05)  # 等 50ms
        return get_with_mutex(redis, key, db_loader)  # 遞迴重試</code></pre>

  <p><strong>防禦方法 3：Probabilistic Early Expiration（機率提前過期）</strong></p>
  <p>
    這是一個優雅的無鎖方案：在 Key 即將過期前，以一定機率提前重新計算，
    避免所有請求都等到 TTL 真正到期才發現 Cache Miss。
  </p>
  <pre data-lang="python"><code class="language-python">import math, random, time

def get_with_early_expiration(redis, key: str, db_loader,
                               ttl: int = 3600, beta: float = 1.0) -> dict:
    """
    Probabilistic Early Expiration
    beta 越大 = 越激進地提前重計算（通常設 1.0）
    """
    cached = redis.get(key)
    if cached:
        data = deserialize(cached)
        remaining_ttl = redis.ttl(key)  # 剩餘 TTL（秒）
        delta = data.get('compute_time', 0.1)  # 上次計算花了多少秒

        # 核心公式：當 remaining_ttl 越小，這個條件越容易成立
        if remaining_ttl - beta * delta * math.log(random.random()) < 0:
            # 機率性地提前重新計算
            value = db_loader(key)
            redis.setex(key, ttl, serialize({'data': value, 'compute_time': delta}))
            return value
        return data['data']

    # 完全 Cache Miss 的情況
    value = db_loader(key)
    redis.setex(key, ttl, serialize({'data': value, 'compute_time': 0.1}))
    return value</code></pre>

  <h3>2. Cache Penetration（快取穿透）</h3>
  <p>
    <strong>場景：</strong>惡意用戶請求大量不存在的 Key（如 <code>user:-1</code>、<code>user:99999999</code>）。
    由於這些 Key 在資料庫也不存在，每次都 Cache Miss，每次都打到資料庫，
    快取完全失去保護作用。
  </p>
  <p><strong>防禦方法 1：快取空值（Cache Null）</strong></p>
  <pre data-lang="python"><code class="language-python">CACHE_NULL_VALUE = "__NULL__"

def get_user_safe(user_id: str):
    cache_key = f"user:{user_id}"
    cached = redis.get(cache_key)

    if cached == CACHE_NULL_VALUE:
        return None  # 已知不存在，直接返回

    if cached:
        return deserialize(cached)

    user = db.query("SELECT * FROM users WHERE id=%s", user_id)

    if user is None:
        # 快取「不存在」這個事實，TTL 短（60 秒），避免佔太多記憶體
        redis.setex(cache_key, 60, CACHE_NULL_VALUE)
        return None

    redis.setex(cache_key, 3600, serialize(user))
    return user</code></pre>

  <p><strong>防禦方法 2：Bloom Filter（布隆過濾器）</strong></p>
  <p>
    Bloom Filter 是一種記憶體極小的概率數據結構，可以快速判斷「一個元素是否在集合中」。
    它的特點是：<strong>不存在的判定 100% 準確（無假陰性），但「存在」的判定可能有少量假陽性</strong>。
  </p>
  <pre data-lang="text"><code class="language-text">Bloom Filter 原理：

初始化：一個 m 位的位元陣列（初始全為 0）

寫入 "user:1"：
  用 k 個不同的 Hash 函數計算 k 個位置
  hash1("user:1") = 3  → bit[3] = 1
  hash2("user:1") = 7  → bit[7] = 1
  hash3("user:1") = 12 → bit[12] = 1

查詢 "user:99999"（不存在的 Key）：
  hash1("user:99999") = 5  → bit[5] = 0 ← 任何一個位為 0
  → 直接返回「不存在」！（100% 準確，不查 Cache 和 DB）

查詢 "user:2"（也不存在，但碰巧）：
  hash1("user:2") = 3  → bit[3] = 1
  hash2("user:2") = 7  → bit[7] = 1
  hash3("user:2") = 12 → bit[12] = 1
  → 誤判為「存在」（假陽性）→ 允許進入快取查詢
  → 但只會查快取，快取 Miss 後查 DB，不會造成大問題</code></pre>
  <pre data-lang="python"><code class="language-python"># 使用 Redis 的 Bloom Filter（需要 RedisBloom 模組）
# 或使用純 Python 實現

from bloom_filter2 import BloomFilter

# 初始化：預期 100 萬個元素，假陽性率 0.1%
bf = BloomFilter(max_elements=1_000_000, error_rate=0.001)

# 系統啟動時，將所有合法 user_id 加入 Bloom Filter
for user_id in db.query("SELECT id FROM users"):
    bf.add(f"user:{user_id}")

def get_user_with_bloom(user_id: str):
    cache_key = f"user:{user_id}"

    # 先查 Bloom Filter（O(1)，幾乎零成本）
    if cache_key not in bf:
        return None  # 100% 確定不存在，不查快取和 DB

    # Bloom Filter 說可能存在，繼續正常流程
    cached = redis.get(cache_key)
    if cached:
        return deserialize(cached)

    user = db.query("SELECT * FROM users WHERE id=%s", user_id)
    if user:
        redis.setex(cache_key, 3600, serialize(user))
    return user</code></pre>

  <h3>3. Cache Breakdown（快取擊穿 / Hotspot Invalid）</h3>
  <p>
    <strong>場景：</strong>單一熱點 Key（如某個爆紅商品的資料）在高並發下突然過期，
    瞬間有數千個請求同時發現 Cache Miss，全部並發地去查資料庫，造成資料庫瞬間過載。
    這和 Stampede 的差別是：Stampede 是大量 Key 同時過期，Breakdown 是單一熱點 Key 過期。
  </p>
  <p><strong>解法：互斥鎖（見上方 Mutex 方案）或熱點 Key 永不過期</strong></p>
  <pre data-lang="python"><code class="language-python">def get_hotspot_key(redis, key: str, db_loader) -> dict:
    """
    熱點 Key 處理：永不設 TTL，但在 Value 中存儲邏輯過期時間
    後台任務負責在邏輯過期時非同步更新
    """
    cached = redis.get(key)

    if cached:
        data = deserialize(cached)
        # 檢查邏輯過期時間
        if data['expires_at'] > time.time():
            return data['value']
        # 邏輯過期但快取仍在：返回舊值，同時觸發非同步更新
        asyncio.create_task(refresh_hotspot(redis, key, db_loader))
        return data['value']  # 返回略過時的資料（可接受）

    # 第一次載入
    value = db_loader(key)
    redis.set(key, serialize({  # 注意：不設 ex（永不過期）
        'value': value,
        'expires_at': time.time() + 3600
    }))
    return value</code></pre>

  <callout-box type="danger" title="三種問題的記憶框架">
    <ul>
      <li><strong>穿透（Penetration）：</strong>查詢的 Key 根本不存在 → 布隆過濾器攔截 / 快取空值</li>
      <li><strong>擊穿（Breakdown）：</strong>單個熱點 Key 過期 → 互斥鎖 / 邏輯永不過期</li>
      <li><strong>雪崩（Stampede/Avalanche）：</strong>大量 Key 同時過期 OR 節點宕機 → TTL 抖動 + 高可用叢集</li>
    </ul>
    記憶口訣：穿透是「不存在的 Key 打穿快取保護」；擊穿是「熱點 Key 過期瞬間被擊穿」；
    雪崩是「快取集體失效引發的雪崩效應」。
  </callout-box>
</section>
`,
} satisfies ChapterContent;
