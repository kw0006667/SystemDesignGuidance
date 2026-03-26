import type { ChapterContent } from '../../types.js';

export default {
  title: '設計短網址服務（URL Shortener）',
  content: `
<section id="url-requirements">
  <h2>需求分析與容量估算</h2>
  <p>短網址服務（如 bit.ly、TinyURL）看似簡單，卻涵蓋了高讀寫比、快取設計、資料一致性等系統設計核心概念。在面試中，從需求分析到容量估算的完整框架，往往比架構本身更能展現候選人的系統化思維。</p>

  <arch-diagram src="./diagrams/ch15-url-shortener.json" caption="短網址服務架構：展示短碼生成、重定向服務、快取層與 Analytics Pipeline 的完整設計。"></arch-diagram>

  <h3>功能需求（Functional Requirements）</h3>
  <ul>
    <li>給定長網址，生成唯一的短網址（如 <code>https://short.io/abc1234</code>）</li>
    <li>訪問短網址時，重定向到原始長網址</li>
    <li>支援自訂短碼（Custom Alias，如 <code>short.io/my-campaign</code>）</li>
    <li>短網址有效期設定（可選，預設永久有效）</li>
    <li>分析功能：追蹤點擊次數、來源地區、設備類型</li>
    <li>用戶可查看自己建立的短網址列表和統計數據</li>
  </ul>

  <h3>非功能需求（Non-Functional Requirements）</h3>
  <ul>
    <li><strong>高可用性</strong>：99.9%（每月停機不超過 43.8 分鐘），重定向服務更要追求 99.99%</li>
    <li><strong>低延遲</strong>：重定向 &lt; 10ms（快取命中），&lt; 100ms（快取未命中）</li>
    <li><strong>讀多寫少</strong>：讀寫比 100:1（重定向遠多於建立）</li>
    <li><strong>短碼唯一性</strong>：全域唯一，無碰撞（即使在高並發下）</li>
    <li><strong>防濫用</strong>：速率限制（Rate Limiting）、惡意 URL 過濾（釣魚、惡意軟體）</li>
    <li><strong>可擴展性</strong>：能在現有規模基礎上橫向擴展，不需要停機遷移</li>
  </ul>

  <h3>完整的容量估算框架（DAU → QPS → Storage）</h3>
  <pre data-lang="text"><code class="language-text">步驟一：從 DAU 出發
  假設：每天活躍用戶 100M（DAU）
  假設：每個 DAU 平均建立 1 條短網址
  → 每天新建短網址：100M 筆

步驟二：計算 QPS
  寫入 QPS（建立短網址）：
    100M / 86,400 秒 ≈ 1,157 寫入/秒 ≈ 1.2K wps
    峰值（2x 平均）：~2.4K wps

  讀取 QPS（重定向）：
    讀寫比 100:1 → 1,157 × 100 ≈ 115.7K 讀取/秒
    峰值（2x 平均）：~231K rps

步驟三：計算 Storage
  每筆記錄大小分解：
    short_code:    7 bytes  （Base62 7位）
    long_url:    200 bytes  （平均，含參數）
    user_id:       8 bytes  （bigint）
    created_at:    8 bytes
    expires_at:    8 bytes
    metadata:     69 bytes  （標題、描述等）
    總計：       ~300 bytes/筆

  5 年儲存總量：
    100M/天 × 365天/年 × 5年 = 182.5 億筆
    182.5億 × 300 bytes ≈ 5.475 TB

步驟四：計算 Cache
  Power Law（冪律分布）：20% 的 URL 貢獻 80% 的流量
  需快取的熱門 URL：182.5億 × 20% 的每日活躍 ≈ 20M 筆
  記憶體需求：20M × 300 bytes ≈ 6 GB（單台快取伺服器足夠）

步驟五：頻寬估算
  讀取：115.7K rps × 300 bytes ≈ 34.7 MB/s ≈ 278 Mbps（重定向回應小）
  寫入：1.2K wps × 300 bytes ≈ 0.36 MB/s（可忽略）</code></pre>

  <callout-box type="info" title="估算重點：讀取密集型系統">
    <p>注意讀寫比 100:1 的含義：系統是<strong>讀取密集型（Read-heavy）</strong>。架構設計應優先優化讀取路徑：多層快取（本地快取 → Redis → 資料庫）、CDN 快取重定向響應、讀副本（Read Replica）分流查詢。寫入路徑（短碼生成）相對不頻繁，但需要保證唯一性。</p>
  </callout-box>

  <h3>高階架構設計</h3>
  <pre data-lang="text"><code class="language-text">Client
  │
  ▼
CDN（快取熱門短碼的重定向，301 或設置 Cache-Control）
  │ Cache Miss
  ▼
Load Balancer（Layer 7，按路由分發）
  │
  ├─► [Redirect Service]（無狀態，水平擴展）
  │     │
  │     ├─► L1 本地快取（每台機器的記憶體，~1M 條熱門 URL）
  │     ├─► L2 Redis Cluster（分散式快取，~20M 條）
  │     └─► MySQL（主從架構，讀從庫）
  │
  └─► [URL Shortening Service]
        │
        ├─► Key Generation Service（KGS）
        │     └─► 預生成唯一短碼，批量分配
        ├─► Malicious URL Filter（Google Safe Browsing API）
        ├─► MySQL（寫主庫）
        └─► Cache Invalidation（更新 Redis）

Analytics Pipeline（非同步，不影響主流程）：
  Redirect Service → Kafka → Flink Stream Processor → ClickHouse（OLAP）
                                                    → Redis（實時計數）
                                                    → S3（原始事件備份）</code></pre>
</section>

<section id="base62-encoding">
  <h2>Base62 編碼與短碼生成策略</h2>
  <p>生成短碼是短網址服務的核心挑戰。短碼需要足夠短、全球唯一、高效生成、且不可預測（可選）。有多種方案，每種都有不同的取捨。</p>

  <h3>Base62 字符集與容量</h3>
  <p>Base62 使用 0-9（10個）+ a-z（26個）+ A-Z（26個）= 62 個字符。相比 Base64 沒有 +、/ 等需要 URL 編碼的字符，天然適合短網址。</p>
  <pre data-lang="text"><code class="language-text">各位數 Base62 的容量：
  6 位：62^6  =  56,800,235,584 ≈ 568 億
  7 位：62^7  = 3,521,614,606,208 ≈ 3.52 兆
  8 位：62^8  = 218,340,105,584,896 ≈ 218 兆

每天 100M 新 URL，能撐多久？
  6 位：568 億 / 1億/天 = 568 天（~1.5 年，不夠）
  7 位：3.52 兆 / 1億/天 = 35,200 天 ≈ 96 年 ✓

結論：7 位 Base62 足夠，但設計時預留 8 位的擴展能力</code></pre>

  <h3>Base62 vs MD5 vs UUID 對比分析</h3>
  <pre data-lang="text"><code class="language-text">┌────────────────┬──────────────┬───────────────────────────────────────┐
│ 方案           │ 短碼長度     │ 優缺點                                │
├────────────────┼──────────────┼───────────────────────────────────────┤
│ MD5 取前 N 位  │ 7 位（截斷） │ ✓ 相同 URL 得到相同短碼（去重）       │
│                │              │ ✗ 碰撞：不同 URL 可能得到相同短碼     │
│                │              │ ✗ 需要碰撞處理邏輯（資料庫往返）      │
├────────────────┼──────────────┼───────────────────────────────────────┤
│ UUID v4        │ 22 位（B62） │ ✓ 極低碰撞率                          │
│                │              │ ✗ 太長（22位），不適合短網址           │
├────────────────┼──────────────┼───────────────────────────────────────┤
│ 自增 ID + B62  │ 1-7 位（漸增）│ ✓ 無碰撞，O(1) 生成                  │
│                │              │ ✗ 有序，可猜測 URL 數量（隱私問題）   │
│                │              │ ✗ 分散式環境需要 ID 協調              │
├────────────────┼──────────────┼───────────────────────────────────────┤
│ Snowflake + B62│ 7-8 位       │ ✓ 無碰撞，分散式生成，包含時間戳      │
│                │              │ ✗ 實作複雜度較高                      │
│                │              │ ✗ 仍然偽有序（可猜測時間範圍）        │
├────────────────┼──────────────┼───────────────────────────────────────┤
│ 預生成 KGS     │ 7 位（固定） │ ✓ 最快（無實時計算）                  │
│                │              │ ✓ 無碰撞（預先保證唯一）              │
│                │              │ ✗ KGS 需要高可用設計（備用節點）      │
└────────────────┴──────────────┴───────────────────────────────────────┘</code></pre>

  <h3>自增 ID 的問題與 Snowflake ID 簡介</h3>
  <pre data-lang="text"><code class="language-text">自增 ID 的問題（單一資料庫）：
  - 單點故障（SPOF）：資料庫故障時無法生成 ID
  - 成為寫入瓶頸：所有服務需要串行獲取 ID
  - 跨資料庫遷移困難

Snowflake ID（Twitter 開源，64 位整數）：
  ┌──────────────────────┬────────────────┬─────────────┐
  │  時間戳（41 位）      │  機器 ID（10位）│  序號（12位）│
  │  ~69 年容量          │  1024 台機器    │  4096/毫秒  │
  └──────────────────────┴────────────────┴─────────────┘

  特性：
  - 每台機器每毫秒可生成 4096 個唯一 ID
  - 全分散式：無需協調，每台機器獨立生成
  - 大致有序（時間戳打頭），對 B-Tree 索引友好
  - 64 位整數，轉 Base62 約 7-8 位

  轉換：Snowflake ID 1735689600000001 → Base62 "2dT9mK4"
  （11 位 Base62 可以表示 64 位整數，實際業務 ID 比理論最大值小，約 7-8 位）</code></pre>

  <pre data-lang="typescript"><code class="language-typescript">// Snowflake ID 生成器實作
class SnowflakeIdGenerator {
  private readonly epoch = 1420041600000n; // 2015-01-01T00:00:00Z
  private readonly machineIdBits = 10n;
  private readonly sequenceBits = 12n;
  private readonly maxSequence = (1n << this.sequenceBits) - 1n; // 4095

  private lastTimestamp = -1n;
  private sequence = 0n;

  constructor(private readonly machineId: bigint) {
    if (machineId < 0n || machineId > (1n << this.machineIdBits) - 1n) {
      throw new Error('Machine ID out of range');
    }
  }

  nextId(): bigint {
    let timestamp = BigInt(Date.now());

    if (timestamp < this.lastTimestamp) {
      throw new Error('Clock moved backwards! Refusing to generate ID');
    }

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1n) & this.maxSequence;
      if (this.sequence === 0n) {
        // 同一毫秒序號溢出，等待下一毫秒
        while (timestamp <= this.lastTimestamp) {
          timestamp = BigInt(Date.now());
        }
      }
    } else {
      this.sequence = 0n;
    }

    this.lastTimestamp = timestamp;

    return ((timestamp - this.epoch) << (this.machineIdBits + this.sequenceBits))
      | (this.machineId << this.sequenceBits)
      | this.sequence;
  }
}

// Base62 轉換
const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function toBase62(num: bigint): string {
  if (num === 0n) return '0';
  let result = '';
  while (num > 0n) {
    result = BASE62_CHARS[Number(num % 62n)] + result;
    num = num / 62n;
  }
  return result;
}

function fromBase62(str: string): bigint {
  return str.split('').reduce((acc, char) => {
    return acc * 62n + BigInt(BASE62_CHARS.indexOf(char));
  }, 0n);
}

// 使用
const generator = new SnowflakeIdGenerator(BigInt(process.env.MACHINE_ID || '1'));
const shortCode = toBase62(generator.nextId()); // e.g., "2dT9mK4"</code></pre>

  <h3>哈希碰撞處理（使用 MD5 方案時）</h3>
  <pre data-lang="typescript"><code class="language-typescript">import crypto from 'crypto';

// MD5 方案的碰撞處理
async function generateShortCodeWithHash(
  longUrl: string,
  maxAttempts = 5
): Promise<string> {
  let url = longUrl;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const hash = crypto.createHash('md5').update(url).digest('hex');
    // 取前 10 個 hex 字符轉換為數字，再轉 Base62
    const num = BigInt('0x' + hash.substring(0, 10));
    const shortCode = toBase62(num).substring(0, 7).padStart(7, '0');

    // 查詢資料庫是否已存在
    const existing = await db.query(
      'SELECT long_url FROM urls WHERE short_code = ?',
      [shortCode]
    );

    if (!existing) {
      return shortCode; // 沒有衝突，使用此短碼
    }

    if (existing.long_url === longUrl) {
      return shortCode; // 相同 URL，直接返回（去重）
    }

    // 碰撞：不同 URL 得到相同短碼
    // 在 URL 後加入鹽值重新計算
    url = longUrl + ':salt:' + attempt;
  }

  throw new Error('Failed to generate unique short code after max attempts');
}

// 更好的方案：在短碼中加入隨機性（避免碰撞，但犧牲去重）
function generateRandomShortCode(length = 7): string {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (const byte of bytes) {
    result += BASE62_CHARS[byte % 62];
  }
  return result;
}</code></pre>

  <h3>Key Generation Service（KGS）預生成方案</h3>
  <pre data-lang="text"><code class="language-text">KGS 架構（預先生成，離線消費）：

key-db 結構：
  CREATE TABLE keys (
    short_code  CHAR(7) PRIMARY KEY,
    status      ENUM('available', 'used') DEFAULT 'available',
    reserved_by VARCHAR(64),  -- 哪個 KGS 節點保留了此 key
    reserved_at TIMESTAMP
  );

KGS 工作流程：
  1. 離線批量生成隨機 7 位 Base62 短碼（離線腳本執行）
  2. 存入 key-db 的 available 表
  3. KGS 節點啟動時，預載入 10,000 個 key 到記憶體
  4. 將載入的 key 標記為 reserved（原子操作，防多節點競爭）
  5. 收到請求時，從記憶體返回一個 key（O(1)，極快）
  6. 記憶體 key 用完時，再批量載入下一批

高可用設計：
  - 主 KGS + 備 KGS（Hot Standby）
  - 主 KGS 失敗時，備 KGS 自動接管（Failover < 30 秒）
  - 各 KGS 節點預留的 key 不重疊（在 DB 層用行鎖保證）

優點：
  ✓ 生成速度極快（從記憶體取，無 DB 查詢）
  ✓ 無碰撞（預先保證唯一）
  ✓ 短碼完全隨機（不可猜測）

缺點：
  ✗ KGS 需要高可用設計
  ✗ KGS 崩潰時記憶體中未使用的 key 浪費（可接受）</code></pre>
</section>

<section id="redirect-strategy">
  <h2>301 vs 302 Redirect 與 URL 管理</h2>
  <p>HTTP 狀態碼的選擇看似微小，卻對系統行為、分析準確性、SEO 和業務靈活性有重大影響。這是面試中常考的細節。</p>

  <h3>301 Permanent Redirect</h3>
  <pre data-lang="http"><code class="language-http">HTTP/1.1 301 Moved Permanently
Location: https://www.example.com/very-long-url/with/parameters?q=value
Cache-Control: max-age=31536000, immutable</code></pre>
  <p><strong>行為</strong>：瀏覽器永久快取此重定向。後續對相同短網址的訪問，直接在客戶端重定向，<strong>完全不請求我們的伺服器</strong>。CDN 也會長期快取。</p>

  <p><strong>對 Analytics 的影響（關鍵！）</strong>：一旦瀏覽器快取了 301，後續點擊永遠不會到達我們的伺服器，點擊計數停止增長。第一次點擊後的所有分析數據都丟失。</p>

  <h3>302 Temporary Redirect</h3>
  <pre data-lang="http"><code class="language-http">HTTP/1.1 302 Found
Location: https://www.example.com/very-long-url
Cache-Control: no-store, no-cache</code></pre>
  <p><strong>行為</strong>：瀏覽器不快取，<strong>每次訪問都請求我們的伺服器</strong>。可以即時更新目標 URL，且每次點擊都能被記錄。</p>

  <callout-box type="tip" title="面試標準答案">
    <p>短網址服務通常選擇 <strong>302 Temporary Redirect</strong>，因為：(1) 需要 Analytics 功能（每次點擊必須到達伺服器）；(2) 允許動態更改目標 URL；(3) 可以追蹤 URL 是否已過期。只有明確說明「永遠不需要更改目標且不需要分析」的場景才選 301。某些服務提供混合選項：首次訪問記錄後返回帶短期 Cache-Control 的 302。</p>
  </callout-box>

  <h3>自訂到期時間設計</h3>
  <pre data-lang="typescript"><code class="language-typescript">// 短網址建立時支援到期時間
interface CreateUrlRequest {
  longUrl: string;
  customAlias?: string;        // 自訂短碼
  expiresIn?: number;          // 秒數，null 表示永不過期
  password?: string;           // 密碼保護（可選功能）
  maxClicks?: number;          // 點擊次數上限（達到後自動過期）
}

// 資料庫 Schema
const createTableSql = \`
  CREATE TABLE urls (
    short_code    CHAR(7)      NOT NULL,
    long_url      TEXT         NOT NULL,
    user_id       BIGINT,
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    expires_at    TIMESTAMP    NULL,       -- NULL 表示永不過期
    max_clicks    INT          NULL,       -- NULL 表示無上限
    click_count   INT          DEFAULT 0,
    is_active     BOOLEAN      DEFAULT TRUE,
    password_hash VARCHAR(64)  NULL,       -- bcrypt hash，可選
    PRIMARY KEY (short_code),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)     -- 用於定期清理過期 URL
  )
\`;

// Redirect Service：檢查到期時間
app.get('/:shortCode', async (req, res) => {
  const { shortCode } = req.params;

  // L1 快取：本地記憶體
  const localCached = localCache.get(shortCode);
  if (localCached) {
    recordClick(shortCode, req);
    return res.redirect(302, localCached.longUrl);
  }

  // L2 快取：Redis
  const redisCached = await redis.get(\`url:\${shortCode}\`);
  if (redisCached) {
    const urlData = JSON.parse(redisCached);

    // 檢查是否已過期（即使在快取中）
    if (urlData.expiresAt && new Date(urlData.expiresAt) < new Date()) {
      await redis.del(\`url:\${shortCode}\`); // 清除過期快取
      return res.status(410).send('Short URL has expired');
    }

    recordClick(shortCode, req);
    return res.redirect(302, urlData.longUrl);
  }

  // 查資料庫
  const record = await db.query(
    \`SELECT long_url, expires_at, max_clicks, click_count, is_active, password_hash
     FROM urls WHERE short_code = ?\`,
    [shortCode]
  );

  if (!record || !record.is_active) {
    return res.status(404).send('Short URL not found');
  }

  if (record.expires_at && new Date(record.expires_at) < new Date()) {
    return res.status(410).send('Short URL has expired'); // 410 Gone：資源曾存在但已刪除
  }

  if (record.max_clicks && record.click_count >= record.max_clicks) {
    return res.status(410).send('Short URL has reached its click limit');
  }

  if (record.password_hash) {
    // 密碼保護：重定向到密碼輸入頁面
    return res.redirect(302, \`/password-gate/\${shortCode}\`);
  }

  // 設定快取 TTL：根據到期時間動態調整
  const ttl = record.expires_at
    ? Math.max(0, Math.floor((new Date(record.expires_at).getTime() - Date.now()) / 1000))
    : 86400; // 預設 1 天

  if (ttl > 0) {
    await redis.setex(\`url:\${shortCode}\`, ttl, JSON.stringify({
      longUrl: record.long_url,
      expiresAt: record.expires_at,
    }));
    localCache.set(shortCode, { longUrl: record.long_url }, { ttl: Math.min(ttl, 300) });
  }

  recordClick(shortCode, req);
  return res.redirect(302, record.long_url);
});</code></pre>

  <h3>惡意 URL 過濾</h3>
  <pre data-lang="typescript"><code class="language-typescript">// 多層惡意 URL 過濾機制
class MaliciousUrlFilter {
  // 層一：格式驗證
  async validateUrl(url: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      const parsed = new URL(url);

      // 只允許 HTTP/HTTPS
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { valid: false, reason: 'Only HTTP and HTTPS URLs are allowed' };
      }

      // 阻擋內網 IP（SSRF 防護）
      if (this.isPrivateIp(parsed.hostname)) {
        return { valid: false, reason: 'Private IP addresses are not allowed' };
      }

      // 阻擋 localhost
      if (['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)) {
        return { valid: false, reason: 'Localhost URLs are not allowed' };
      }
    } catch {
      return { valid: false, reason: 'Invalid URL format' };
    }

    return { valid: true };
  }

  // 層二：Google Safe Browsing API（每日更新的惡意 URL 資料庫）
  async checkSafeBrowsing(url: string): Promise<boolean> {
    const response = await fetch(
      \`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=\${GOOGLE_API_KEY}\`,
      {
        method: 'POST',
        body: JSON.stringify({
          client: { clientId: 'myapp', clientVersion: '1.0' },
          threatInfo: {
            threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: [{ url }],
          },
        }),
      }
    );
    const data = await response.json();
    return !data.matches || data.matches.length === 0; // true = 安全
  }

  // 層三：自建黑名單（被舉報的域名）
  async checkBlacklist(url: string): Promise<boolean> {
    const domain = new URL(url).hostname;
    return !(await redis.sismember('blacklisted_domains', domain));
  }

  // SSRF 防護：判斷是否為私有 IP
  private isPrivateIp(hostname: string): boolean {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,  // Link-local
      /^fc00:/,       // IPv6 ULA
    ];
    return privateRanges.some(range => range.test(hostname));
  }
}

// 整合到 URL 建立流程
async function createShortUrl(req: Request, res: Response) {
  const { longUrl } = req.body;
  const filter = new MaliciousUrlFilter();

  const formatCheck = await filter.validateUrl(longUrl);
  if (!formatCheck.valid) {
    return res.status(400).json({ error: formatCheck.reason });
  }

  const [isSafe, isNotBlacklisted] = await Promise.all([
    filter.checkSafeBrowsing(longUrl),
    filter.checkBlacklist(longUrl),
  ]);

  if (!isSafe || !isNotBlacklisted) {
    // 記錄日誌（不告訴用戶具體原因，防止繞過）
    logger.warn('Blocked malicious URL', { longUrl, userId: req.user?.id });
    return res.status(400).json({ error: 'URL cannot be shortened due to security policy' });
  }

  // 通過檢查，繼續建立短網址
  const shortCode = await keyGenerationService.nextKey();
  // ...
}</code></pre>
</section>

<section id="url-analytics">
  <h2>Analytics 資料收集架構</h2>
  <p>分析功能需要在不影響重定向延遲的前提下，收集每次點擊的詳細資訊。這是一個典型的「寫入路徑解耦（Write Path Decoupling）」設計，也是 Lambda / Kappa 架構在實際業務中的應用。</p>

  <h3>Click 統計 Pipeline 設計</h3>
  <pre data-lang="text"><code class="language-text">完整的 Click Analytics Pipeline：

[重定向請求]
    │
    ├─► [立即返回 302 重定向] ← 主路徑，P99 < 10ms
    │
    └─► [非同步事件發佈] ← 不阻塞主路徑
           │ fire-and-forget（最多等待 1ms）
           ▼
    [Kafka Topic: raw-clicks]
    （多分區，按 short_code 分區，保序）
           │
           ├─► [實時流處理（Flink/Spark Streaming）]
           │         │ 每 10 秒微批次
           │         ├─► IP 地理位置解析（MaxMind GeoIP2 本地庫）
           │         ├─► User-Agent 解析（設備/OS/瀏覽器）
           │         ├─► Bot 過濾（已知爬蟲 User-Agent）
           │         └─► 輸出到：
           │               ├─► Redis（實時計數 INCR）
           │               └─► ClickHouse（OLAP 分析庫）
           │
           └─► [批次處理（Spark，每小時）]
                     │ 從 S3 讀取原始事件
                     ├─► 去重（相同 IP 在 5 分鐘內的重複點擊）
                     ├─► 關聯用戶資訊
                     └─► 輸出到 ClickHouse（覆蓋實時數據，更準確）</code></pre>

  <h3>地理分佈分析</h3>
  <pre data-lang="typescript"><code class="language-typescript">import maxmind, { CityResponse } from 'maxmind';

// 初始化 MaxMind GeoIP2 本地資料庫（避免外部 API 呼叫的延遲）
const geoipDb = await maxmind.open<CityResponse>('/data/GeoLite2-City.mmdb');

async function enrichClickEvent(rawEvent: RawClickEvent): Promise<EnrichedClickEvent> {
  const clientIp = rawEvent.ipAddress;

  // 地理位置解析（本地資料庫，無網路延遲）
  const geoResult = geoipDb.get(clientIp);
  const geo = {
    country: geoResult?.country?.iso_code ?? 'UNKNOWN',        // e.g., "TW"
    countryName: geoResult?.country?.names?.['zh-CN'] ?? '',   // e.g., "台灣"
    city: geoResult?.city?.names?.['en'] ?? '',                // e.g., "Taipei"
    latitude: geoResult?.location?.latitude,
    longitude: geoResult?.location?.longitude,
    timezone: geoResult?.location?.time_zone,                  // e.g., "Asia/Taipei"
  };

  // User-Agent 解析
  const ua = parseUserAgent(rawEvent.userAgent);
  const device = {
    type: ua.device.type ?? 'desktop',   // 'mobile' | 'tablet' | 'desktop'
    os: ua.os.name ?? 'Unknown',         // 'iOS' | 'Android' | 'Windows' | 'macOS'
    osVersion: ua.os.version,
    browser: ua.browser.name ?? 'Unknown', // 'Chrome' | 'Safari' | 'Firefox'
    isBot: ua.isBot,                     // 已知爬蟲過濾
  };

  // Referrer 分類
  const referer = classifyReferer(rawEvent.referer);
  // e.g., { source: 'twitter', medium: 'social', campaign: null }

  return {
    ...rawEvent,
    geo,
    device,
    referer,
    // 匿名化：IP 地址在地理解析後截斷最後一段
    ipAddress: anonymizeIp(clientIp), // 192.168.1.x → 192.168.1.0
  };
}

// IP 匿名化（GDPR 合規）
function anonymizeIp(ip: string): string {
  if (ip.includes(':')) {
    // IPv6：保留前 64 位
    return ip.replace(/:[^:]+:[^:]+:[^:]+:[^:]+$/, ':0:0:0:0');
  }
  // IPv4：清零最後一段
  return ip.replace(/\.\d+$/, '.0');
}</code></pre>

  <h3>Real-time vs Batch Analytics 取捨</h3>
  <pre data-lang="text"><code class="language-text">Lambda 架構（同時維護 Batch 和 Stream 兩條路徑）：

實時層（Speed Layer）—— Redis + Flink：
  優點：即時可見（10 秒內更新），低延遲查詢
  缺點：可能有小幅誤差（重複計數、Bot 未過濾完整）
  適用：儀表板即時顯示、短期趨勢（最近 24 小時）

批次層（Batch Layer）—— Spark + ClickHouse：
  優點：準確（完整去重、Bot 過濾、跨事件關聯）
  缺點：延遲高（1-24 小時才更新）
  適用：計費依據、SLA 報告、長期趨勢分析

服務層（Serving Layer）—— 合併兩層結果：
  查詢邏輯：
    最近 1 小時的數據 → 從實時層讀取（Redis）
    超過 1 小時的數據 → 從批次層讀取（ClickHouse）
    合併時確保不重疊

Kappa 架構（簡化版，只有 Stream）：
  適合：數據準確性要求不極高的場景
  做法：所有計算都在 Flink 中完成，包括延遲去重視窗
  優點：架構更簡單，只需維護一套代碼
  缺點：歷史數據重算時需要重新消費 Kafka（設置長期保留）</code></pre>

  <h3>ClickHouse 查詢範例</h3>
  <pre data-lang="typescript"><code class="language-typescript">// 查詢 API：獲取短網址的完整分析數據
app.get('/api/analytics/:shortCode', authenticate, async (req, res) => {
  const { shortCode } = req.params;
  const { period = '7d', granularity = 'day' } = req.query;

  // 驗證此短網址屬於請求者
  const ownership = await db.query(
    'SELECT user_id FROM urls WHERE short_code = ?', [shortCode]
  );
  if (!ownership || ownership.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const periodInterval = { '24h': '1 DAY', '7d': '7 DAY', '30d': '30 DAY' }[period as string];

  // 時間序列（點擊趨勢）
  const timeSeries = await clickhouse.query(\`
    SELECT
      toStartOfInterval(timestamp, INTERVAL 1 \${granularity === 'day' ? 'DAY' : 'HOUR'}) AS period,
      count() AS clicks,
      countIf(device_type = 'mobile') AS mobile_clicks,
      countIf(device_type = 'desktop') AS desktop_clicks
    FROM click_events
    WHERE short_code = {shortCode: String}
      AND timestamp >= now() - INTERVAL \${periodInterval}
      AND is_bot = 0
    GROUP BY period
    ORDER BY period ASC
  \`, { shortCode });

  // 地理分佈
  const geoDistribution = await clickhouse.query(\`
    SELECT
      country_code,
      country_name,
      count() AS clicks
    FROM click_events
    WHERE short_code = {shortCode: String}
      AND timestamp >= now() - INTERVAL \${periodInterval}
      AND is_bot = 0
    GROUP BY country_code, country_name
    ORDER BY clicks DESC
    LIMIT 20
  \`, { shortCode });

  // 即時計數（從 Redis 取，更即時）
  const totalClicks = await redis.get(\`clicks:\${shortCode}:total\`) ?? '0';

  res.json({
    totalClicks: parseInt(totalClicks),
    uniqueClicks: '（從 ClickHouse 的 uniqExact(ip_address)）',
    timeSeries,
    geoDistribution,
  });
});</code></pre>

  <h3>隱私保護設計（GDPR/CCPA 合規）</h3>
  <pre data-lang="typescript"><code class="language-typescript">// 隱私保護的分層設計
class PrivacyAwareAnalytics {
  // 1. 最短保留原則：原始 IP 最多保留 24 小時
  async storeRawEvent(event: RawClickEvent): Promise<void> {
    await redis.setex(
      \`raw_event:\${event.id}\`,
      86400, // 24 小時後自動刪除
      JSON.stringify(event)
    );
  }

  // 2. 發布匿名化事件到 Kafka（永久保留，但已無法識別個人）
  async publishAnonymizedEvent(event: RawClickEvent): Promise<void> {
    await kafka.send({
      topic: 'anonymized-clicks',
      messages: [{
        key: event.shortCode,
        value: JSON.stringify({
          short_code: event.shortCode,
          timestamp: event.timestamp,
          country_code: await this.getCountryCode(event.ipAddress), // 只保留國家
          device_type: this.getDeviceType(event.userAgent),
          referer_domain: this.getRefererDomain(event.referer),
          // 不保存：完整 IP、完整 User-Agent、完整 Referer URL
        }),
      }],
    });
  }

  // 3. 用戶可要求刪除自己的數據（GDPR Right to Erasure）
  async deleteUserData(userId: string): Promise<void> {
    // 獲取用戶所有短網址
    const urls = await db.query('SELECT short_code FROM urls WHERE user_id = ?', [userId]);
    const shortCodes = urls.map((u: any) => u.short_code);

    // 在 ClickHouse 中刪除相關點擊記錄（GDPR 合規）
    // ClickHouse 的 DELETE 是非同步的，透過 ALTER TABLE ... DELETE
    for (const shortCode of shortCodes) {
      await clickhouse.query(
        \`ALTER TABLE click_events DELETE WHERE short_code = {sc: String}\`,
        { sc: shortCode }
      );
    }
    // 同時刪除 Redis 中的計數
    const pipeline = redis.pipeline();
    for (const shortCode of shortCodes) {
      pipeline.del(\`clicks:\${shortCode}:total\`);
    }
    await pipeline.exec();
  }
}

// 允許用戶選擇退出追蹤（Do Not Track）
app.get('/:shortCode', async (req, res) => {
  const dnt = req.headers['dnt'] === '1'; // Do Not Track Header
  // 重定向照常執行
  // ...
  if (!dnt) {
    recordClick(shortCode, req); // 只在用戶允許時記錄
  }
});</code></pre>

  <callout-box type="warning" title="隱私法規合規要點">
    <p>GDPR（歐盟）和 CCPA（加州）要求：(1) IP 地址視為個人資料，轉換為地理位置後應立即刪除或匿名化；(2) 必須提供退出追蹤的選項（Opt-out）；(3) 隱私政策需明確說明資料收集範圍；(4) 用戶有權要求刪除自己的所有資料（Right to Erasure）；(5) 資料不能傳輸至 GDPR 不認可的第三國（注意 MaxMind GeoIP 資料庫的授權）。</p>
  </callout-box>
</section>
`,
} satisfies ChapterContent;
