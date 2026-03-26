import type { ChapterContent } from '../../types.js';

export default {
  title: 'API 設計最佳實踐',
  content: `
<section id="restful-principles">
  <h2>RESTful 設計原則</h2>
  <p>
    REST（Representational State Transfer）是 Roy Fielding 在 2000 年博士論文中提出的架構風格。
    REST 不是規格（Specification），而是一組架構約束（Architectural Constraints）。
    正確理解 REST 不僅是語法規範（GET vs POST），更是如何以資源為中心建模 API 的思維方式。
  </p>

  <arch-diagram src="./diagrams/ch13-api-design.json" caption="API 設計的核心元素：客戶端透過 API Gateway 存取資源，閘道負責認證、限流、路由；內部服務以 Richardson 成熟度 Level 2 為基準，提供標準 HTTP 語義；Webhook 提供反向推送能力。"></arch-diagram>

  <h3>Richardson Maturity Model（成熟度模型）</h3>
  <p>
    Richardson Maturity Model（RMM）將 REST API 分為四個成熟度等級（Level 0-3），
    幫助我們評估一個 API 的 RESTful 程度，也提供了 API 演進的路線圖：
  </p>

  <h4>Level 0：單一端點（The Swamp of POX）</h4>
  <pre data-lang="http"><code class="language-http">POST /api
Content-Type: application/json

{ "action": "getUser", "userId": 123 }
{ "action": "createOrder", "items": [...] }
{ "action": "deleteProduct", "productId": 456 }</code></pre>
  <p>
    所有操作都透過同一端點，用 action 欄位區分。
    這實際上是 RPC over HTTP，而非 REST。
    SOAP Web Service 就是典型的 Level 0 系統。
    主要問題：難以快取（所有請求都是 POST）、沒有語意化（無法從 URL 理解操作）。
  </p>

  <h4>Level 1：資源（Resources）</h4>
  <pre data-lang="http"><code class="language-http">POST /users/123          # 對用戶的操作
POST /orders             # 對訂單的操作
POST /products/456       # 對商品的操作</code></pre>
  <p>有了資源概念，URL 表示資源，但仍然只使用 POST，沒有利用 HTTP 動詞的語意。</p>

  <h4>Level 2：HTTP 動詞（HTTP Verbs）— 業界標配</h4>
  <pre data-lang="http"><code class="language-http">GET    /users/123              # 讀取單個用戶
GET    /users?role=admin       # 查詢用戶列表
POST   /users                  # 建立新用戶（201 + Location header）
PUT    /users/123              # 完整替換用戶資源
PATCH  /users/123              # 部分更新用戶欄位
DELETE /users/123              # 刪除用戶
GET    /users/123/orders       # 讀取用戶的訂單（子資源關係）
POST   /users/123/orders       # 為特定用戶建立訂單</code></pre>
  <p>
    正確使用 HTTP 動詞與狀態碼，這是目前業界最常見的「REST API」。
    大多數商業 API（GitHub、Stripe、Twilio）都在這個層次。
  </p>

  <h4>Level 3：超媒體控制（HATEOAS）</h4>
  <pre data-lang="json"><code class="language-json">{
  "id": "ord-123",
  "status": "PENDING",
  "amount": 150.00,
  "_links": {
    "self":    { "href": "/orders/ord-123",         "method": "GET" },
    "confirm": { "href": "/orders/ord-123/confirm", "method": "POST" },
    "cancel":  { "href": "/orders/ord-123/cancel",  "method": "POST" },
    "payment": { "href": "/payments?orderId=ord-123","method": "GET" }
  }
}</code></pre>
  <p>
    回應中包含相關操作的連結（Hypermedia Links），客戶端不需要硬編碼 URL。
    客戶端像瀏覽網頁一樣「發現」可以執行的操作，API 可以在不改動客戶端的情況下修改 URL。
    這是 REST 的最高境界，但實務中採用率較低，因為客戶端通常仍然需要理解每個 rel 的業務語意。
  </p>

  <callout-box type="info" title="業界實踐：Level 2 是最佳平衡點">
    大多數企業 API 達到 Level 2 就已足夠。Level 3 的 HATEOAS 雖然理論完美，
    但在實踐中客戶端通常仍需要硬編碼對 rel 類型的理解（如「confirm 意味著什麼？」），
    靈活性有限。維護 _links 也增加了 API 文件和測試的複雜度。
    <br/><br/>
    建議：以 Level 2 為基準，在需要引導客戶端狀態流轉的場景（如訂單狀態機）
    選擇性地加入部分 HATEOAS 元素。
  </callout-box>

  <h3>HTTP 狀態碼完整指南</h3>
  <pre data-lang="text"><code class="language-text">2xx 成功（Success）：
  200 OK              → GET/PUT/PATCH 成功，回應包含資料
  201 Created         → POST 建立資源成功，Location header 指向新資源
                        Location: /users/456
  202 Accepted        → 請求已接受，但非同步處理中（如發送 Email、生成報表）
  204 No Content      → DELETE 成功，或 PUT/PATCH 成功但不需要返回資料

3xx 重定向（Redirection）：
  301 Moved Permanently → 資源永久移動，客戶端應更新書籤
  302 Found           → 臨時重定向（如登入後跳轉）
  304 Not Modified    → 資源未變化（配合 ETag / If-None-Match 使用）
                        客戶端使用快取版本

4xx 客戶端錯誤（Client Error）：
  400 Bad Request     → 請求格式錯誤、必填參數缺失、類型錯誤
  401 Unauthorized    → 未提供認證資訊，或 Token 過期
                        （名字有誤導性，這是 Authentication 問題）
  403 Forbidden       → 已認證但無此資源的操作權限
                        （這才是 Authorization 問題）
  404 Not Found       → 資源不存在（也可用於隱藏資源存在以增加安全性）
  405 Method Not Allowed → HTTP 方法不支援（如對唯讀資源發 DELETE）
  409 Conflict        → 資源衝突（唯一性違反、版本衝突、狀態衝突）
  410 Gone            → 資源已永久刪除（比 404 語意更強）
  422 Unprocessable Entity → 格式正確但業務邏輯驗證失敗（如年齡 = -5）
  429 Too Many Requests → 超過 Rate Limit（帶 Retry-After header）

5xx 伺服器錯誤（Server Error）：
  500 Internal Server Error → 未預期的伺服器錯誤（不應返回堆疊追蹤）
  502 Bad Gateway     → 上游服務（後端）返回了無效回應
  503 Service Unavailable → 服務暫時不可用（過載、維護），帶 Retry-After
  504 Gateway Timeout → 上游服務超時未回應</code></pre>

  <h3>錯誤回應的標準格式設計</h3>
  <p>
    良好的錯誤回應應包含足夠的資訊讓開發者快速定位問題，但不應暴露安全敏感的內部資訊：
  </p>
  <pre data-lang="json"><code class="language-json">{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "請求驗證失敗，請檢查以下欄位",
    "request_id": "req-8f3a2b1c",
    "timestamp": "2025-03-26T10:30:00Z",
    "details": [
      {
        "field": "email",
        "code": "INVALID_FORMAT",
        "message": "email 格式不正確"
      },
      {
        "field": "age",
        "code": "OUT_OF_RANGE",
        "message": "age 必須在 0-150 之間"
      }
    ],
    "doc_url": "https://docs.example.com/errors#VALIDATION_FAILED"
  }
}</code></pre>

  <h3>URL 設計原則</h3>
  <pre data-lang="text"><code class="language-text">好的 URL 設計（名詞為主，複數資源名稱）：
✓ GET  /articles/{id}                   # 單個資源，名詞
✓ GET  /articles                        # 資源集合
✓ GET  /articles/{id}/comments          # 子資源關係（避免超過 2 層）
✓ POST /articles/{id}/publish           # 動作例外（狀態流轉）
✓ GET  /users?role=admin&status=active  # 篩選用 query params
✓ GET  /articles?sort=created_at&order=desc&limit=20&cursor=xxx

不好的 URL 設計（常見錯誤）：
✗ GET  /getArticle?id=123              # 動詞在 URL
✗ POST /articles/delete/123            # 用 POST 做 DELETE
✗ GET  /articles/123/getAllComments     # 多餘動詞
✗ GET  /article                        # 單數（應用複數）
✗ GET  /ARTICLES/{ID}                  # 大寫（應用小寫）
✗ GET  /articles/{id}/comments/{cid}/replies/{rid}/likes/{lid}  # 巢狀太深</code></pre>
</section>

<section id="pagination">
  <h2>Pagination：Offset vs Cursor-based</h2>
  <p>
    分頁是 API 設計中最常見也最容易出錯的功能。
    選擇合適的分頁策略對效能和資料一致性有重大影響，
    不同的使用場景需要不同的分頁策略。
  </p>

  <h3>Offset-based Pagination（偏移量分頁）</h3>
  <pre data-lang="http"><code class="language-http">GET /articles?page=3&limit=20
GET /articles?offset=40&limit=20</code></pre>
  <pre data-lang="sql"><code class="language-sql">SELECT * FROM articles
ORDER BY created_at DESC
LIMIT 20 OFFSET 40;  -- 跳過前 40 筆，返回第 41-60 筆</code></pre>
  <p><strong>優點：</strong>直觀易懂，可以直接跳到任意頁；前端容易實作頁碼顯示（共 X 頁，第 Y 頁）。</p>
  <p><strong>缺點：</strong></p>
  <ul>
    <li><strong>效能問題（深分頁懲罰）：</strong>
    OFFSET 100000 需要資料庫全表掃描 100020 行，再丟棄前 100000 行。
    即使有索引，資料庫仍需要遍歷索引找到第 100001 行的位置。
    在資料量達到百萬級時，第 5000 頁的查詢可能需要數秒。</li>
    <li><strong>資料漂移（Data Drift）問題：</strong>
    如果在翻頁期間有新資料插入，頁碼的對應關係會發生偏移，
    可能導致重複顯示或跳過資料。</li>
  </ul>
  <pre data-lang="text"><code class="language-text">資料漂移詳細範例（按時間倒序排列）：

初始狀態：資料 [Z, Y, X, W, V, U, T, S, R, Q]（Z 最新）

第 1 頁（offset=0, limit=5）返回：[Z, Y, X, W, V]
用戶正在閱讀第 1 頁時，新資料 AA 和 BB 被插入...

狀態變成：[BB, AA, Z, Y, X, W, V, U, T, S, R, Q]

第 2 頁（offset=5, limit=5）返回：[W, V, U, T, S]
                                    ↑  ↑
                                    W 和 V 出現在第 2 頁！（第 1 頁已見過）

→ 用戶看到了重複資料，U 之前的資料也向後偏移了</code></pre>

  <h3>Cursor-based Pagination（遊標分頁）</h3>
  <p>
    使用遊標（Cursor）標記位置——通常是最後一條記錄的唯一識別符或複合值（ID + 時間戳）——
    而非偏移量。每次查詢都以上一頁最後一條記錄為起點。
  </p>
  <pre data-lang="http"><code class="language-http">GET /articles?limit=20
# 回應：
{
  "data": [...20 筆資料...],
  "pagination": {
    "next_cursor": "eyJpZCI6MTIzLCJjcmVhdGVkX2F0IjoiMjAyNS0wMy0yNlQxMDowMDowMFoifQ==",
    "has_more": true,
    "total": null
  }
}

GET /articles?limit=20&cursor=eyJpZCI6MTIzLCJjcmVhdGVkX2F0IjoiMjAyNS0wMy0yNlQxMDowMDowMFoifQ==</code></pre>
  <pre data-lang="typescript"><code class="language-typescript">// Cursor 是 Base64 編碼的 JSON（對外不透明，避免客戶端依賴內部格式）
function encodeCursor(lastItem: Article): string {
  const payload = {
    id: lastItem.id,
    created_at: lastItem.createdAt.toISOString(),
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeCursor(cursor: string): { id: string; created_at: string } {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Invalid cursor');
  }
}

async function getArticles(params: {
  cursor?: string;
  limit?: number;
  sort?: 'desc' | 'asc';
}) {
  const limit = Math.min(params.limit ?? 20, 100);  // 最多 100 筆，防止濫用
  const sort = params.sort ?? 'desc';

  let query = db('articles')
    .select('*')
    .orderBy([
      { column: 'created_at', order: sort },
      { column: 'id', order: sort },  // 確保穩定排序（相同時間戳時按 ID 排）
    ]);

  if (params.cursor) {
    const { id, created_at } = decodeCursor(params.cursor);
    // 使用複合條件：時間不同時按時間，時間相同時按 ID
    if (sort === 'desc') {
      query = query.where(function () {
        this.where('created_at', '&lt;', created_at)
          .orWhere(function () {
            this.where('created_at', '=', created_at).andWhere('id', '&lt;', id);
          });
      });
    } else {
      query = query.where(function () {
        this.where('created_at', '&gt;', created_at)
          .orWhere(function () {
            this.where('created_at', '=', created_at).andWhere('id', '&gt;', id);
          });
      });
    }
  }

  // 多取一筆，用於判斷是否還有更多資料
  const items = await query.limit(limit + 1);
  const hasMore = items.length &gt; limit;
  if (hasMore) items.pop();

  return {
    data: items,
    pagination: {
      next_cursor: hasMore ? encodeCursor(items[items.length - 1]) : null,
      has_more: hasMore,
      // Cursor pagination 通常不提供 total count（代價高昂）
    },
  };
}</code></pre>

  <h3>Keyset Pagination（鍵集分頁）</h3>
  <p>
    Keyset Pagination 是 Cursor-based Pagination 的一種具體實現，
    直接使用排序鍵作為分頁條件，不需要 Base64 編碼，SQL 更簡潔：
  </p>
  <pre data-lang="sql"><code class="language-sql">-- 第一頁（最新的 20 篇文章）
SELECT * FROM articles
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- 假設上一頁最後一篇：created_at='2025-03-26', id=123
-- 下一頁：
SELECT * FROM articles
WHERE (created_at, id) &lt; ('2025-03-26', 123)
ORDER BY created_at DESC, id DESC
LIMIT 20;
-- PostgreSQL 支援 Row Value Comparison，這個語法是有效的！

-- 確保複合索引存在（缺少此索引查詢效能極差）
CREATE INDEX idx_articles_cursor ON articles (created_at DESC, id DESC);</code></pre>

  <h3>無限滾動（Infinite Scroll）的實現挑戰</h3>
  <p>無限滾動是 Cursor-based Pagination 的典型應用場景，但也有其特有的挑戰：</p>
  <ul>
    <li><strong>Back Navigation 問題：</strong>用戶向下滾動了 200 筆後，按下瀏覽器「上一頁」，
    大多數 SPA 會回到頁面頂部而非滾動位置（可用 scroll restoration 解決）</li>
    <li><strong>DOM 節點膨脹：</strong>長時間滾動後，DOM 中可能有數千個節點，
    造成記憶體壓力和渲染卡頓（解決方案：Virtual Scrolling / Windowing）</li>
    <li><strong>SEO 問題：</strong>搜尋引擎爬蟲通常不會模擬用戶滾動，
    後面的內容可能無法被索引（解決方案：服務端渲染初始內容，或提供傳統頁碼版本）</li>
    <li><strong>載入狀態管理：</strong>需要優雅處理「載入中」、「到底了」、「載入失敗並重試」三種狀態</li>
  </ul>

  <callout-box type="tip" title="分頁策略選擇建議">
    後台管理介面、需要跳頁的場景（如查看「第 50 頁的訂單記錄」）→ Offset Pagination。
    社群媒體 Feed、即時資料、無限滾動 → Cursor Pagination。
    資料量超過 10 萬筆時，應強烈考慮 Cursor Pagination——
    此時 OFFSET 的效能代價已經非常明顯。
    <br/><br/>
    如果同時需要「頁碼顯示」和「無限滾動」（如某些電商網站），
    可以在 URL 中同時支援兩種參數，前端根據場景選擇。
  </callout-box>
</section>

<section id="rate-limiting">
  <h2>Rate Limiting：演算法與分散式實現</h2>
  <p>
    Rate Limiting（速率限制）保護系統免於過載，
    也是 API 商業化的基礎（不同定價計劃有不同的 API 配額）。
    選擇正確的限流演算法取決於你對「突發流量（Burst）」的態度。
  </p>

  <h3>演算法一：Token Bucket（令牌桶）</h3>
  <p>
    桶中有固定容量的令牌，以固定速率補充。每次請求消耗一個令牌，
    桶空了就拒絕請求。<strong>允許短時突發</strong>是其核心特性。
  </p>
  <pre data-lang="typescript"><code class="language-typescript">class TokenBucket {
  private tokens: number;
  private lastRefillTime: number;

  constructor(
    private readonly capacity: number,   // 桶的最大容量（允許的突發量）
    private readonly refillRate: number, // 每秒補充令牌數（穩態速率）
  ) {
    this.tokens = capacity;  // 初始滿桶
    this.lastRefillTime = Date.now();
  }

  consume(requested = 1): boolean {
    this.refill();
    if (this.tokens &gt;= requested) {
      this.tokens -= requested;
      return true;   // 允許請求
    }
    return false;    // 令牌不足，拒絕請求
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTime) / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRate;
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  getStatus(): { tokens: number; capacity: number } {
    this.refill();
    return { tokens: Math.floor(this.tokens), capacity: this.capacity };
  }
}

// 範例：每秒 100 個請求的穩態速率，允許最多 200 個的瞬間突發
// 用戶可以在積累令牌後，短時間內快速消耗（如下載多個檔案）
const limiter = new TokenBucket(200, 100);

// 在 API 中間件中使用
async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = req.user.id;
  const allowed = await checkRateLimit(userId, limiter);
  if (!allowed) {
    res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' });
    return;
  }
  next();
}</code></pre>

  <h3>演算法二：Leaky Bucket（漏桶）</h3>
  <p>
    請求進入固定大小的佇列（桶），以固定速率流出處理。
    超出佇列容量的請求被直接拒絕。<strong>輸出速率固定，平滑無突發</strong>。
  </p>
  <pre data-lang="python"><code class="language-python">import asyncio
from collections import deque
import time

class LeakyBucket:
    def __init__(self, capacity: int, leak_rate: float):
        """
        capacity: 佇列最大長度（緩衝區大小）
        leak_rate: 每秒處理請求數（固定輸出速率）
        """
        self.capacity = capacity
        self.leak_rate = leak_rate
        self.queue = deque()
        self.last_leak_time = time.monotonic()

    def add_request(self, request) -> bool:
        """嘗試加入請求，返回是否成功"""
        self._leak()  # 先處理已到時間的請求

        if len(self.queue) &lt; self.capacity:
            self.queue.append(request)
            return True   # 成功加入佇列
        return False      # 佇列已滿，拒絕

    def _leak(self) -> list:
        """以固定速率「漏出」請求並處理"""
        now = time.monotonic()
        elapsed = now - self.last_leak_time
        requests_to_process = int(elapsed * self.leak_rate)
        processed = []

        for _ in range(min(requests_to_process, len(self.queue))):
            processed.append(self.queue.popleft())

        if requests_to_process &gt; 0:
            self.last_leak_time = now
        return processed

# Leaky Bucket 的適用場景：
# 向第三方 API 發送請求（如 SMS 閘道只允許每秒 10 次）
# 不允許突發的嚴格速率控制（如支付 API）</code></pre>

  <h3>演算法三：Sliding Window Counter（滑動視窗計數器）</h3>
  <p>
    固定視窗計數器（Fixed Window Counter）有一個嚴重問題：
    在視窗邊界前後各 50% 的請求可以在 1 秒內通過，實際速率達到限制的兩倍。
    滑動視窗計數器解決了這個問題：
  </p>
  <pre data-lang="text"><code class="language-text">固定視窗的邊界突發問題：
限制：每分鐘 100 次請求

0:59 到 1:00（最後 1 秒）：發送 100 次 → 允許（計入第 1 分鐘）
1:00 到 1:01（最初 1 秒）：發送 100 次 → 允許（計入第 2 分鐘）
→ 在 0:59-1:01 這 2 秒內，實際發送了 200 次！是限制的兩倍

滑動視窗計數器解法：
  紀錄每個時間片（如 1 秒）的請求數
  計算當前時間往前 1 分鐘的所有時間片的總和
  如果總和 &gt; 100，拒絕請求

  例：當前是 1:30，檢查 0:30-1:30 這 60 個時間片的請求總數</code></pre>

  <h3>分散式 Rate Limiting：Redis + Lua 腳本</h3>
  <p>
    單機的 Rate Limiter 無法處理多個服務實例共享限流狀態的問題。
    Redis + Lua 腳本提供了原子性的分散式限流方案：
  </p>
  <pre data-lang="lua"><code class="language-lua">-- Redis Lua 腳本：Token Bucket 分散式實現（原子操作，避免競態條件）
-- KEYS[1]: rate limit key（如 "ratelimit:user:123"）
-- ARGV[1]: bucket capacity（最大令牌數）
-- ARGV[2]: refill_rate（每秒補充令牌數）
-- ARGV[3]: requested（本次消耗的令牌數，通常為 1）
-- ARGV[4]: current_time_ms（當前時間毫秒）

local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local requested = tonumber(ARGV[3])
local now = tonumber(ARGV[4])

-- 從 Redis 取得當前狀態（HMGET 原子讀取兩個欄位）
local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(bucket[1]) or capacity      -- 預設滿桶
local last_refill = tonumber(bucket[2]) or now

-- 計算補充令牌（時間差 × 補充速率）
local elapsed_seconds = (now - last_refill) / 1000
local tokens_to_add = elapsed_seconds * refill_rate
tokens = math.min(capacity, tokens + tokens_to_add)

if tokens >= requested then
  -- 允許：扣除令牌並更新狀態
  tokens = tokens - requested
  redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
  redis.call('EXPIRE', key, 3600)  -- 1 小時無請求後自動清除
  return {1, math.floor(tokens)}  -- {allowed=1, remaining_tokens}
else
  -- 拒絕：更新時間戳但不扣令牌
  redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
  redis.call('EXPIRE', key, 3600)
  return {0, 0}  -- {allowed=0, remaining_tokens=0}
end</code></pre>

  <pre data-lang="typescript"><code class="language-typescript">// 在 Node.js 中調用 Redis Lua 腳本
const RATE_LIMIT_SCRIPT = \`...（上面的 Lua 腳本）...\`;

async function checkRateLimit(
  userId: string,
  capacity: number,
  refillRate: number
): Promise&lt;{ allowed: boolean; remaining: number; resetAfterMs: number }&gt; {
  const key = \`ratelimit:user:\${userId}\`;
  const now = Date.now();

  const result = await redis.eval(
    RATE_LIMIT_SCRIPT,
    1,          // key 的數量
    key,        // KEYS[1]
    capacity,   // ARGV[1]
    refillRate, // ARGV[2]
    1,          // ARGV[3]（消耗 1 個令牌）
    now,        // ARGV[4]
  ) as [number, number];

  const allowed = result[0] === 1;
  const remaining = result[1];
  const resetAfterMs = allowed ? 0 : Math.ceil((1 - remaining) / refillRate * 1000);

  return { allowed, remaining, resetAfterMs };
}</code></pre>

  <h3>Rate Limit 回應 Header（業界標準）</h3>
  <pre data-lang="http"><code class="language-http">HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 1000            # 限制總量
X-RateLimit-Remaining: 0           # 剩餘配額
X-RateLimit-Reset: 1743000000      # 配額重置的 Unix 時間戳
X-RateLimit-Reset-After: 60        # 多少秒後重置（相對時間）
Retry-After: 60                    # 標準 header：多少秒後可重試
Content-Type: application/json

{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "API 請求過於頻繁，請 60 秒後再試",
  "retry_after": 60
}</code></pre>

  <h3>分散式限流的挑戰</h3>
  <p>在多個 API Server 實例共享限流狀態時，面臨以下挑戰：</p>
  <ul>
    <li><strong>網路延遲：</strong>每次請求都需要讀寫 Redis，增加 1-5ms 延遲。
    解決方案：在本地快取部分令牌（Local Token Cache），定期與 Redis 同步，
    以輕微的不精確換取效能。</li>
    <li><strong>Redis 可用性：</strong>如果 Redis 不可用，限流策略降級為「放行所有請求」
    還是「拒絕所有請求」？通常選擇放行（允許過載風險），以維持服務可用性。</li>
    <li><strong>時鐘同步：</strong>不同 API Server 的時鐘可能有微小差異，
    影響 Token Bucket 的令牌補充計算（通常在 1-10ms 範圍內，可忽略）。</li>
  </ul>

  <callout-box type="warning" title="Rate Limiting 的粒度設計">
    不同維度的限流需要疊加使用：
    全局限流（整個 API 每秒 10000 次，防止系統過載）、
    用戶級限流（每個用戶每秒 100 次，防止單一用戶濫用）、
    端點級限流（/search 每秒 50 次，因為搜索比普通查詢更昂貴）、
    IP 級限流（防止 DDoS，在 API Gateway 層實施）。
    這些限流應該分別設置，互相獨立。
  </callout-box>
</section>

<section id="api-versioning">
  <h2>API 版本管理策略</h2>
  <p>
    當 API 需要做破壞性變更時（Breaking Change），版本管理策略決定了如何在不影響現有客戶端的情況下演進 API。
    不良的版本管理會導致客戶端崩潰，良好的版本管理讓 API 平滑演進。
  </p>

  <h3>什麼是破壞性變更？</h3>
  <table>
    <thead>
      <tr>
        <th>類型</th>
        <th>破壞性（需要版本升級）</th>
        <th>非破壞性（向後相容）</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>欄位變更</td>
        <td>刪除欄位、重新命名欄位、改變欄位類型</td>
        <td>新增可選欄位、新增 enum 值（客戶端應忽略未知 enum）</td>
      </tr>
      <tr>
        <td>端點變更</td>
        <td>刪除端點、改變 HTTP 方法、改變 URL 結構</td>
        <td>新增端點、新增 HTTP 方法到現有資源</td>
      </tr>
      <tr>
        <td>狀態碼變更</td>
        <td>改變成功/失敗的 HTTP 狀態碼語義</td>
        <td>新增特定情況下的新狀態碼（如 202 替代 200）</td>
      </tr>
      <tr>
        <td>行為變更</td>
        <td>改變排序、分頁預設值、計算邏輯</td>
        <td>新增功能、改善效能</td>
      </tr>
    </tbody>
  </table>

  <h3>方案一：URL Path Versioning（最常見）</h3>
  <pre data-lang="http"><code class="language-http">GET /v1/users/123
GET /v2/users/123       # v2 引入了 breaking change

# 也可以用 /api/v1/... 形式
GET /api/v1/orders
GET /api/v2/orders</code></pre>
  <p><strong>優點：</strong>直觀易懂、易於測試（可用瀏覽器直接訪問）、可被 CDN 快取、
  路由器易於分流（/v1/* → v1 服務，/v2/* → v2 服務）。</p>
  <p><strong>缺點：</strong>URL 包含「版本」資訊，語意上不夠純粹（版本是表示形式，不是資源的一部分）；
  客戶端需要在所有 URL 中更新版本號。</p>

  <h3>方案二：Header Versioning（最 RESTful）</h3>
  <pre data-lang="http"><code class="language-http">GET /users/123
Accept: application/vnd.myapp.v2+json

# 或使用自訂 Header（GitHub API 和 Stripe API 的做法）
GET /users/123
API-Version: 2024-01

# 或使用 Accept-Version
GET /users/123
Accept-Version: 2</code></pre>
  <p><strong>優點：</strong>URL 保持清潔，資源識別與版本分離；
  可以在單一 URL 上支援多個版本的回應格式。</p>
  <p><strong>缺點：</strong>不易測試（瀏覽器無法直接訪問指定版本）；
  CDN 快取需要 Vary header 配合（Vary: Accept 或 Vary: API-Version）；
  不易被新手發現（版本不在 URL 中）。</p>

  <h3>方案三：Query Parameter Versioning</h3>
  <pre data-lang="http"><code class="language-http">GET /users/123?version=2
GET /users/123?api-version=2024-01</code></pre>
  <p><strong>優點：</strong>易於測試；向後相容性好（舊客戶端不傳 version 時使用預設版本）。</p>
  <p><strong>缺點：</strong>URL 語意混亂（版本不是查詢條件）；快取策略複雜（需要按 query param 分快取）。</p>

  <h3>Stripe 的日期版本策略（推薦學習）</h3>
  <p>
    Stripe 使用日期作為版本號（如 <code>2024-04-10</code>），
    每個版本維護對應的行為快照，是大型商業 API 的優秀實踐：
  </p>
  <pre data-lang="http"><code class="language-http">POST /v1/charges
Stripe-Version: 2024-04-10
Authorization: Bearer sk_test_...</code></pre>
  <p>
    Stripe 的設計優點：
    API Key 可以綁定預設版本（建立時決定），確保舊程式碼不受新版本影響；
    開發者可以在測試環境升級版本，確認相容性後再升級生產環境；
    每個版本的行為被精確記錄在 CHANGELOG 中，便於審計。
  </p>

  <h3>語意化版本號（Semantic Versioning）在 API 中的應用</h3>
  <pre data-lang="text"><code class="language-text">Semantic Versioning：MAJOR.MINOR.PATCH
  MAJOR（主版本）：包含破壞性變更，需要客戶端修改程式碼
    → 觸發 URL 版本升級（v1 → v2）
  MINOR（次版本）：向後相容的新功能
    → 不需要新版本，客戶端可選擇性使用新功能
  PATCH（修訂版本）：向後相容的 Bug 修復
    → 不需要新版本，客戶端自動受益

API URL 版本只反映 MAJOR 版本：
  /v1/ → 所有 1.x.x 版本（包含所有 MINOR 和 PATCH 更新）
  /v2/ → 所有 2.x.x 版本（包含破壞性變更）

在 CHANGELOG 中記錄所有 MINOR 和 PATCH 變更：
  v1.3.0 (2025-03-01): 新增 /users/123/preferences 端點
  v1.2.1 (2025-02-15): 修復 /orders 分頁計算錯誤
  v2.0.0 (2025-01-01): 重新設計 User 物件結構（breaking change）</code></pre>

  <h3>版本廢棄策略（Deprecation Strategy）</h3>
  <pre data-lang="http"><code class="language-http"># 在所有 v1 回應中加入廢棄警告 Header（標準草案 RFC 8594）
HTTP/1.1 200 OK
Deprecation: true
Deprecation-Date: Mon, 01 Jan 2026 00:00:00 GMT
Sunset: Sat, 01 Jul 2026 00:00:00 GMT     # 最終下線日期（RFC 8594）
Link: &lt;https://api.example.com/v2/users&gt;; rel="successor-version"
Link: &lt;https://docs.example.com/migration-v1-to-v2&gt;; rel="deprecation"
Warning: 299 - "This version will be sunset on 2026-07-01"</code></pre>

  <p>廢棄時間線建議：</p>
  <ul>
    <li>宣告廢棄（Announce Deprecation）：至少提前 6 個月通知，發送 Email 給 API 使用者</li>
    <li>觀察期（Observation Period）：監控舊版本 API 的使用量，識別仍在使用的客戶端主動聯繫</li>
    <li>強制遷移提醒：廢棄日期前 30 天，對所有請求返回 Warning header</li>
    <li>下線（Sunset）：達到 Sunset 日期後，端點返回 410 Gone（不是 404）</li>
  </ul>

  <callout-box type="warning" title="永遠不要假設客戶端會主動升級">
    一旦 API 公開，總有客戶端不會主動升級。
    即使你提前 6 個月通知了廢棄計畫，到了下線日期，仍然會有客戶端在呼叫舊版本。
    建議：在下線前最後一週，監控舊版本的剩餘請求量，
    評估是否有必要延期（商業 API 的強制廢棄可能影響客戶關係）。
    GitHub 的一些 API 版本宣告廢棄後維護了多年才真正下線。
  </callout-box>
</section>

<section id="webhook-design">
  <h2>Webhook 設計：安全、可靠、可維運</h2>
  <p>
    Webhook 是「反向 API」——當事件發生時，伺服器主動推送 HTTP POST 通知給客戶端，
    而非客戶端輪詢（Polling）。
    廣泛用於支付通知（Stripe、PayPal）、CI/CD 觸發（GitHub Actions）、
    資料同步（Shopify 訂單）、即時告警（PagerDuty）等場景。
  </p>

  <h3>Webhook 的完整生命週期</h3>
  <pre data-lang="text"><code class="language-text">1. 訂閱（Registration）：
   客戶端呼叫我們的 API 登記 Webhook URL 和感興趣的事件類型
   POST /webhooks
   {
     "url": "https://customer.example.com/webhooks/payment",
     "events": ["payment.succeeded", "payment.failed", "refund.created"],
     "secret": "whsec_..."   # 客戶端提供的共享密鑰（用於驗籤）
   }
   → 返回 webhook_id，客戶端用於管理（查詢、刪除、查看歷史）

2. 觸發（Delivery）：
   事件發生時，我們的系統向客戶端發送 POST 請求
   POST https://customer.example.com/webhooks/payment
   Content-Type: application/json
   X-Webhook-ID: wh-evt-789abc
   X-Webhook-Timestamp: 1743000000
   X-Webhook-Signature: sha256=abcdef1234567890...

   {
     "id": "evt-456",
     "type": "payment.succeeded",
     "created": 1743000000,
     "data": {
       "payment_id": "pay-123",
       "amount": 15000,
       "currency": "TWD",
       "order_id": "ord-789"
     }
   }

3. 確認（Acknowledgement）：
   客戶端返回 2xx 狀態碼表示成功接收
   HTTP/1.1 200 OK

4. 重試（Retry）：
   若非 2xx，系統進行指數退避重試（見下文）

5. 失敗處理：
   達到最大重試次數後，標記為 FAILED，
   可發郵件通知或在管理介面顯示</code></pre>

  <h3>HMAC-SHA256 簽名驗證（防止偽造攻擊）</h3>
  <p>
    簽名驗證防止攻擊者偽造 Webhook：攻擊者可以向你的 Webhook 端點發送偽造事件
    （如偽造「支付成功」通知）。正確的 HMAC 驗證讓接收方能確認事件確實來自正規發送方。
  </p>
  <pre data-lang="typescript"><code class="language-typescript">import crypto from 'crypto';

// ─── 發送方（我們的系統）───
function generateWebhookSignature(
  payload: string,
  timestamp: string,
  secret: string
): string {
  // 簽名包含時間戳，防止重放攻擊（同一 payload 在不同時間有不同簽名）
  const signedPayload = \`\${timestamp}.\${payload}\`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signedPayload, 'utf8');
  return 'sha256=' + hmac.digest('hex');
}

async function sendWebhookWithSignature(
  webhookId: string,
  url: string,
  event: WebhookEvent,
  secret: string
): Promise&lt;void&gt; {
  const payload = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = generateWebhookSignature(payload, timestamp, secret);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-ID': event.id,
      'X-Webhook-Timestamp': timestamp,
      'X-Webhook-Signature': signature,
    },
    body: payload,
    signal: AbortSignal.timeout(30000), // 30 秒超時
  });

  if (!response.ok) {
    throw new WebhookDeliveryError(\`HTTP \${response.status}\`, response.status);
  }
}

// ─── 接收方（客戶端）───
function verifyWebhookSignature(
  rawBody: string,    // 必須是原始 body 字串，不能先 JSON.parse
  timestamp: string,
  signature: string,
  secret: string
): boolean {
  // 防禦 1：驗證時間戳，拒絕超過 5 分鐘的請求（防重放攻擊）
  const now = Math.floor(Date.now() / 1000);
  const age = Math.abs(now - parseInt(timestamp, 10));
  if (age &gt; 300) {
    throw new Error(\`Webhook 時間戳過期：\${age} 秒前的請求（最多允許 300 秒）\`);
  }

  // 防禦 2：計算預期簽名
  const expectedSignature = generateWebhookSignature(rawBody, timestamp, secret);

  // 防禦 3：使用 timingSafeEqual 比較（防止時序攻擊：Timing Attack）
  // 普通字串比較在長度或前幾個字元相同時耗時不同，攻擊者可藉此猜測正確簽名
  const sigBuffer = Buffer.from(signature.replace('sha256=', ''), 'hex');
  const expectedBuffer = Buffer.from(expectedSignature.replace('sha256=', ''), 'hex');

  if (sigBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

// Express 中間件範例：接收並驗證 Webhook
app.post('/webhooks/payment',
  express.raw({ type: 'application/json' }),  // 取得原始 body bytes
  (req, res) => {
    const rawBody = req.body.toString('utf8');
    const timestamp = req.headers['x-webhook-timestamp'] as string;
    const signature = req.headers['x-webhook-signature'] as string;

    try {
      const isValid = verifyWebhookSignature(rawBody, timestamp, signature, WEBHOOK_SECRET);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    } catch (e) {
      return res.status(401).json({ error: e.message });
    }

    const event = JSON.parse(rawBody);

    // 立即返回 200（在 30 秒內），非同步處理業務邏輯
    res.status(200).json({ received: true });

    // 非同步處理（不阻塞回應）
    setImmediate(() => processWebhookEvent(event));
  }
);</code></pre>

  <h3>重試機制與指數退避</h3>
  <pre data-lang="typescript"><code class="language-typescript">// 指數退避重試策略（業界標準）
const RETRY_DELAYS_SECONDS = [0, 30, 300, 1800, 86400]; // 立即、30s、5m、30m、24h

async function deliverWebhookWithRetry(
  delivery: WebhookDelivery
): Promise&lt;void&gt; {
  const { webhookId, url, payload, attempt } = delivery;

  if (attempt &gt;= RETRY_DELAYS_SECONDS.length) {
    await db.updateWebhookDelivery(webhookId, {
      status: 'FAILED',
      failedAt: new Date(),
      failureReason: \`已達最大重試次數 (\${RETRY_DELAYS_SECONDS.length} 次)\`,
    });
    await notifyWebhookOwner(webhookId, 'delivery_failed');
    return;
  }

  try {
    await sendWebhookWithSignature(webhookId, url, payload, delivery.secret);

    await db.updateWebhookDelivery(webhookId, {
      status: 'DELIVERED',
      deliveredAt: new Date(),
      attempt,
    });
  } catch (error) {
    const nextAttempt = attempt + 1;
    const delaySeconds = RETRY_DELAYS_SECONDS[nextAttempt] ?? 86400;

    await db.updateWebhookDelivery(webhookId, {
      status: 'PENDING_RETRY',
      lastAttemptAt: new Date(),
      attempt: nextAttempt,
      lastError: error.message,
    });

    // 加入帶延遲的重試佇列（如 Bull Queue / AWS SQS delay）
    await retryQueue.add(
      { ...delivery, attempt: nextAttempt },
      { delay: delaySeconds * 1000 }
    );
  }
}</code></pre>

  <h3>冪等設計：接收方去重</h3>
  <p>
    由於重試機制的存在，接收方可能收到同一個 Webhook 事件多次。
    接收方必須設計冪等的事件處理邏輯：
  </p>
  <pre data-lang="typescript"><code class="language-typescript">// 使用事件 ID 去重，確保相同事件只處理一次
async function processWebhookEvent(event: WebhookEvent): Promise&lt;void&gt; {
  const eventId = event.id;

  // 檢查是否已處理過（Redis TTL 48 小時，覆蓋重試時間窗口）
  const alreadyProcessed = await redis.get(\`processed_webhook:\${eventId}\`);
  if (alreadyProcessed) {
    logger.info(\`Webhook \${eventId} 已處理，跳過（冪等）\`);
    return;
  }

  // 設置處理標記（先標記再執行，避免重複執行）
  await redis.setex(\`processed_webhook:\${eventId}\`, 172800, '1'); // 48 小時

  try {
    switch (event.type) {
      case 'payment.succeeded':
        await handlePaymentSuccess(event.data);
        break;
      case 'payment.failed':
        await handlePaymentFailure(event.data);
        break;
      default:
        logger.warn(\`未知的 Webhook 事件類型: \${event.type}\`);
    }
  } catch (error) {
    // 處理失敗時刪除標記，允許重試
    await redis.del(\`processed_webhook:\${eventId}\`);
    throw error;
  }
}</code></pre>

  <h3>背壓處理（Backpressure）</h3>
  <p>
    當接收方系統過載時，它會頻繁返回 5xx 錯誤，
    觸發我們系統的大量重試，進一步加重接收方的負擔——形成正反饋循環。
    背壓處理策略：
  </p>
  <ul>
    <li><strong>指數退避：</strong>重試間隔按指數增長，給接收方恢復時間</li>
    <li><strong>電路斷路器（Circuit Breaker）：</strong>如果一個 URL 連續失敗 N 次，
    暫停向該 URL 發送新的 Webhook，等待一段時間後再試</li>
    <li><strong>限制重試佇列深度：</strong>如果重試佇列積壓超過閾值，
    丟棄最老的重試任務（通知 Webhook 擁有者）</li>
    <li><strong>接收方的快速回應：</strong>接收方應在 200ms 內返回 200，
    非同步處理業務邏輯。超過 30 秒未回應視為失敗。</li>
  </ul>

  <callout-box type="tip" title="Webhook 系統的完整最佳實踐清單">
    <strong>發送方設計：</strong>
    HMAC-SHA256 簽名（帶時間戳防重放）、指數退避重試（最多 5 次）、
    每個事件唯一 ID（用於接收方去重）、30 秒發送超時、
    提供 Webhook 管理介面（查看歷史、手動重試、暫停）。
    <br/><br/>
    <strong>接收方設計：</strong>
    驗證 HMAC 簽名、驗證時間戳（防重放）、
    立即返回 200（200ms 內），非同步處理業務、
    使用事件 ID 去重（冪等處理）、記錄所有收到的事件（便於排查）。
  </callout-box>
</section>
`,
} satisfies ChapterContent;
