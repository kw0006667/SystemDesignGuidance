import type { ChapterContent } from '../../types.js';

export default {
  title: '網路基礎與通訊協定',
  content: `
<section id="http-evolution">
  <h2>HTTP/1.1 → HTTP/2 → HTTP/3 演進</h2>
  <p>
    HTTP（HyperText Transfer Protocol）自 1991 年問世以來，歷經三次重大版本演進。
    每一次演進都是為了解決前一版本的效能瓶頸，理解這個脈絡，
    能幫助你在系統設計中做出更好的協定選擇。
  </p>
  <arch-diagram src="./diagrams/ch03-network-protocols.json" caption="HTTP 演進全景：從 HTTP/1.1 的序列請求、HTTP/2 的多路復用，到 HTTP/3 的 QUIC 無頭阻塞設計"></arch-diagram>

  <h3>HTTP/1.1（1997 年）：持久連線，但有 Head-of-Line Blocking</h3>
  <p>HTTP/1.1 引入了<strong>持久連線（Keep-Alive）</strong>，避免每個請求都重新建立 TCP 連線。
  但它最根本的問題是：在同一個連線上，請求必須依序回應（FIFO）。
  若前一個請求很慢（例如大圖片），後面的請求都得等待——這就是 <strong>Head-of-Line Blocking（HoL Blocking）</strong>。</p>
  <pre data-lang="text"><code class="language-text">HTTP/1.1 的 HoL Blocking 示意：

連線 1：[請求 A（大圖片，500ms）] → [請求 B（等待...）] → [請求 C（等待...）]

瀏覽器的解法：開 6 條 TCP 連線
連線 1：[請求 A] → [請求 G]
連線 2：[請求 B] → [請求 H]
連線 3：[請求 C] → [請求 I]
連線 4：[請求 D]
連線 5：[請求 E]
連線 6：[請求 F]

→ 每條連線仍有 HoL 問題；多連線浪費伺服器資源；並發量受限於 6 條</code></pre>
  <p>開發者因此誕生了許多 HTTP/1.1 的效能技巧（Hacks）：Domain Sharding（多個域名繞過 6 連線限制）、
  Sprite 合併圖片（減少請求數）、Script 合併（減少 JS 請求）——這些在 HTTP/2 時代幾乎全部不再需要。</p>

  <h3>HTTP/2（2015 年）：多路復用與二進位幀</h3>
  <p>HTTP/2 的核心改進是將所有通訊拆分為<strong>二進位幀（Binary Frame）</strong>，在單一 TCP 連線上實現多路復用：</p>
  <pre data-lang="text"><code class="language-text">HTTP/2 多路復用（Multiplexing）示意：

單一 TCP 連線上交錯傳輸多個 Stream：
  Frame [Stream 1, DATA] → [Stream 3, DATA] → [Stream 1, DATA] → [Stream 2, HEADERS]
  ↑ 不同請求的幀可以交錯，不需要排隊

Stream 1（CSS 檔案）：  Frame1 → Frame2 → Frame3 ✓
Stream 2（JS 檔案）：         Frame1 → Frame2 ✓
Stream 3（API 請求）：  Frame1 ✓（小請求可搶先完成）</code></pre>
  <p>HTTP/2 引入的關鍵改進：</p>
  <ul>
    <li><strong>多路復用（Multiplexing）：</strong>單一 TCP 連線上可並行傳輸多個請求/回應，不需排隊等待。一個請求的延遲不影響其他請求。</li>
    <li><strong>Header 壓縮（HPACK）：</strong>HTTP Headers 通常重複性很高（如 Cookie、User-Agent），HPACK 維護一個靜態+動態壓縮表，後續請求只需傳輸變化的欄位，節省 30-90% 的 Header 大小。</li>
    <li><strong>Server Push：</strong>伺服器可主動推送客戶端尚未請求的資源（如 CSS、JS），在 HTML 還沒被解析前就開始傳輸，但因濫用問題，Chrome 已在 2022 年移除對 Server Push 的支援。</li>
    <li><strong>二進位協定：</strong>HTTP/1.1 是文字格式（易於除錯但解析慢），HTTP/2 改為二進位幀，解析更高效，但需要工具才能閱讀（如 Wireshark）。</li>
    <li><strong>請求優先級（Priority）：</strong>客戶端可標記請求的優先級（如 CSS 優先於圖片），讓伺服器合理分配頻寬。</li>
  </ul>
  <p>然而，HTTP/2 仍然依賴 TCP。當封包遺失時，TCP 的重傳機制會阻塞整條連線上的所有 Stream——
  這是 <strong>TCP 層的 HoL Blocking</strong>，HTTP/2 無法解決。在弱網環境（如行動網路）下，
  HTTP/2 的實際效能有時甚至比 HTTP/1.1 差（因為所有 Stream 都被一個遺失封包卡住）。</p>

  <h3>HTTP/3（2022 年 RFC 9114）：基於 QUIC，告別 TCP 的 HoL Blocking</h3>
  <p>HTTP/3 最大的突破是：<strong>放棄 TCP，改用 QUIC（Quick UDP Internet Connections）</strong>。
  QUIC 建立在 UDP 之上，但在應用層自行實作了可靠傳輸和安全性：</p>
  <pre data-lang="text"><code class="language-text">QUIC 解決 HoL Blocking 的方式：

TCP（HTTP/2 的問題）：
  Stream 1：[S1-F1] [S1-F2] [S1-F3 ← 遺失！]
  Stream 2：[S2-F1] [S2-F2] [等待 S1-F3 重傳...]  ← 被阻塞！

QUIC（HTTP/3 的解法）：
  Stream 1：[S1-F1] [S1-F2] [S1-F3 ← 遺失，重傳中]
  Stream 2：[S2-F1] [S2-F2] [S2-F3 → 繼續傳輸！]  ← 不受影響
  ↑ 每個 Stream 獨立管理封包順序，互不阻塞</code></pre>
  <p>QUIC 的其他核心特性：</p>
  <ul>
    <li><strong>0-RTT 連線建立：</strong>傳統 TLS 1.3 over TCP 需要 1-RTT（TCP 握手）+ 1-RTT（TLS 握手）= 總計 2 RTT。QUIC 將 TLS 1.3 整合進握手過程，首次連線只需 1-RTT。若曾連線過，可用 0-RTT 模式直接發送資料（代價是重播攻擊風險，通常限用於冪等請求）。</li>
    <li><strong>連線遷移（Connection Migration）：</strong>QUIC 連線由 Connection ID 識別，而非 IP:Port 組合。當用戶從 Wi-Fi 切換到 4G，IP 位址改變，TCP 連線會斷開，而 QUIC 連線可以無縫繼續。這對行動用戶體驗至關重要。</li>
    <li><strong>內建加密：</strong>QUIC 強制使用 TLS 1.3，沒有明文版本。這提升了安全性，但也讓中間設備（防火牆、負載均衡器）難以檢查流量內容。</li>
  </ul>

  <table>
    <thead>
      <tr>
        <th>特性</th>
        <th>HTTP/1.1</th>
        <th>HTTP/2</th>
        <th>HTTP/3</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>傳輸層協定</td>
        <td>TCP</td>
        <td>TCP</td>
        <td>QUIC (UDP)</td>
      </tr>
      <tr>
        <td>多路復用</td>
        <td>否（需多條連線）</td>
        <td>是（但 TCP HoL）</td>
        <td>是（Stream 完全獨立）</td>
      </tr>
      <tr>
        <td>Header 壓縮</td>
        <td>否</td>
        <td>HPACK</td>
        <td>QPACK</td>
      </tr>
      <tr>
        <td>應用層 HoL Blocking</td>
        <td>有</td>
        <td>無</td>
        <td>無</td>
      </tr>
      <tr>
        <td>傳輸層 HoL Blocking</td>
        <td>有</td>
        <td>有</td>
        <td>無</td>
      </tr>
      <tr>
        <td>連線建立延遲</td>
        <td>1 RTT (TCP) + TLS</td>
        <td>同 HTTP/1.1</td>
        <td>1 RTT（首次）/ 0-RTT（已知）</td>
      </tr>
      <tr>
        <td>行動網路表現</td>
        <td>差（IP 換了就斷線）</td>
        <td>差</td>
        <td>佳（連線遷移）</td>
      </tr>
      <tr>
        <td>加密</td>
        <td>可選（HTTPS）</td>
        <td>實際強制（TLS）</td>
        <td>強制（TLS 1.3）</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="info" title="何時使用 HTTP/3？">
    HTTP/3 對行動用戶和弱網環境特別有益（例如影音串流、遊戲）。
    但它需要 UDP 通道未被防火牆封鎖，且伺服器/客戶端都要支援 QUIC。
    目前 Cloudflare、Google（約 25% 流量）、Meta 都已大規模部署 HTTP/3。
    對於內部服務（Backend-to-Backend），HTTP/2 通常已經足夠，
    因為資料中心網路封包遺失率極低，QUIC 的優勢不明顯。
  </callout-box>
</section>

<section id="tcp-vs-udp">
  <h2>TCP vs UDP 的選擇邏輯</h2>
  <p>
    TCP 和 UDP 是傳輸層的兩大主角。選擇哪一個，取決於你的應用<strong>更在乎可靠性還是低延遲</strong>。
    理解兩者的差異，是設計即時系統、遊戲、串流服務的基礎。
  </p>

  <h3>TCP 三次握手（Three-Way Handshake）</h3>
  <p>TCP 在傳送任何資料前，必須先建立連線。三次握手的過程：</p>
  <pre data-lang="text"><code class="language-text">TCP 三次握手（Three-Way Handshake）

客戶端                              伺服器
  |                                   |
  |------- SYN (seq=x) ------------->|  步驟 1：客戶端發 SYN，宣布「想連線」
  |                                   |
  |<------ SYN-ACK (seq=y, ack=x+1)--|  步驟 2：伺服器回 SYN-ACK，確認並宣告序號
  |                                   |
  |------- ACK (ack=y+1) ----------->|  步驟 3：客戶端確認，連線建立
  |                                   |
  |====== 可以開始傳輸資料 =======|

延遲成本：
  - 需要 1.5 RTT 才能開始傳輸第一個位元組
  - 若 RTT = 50ms，建立連線就花了 75ms
  - 加上 TLS 握手（1 RTT）= 共 2.5 RTT ≈ 125ms 才能開始傳資料</code></pre>

  <p>TCP 的四次揮手（連線關閉）同樣需要額外的 RTT 成本，這就是為什麼 HTTP/1.1 的 Keep-Alive 如此重要：複用連線省去重複握手的開銷。</p>

  <h3>TCP vs UDP 完整對比</h3>
  <table>
    <thead>
      <tr>
        <th>特性</th>
        <th>TCP</th>
        <th>UDP</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>連線方式</td>
        <td>連線導向（三次握手）</td>
        <td>無連線（直接發送）</td>
      </tr>
      <tr>
        <td>可靠性</td>
        <td>保證送達、順序正確、不重複</td>
        <td>不保證送達、不保證順序、可能重複</td>
      </tr>
      <tr>
        <td>流量控制</td>
        <td>有（滑動視窗機制）</td>
        <td>無（發多快就發多快）</td>
      </tr>
      <tr>
        <td>壅塞控制</td>
        <td>有（TCP Congestion Control）</td>
        <td>無（可能壓垮網路）</td>
      </tr>
      <tr>
        <td>延遲</td>
        <td>較高（ACK 確認、重傳機制）</td>
        <td>極低（無握手、無 ACK 等待）</td>
      </tr>
      <tr>
        <td>Header 大小</td>
        <td>20-60 bytes</td>
        <td>8 bytes</td>
      </tr>
      <tr>
        <td>廣播/多播</td>
        <td>不支援</td>
        <td>支援（UDP 多播）</td>
      </tr>
      <tr>
        <td>適用場景</td>
        <td>HTTP、Email、FTP、SSH、資料庫連線</td>
        <td>DNS、VoIP、視訊通話、線上遊戲、QUIC</td>
      </tr>
    </tbody>
  </table>

  <h3>系統設計中的 TCP vs UDP 決策矩陣</h3>
  <table>
    <thead>
      <tr>
        <th>應用場景</th>
        <th>選擇</th>
        <th>理由</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>HTTP API（REST/gRPC）</td>
        <td>TCP</td>
        <td>必須保證請求/回應完整送達</td>
      </tr>
      <tr>
        <td>DNS 查詢</td>
        <td>UDP（預設）</td>
        <td>請求很小（&lt;512 bytes），失敗重試即可，無需握手延遲</td>
      </tr>
      <tr>
        <td>視訊通話（VoIP/WebRTC）</td>
        <td>UDP（RTP/SRTP）</td>
        <td>舊封包重傳毫無意義，寧要即時性而非完整性</td>
      </tr>
      <tr>
        <td>線上遊戲（位置同步）</td>
        <td>UDP</td>
        <td>玩家位置是「最新狀態有效」，100ms 延遲可感知</td>
      </tr>
      <tr>
        <td>串流影片（HLS/DASH）</td>
        <td>TCP（HTTP）</td>
        <td>影片片段需要完整接收，但可接受緩衝</td>
      </tr>
      <tr>
        <td>即時直播（低延遲）</td>
        <td>UDP（RTMP/WebRTC）</td>
        <td>延遲 &lt; 1 秒的直播必須犧牲完整性</td>
      </tr>
      <tr>
        <td>IoT 感測器資料</td>
        <td>UDP（MQTT over UDP）</td>
        <td>資料量大、頻率高，偶爾遺失可接受</td>
      </tr>
      <tr>
        <td>金融交易訂單</td>
        <td>TCP</td>
        <td>必須保證每筆訂單完整送達，不允許遺失</td>
      </tr>
    </tbody>
  </table>

  <h3>UDP 的「不可靠」不代表糟糕：應用層可靠性</h3>
  <p>
    UDP 不保證送達，但應用層可以自行決定可靠性策略。不同場景需要不同的容錯行為：
  </p>
  <pre data-lang="text"><code class="language-text">UDP 上的應用層可靠性策略：

1. 不需要可靠性（DNS、遊戲位置）：
   直接發送，丟包就丟包，下次更新即可。

2. 選擇性重傳（Selective Retransmission）：
   對關鍵資料（遊戲事件：開槍、死亡）加序號和確認，非關鍵資料（位置更新）不重傳。

3. 前向糾錯（FEC, Forward Error Correction）：
   傳送資料時附加冗餘資訊，接收方可在不重傳的情況下恢復丟失的封包。
   WebRTC 使用 FEC 處理封包丟失，比等待重傳快得多。

4. 帶內重傳（In-band Retransmission）：
   QUIC 的做法——每個封包都包含足夠的上下文，接收方可直接重建，不需要 RTT 等待確認。</code></pre>

  <callout-box type="tip" title="QUIC 是 UDP 的未來">
    QUIC 在 UDP 上自行實作了可靠傳輸、加密、壅塞控制，兼顧低延遲與可靠性。
    它代表了網路協定設計的趨勢：與其依賴作業系統內建的 TCP（升級緩慢，需修改核心），
    不如在應用層實作，可以快速迭代和優化。
    Google 最初在 Chrome 和 YouTube 上測試 QUIC，比 TCP 的頁面載入快 3-5%，
    高延遲弱網環境下改善更明顯（降低視訊緩衝 30%）。
  </callout-box>
</section>

<section id="rest-graphql-grpc">
  <h2>REST vs GraphQL vs gRPC</h2>
  <p>
    現代系統中最常見的三種 API 範式，各有其設計哲學和適用場景。
    面試中，面試官可能問你：「為什麼選擇 REST 而不是 gRPC？」
    你需要能清楚說明取捨。
  </p>

  <h3>三種 API 範式的對比總表</h3>
  <table>
    <thead>
      <tr>
        <th>面向</th>
        <th>REST</th>
        <th>GraphQL</th>
        <th>gRPC</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>設計哲學</td>
        <td>資源導向（Resource-Oriented）</td>
        <td>查詢導向（Query-Oriented）</td>
        <td>程序呼叫導向（RPC-Oriented）</td>
      </tr>
      <tr>
        <td>傳輸格式</td>
        <td>JSON / XML（文字）</td>
        <td>JSON（文字）</td>
        <td>Protocol Buffers（二進位）</td>
      </tr>
      <tr>
        <td>傳輸協定</td>
        <td>HTTP/1.1 或 HTTP/2</td>
        <td>HTTP/1.1 或 HTTP/2</td>
        <td>HTTP/2（強制）</td>
      </tr>
      <tr>
        <td>Schema 定義</td>
        <td>OpenAPI（選填）</td>
        <td>GraphQL Schema（強制）</td>
        <td>Protocol Buffer 定義（強制）</td>
      </tr>
      <tr>
        <td>Over-fetching 問題</td>
        <td>是（固定欄位回傳）</td>
        <td>否（客戶端指定欄位）</td>
        <td>輕微（Schema 定義精確）</td>
      </tr>
      <tr>
        <td>Streaming 支援</td>
        <td>有限（SSE 單向）</td>
        <td>Subscription（WebSocket）</td>
        <td>完整（Server/Client/Bidirectional）</td>
      </tr>
      <tr>
        <td>效能</td>
        <td>中（JSON 解析開銷）</td>
        <td>中（N+1 問題需處理）</td>
        <td>高（二進位序列化，快 5-10×）</td>
      </tr>
      <tr>
        <td>瀏覽器支援</td>
        <td>原生支援</td>
        <td>原生支援（HTTP + JSON）</td>
        <td>需要 gRPC-Web 代理</td>
      </tr>
      <tr>
        <td>適用場景</td>
        <td>公開 API、Web 服務</td>
        <td>複雜前端、多客戶端 API</td>
        <td>內部微服務通訊</td>
      </tr>
    </tbody>
  </table>

  <h3>REST：成熟但有 Over-fetching / Under-fetching 問題</h3>
  <p>REST 以 HTTP 動詞（GET/POST/PUT/DELETE）操作資源（Resource），是最廣泛使用的 API 風格：</p>
  <pre data-lang="javascript"><code class="language-javascript">// REST API 設計範例：用戶與貼文系統

// 取得用戶基本資料
// GET /users/123
// Response（可能包含不需要的欄位 → Over-fetching）：
{
  "id": 123,
  "name": "Alice",
  "email": "alice@example.com",
  "bio": "...",
  "avatar_url": "...",
  "follower_count": 5000,
  "created_at": "2024-01-01",
  // 行動 App 可能只需要 name 和 avatar_url
}

// 取得用戶的最新 5 篇貼文需要第二個請求 → Under-fetching
// GET /users/123/posts?limit=5

// REST 的 CRUD 操作
// POST   /posts          建立貼文
// GET    /posts/456      讀取貼文
// PUT    /posts/456      更新貼文（完整替換）
// PATCH  /posts/456      部分更新貼文
// DELETE /posts/456      刪除貼文</code></pre>

  <p>REST 的優勢：HTTP 快取天然適用（GET 請求可被 CDN、瀏覽器快取）、無狀態設計易於水平擴展、生態系最成熟（Swagger、Postman、大量現成工具）。</p>

  <h3>GraphQL：客戶端主導查詢，解決 Over/Under-fetching</h3>
  <pre data-lang="graphql"><code class="language-graphql"># GraphQL 查詢：一次請求取得所有需要的資料，且只取需要的欄位
query GetUserProfile($userId: ID!) {
  user(id: $userId) {
    name           # 只要 name
    avatarUrl      # 只要 avatarUrl
    posts(last: 5) {  # 同時取最新 5 篇貼文
      title
      publishedAt
      likeCount
    }
    followers(first: 3) {  # 順便取前 3 個追蹤者
      name
      avatarUrl
    }
  }
}

# Mutation：修改資料
mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    id
    title
    publishedAt
  }
}

# Subscription：即時訂閱（透過 WebSocket）
subscription OnNewMessage($chatRoomId: ID!) {
  newMessage(chatRoomId: $chatRoomId) {
    id
    content
    sender { name avatarUrl }
  }
}</code></pre>

  <callout-box type="warning" title="GraphQL 的 N+1 問題">
    GraphQL 的靈活性帶來一個經典陷阱：N+1 查詢問題。
    查詢 100 個用戶的貼文，若未優化，會觸發 1 次查詢取用戶列表，再觸發 100 次查詢各取每個用戶的貼文 = N+1 次 DB 查詢。
  </callout-box>

  <pre data-lang="javascript"><code class="language-javascript">// N+1 問題示意：
// 查詢：{ users { name posts { title } } }

// ❌ 未優化的 Resolver（N+1 問題）：
const resolvers = {
  Query: {
    users: () => db.query('SELECT * FROM users'),  // 1 次查詢
  },
  User: {
    posts: (user) => db.query(
      'SELECT * FROM posts WHERE user_id = ?', [user.id]
    ),  // 對每個用戶各執行 1 次 → N 次查詢
  },
};
// 100 個用戶 = 1 + 100 = 101 次 DB 查詢！

// ✅ 使用 DataLoader 解決（批次 + 快取）：
const DataLoader = require('dataloader');

const postLoader = new DataLoader(async (userIds) => {
  // 一次查詢取回所有用戶的貼文
  const posts = await db.query(
    'SELECT * FROM posts WHERE user_id = ANY(?)', [userIds]
  );
  // 依 userId 分組返回
  return userIds.map(id => posts.filter(p => p.user_id === id));
});

const resolvers = {
  User: {
    posts: (user) => postLoader.load(user.id),  // 自動批次，只觸發 1-2 次查詢
  },
};</code></pre>

  <h3>gRPC：高效的內部微服務通訊</h3>
  <p>gRPC 由 Google 開發，使用 Protocol Buffers 進行強型別的 IDL（Interface Definition Language）定義，
  並以 HTTP/2 為傳輸層，是微服務間通訊的高效選擇：</p>
  <pre data-lang="protobuf"><code class="language-protobuf">// 定義服務介面（user_service.proto）
syntax = "proto3";

package userservice;

service UserService {
  // 一元 RPC（類似 REST GET）
  rpc GetUser (GetUserRequest) returns (User);

  // 伺服器串流 RPC（類似 SSE）
  rpc ListUserPosts (ListPostsRequest) returns (stream Post);

  // 客戶端串流 RPC（批次上傳）
  rpc BatchCreateUsers (stream CreateUserRequest) returns (BatchResult);

  // 雙向串流 RPC（即時聊天）
  rpc ChatStream (stream ChatMessage) returns (stream ChatMessage);
}

message User {
  int64 id = 1;
  string name = 2;
  string email = 3;
  int64 created_at = 4;
}

message GetUserRequest {
  int64 user_id = 1;
}

message Post {
  int64 id = 1;
  string title = 2;
  string content = 3;
}</code></pre>

  <pre data-lang="typescript"><code class="language-typescript">// TypeScript 客戶端使用 gRPC（自動生成的 Stub）
import { UserServiceClient } from './generated/user_service_grpc_pb';
import { GetUserRequest } from './generated/user_service_pb';
import * as grpc from '@grpc/grpc-js';

const client = new UserServiceClient(
  'user-service:50051',
  grpc.credentials.createInsecure()
);

// 一元呼叫
const request = new GetUserRequest();
request.setUserId(123);

client.getUser(request, (err, response) => {
  if (err) throw err;
  console.log('用戶名稱:', response.getName());
});

// 伺服器串流
const streamRequest = new ListPostsRequest();
streamRequest.setUserId(123);

const stream = client.listUserPosts(streamRequest);
stream.on('data', (post) => {
  console.log('收到貼文:', post.getTitle());
});
stream.on('end', () => console.log('串流結束'));</code></pre>

  <p>gRPC 使用 Protocol Buffers 進行序列化，比 JSON 小 3-10 倍，解析速度快 5-10 倍。
  強型別的 .proto 契約讓跨語言服務間的 API 相容性問題幾乎消失：Go、Java、Python、Node.js 等語言都能從同一份 .proto 文件自動生成對應的客戶端和伺服器端代碼。</p>

  <h3>使用場景選擇矩陣</h3>
  <table>
    <thead>
      <tr>
        <th>場景</th>
        <th>推薦選擇</th>
        <th>理由</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>公開 API（第三方開發者使用）</td>
        <td>REST</td>
        <td>最廣泛支援，文件生態最成熟，開發者熟悉</td>
      </tr>
      <tr>
        <td>行動 App 後端（BFF 模式）</td>
        <td>GraphQL</td>
        <td>各平台（iOS/Android/Web）可自訂查詢，避免 Over-fetching 節省流量</td>
      </tr>
      <tr>
        <td>內部微服務通訊</td>
        <td>gRPC</td>
        <td>高效能、強型別、支援串流，跨語言友好</td>
      </tr>
      <tr>
        <td>即時資料查詢（儀表板）</td>
        <td>GraphQL Subscription</td>
        <td>訂閱機制天然適合即時更新的複雜資料圖</td>
      </tr>
      <tr>
        <td>批次資料處理</td>
        <td>gRPC 串流</td>
        <td>雙向串流可高效處理大量資料，無需分頁</td>
      </tr>
      <tr>
        <td>IoT 裝置 API</td>
        <td>gRPC 或 REST（輕量 JSON）</td>
        <td>gRPC 省頻寬；但部分嵌入式環境不支援 HTTP/2</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="tip" title="三者的選擇原則（面試總結）">
    面試中被問到 API 設計選擇時，用這個框架回答：「對外公開 API 用 REST（生態系成熟、易於除錯、HTTP 快取天然適用）；
    複雜前端多客戶端場景用 GraphQL（減少 Round Trip，讓前端自主查詢）；
    內部微服務通訊用 gRPC（高效能、強型別、支援雙向串流）。
    這三者也可以共存——對外 REST、前端 GraphQL BFF、後端微服務 gRPC。」
  </callout-box>
</section>

<section id="realtime-protocols">
  <h2>即時通訊協定：WebSocket / SSE / Long Polling</h2>
  <p>
    傳統 HTTP 是「請求-回應」模式：客戶端發問、伺服器回答，然後連線關閉。
    但許多現代應用需要<strong>伺服器主動推送</strong>資料（即時通知、聊天室、股票報價、AI 串流輸出）。
    這催生了三種不同的即時通訊方案，各有其優缺點和適用場景。
  </p>

  <h3>三種方案的延遲比較</h3>
  <table>
    <thead>
      <tr>
        <th>方案</th>
        <th>首次訊息延遲</th>
        <th>後續訊息延遲</th>
        <th>伺服器連線資源</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Long Polling</td>
        <td>~50-100ms（TCP + HTTP）</td>
        <td>~50-100ms（每次需重建請求）</td>
        <td>高（每次訊息 = 1 個新 HTTP 請求）</td>
      </tr>
      <tr>
        <td>SSE</td>
        <td>~50ms（TCP + HTTP）</td>
        <td>&lt;5ms（持久連線，無重建開銷）</td>
        <td>中（1 個長連線，輕量）</td>
      </tr>
      <tr>
        <td>WebSocket</td>
        <td>~50ms（TCP + HTTP Upgrade）</td>
        <td>&lt;1ms（全雙工，Header 僅 2-10 bytes）</td>
        <td>低（1 個長連線，Header 最小）</td>
      </tr>
    </tbody>
  </table>

  <h3>Long Polling：HTTP 的即時通訊仿真</h3>
  <p>客戶端發出請求，伺服器<strong>不立即回應</strong>，而是等到有新資料或超時才回應。客戶端收到後立刻再發一個新請求。</p>
  <pre data-lang="javascript"><code class="language-javascript">// Long Polling 客戶端實作（JavaScript）
async function longPoll(lastEventId) {
  try {
    const response = await fetch(
      \`/api/messages?after=\${lastEventId}&timeout=30\`,  // 服務端最多等 30 秒
      { signal: AbortSignal.timeout(35000) }  // 客戶端 35 秒超時
    );

    if (response.ok) {
      const data = await response.json();
      if (data.messages.length > 0) {
        handleNewMessages(data.messages);
        lastEventId = data.messages.at(-1).id;
      }
    }
  } catch (err) {
    console.log('Long poll 超時或錯誤，重新連接...');
    await sleep(1000);  // 錯誤後等 1 秒再試
  }

  // 立刻發起下一次 Long Poll
  longPoll(lastEventId);
}

longPoll(0);  // 開始輪詢</code></pre>
  <ul>
    <li><strong>優點：</strong>相容性極佳，任何 HTTP 基礎設施都支援（包括老舊代理伺服器）</li>
    <li><strong>缺點：</strong>每次資料推送都需要一次完整 HTTP 往返；服務端需維持掛起的請求連線；擴展困難</li>
    <li><strong>適用：</strong>需要兼容老舊環境的通知系統、Comet 時代的遺留系統</li>
  </ul>

  <h3>Server-Sent Events（SSE）：單向推送的最佳實踐</h3>
  <p>建立一條持久 HTTP 連線，<strong>伺服器可持續推送</strong>文字資料（基於 <code>text/event-stream</code> MIME 類型）。
  連線是單向的：只有伺服器→客戶端，但客戶端可以透過正常的 POST 請求向伺服器發送資料。</p>
  <pre data-lang="javascript"><code class="language-javascript">// SSE 伺服器端實作（Node.js / Express）
app.get('/api/stream', (req, res) => {
  // 設定 SSE 所需的 Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');  // 關閉 Nginx 緩衝

  // 發送初始連線確認
  res.write('data: {"type":"connected"}\n\n');

  // 訂閱業務事件，推送給客戶端
  const unsubscribe = eventBus.subscribe('user-events', (event) => {
    // SSE 格式：可含 id、event、data、retry 欄位
    res.write(\`id: \${event.id}\n\`);
    res.write(\`event: \${event.type}\n\`);
    res.write(\`data: \${JSON.stringify(event.payload)}\n\n\`);  // 雙換行結束一條事件
  });

  // 定期發送心跳，防止代理伺服器斷開連線
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');  // 冒號開頭表示注釋，客戶端忽略
  }, 15000);

  // 客戶端斷開時清理資源
  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
    console.log('SSE 客戶端斷開連線');
  });
});

// SSE 客戶端實作（原生瀏覽器 API）
const eventSource = new EventSource('/api/stream');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('收到預設事件:', data);
};

eventSource.addEventListener('notification', (event) => {
  const data = JSON.parse(event.data);
  showNotification(data);  // 處理特定事件類型
});

// SSE 自動重連機制
eventSource.onerror = (err) => {
  console.log('SSE 連線錯誤，瀏覽器將自動重連...');
  // EventSource 預設在連線斷開後自動重連（預設 3 秒）
  // 重連時會附上 Last-Event-ID Header，伺服器可從斷點繼續
};</code></pre>
  <callout-box type="info" title="SSE 的自動重連與斷點續傳">
    SSE 原生支援自動重連和斷點續傳：伺服器傳送每條事件時附上 <code>id</code> 欄位，
    客戶端斷線重連後，瀏覽器會在請求 Header 中附上 <code>Last-Event-ID</code>，
    伺服器可從此 ID 之後繼續推送遺漏的事件。這讓 SSE 非常適合通知系統——
    即使用戶暫時斷網，重連後也不會遺漏訊息。
    ChatGPT、Claude、Copilot 都使用 SSE 來實作 AI 的串流文字輸出。
  </callout-box>

  <h3>WebSocket：雙向全雙工通訊</h3>
  <p>透過 HTTP Upgrade 建立持久連線，之後升級為 WebSocket 協定（<code>ws://</code> 或加密的 <code>wss://</code>）。
  客戶端和伺服器都可以<strong>隨時互傳</strong>資料，Header 開銷只有 2-10 bytes（相比 HTTP 的數百 bytes）。</p>
  <pre data-lang="javascript"><code class="language-javascript">// WebSocket 客戶端（瀏覽器原生 API）
const ws = new WebSocket('wss://chat.example.com/ws');

ws.onopen = () => {
  console.log('WebSocket 連線建立');
  ws.send(JSON.stringify({ type: 'auth', token: localStorage.getItem('token') }));
  ws.send(JSON.stringify({ type: 'join', room: 'general' }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  switch (msg.type) {
    case 'message':
      appendMessage(msg.sender, msg.text);
      break;
    case 'user_joined':
      showSystemMessage(\`\${msg.username} 加入了聊天室\`);
      break;
    case 'typing':
      showTypingIndicator(msg.username);
      break;
  }
};

ws.onclose = (event) => {
  console.log('連線關閉，代碼:', event.code, '原因:', event.reason);
  // 實作自動重連（指數退避）
  setTimeout(reconnect, Math.min(1000 * 2 ** reconnectAttempts, 30000));
};

// 發送訊息（無需等待，直接透過已建立的連線傳送）
function sendMessage(text) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'message', text, timestamp: Date.now() }));
  }
}</code></pre>

  <pre data-lang="javascript"><code class="language-javascript">// WebSocket 伺服器端（Node.js + ws 套件）
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

// 維護連線集合（按房間分組）
const rooms = new Map();  // roomId -> Set<WebSocket>
const clients = new Map(); // ws -> { userId, rooms }

wss.on('connection', (ws, req) => {
  console.log('新連線，IP:', req.socket.remoteAddress);
  clients.set(ws, { userId: null, rooms: new Set() });

  ws.on('message', (rawData) => {
    const msg = JSON.parse(rawData.toString());

    switch (msg.type) {
      case 'auth':
        // 驗證 JWT Token，獲取 userId
        const userId = verifyToken(msg.token);
        clients.get(ws).userId = userId;
        break;

      case 'join':
        // 加入聊天室
        if (!rooms.has(msg.room)) rooms.set(msg.room, new Set());
        rooms.get(msg.room).add(ws);
        clients.get(ws).rooms.add(msg.room);
        broadcastToRoom(msg.room, { type: 'user_joined', username: getUserName(ws) }, ws);
        break;

      case 'message':
        // 廣播訊息給同房間所有人
        const sender = getUserName(ws);
        clients.get(ws).rooms.forEach(room => {
          broadcastToRoom(room, {
            type: 'message',
            sender,
            text: msg.text,
            timestamp: Date.now()
          });
        });
        break;
    }
  });

  ws.on('close', () => {
    // 清理連線資源
    const client = clients.get(ws);
    client.rooms.forEach(room => {
      rooms.get(room)?.delete(ws);
    });
    clients.delete(ws);
  });
});

function broadcastToRoom(roomId, message, excludeWs = null) {
  rooms.get(roomId)?.forEach(client => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}</code></pre>

  <h3>三種方案完整對比</h3>
  <table>
    <thead>
      <tr>
        <th>特性</th>
        <th>Long Polling</th>
        <th>SSE</th>
        <th>WebSocket</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>通訊方向</td>
        <td>雙向（模擬）</td>
        <td>單向（Server→Client）</td>
        <td>雙向全雙工</td>
      </tr>
      <tr>
        <td>協定</td>
        <td>HTTP</td>
        <td>HTTP（text/event-stream）</td>
        <td>WebSocket（ws:// / wss://）</td>
      </tr>
      <tr>
        <td>延遲</td>
        <td>高（50-100ms）</td>
        <td>低（&lt;5ms）</td>
        <td>極低（&lt;1ms）</td>
      </tr>
      <tr>
        <td>伺服器端資源</td>
        <td>高（頻繁重建連線）</td>
        <td>中（1 持久連線，HTTP 開銷）</td>
        <td>低（1 持久連線，最小 Header）</td>
      </tr>
      <tr>
        <td>防火牆穿透</td>
        <td>佳（標準 HTTP）</td>
        <td>佳（標準 HTTP）</td>
        <td>有時需要特別配置</td>
      </tr>
      <tr>
        <td>自動重連</td>
        <td>需手動實作</td>
        <td>瀏覽器原生支援</td>
        <td>需手動實作</td>
      </tr>
      <tr>
        <td>斷點續傳</td>
        <td>需手動實作（Last-ID）</td>
        <td>瀏覽器原生支援（Last-Event-ID）</td>
        <td>需手動實作</td>
      </tr>
      <tr>
        <td>HTTP/2 多路復用</td>
        <td>是</td>
        <td>是（可在 1 個 HTTP/2 連線上開多個 SSE）</td>
        <td>否（獨立協定）</td>
      </tr>
      <tr>
        <td>典型使用場景</td>
        <td>舊系統相容</td>
        <td>通知、AI 串流輸出</td>
        <td>聊天、遊戲、協作編輯</td>
      </tr>
    </tbody>
  </table>

  <h3>WebSocket 水平擴展挑戰與解法</h3>
  <p>
    WebSocket 是有狀態連線（Stateful）——用戶連接到伺服器 A，訊息就在伺服器 A 上。
    這給水平擴展帶來根本性的挑戰：
  </p>
  <pre data-lang="text"><code class="language-text">問題示意：

用戶 Alice 連接到 Server A
用戶 Bob   連接到 Server B

Alice 發訊息給 Bob：
  Alice → Server A（有 Alice 的連線）
  Server A 如何把訊息傳給在 Server B 上的 Bob？

解法 1：Sticky Session（黏性會話）
  Load Balancer 確保同一用戶每次都連到同一台伺服器
  缺點：伺服器掛掉，所有該伺服器的用戶都斷線
  缺點：負載不均衡

解法 2：Pub/Sub 中介層（推薦）
  Alice → Server A
  Server A 發布訊息到 Redis Pub/Sub 頻道（channel: user:bob）
  Server B 訂閱了 user:bob 頻道，收到訊息後推送給 Bob 的 WebSocket 連線

                    Redis Pub/Sub
  Server A (Alice) ──publish──→ channel: user:bob ←──subscribe── Server B (Bob)
                                                    ──→ push to Bob's WS

  這樣任何伺服器都可以服務任何用戶，水平擴展無限制</code></pre>

  <callout-box type="tip" title="選擇即時協定的決策樹">
    遇到「需要即時推送」的需求，用以下問題決策：
    1. 需要客戶端也主動向伺服器發送訊息嗎？（聊天、遊戲）→ WebSocket
    2. 只需要伺服器單向推送，且需要自動重連/斷點續傳？（通知、AI 輸出）→ SSE
    3. 必須相容老舊代理/防火牆，或無法維護長連線？→ Long Polling
    4. 需要極低延遲（&lt;10ms）且可接受 UDP 的不可靠性？→ WebRTC（遊戲、視訊通話）
  </callout-box>

  <h3>連線管理與心跳機制</h3>
  <p>
    長連線（Long-lived Connection）面臨的共同挑戰是：如何偵測「僵屍連線」（客戶端已離線但伺服器未感知）？
  </p>
  <pre data-lang="javascript"><code class="language-javascript">// WebSocket 心跳機制（Ping/Pong）
const HEARTBEAT_INTERVAL = 30000;  // 每 30 秒
const HEARTBEAT_TIMEOUT = 5000;    // 5 秒沒有 Pong 就斷線

function setupHeartbeat(ws) {
  let isAlive = true;

  ws.on('pong', () => {
    isAlive = true;  // 收到 Pong，連線還活著
  });

  const interval = setInterval(() => {
    if (!isAlive) {
      console.log('客戶端無回應，強制斷線');
      ws.terminate();
      return;
    }
    isAlive = false;  // 重置，等待下一次 Pong
    ws.ping();        // 發送 Ping
  }, HEARTBEAT_INTERVAL);

  ws.on('close', () => clearInterval(interval));
}

// 客戶端側（瀏覽器的 WebSocket 會自動回應 Ping，但自訂協定可能需要手動處理）
ws.on('ping', () => ws.pong());  // 服務端手動回 Pong（ws 套件預設自動回）</code></pre>
</section>
`,
} satisfies ChapterContent;
