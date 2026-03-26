import type { ChapterContent } from '../../types.js';

export default {
  title: '設計即時聊天系統（Chat System）',
  content: `
<section id="websocket-management">
  <h2>WebSocket 連線管理</h2>
  <p>即時聊天系統的核心挑戰是雙向通訊。HTTP 是請求-回應模型，客戶端必須主動發起請求才能收到資料。WebSocket 建立了持久的雙向連線，讓伺服器可以主動推送訊息給客戶端。</p>

  <p>在設計大規模聊天系統時，WebSocket 連線管理涉及三個關鍵問題：如何保持連線的活躍性（心跳機制）、如何應對網路不穩定（重連策略），以及如何在多台 Chat Server 之間路由訊息（水平擴展）。</p>

  <h3>WebSocket 握手過程</h3>
  <pre data-lang="http"><code class="language-http"># 客戶端請求升級協定
GET /chat HTTP/1.1
Host: chat.example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13

# 伺服器回應
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=

# 握手完成，開始雙向通訊</code></pre>

  <callout-box type="info" title="WebSocket vs Long Polling vs SSE">
    <p><strong>Long Polling</strong>：客戶端發出請求後，伺服器保持連線直到有訊息才回應。簡單但效率低，每次回應後需重新建立連線。</p>
    <p><strong>Server-Sent Events（SSE）</strong>：單向推送，伺服器可持續推資料給客戶端，但客戶端無法透過同一連線回傳資料。適合通知類場景。</p>
    <p><strong>WebSocket</strong>：全雙工、低延遲，是聊天系統的首選。代價是有狀態連線（Stateful），增加了水平擴展的難度。</p>
  </callout-box>

  <h3>心跳機制（Heartbeat）</h3>
  <p>網路上的防火牆和 NAT 設備通常會在一段時間（通常 60-120 秒）沒有流量時關閉 TCP 連線。心跳機制透過定期發送 Ping/Pong 訊框來保持連線活躍，同時也能即時偵測到連線中斷。</p>
  <pre data-lang="typescript"><code class="language-typescript">// 心跳機制：防止連線被防火牆/NAT 斷開
function startHeartbeat(ws: WebSocket, userId: string): NodeJS.Timer {
  let pongReceived = true;  // 初始設為 true，避免第一次就超時

  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      // 上一次 Ping 沒有收到 Pong，判定連線已斷開
      console.log(\`User \${userId} heartbeat timeout, terminating connection\`);
      ws.terminate();
      clearInterval(pingInterval);
      return;
    }

    // 重置標記，發送新的 Ping
    pongReceived = false;
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();  // 使用 WebSocket 原生 Ping 訊框（比應用層訊息更輕量）
    }
  }, 25_000);  // 每 25 秒發送一次（60 秒 NAT 超時的安全閾值）

  // 收到 Pong 時更新標記
  ws.on('pong', () => {
    pongReceived = true;
    presenceService.refreshHeartbeat(userId);  // 同步更新線上狀態
  });

  return pingInterval;
}

// 應用層心跳（適用於客戶端無法發送原生 WebSocket Ping 的場景）
function handleAppLevelHeartbeat(ws: WebSocket, userId: string): void {
  ws.on('message', (data: string) => {
    const msg = JSON.parse(data);
    if (msg.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      presenceService.refreshHeartbeat(userId);
    }
  });
}</code></pre>

  <h3>客戶端重連策略（Reconnection Strategy）</h3>
  <p>網路不穩定時，WebSocket 連線可能隨時中斷。客戶端需要實作指數退避重連（Exponential Backoff），避免在伺服器故障時大量客戶端同時重連造成「雷群效應（Thundering Herd）」。</p>
  <pre data-lang="typescript"><code class="language-typescript">class ReconnectingWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectDelay = 30_000;  // 最長等待 30 秒
  private readonly baseDelay = 1_000;           // 初始等待 1 秒

  connect(url: string): void {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;  // 重置計數
      this.onConnected?.();
    };

    this.ws.onclose = (event) => {
      if (!event.wasClean) {
        // 非正常關閉（網路中斷、伺服器崩潰），觸發重連
        this.scheduleReconnect(url);
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };

    this.ws.onmessage = (event) => {
      this.onMessage?.(JSON.parse(event.data));
    };
  }

  private scheduleReconnect(url: string): void {
    const jitter = Math.random() * 1000;  // 加入隨機抖動，防止雷群效應
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts) + jitter,
      this.maxReconnectDelay
    );

    console.log(\`Reconnecting in \${Math.round(delay)}ms (attempt \${this.reconnectAttempts + 1})\`);

    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(url);
    }, delay);
  }
}</code></pre>

  <h3>連線管理設計</h3>
  <pre data-lang="typescript"><code class="language-typescript">// WebSocket Connection Manager
class ConnectionManager {
  // 本機連線表：userId → WebSocket 連線
  private connections = new Map&lt;string, WebSocket&gt;();

  onConnect(ws: WebSocket, userId: string): void {
    this.connections.set(userId, ws);

    // 在 Redis 中記錄此用戶連線到哪台伺服器
    redis.hset('user:connections', userId, SERVER_ID);
    redis.expire('user:connections', 86400);

    // 更新線上狀態
    this.presenceService.setOnline(userId);

    ws.on('close', () => this.onDisconnect(userId));
    ws.on('message', (data) => this.onMessage(userId, data));

    // 啟動心跳
    this.startHeartbeat(ws, userId);
  }

  onDisconnect(userId: string): void {
    this.connections.delete(userId);
    redis.hdel('user:connections', userId);
    this.presenceService.setOffline(userId);
  }

  // 向特定用戶發送訊息（可能在其他伺服器上）
  async sendToUser(targetUserId: string, message: ChatMessage): Promise&lt;void&gt; {
    const localConn = this.connections.get(targetUserId);
    if (localConn && localConn.readyState === WebSocket.OPEN) {
      // 目標用戶在本機伺服器
      localConn.send(JSON.stringify(message));
      return;
    }

    // 目標用戶在其他伺服器：透過 Redis Pub/Sub 轉發
    const targetServer = await redis.hget('user:connections', targetUserId);
    if (targetServer) {
      await redis.publish(\`server:\${targetServer}:messages\`, JSON.stringify({
        targetUserId,
        message,
      }));
    }
    // 若 targetServer 為 null，用戶離線，訊息已持久化，等待下次上線時拉取
  }
}</code></pre>

  <h3>水平擴展：多伺服器間的訊息路由</h3>
  <pre data-lang="text"><code class="language-text">問題：
  用戶 A 連接到 Chat Server 1
  用戶 B 連接到 Chat Server 2
  A 傳訊息給 B：Chat Server 1 需要把訊息傳到 Chat Server 2

解決方案：Redis Pub/Sub（訊息總線）
  1. A 的訊息到達 Chat Server 1
  2. Chat Server 1 查詢 Redis：B 在哪台伺服器？→ Server 2
  3. Chat Server 1 向 Redis Channel "server:2:messages" 發布訊息
  4. Chat Server 2 訂閱了此 Channel，收到訊息後轉發給 B 的 WebSocket

水平擴展的 Connection State 同步策略：
  - Redis Hash: user:connections → { userId: serverId }
  - 每次用戶連線/斷線都更新此表
  - 查詢是 O(1)，適合高頻路由

大規模部署的改進：
  - Redis Pub/Sub 在超大規模時可能成為瓶頸
  - 替代方案：Kafka（每台 Server 訂閱自己的 Topic）
  - 或使用 Service Mesh 直接 Server-to-Server 通訊</code></pre>

  <arch-diagram src="./diagrams/ch18-chat-system.json" caption="即時聊天系統架構：WebSocket Gateway 層、Redis Pub/Sub 訊息路由、Message Storage（HBase/Cassandra）、Presence Service 的整體設計。"></arch-diagram>

  <callout-box type="warning" title="WebSocket 的 Load Balancer 設定">
    <p>一般 HTTP Load Balancer 預設採用 Round-Robin，每次請求可能到不同的伺服器。WebSocket 是長連線，需要設定 <strong>Sticky Session（Session Affinity）</strong>，確保同一用戶的所有訊息都路由到同一台 Chat Server。在 AWS 上，使用 ALB 並啟用 Stickiness；在 Nginx 中，使用 <code>ip_hash</code> 指令。</p>
  </callout-box>
</section>

<section id="message-storage">
  <h2>訊息儲存：HBase vs Cassandra</h2>
  <p>聊天訊息是典型的<strong>時序資料（Time-Series Data）</strong>：大量小型寫入、按時間範圍查詢、舊資料很少更新。選擇合適的儲存引擎對效能至關重要。</p>

  <h3>訊息存取模式分析</h3>
  <pre data-lang="text"><code class="language-text">查詢模式：
  1. 載入對話的最近 N 條訊息（最頻繁）
  2. 翻頁載入更舊的訊息（按時間倒序）
  3. 搜尋對話中包含關鍵字的訊息（較少）

寫入模式：
  - 高頻小量寫入：每條訊息幾十 bytes
  - 寫入後很少修改（除了刪除、編輯）

資料量：
  假設 10 億用戶，每人每天發 50 條訊息
  每天：500 億條訊息
  每條 ~200 bytes
  每天寫入：500億 × 200bytes = 10TB/天</code></pre>

  <h3>為什麼不用 MySQL/PostgreSQL？</h3>
  <pre data-lang="text"><code class="language-text">關係型資料庫的問題：
  - 10TB/天的寫入速度超出單機 MySQL 的上限（通常 10-50K TPS）
  - 需要水平 Sharding（按 conversation_id 或 user_id 分片）
  - 大型 JOIN 操作效能差（訊息、用戶、已讀狀態）
  - 但對於中小規模系統，MySQL + Sharding 完全可行</code></pre>

  <h3>HBase Row Key 設計</h3>
  <p>HBase 是建立在 HDFS 之上的 Column-Family 資料庫，資料按 Row Key 的字典順序排列儲存。Row Key 的設計直接決定了查詢效能。</p>
  <pre data-lang="text"><code class="language-text">反轉時間戳（Reversed Timestamp）設計：

問題：直接用 timestamp 作為 Row Key 的一部分，
      最新訊息會在 Region 末尾，掃描時需要跳過大量舊資料。

解決方案：使用「反轉時間戳」
  反轉時間戳 = Long.MAX_VALUE - currentTimestamp
             = 9223372036854775807 - timestamp

效果：最新訊息有最小的反轉時間戳，
      排在 Row Key 的最前面，掃描開頭即可獲得最新訊息。

Row Key 設計：
  格式：{conversation_id}_{reversed_timestamp}_{message_id}
  範例：
    conv:abc123_9223372035854775807_msg001  ← 最新訊息（排最前）
    conv:abc123_9223372035854775806_msg002
    conv:abc123_9223372035854775805_msg003
    ...

查詢最近 50 條訊息：
  Scan(startRow="conv:abc123_", stopRow="conv:abc123\`", LIMIT=50)
  → 因為反轉時間戳，這 50 行就是最新的 50 條訊息

Column Family 設計：
  cf:text      → 訊息文字（或媒體 URL）
  cf:sender    → 發送者 ID
  cf:type      → text/image/video/file/sticker
  cf:status    → sent/delivered/read
  cf:meta      → 回覆的訊息 ID、提及的用戶等 JSON 元數據</code></pre>

  <callout-box type="info" title="為什麼 conversation_id 放在前面？">
    <p>HBase 按 Row Key 分配到不同 Region（分片）。把 conversation_id 放在前面確保同一對話的所有訊息儲存在同一個 Region，使「查詢某對話的訊息」成為高效的單 Region 掃描，而非跨 Region 的分散查詢。</p>
    <p>需要注意「熱點（Hot Spot）」問題：如果大量訊息集中在少數幾個熱門群組，會導致對應的 Region 過熱。解決方式是在 Row Key 前加入「鹽值（Salt）」分散負載，代價是查詢時需要同時掃描多個 Region。</p>
  </callout-box>

  <h3>Cassandra：Partition Key 設計</h3>
  <pre data-lang="sql"><code class="language-sql">-- Cassandra 訊息表設計
CREATE TABLE messages (
  conversation_id  UUID,
  -- 使用時間桶（bucket）避免單一 partition 過大
  -- Cassandra 單個 Partition 建議不超過 100MB / 100,000 行
  bucket           INT,           -- year * 100 + month（如 202501）
  message_id       TIMEUUID,      -- Cassandra 的時間 UUID，天然有序
  sender_id        UUID,
  content          TEXT,
  message_type     VARCHAR,       -- 'text', 'image', 'video', 'file'
  media_url        TEXT,          -- 媒體檔案的 S3 URL（如有）
  reply_to_id      UUID,          -- 回覆訊息的 ID（可為 NULL）
  created_at       TIMESTAMP,
  PRIMARY KEY ((conversation_id, bucket), message_id)
) WITH CLUSTERING ORDER BY (message_id DESC);

-- 查詢最近 50 條訊息（只需指定當前時間桶）
SELECT * FROM messages
WHERE conversation_id = ? AND bucket = 202501
ORDER BY message_id DESC
LIMIT 50;

-- 跨桶查詢（翻頁到上個月）
SELECT * FROM messages
WHERE conversation_id = ? AND bucket = 202412
ORDER BY message_id DESC
LIMIT 50;</code></pre>

  <h3>大型媒體訊息的分離儲存</h3>
  <p>圖片、影片等媒體內容不應直接儲存在資料庫中，而應使用物件儲存（Object Storage）並在資料庫中只保留 URL 引用。</p>
  <pre data-lang="text"><code class="language-text">媒體訊息的處理流程：

1. 客戶端發送媒體訊息前，先上傳媒體到 Object Storage：
   POST /api/media/upload
   → 返回 Pre-signed URL（有效期 15 分鐘）
   → 客戶端直接 PUT 到 S3（繞過應用伺服器）

2. 上傳完成後，客戶端發送訊息（只包含 URL）：
   {
     "type": "image",
     "content": "https://cdn.example.com/media/abc123.jpg",
     "thumbnail_url": "https://cdn.example.com/thumb/abc123.jpg",
     "width": 1080,
     "height": 720,
     "file_size_bytes": 524288
   }

3. 媒體訊息的儲存策略：
   - 原始媒體：S3（private，透過 CDN 提供存取）
   - 縮圖：自動生成並快取在 CDN Edge
   - 訊息記錄：Cassandra（只存 URL，不存二進位內容）

媒體訊息 vs 文字訊息的成本對比：
  文字訊息：~200 bytes/條
  圖片訊息：訊息記錄 ~500 bytes，但媒體檔案 200KB-5MB
  影片訊息：訊息記錄 ~500 bytes，但媒體檔案 10MB-1GB

→ 媒體儲存成本遠高於訊息索引，需要獨立的 CDN + 分層儲存策略</code></pre>

  <callout-box type="info" title="HBase vs Cassandra 如何選擇">
    <p>HBase：強一致性（CP）、依賴 HDFS（整合 Hadoop 生態系）、適合需要跨行事務的場景。Facebook Messenger 使用 HBase。</p>
    <p>Cassandra：最終一致性（AP）、無主架構更易水平擴展、適合超高寫入吞吐量。Discord 使用 Cassandra（後來遷移到 ScyllaDB，效能更高）。</p>
    <p>兩者都適合聊天系統，選擇取決於團隊熟悉度和一致性要求。</p>
  </callout-box>
</section>

<section id="read-receipt">
  <h2>已讀回執（Read Receipt）設計</h2>
  <p>已讀回執讓發送者知道接收者是否看到了訊息（WhatsApp 的雙打勾、藍色打勾）。這個功能看似簡單，但在規模化後設計挑戰很大。</p>

  <h3>已讀回執的精確語義</h3>
  <p>在設計已讀回執前，需要先釐清不同狀態的精確定義，不同系統的語義有所差異：</p>
  <pre data-lang="text"><code class="language-text">訊息狀態的精確定義：

SENDING（傳送中）：
  → 客戶端已發出 HTTP/WebSocket 請求，等待伺服器確認
  → 顯示：時鐘圖示（⏰）

SENT（已傳送）：
  → 伺服器已接收並持久化到資料庫
  → 接收者「可能」尚未下載（可能處於離線狀態）
  → 顯示：單勾（✓）
  → WhatsApp：灰色單勾

DELIVERED（已送達）：
  → 接收者的設備已從伺服器下載此訊息
  → 不代表接收者有看到（可能在背景收到推播通知）
  → 顯示：雙勾（✓✓）
  → WhatsApp：灰色雙勾

READ（已閱讀）：
  → 接收者主動開啟對話並閱讀此訊息
  → 最強的確認：用戶確實看了
  → 顯示：藍色雙勾（✓✓）
  → WhatsApp：藍色雙勾

注意：
  LINE 只有「已讀」一個狀態（不區分 DELIVERED 和 READ）
  Telegram 的「已讀」是雙藍色勾
  iMessage 的「已讀」顯示時間戳記</code></pre>

  <h3>狀態機設計</h3>
  <pre data-lang="text"><code class="language-text">訊息狀態機：
  SENDING → SENT → DELIVERED → READ

SENDING:   客戶端已發出，等待伺服器確認
SENT:      伺服器已接收並儲存（✓ 單勾）
DELIVERED: 接收方設備已下載訊息（✓✓ 雙勾）
READ:      接收方已開啟對話查看訊息（✓✓ 藍色雙勾）</code></pre>

  <h3>批量更新優化</h3>
  <p>用戶開啟對話時，通常需要一次性標記大量訊息為已讀。逐條更新每條訊息的狀態效率極低，使用「最後已讀位置」的設計可以大幅減少寫入量。</p>
  <pre data-lang="typescript"><code class="language-typescript">// 個人聊天：只需追蹤一個人的已讀狀態
interface DirectMessageReceipt {
  messageId: string;
  readAt: Date | null;  // null = 未讀
}

// 群組聊天：需要追蹤每個成員的已讀狀態
// 方案一：每個訊息 × 每個成員 = 龐大的資料量
// 1000 人群組，10 萬條訊息 = 1 億條已讀記錄（不可行！）

// 方案二：只記錄每個成員的最後已讀訊息 ID（推薦）
interface MemberReadProgress {
  conversationId: string;
  userId: string;
  lastReadMessageId: string;  // 此 ID 之前（含）的所有訊息均已讀
  lastReadAt: Date;
}

// 已讀操作（使用者打開對話）
async function markAsRead(
  userId: string,
  conversationId: string,
  latestMessageId: string
): Promise&lt;void&gt; {
  // 更新此成員的最後已讀位置（單次寫入，替代 N 次寫入）
  await db.upsert('member_read_progress', {
    conversation_id: conversationId,
    user_id: userId,
    last_read_message_id: latestMessageId,
    last_read_at: new Date(),
  });

  // 通知其他成員（透過 WebSocket）
  const otherMembers = await getConversationMembers(conversationId);
  for (const memberId of otherMembers) {
    await connectionManager.sendToUser(memberId, {
      type: 'read_receipt',
      conversationId,
      readBy: userId,
      lastReadMessageId: latestMessageId,
    });
  }
}

// 查詢某訊息的已讀人數
async function getReadCount(
  conversationId: string,
  messageId: string,
  senderId: string
): Promise&lt;number&gt; {
  // 統計 last_read_message_id >= messageId 的成員數
  // （讀了更新的訊息，也代表讀了此訊息）
  const result = await db.query(\`
    SELECT COUNT(*) as read_count
    FROM member_read_progress
    WHERE conversation_id = ?
      AND last_read_message_id >= ?
      AND user_id != ?  -- 排除發送者自己
  \`, [conversationId, messageId, senderId]);

  return result.read_count;
}</code></pre>

  <h3>Client-Server 同步機制</h3>
  <p>在多設備場景（手機和電腦同時登入），已讀狀態需要在不同設備間同步。</p>
  <pre data-lang="typescript"><code class="language-typescript">// 設備 A 標記已讀後，同步到同一用戶的其他設備
async function syncReadReceiptAcrossDevices(
  userId: string,
  conversationId: string,
  lastReadMessageId: string
): Promise&lt;void&gt; {
  // 查詢此用戶的所有在線設備（可能有多台）
  const userDevices = await redis.smembers(\`user:devices:\${userId}\`);

  for (const deviceConnection of userDevices) {
    // 向其他設備發送已讀同步通知
    await connectionManager.sendToDevice(deviceConnection, {
      type: 'read_sync',
      conversationId,
      lastReadMessageId,
      syncedAt: new Date(),
    });
  }
}

// 離線設備重新上線時，拉取最新的已讀狀態
async function syncOnReconnect(userId: string): Promise&lt;void&gt; {
  // 拉取所有對話的最後已讀位置
  const readProgresses = await db.query(\`
    SELECT conversation_id, last_read_message_id, last_read_at
    FROM member_read_progress
    WHERE user_id = ?
    ORDER BY last_read_at DESC
    LIMIT 100
  \`, [userId]);

  // 一次性發送給剛連線的設備
  await connectionManager.sendToUser(userId, {
    type: 'read_progress_sync',
    data: readProgresses,
  });
}</code></pre>

  <callout-box type="tip" title="已讀回執的效能瓶頸">
    <p>在大型群組（如 100 人）中，每個成員標記已讀時都會觸發 99 次 WebSocket 推播通知（通知其他成員）。這在高流量時會產生大量推播。優化方案：設定延遲批量通知（如收集 5 秒內的已讀事件再批量推播），或只在群組成員打開訊息詳情時才查詢已讀人數，而非實時推播。</p>
  </callout-box>
</section>

<section id="presence-service">
  <h2>線上狀態（Presence）服務</h2>
  <p>線上狀態顯示（「小明正在輸入中...」、「最後上線：3 分鐘前」）需要以低延遲處理大量的心跳訊號。Presence 服務本質上是一個高吞吐量的分散式狀態機。</p>

  <h3>線上狀態的分類定義</h3>
  <pre data-lang="text"><code class="language-text">用戶狀態的精確定義：

ACTIVE（活躍）：
  → 條件：過去 N 秒內有互動操作（發訊息、捲動頁面）
  → 顯示：綠色實心圓點
  → 建議 N = 60 秒

IDLE（閒置）：
  → 條件：App 在前台但超過 N 秒無操作（手機螢幕亮著但沒動）
  → 或：App 在後台（minimized）
  → 顯示：黃色空心圓點或「閒置」
  → 建議 N = 5 分鐘

OFFLINE（離線）：
  → 條件：WebSocket 已斷線超過 T 秒（心跳超時）
  → 顯示：灰色圓點 + 「最後上線：X 分鐘前」
  → 建議 T = 60 秒（心跳 TTL 到期）

DND（請勿打擾）：
  → 用戶主動設定，不接收推播通知
  → 顯示：特殊圖示（月亮或勿擾符號）

隱私模式（Privacy Mode）：
  → 用戶主動選擇不顯示線上狀態給特定人
  → 實作：在 Presence Query 時過濾黑名單用戶</code></pre>

  <h3>心跳超時設計</h3>
  <pre data-lang="typescript"><code class="language-typescript">class PresenceService {
  // 用戶上線：設置 Redis Key（帶 TTL）
  async setOnline(userId: string): Promise&lt;void&gt; {
    // Key 60 秒後自動過期（如果沒有心跳更新）
    await redis.setex(\`presence:\${userId}\`, 60, JSON.stringify({
      status: 'ACTIVE',
      since: Date.now(),
    }));
    await redis.hset('user:last_seen', userId, Date.now().toString());

    // 通知有活躍對話的聯絡人
    await this.broadcastStatusChange(userId, 'online');
  }

  // 用戶進入背景或關閉 App
  async setIdle(userId: string): Promise&lt;void&gt; {
    await redis.setex(\`presence:\${userId}\`, 300, JSON.stringify({
      status: 'IDLE',
      since: Date.now(),
    }));
    // 可選：通知聯絡人
  }

  // 用戶離線
  async setOffline(userId: string): Promise&lt;void&gt; {
    await redis.del(\`presence:\${userId}\`);
    await redis.hset('user:last_seen', userId, Date.now().toString());
    await this.broadcastStatusChange(userId, 'offline');
  }

  // 心跳（每 30 秒由客戶端發送）
  async heartbeat(userId: string, activity: 'active' | 'idle'): Promise&lt;void&gt; {
    const status = activity === 'active' ? 'ACTIVE' : 'IDLE';
    const ttl = activity === 'active' ? 60 : 300;

    // 更新 TTL（重置計時器）
    await redis.setex(\`presence:\${userId}\`, ttl, JSON.stringify({
      status,
      since: Date.now(),
    }));
  }

  // 查詢多個用戶的線上狀態（批量查詢，減少 Round-trip）
  async getPresence(userIds: string[]): Promise&lt;PresenceInfo[]&gt; {
    const pipeline = redis.pipeline();
    userIds.forEach(id => {
      pipeline.get(\`presence:\${id}\`);
      pipeline.hget('user:last_seen', id);
    });
    const results = await pipeline.exec();

    return userIds.map((userId, i) => {
      const presenceData = results[i * 2][1];
      const lastSeenTimestamp = results[i * 2 + 1][1];

      return {
        userId,
        status: presenceData
          ? JSON.parse(presenceData).status
          : 'OFFLINE',
        lastSeenAt: lastSeenTimestamp
          ? new Date(parseInt(lastSeenTimestamp))
          : null,
      };
    });
  }
}

// 「正在輸入」狀態（短暫，無需持久化）
async function setTyping(
  userId: string,
  conversationId: string
): Promise&lt;void&gt; {
  // 設置一個 5 秒的 Typing 狀態
  await redis.setex(
    \`typing:\${conversationId}:\${userId}\`,
    5,
    '1'
  );

  // 廣播給對話中的其他成員
  await broadcastToConversation(conversationId, {
    type: 'typing',
    userId,
    conversationId,
  });
}</code></pre>

  <h3>分散式 Presence Server</h3>
  <p>Presence 服務的規模化是一個非常有挑戰性的工程問題。10 億用戶每 30 秒心跳一次，意味著每秒超過 3,300 萬次心跳請求。</p>
  <pre data-lang="text"><code class="language-text">10 億活躍用戶的 Presence 服務：
  每 30 秒心跳：10億 / 30 ≈ 3,300萬 心跳/秒（33M heartbeats/s）
  每個心跳：1 次 Redis EXPIRE 操作

水平分片架略：
  1. 按 userId 的雜湊值，分配到不同的 Presence Server 叢集
     hash(userId) % N_shards → 路由到特定的 Redis 實例
  2. 每個 Presence Server 只負責一部分用戶
  3. 查詢時根據 userId 路由到對應的 Presence Server

優化：只廣播必要的狀態變更
  - 不需要廣播所有線上狀態變更給所有人
  - 策略一：開啟對話時查詢，而非持續推送
  - 策略二：只通知有活躍對話的聯絡人
  - 策略三：用戶列表較小時（如微信 <500 人通訊錄）可以廣播；
            超大平台（如 Twitter）僅顯示當前查看的人的狀態

Privacy 考量：
  - 「最後上線時間」的可見性設定（全公開/只有好友/隱藏）
  - 不同的對話夥伴可以看到不同的狀態（黑名單功能）
  - 實作：查詢 Presence 時，先過濾隱私設定再返回
  - 儲存：Redis Hash 中包含 privacy_level 欄位</code></pre>

  <callout-box type="warning" title="Presence 服務的精確性取捨">
    <p>Presence 服務通常提供「最終一致性」而非「強一致性」。當用戶突然斷網時，最長需要 60 秒（TTL）才能偵測到其離線，這段時間其他用戶仍會看到其「在線」狀態。這個延遲是可以接受的——在生活中，用戶對幾分鐘內的狀態誤差並不敏感。如果需要更即時的離線偵測，可以縮短 TTL（如 30 秒），代價是心跳頻率需要更高，消耗更多伺服器資源。</p>
  </callout-box>
</section>

<section id="group-chat-fanout">
  <h2>群組聊天 Fan-out 策略</h2>
  <p>群組聊天的訊息需要送達所有成員，當群組規模增大時，Fan-out 策略需要相應調整。Fan-out 本質上是「一寫多讀」問題的取捨：在寫入時就推送給所有人（Fan-out on Write），還是讓各自在讀取時才拉取（Fan-out on Read）。</p>

  <h3>Fan-out on Write vs Fan-out on Read</h3>
  <pre data-lang="text"><code class="language-text">Fan-out on Write（寫時擴散）：
  → 訊息到達時，立即推送給所有成員
  → 優點：讀取延遲低（已在各自收件箱）
  → 缺點：寫入放大（1條訊息 × N個成員 = N次推送）
  → 適合：小型群組（&lt;100人），成員通常在線

Fan-out on Read（讀時拉取）：
  → 訊息只存一份，成員打開對話時才拉取
  → 優點：寫入成本低，節省儲存空間
  → 缺點：讀取時需要計算未讀數、即時性差
  → 適合：超大群組（>1000人），頻道（Channel）模式

混合策略（Hybrid Fan-out）：
  → 在線用戶：即時推送（Fan-out on Write）
  → 離線用戶：存入訊息佇列，上線時批量拉取（Fan-out on Read）
  → 這是 WhatsApp、微信等主流聊天應用的實作方式</code></pre>

  <h3>小群組（&lt; 100 人）：直接 Fan-out</h3>
  <pre data-lang="typescript"><code class="language-typescript">// 訊息到達後，直接推送給所有線上成員
async function fanoutGroupMessage(
  message: ChatMessage,
  conversationId: string
): Promise&lt;void&gt; {
  const members = await getConversationMembers(conversationId);

  // 先儲存訊息到 Message Store
  await messageStore.save(message);

  // 並行推送給所有成員（過濾發送者自己）
  const pushResults = await Promise.allSettled(
    members
      .filter(m => m.userId !== message.senderId)
      .map(member =>
        connectionManager.sendToUser(member.userId, message)
      )
  );

  // 統計推送失敗的用戶（離線用戶，需要推播通知）
  const offlineMembers = members.filter((member, i) =>
    pushResults[i].status === 'rejected'
  );

  // 對離線用戶發送 Push Notification（APNs/FCM）
  for (const member of offlineMembers) {
    await pushNotificationService.send(member.userId, {
      title: message.senderName,
      body: truncate(message.content, 100),
      conversationId,
    });
  }
}</code></pre>

  <h3>大群組（100 - 1000 人）：非同步批量 Fan-out</h3>
  <pre data-lang="typescript"><code class="language-typescript">async function fanoutLargeGroupMessage(
  message: ChatMessage,
  conversationId: string
): Promise&lt;void&gt; {
  // 先儲存訊息
  await messageStore.save(message);

  // 查詢群組成員快取（避免每次訊息都查資料庫）
  const members = await groupMemberCache.getMembers(conversationId);

  // 發布到佇列，由 Fan-out Workers 非同步處理
  await messageQueue.publish('group.message.fanout', {
    messageId: message.id,
    conversationId,
    timestamp: message.createdAt,
    onlineMemberIds: members
      .filter(m => presenceService.isOnline(m.userId))
      .map(m => m.userId),
  });
}

// Fan-out Worker
async function processFanout(job: FanoutJob): Promise&lt;void&gt; {
  const message = await messageStore.get(job.messageId);

  // 分批處理，每批 100 人（避免單次大量並行請求）
  const batches = chunk(job.onlineMemberIds, 100);
  for (const batch of batches) {
    await Promise.allSettled(
      batch.map(userId => connectionManager.sendToUser(userId, message))
    );
    // 批次之間稍微停頓，避免流量峰值
    await sleep(10);
  }
}

// 群組快取設計：避免每條訊息都查詢 DB 成員列表
class GroupMemberCache {
  async getMembers(conversationId: string): Promise&lt;Member[]&gt; {
    const cacheKey = \`group:members:\${conversationId}\`;
    const cached = await redis.get(cacheKey);

    if (cached) return JSON.parse(cached);

    const members = await db.getGroupMembers(conversationId);
    // 快取 5 分鐘（成員變動不頻繁）
    await redis.setex(cacheKey, 300, JSON.stringify(members));
    return members;
  }

  // 成員加入/離開時，主動失效快取
  async invalidate(conversationId: string): Promise&lt;void&gt; {
    await redis.del(\`group:members:\${conversationId}\`);
  }
}</code></pre>

  <h3>超大群組（&gt; 1000 人）：Fan-out 切換策略</h3>
  <callout-box type="warning" title="大型群組的 Fan-out 成本">
    <p>群組聊天超過 1000 人時，Fan-out on Write 的成本急劇上升。例如一個 5000 人的群組每秒接收 10 條訊息，每條訊息需要 5000 次推送，等於每秒 50,000 次推送操作。這是大多數系統設定最大群組成員數的原因。</p>
    <p>超大群組（廣播頻道）改用 Fan-out on Read：成員打開頻道時主動拉取最新訊息，而非被動接收推送。App 上顯示的「N條未讀訊息」是透過計算訊息總數減去用戶最後已讀位置得出的，而非真正維護每人的收件箱。</p>
  </callout-box>
  <pre data-lang="text"><code class="language-text">業界群組上限設計：
  微信群組上限：500 人
  LINE 群組上限：500 人
  Telegram 群組：200,000 人（改用 Channel 模式）
  Discord 伺服器：無上限（頻道使用 Fan-out on Read）

超大群組的設計切換：
  - 群組 &lt; 閾值（如 500）：Fan-out on Write（實時推送）
  - 群組 > 閾值：Fan-out on Read（拉取 + 未讀計數提示）
  - Badge 未讀數：用戶打開 App 時顯示未讀計數，點進去才載入訊息

未讀計數的計算（Fan-out on Read 模式）：
  未讀數 = 最新訊息序號 - 用戶最後已讀訊息序號
  實作：每條訊息有一個全局序號（sequence number）
  優點：不需要為每個成員維護個別的消息收件箱</code></pre>

  <callout-box type="tip" title="訊息序號與唯一 ID">
    <p>聊天系統中的訊息 ID 需要同時滿足：(1) 全局唯一；(2) 在同一對話內按時間有序（便於翻頁和未讀計數）；(3) 高吞吐量生成（不能成為瓶頸）。常見方案是 Twitter Snowflake：64 位 ID = 41位時間戳 + 10位機器ID + 12位序號，每台機器每毫秒可以生成 4096 個唯一 ID，並且天然有時間序。</p>
  </callout-box>
</section>
`,
} satisfies ChapterContent;
