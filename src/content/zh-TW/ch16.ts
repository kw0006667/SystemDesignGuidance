import type { ChapterContent } from '../../types.js';

export default {
  title: '設計通知系統（Notification System）',
  content: `
<section id="notification-channels">
  <h2>Push / Email / SMS 多渠道抽象</h2>
  <p>現代通知系統需要支援多種渠道（Push Notification、Email、SMS、In-App），每個渠道有不同的延遲特性、費用和可靠性。好的設計應該讓業務邏輯與傳送細節完全解耦，並能靈活切換 Provider，實現「Write once, deliver anywhere」。</p>

  <arch-diagram src="./diagrams/ch16-notification.json" caption="通知系統架構：展示多渠道通知分發、優先級佇列、去重機制與可靠性保障的完整設計。"></arch-diagram>

  <h3>各渠道特性比較</h3>
  <pre data-lang="text"><code class="language-text">渠道              延遲     費用    開啟率   成功率  適用場景
──────────────────────────────────────────────────────────────
Push (iOS APNs)   秒級     低      ~8%     95%+   即時提醒、互動通知（需用戶授權）
Push (Android FCM) 秒級    低      ~12%    93%+   Android 生態（依賴 Google 服務）
Email             分鐘     極低    ~20%    99%+   行銷活動、交易收據、週報
SMS               秒級     中高    ~98%    99%+   OTP 驗證、重要安全警告
In-App Banner     毫秒     免費    ~60%    100%   用戶在線時的即時通知
WebSocket Push    毫秒     免費    ~60%    依連線  Web 應用的即時通知
Line/WhatsApp     秒級     低中    ~50%    95%+   特定市場的用戶觸達</code></pre>

  <h3>APNs vs FCM 推播差異</h3>
  <pre data-lang="text"><code class="language-text">APNs（Apple Push Notification Service）：
  連線協定：HTTP/2（APNs Provider API）或 binary protocol（舊）
  認證方式：
    - Token-based（推薦）：使用 JWT（ES256）+ .p8 私鑰，無需每年更新
    - Certificate-based：.p12 憑證，每年需要更新
  Push 類型：
    - Alert：顯示通知橫幅和聲音
    - Background：靜默喚醒 App（iOS 在後台靜默執行）
    - VoIP：CallKit 電話通知（高優先級，系統保證送達）
  重要參數：
    apns-priority: 10（立即送達）或 5（低電量模式下延遲）
    apns-expiration: 0（立即過期，用戶不在線就不送）或 Unix 時間戳
    apns-collapse-id: 折疊 ID（相同 ID 的通知只顯示最新一條）

FCM（Firebase Cloud Messaging）：
  前身：GCM（Google Cloud Messaging）
  連線方式：HTTP v1 API（OAuth 2.0 認證）
  特殊功能：
    - Data Message vs Notification Message 兩種類型
      - Notification Message：系統 Tray 直接顯示（App 不需要在前台）
      - Data Message：傳給 App 處理（App 在後台時可能被殺死）
    - Priority: HIGH（立即送達）vs NORMAL（省電模式下延遲）
    - time_to_live: 最長 4 週（APNs 最長 30 天）
    - collapse_key：類似 APNs 的 apns-collapse-id

主要差異：
  APNs  → 強制要求用戶授權（iOS 13+），使用者可完全拒絕
  FCM   → Android 預設允許（用戶可在設定中關閉）
  APNs  → 每個 Token 對應單一設備，Token 有效期長
  FCM   → 同一 Token 可能跨設備（換機後需要更新）
  APNs  → 在中國大陸可用（蘋果自建 CDN）
  FCM   → 在中國大陸不可用（需使用廠商通道：小米推送、華為推送）</code></pre>

  <pre data-lang="typescript"><code class="language-typescript">// APNs Token-based 推播實作
import apn from '@parse/node-apn';

class ApnsProvider {
  private provider: apn.Provider;

  constructor() {
    this.provider = new apn.Provider({
      token: {
        key: process.env.APNS_PRIVATE_KEY!,    // .p8 檔案內容
        keyId: process.env.APNS_KEY_ID!,       // 10 字元 Key ID
        teamId: process.env.APPLE_TEAM_ID!,    // 10 字元 Team ID
      },
      production: process.env.NODE_ENV === 'production',
    });
  }

  async send(deviceToken: string, payload: NotificationPayload): Promise<void> {
    const notification = new apn.Notification();
    notification.alert = { title: payload.title, body: payload.body };
    notification.badge = payload.badge;
    notification.sound = payload.sound ?? 'default';
    notification.topic = process.env.APPLE_BUNDLE_ID!; // e.g., 'com.myapp.ios'
    notification.expiry = Math.floor(Date.now() / 1000) + 3600; // 1 小時後過期
    notification.priority = payload.priority === 'CRITICAL' ? 10 : 5;
    notification.collapseId = payload.collapseKey;
    notification.payload = { notificationId: payload.id, data: payload.data };

    const result = await this.provider.send(notification, deviceToken);

    if (result.failed.length > 0) {
      const error = result.failed[0].response;
      if (error?.reason === 'BadDeviceToken' || error?.reason === 'Unregistered') {
        // Token 失效：從資料庫刪除，避免繼續浪費請求
        await deviceTokenService.invalidateToken(deviceToken);
      }
      throw new Error(\`APNs error: \${error?.reason}\`);
    }
  }
}

// FCM HTTP v1 API 推播實作
import { GoogleAuth } from 'google-auth-library';

class FcmProvider {
  private auth: GoogleAuth;

  constructor() {
    this.auth = new GoogleAuth({
      credentials: JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!),
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
  }

  async send(deviceToken: string, payload: NotificationPayload): Promise<void> {
    const token = await this.auth.getAccessToken();
    const projectId = process.env.FIREBASE_PROJECT_ID!;

    const response = await fetch(
      \`https://fcm.googleapis.com/v1/projects/\${projectId}/messages:send\`,
      {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${token}\`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: deviceToken,
            notification: { title: payload.title, body: payload.body },
            data: { notificationId: payload.id, ...payload.data },
            android: {
              priority: payload.priority === 'CRITICAL' ? 'high' : 'normal',
              ttl: '3600s',
              collapse_key: payload.collapseKey,
              notification: { click_action: 'OPEN_ACTIVITY' },
            },
            apns: {
              headers: {
                'apns-priority': payload.priority === 'CRITICAL' ? '10' : '5',
                'apns-collapse-id': payload.collapseKey,
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      // UNREGISTERED：Token 失效
      if (error.error?.details?.[0]?.errorCode === 'UNREGISTERED') {
        await deviceTokenService.invalidateToken(deviceToken);
      }
      throw new Error(\`FCM error: \${JSON.stringify(error)}\`);
    }
  }
}</code></pre>

  <h3>Email Provider 選型（SendGrid vs Amazon SES）</h3>
  <pre data-lang="text"><code class="language-text">SendGrid：
  優點：
    - 優秀的送達率（Deliverability）管理，自動處理退信、取消訂閱
    - 強大的模板引擎（Handlebars，支援動態內容）
    - 詳細的 Analytics（開啟率、點擊率、退信原因）
    - 簡單的 API 和 SDK
  缺點：
    - 費用較高（$14.95/月起 for 50K emails）
    - 資料存在 SendGrid 的伺服器
  適用：中小型 SaaS、需要行銷郵件功能的產品

Amazon SES（Simple Email Service）：
  優點：
    - 費用極低（$0.10 per 1000 emails，EC2 內發送免費）
    - 可完全整合 AWS 生態（IAM、CloudWatch、SNS）
    - 支援 SMTP 介面（無需改代碼）
  缺點：
    - 需要自己處理退信（Bounce）和取消訂閱（Unsubscribe）管理
    - 模板功能較弱
    - 初始有發送限制（需要申請解除 Sandbox 限制）
  適用：大量交易型郵件（如電子收據、OTP）、已在 AWS 上的系統

最佳實踐：
  - 交易型郵件（OTP、訂單確認）：SES（低成本、高量）
  - 行銷型郵件（電子報、促銷）：SendGrid（行銷功能豐富）
  - 退信率 > 5%：立即調查（影響域名信譽，可能被列入黑名單）</code></pre>

  <h3>SMS Gateway 設計</h3>
  <pre data-lang="typescript"><code class="language-typescript">// SMS Gateway 抽象層：支援多 Provider 容錯
class SmsGateway {
  // 主要 Provider 按地區優化（不同地區選擇不同運營商）
  private readonly providersByRegion: Record<string, SmsProvider[]> = {
    'TW': [new TwilioProvider(), new NexmoProvider()],
    'CN': [new AlibabaCloudSmsProvider(), new TencentSmsProvider()], // 中國大陸必須用國內服務商
    'US': [new TwilioProvider(), new AwsSnsProvider()],
    'default': [new TwilioProvider(), new NexmoProvider(), new AwsSnsProvider()],
  };

  async send(phoneNumber: string, message: string): Promise<DeliveryResult> {
    const region = this.detectRegion(phoneNumber); // 根據國際區號判斷
    const providers = this.providersByRegion[region] ?? this.providersByRegion['default'];

    for (const provider of providers) {
      if (circuitBreaker.isOpen(provider.name)) continue; // 跳過熔斷中的 Provider

      try {
        const result = await provider.send(phoneNumber, message);
        circuitBreaker.recordSuccess(provider.name);
        return result;
      } catch (error) {
        circuitBreaker.recordFailure(provider.name);
        logger.warn(\`SMS Provider \${provider.name} failed\`, { error, phoneNumber });
      }
    }
    throw new Error('All SMS providers failed');
  }

  // 重要：OTP 類 SMS 的特殊處理
  async sendOtp(phoneNumber: string, otp: string): Promise<void> {
    // OTP 訊息模板（需要在運營商預先備案，否則可能被過濾）
    const message = \`您的驗證碼是：\${otp}，5 分鐘內有效，請勿洩露他人。\`;

    await this.send(phoneNumber, message);

    // 記錄發送時間，防止用戶頻繁請求
    await redis.setex(\`otp:ratelimit:\${phoneNumber}\`, 60, '1'); // 60 秒內只能發 1 次
  }

  // 電話號碼格式標準化（E.164 格式）
  normalizePhoneNumber(phone: string, defaultCountry = 'TW'): string {
    // 使用 libphonenumber-js 解析
    const parsed = parsePhoneNumber(phone, defaultCountry as CountryCode);
    return parsed.format('E.164'); // e.g., "+886912345678"
  }
}</code></pre>

  <h3>多渠道抽象層設計</h3>
  <pre data-lang="typescript"><code class="language-typescript">// 統一的通知 Provider 介面
interface NotificationProvider {
  channel: NotificationChannel;
  send(notification: Notification): Promise<DeliveryResult>;
  isAvailable(): Promise<boolean>;
}

// 通知請求的標準結構
interface Notification {
  id: string;           // 冪等 Key（全域唯一）
  userId: string;
  channel: NotificationChannel;
  template: string;     // 模板 ID（與渠道無關的邏輯模板）
  variables: Record<string, string>;
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
  scheduledAt?: Date;   // 排程發送時間
  expiresAt?: Date;     // 過期時間（超過此時間不發）
  collapseKey?: string; // 折疊 Key（相同 Key 的通知只保留最新一條）
  ttl?: number;         // Time-to-live（秒）
}

// 統一發送入口：NotificationService
class NotificationService {
  constructor(
    private providers: Map<NotificationChannel, NotificationProvider>,
    private queue: PriorityMessageQueue,
  ) {}

  async send(request: SendNotificationRequest): Promise<void> {
    // 查詢用戶的偏好設定和訂閱狀態
    const prefs = await this.getUserPreferences(request.userId);

    // 決定使用哪些渠道（基於用戶偏好、通知類型、用戶設備情況）
    const channels = this.resolveChannels(request, prefs);

    // 對每個渠道，發送到對應的 Priority Queue
    for (const channel of channels) {
      const idempotencyKey = generateIdempotencyKey(request.userId, request.type, channel);
      await this.queue.enqueue({
        queueName: \`notifications:\${channel}:\${request.priority}\`,
        payload: {
          ...request,
          channel,
          id: idempotencyKey,
          expiresAt: this.calculateExpiry(request.priority),
        },
      });
    }
  }

  private resolveChannels(
    request: SendNotificationRequest,
    prefs: UserPreferences
  ): NotificationChannel[] {
    const channels: NotificationChannel[] = [];

    // CRITICAL 通知：強制使用 SMS（即使用戶關閉了推播）
    if (request.priority === 'CRITICAL') {
      if (prefs.phone) channels.push(NotificationChannel.SMS);
    }

    // Push：用戶已授權且有設備 Token
    if (prefs.pushEnabled && prefs.deviceTokens.length > 0) {
      channels.push(NotificationChannel.PUSH);
    }

    // Email：用戶未退訂此類別的 Email
    if (prefs.emailEnabled && !prefs.emailUnsubscribed.has(request.category)) {
      channels.push(NotificationChannel.EMAIL);
    }

    return channels;
  }
}

// 用戶偏好設定資料庫 Schema
const prefSchema = \`
  CREATE TABLE notification_preferences (
    user_id         BIGINT,
    channel         VARCHAR(20),   -- 'push', 'email', 'sms'
    category        VARCHAR(50),   -- 'marketing', 'security', 'transaction', 'social'
    enabled         BOOLEAN DEFAULT TRUE,
    quiet_hours_start TIME,        -- 勿擾時段開始（如 22:00）
    quiet_hours_end   TIME,        -- 勿擾時段結束（如 08:00）
    timezone        VARCHAR(50),   -- 'Asia/Taipei'
    updated_at      TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, channel, category)
  )
\`;</code></pre>
</section>

<section id="priority-queue">
  <h2>優先級佇列設計</h2>
  <p>不同類型的通知有截然不同的時效性要求：安全警告（帳號異常登入）必須秒級送達，而行銷推播可以延遲幾分鐘甚至幾小時。使用優先級佇列確保緊急通知不被普通通知阻塞。</p>

  <h3>通知分級策略（Critical/High/Normal/Low）</h3>
  <pre data-lang="text"><code class="language-text">CRITICAL（緊急）—— SLA: P99 < 5 秒
  場景：帳號異常登入、密碼變更確認、OTP 驗證碼、支付失敗
  策略：獨立佇列，專用 Worker（永遠不堆積），跳過勿擾時段
  渠道：SMS 優先（最高觸達率），同時發 Push

HIGH（高優先級）—— SLA: P99 < 30 秒
  場景：訂單確認、出貨通知、即時訊息提醒
  策略：高優先佇列，優先消費
  渠道：Push + Email

NORMAL（一般）—— SLA: P99 < 5 分鐘
  場景：評論/按讚通知、系統狀態更新、好友請求
  策略：正常佇列，可以批量合併（折疊）
  渠道：Push（In-App 優先）

LOW（低優先級）—— SLA: P99 < 24 小時
  場景：行銷推播、每週摘要報告、功能更新通知
  策略：排程到非高峰時段（如凌晨 2-6 點），批量發送
  渠道：Email 優先（成本最低），Push 可選</code></pre>

  <h3>優先級佇列實現（Redis Sorted Set）</h3>
  <pre data-lang="typescript"><code class="language-typescript">// 使用 Redis Sorted Set 實現優先級佇列
// score = 優先級權重（越小越優先）* 時間因子
class PriorityNotificationQueue {
  private readonly priorityWeights = {
    CRITICAL: 0,
    HIGH: 1000,
    NORMAL: 2000,
    LOW: 3000,
  };

  async enqueue(notification: Notification): Promise<void> {
    const weight = this.priorityWeights[notification.priority];
    // score = 優先級權重 + 毫秒時間戳（同優先級內按時間 FIFO）
    const score = weight * 1e13 + Date.now();
    const key = \`notifications:queue:\${notification.channel}\`;

    await redis.zadd(key, score, JSON.stringify(notification));
  }

  async dequeue(channel: NotificationChannel, batchSize = 10): Promise<Notification[]> {
    const key = \`notifications:queue:\${channel}\`;
    // ZPOPMIN：取出 score 最小（優先級最高）的 N 個元素
    const items = await redis.zpopmin(key, batchSize);

    return items
      .filter((_, index) => index % 2 === 0) // zpopmin 返回 [value, score, value, score, ...]
      .map(item => JSON.parse(item as string));
  }

  // 延遲佇列：排程到未來某個時間點
  async enqueueDelayed(notification: Notification, deliverAt: Date): Promise<void> {
    const score = deliverAt.getTime(); // score = 期望送達時間
    await redis.zadd('notifications:delayed', score, JSON.stringify(notification));
  }

  // 定時任務：將到期的延遲通知移到主佇列
  async moveReadyNotifications(): Promise<void> {
    const now = Date.now();
    // ZRANGEBYSCORE：取出 score <= now 的所有通知
    const items = await redis.zrangebyscore('notifications:delayed', '-inf', now);

    if (items.length === 0) return;

    const pipeline = redis.pipeline();
    for (const item of items) {
      const notification = JSON.parse(item);
      const weight = this.priorityWeights[notification.priority as keyof typeof this.priorityWeights];
      const score = weight * 1e13 + Date.now();
      pipeline.zadd(\`notifications:queue:\${notification.channel}\`, score, item);
      pipeline.zrem('notifications:delayed', item);
    }
    await pipeline.exec();
  }
}

// 多級佇列 Worker 架構
class NotificationWorkerPool {
  private workers: Map<string, Worker[]> = new Map();

  // 根據優先級分配不同數量的 Worker
  async initialize() {
    const config = {
      'push:CRITICAL': 20,   // 最多 Worker，專用，永遠空跑等待
      'push:HIGH': 10,
      'push:NORMAL': 5,
      'push:LOW': 2,
      'email:CRITICAL': 5,
      'email:HIGH': 3,
      'email:NORMAL': 3,
      'email:LOW': 2,        // 低峰時段才活躍
      'sms:CRITICAL': 10,
      'sms:HIGH': 5,
    };

    for (const [queueKey, workerCount] of Object.entries(config)) {
      const workers = Array.from({ length: workerCount }, () =>
        new NotificationWorker(queueKey)
      );
      this.workers.set(queueKey, workers);
    }
  }
}</code></pre>

  <h3>批量通知合併（Notification Batching）</h3>
  <pre data-lang="typescript"><code class="language-typescript">// 批量合併：避免短時間內發送大量相似通知
class NotificationBatcher {
  // 場景：用戶在 30 秒內收到 10 個「有人按讚你的文章」通知
  // 合併為：「張三和其他 9 人對你的文章按讚」

  async batchAndSend(
    userId: string,
    category: string,
    event: NotificationEvent
  ): Promise<void> {
    const batchKey = \`batch:\${userId}:\${category}:\${event.entityId}\`;
    const windowSeconds = this.getBatchWindow(category); // 按讚：30秒，評論：60秒

    // 使用 Lua 腳本保證原子性：INCR + EXPIRE + 條件觸發
    const luaScript = \`
      local count = redis.call('INCR', KEYS[1])
      if count == 1 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
        redis.call('RPUSH', KEYS[2], ARGV[2])
        redis.call('EXPIRE', KEYS[2], ARGV[1])
        return 1  -- 第一個事件，需要排程定時器
      else
        redis.call('RPUSH', KEYS[2], ARGV[2])
        return 0  -- 後續事件，已有定時器在等待
      end
    \`;

    const isFirst = await redis.eval(
      luaScript,
      2,
      batchKey,
      \`batch:events:\${userId}:\${category}:\${event.entityId}\`,
      windowSeconds.toString(),
      JSON.stringify(event)
    ) as number;

    if (isFirst === 1) {
      // 第一個事件：設置定時器，視窗結束後發送合併通知
      setTimeout(
        () => this.flushBatch(userId, category, event.entityId),
        windowSeconds * 1000
      );
    }
  }

  async flushBatch(userId: string, category: string, entityId: string): Promise<void> {
    const eventsKey = \`batch:events:\${userId}:\${category}:\${entityId}\`;
    const countKey = \`batch:\${userId}:\${category}:\${entityId}\`;

    const [events, count] = await Promise.all([
      redis.lrange(eventsKey, 0, -1),
      redis.get(countKey),
    ]);

    // 清除批次數據
    await redis.del(eventsKey, countKey);

    const totalCount = parseInt(count ?? '0');
    const parsedEvents = events.map(e => JSON.parse(e));
    const firstActor = parsedEvents[0]?.actorName ?? '有人';

    let message: string;
    if (totalCount === 1) {
      message = \`\${firstActor} 對你的文章按讚\`;
    } else {
      message = \`\${firstActor} 和其他 \${totalCount - 1} 人對你的文章按讚\`;
    }

    // 發送合併後的單一通知
    await notificationService.send({
      userId,
      type: category,
      message,
      priority: 'NORMAL',
    });
  }

  private getBatchWindow(category: string): number {
    const windows: Record<string, number> = {
      'like': 30,        // 按讚：30 秒視窗
      'comment': 60,     // 評論：60 秒視窗
      'follow': 300,     // 追蹤：5 分鐘視窗
      'mention': 10,     // @提及：10 秒視窗（時效性高）
    };
    return windows[category] ?? 30;
  }
}</code></pre>

  <callout-box type="info" title="通知折疊的業務價值">
    <p>Facebook/Instagram 的通知折疊是典型實作：當有人連續按讚多篇文章，不會發送 10 次通知，而是一次「張三和其他 9 人對你的文章按讚」。Apple 的 APNs 和 FCM 都支援在設備端折疊（collapse_key），但服務端合併更節省推播資源，也能跨渠道合併（例如同時折疊 Push 和 Email）。</p>
  </callout-box>
</section>

<section id="deduplication">
  <h2>防止重複通知（Deduplication）</h2>
  <p>在分散式系統中，由於重試機制和 At-least-once 投遞保證，同一個通知可能被多次投遞。沒有去重機制的通知系統，用戶可能收到重複的推播，嚴重損害用戶體驗。</p>

  <h3>重複通知的根本原因</h3>
  <pre data-lang="text"><code class="language-text">場景一：Worker 崩潰後重試（At-least-once 的代價）
  1. Worker A 從 Kafka 消費通知
  2. Worker A 成功呼叫 FCM 發送通知
  3. Worker A 在 commit offset 之前崩潰
  4. Kafka 認為此訊息未被消費，重新分配給 Worker B
  5. Worker B 再次呼叫 FCM → 用戶收到兩次通知

場景二：網路超時導致重試
  1. Worker 呼叫 FCM，等待 5 秒後超時
  2. Worker 認為失敗，進行重試
  3. 實際上 FCM 已收到並送達，只是響應慢了
  4. 重試後 FCM 再次送達 → 用戶收到兩次

場景三：多個觸發源
  1. 用戶 A 的訂單狀態更新
  2. 同時觸發：Order Service 和 Payment Service 都發出通知事件
  3. 兩個事件都被 Worker 消費，發送兩次「訂單確認」通知</code></pre>

  <h3>Idempotency Key 在通知中的應用</h3>
  <pre data-lang="typescript"><code class="language-typescript">// 設計具有業務語義的 Idempotency Key
function generateIdempotencyKey(
  userId: string,
  notificationType: string,
  entityId: string,
  channel: string,
  timeWindowHours = 1
): string {
  // 關鍵：相同業務事件（userId + type + entityId）在時間視窗內只發一次
  const timeWindow = Math.floor(Date.now() / (timeWindowHours * 3_600_000));

  const components = [
    userId,
    notificationType,  // e.g., 'ORDER_CONFIRMED', 'PASSWORD_RESET'
    entityId,          // e.g., 訂單 ID、評論 ID
    channel,           // 'push', 'email', 'sms'（不同渠道獨立去重）
    timeWindow.toString(),
  ];

  return crypto
    .createHash('sha256')
    .update(components.join(':'))
    .digest('hex')
    .substring(0, 32);
}

// 使用範例：
// 訂單確認通知：userId=123, type=ORDER_CONFIRMED, entityId=ORDER-456, channel=push
// → 相同訂單在 1 小時內只發一次 Push 通知

// 去重執行邏輯
async function deduplicateAndSend(notification: Notification): Promise<'sent' | 'duplicate'> {
  const dedupKey = \`notif:dedup:\${notification.id}\`;

  // Redis SET NX EX：原子操作，只有第一次執行時才成功
  const acquired = await redis.set(dedupKey, '1', {
    NX: true,       // Not Exists：key 不存在時才設置
    EX: 86400,      // 24 小時後清理去重記錄
  });

  if (acquired === null) {
    // key 已存在：重複通知，跳過
    logger.info('Duplicate notification skipped', { id: notification.id });
    metrics.increment('notifications.deduplicated', { channel: notification.channel });
    return 'duplicate';
  }

  // 首次執行：發送通知
  await provider.send(notification);
  return 'sent';
}

// 進階：記錄去重詳情，便於排查問題
async function deduplicateWithDetails(notification: Notification): Promise<void> {
  const dedupKey = \`notif:dedup:\${notification.id}\`;

  const details = JSON.stringify({
    workerId: process.env.WORKER_ID,
    processedAt: new Date().toISOString(),
    attempt: 1,
  });

  const existing = await redis.get(dedupKey);
  if (existing) {
    const prev = JSON.parse(existing);
    logger.warn('Duplicate notification detected', {
      notificationId: notification.id,
      previousWorker: prev.workerId,
      previousTime: prev.processedAt,
    });
    return;
  }

  await redis.setex(dedupKey, 86400, details);
  await provider.send(notification);
}</code></pre>

  <h3>時間窗口去重（Sliding Window）</h3>
  <pre data-lang="typescript"><code class="language-typescript">// 更細粒度：滑動時間視窗去重
// 場景：防止用戶在 10 分鐘內收到超過 3 條相同類型的通知

class SlidingWindowDeduplication {
  async shouldSend(
    userId: string,
    notificationType: string,
    windowMinutes: number,
    maxCount: number
  ): Promise<boolean> {
    const windowKey = \`notif:window:\${userId}:\${notificationType}\`;
    const now = Date.now();
    const windowStart = now - windowMinutes * 60 * 1000;

    // 使用 Redis Sorted Set 的時間戳作為 score
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(windowKey, '-inf', windowStart); // 清理過期記錄
    pipeline.zadd(windowKey, now, \`\${now}-\${Math.random()}\`); // 記錄此次
    pipeline.zcount(windowKey, windowStart, '+inf');             // 統計視窗內的次數
    pipeline.expire(windowKey, windowMinutes * 60 + 60);         // TTL 稍長於視窗

    const results = await pipeline.exec();
    const countInWindow = results?.[2]?.[1] as number ?? 0;

    if (countInWindow > maxCount) {
      logger.info(\`Rate limited notification for user \${userId}\`, {
        type: notificationType,
        countInWindow,
        maxCount,
      });
      return false; // 超過限制，不發送
    }
    return true;
  }
}

// 使用：「10 分鐘內同類型通知最多 3 條」
const slidingWindow = new SlidingWindowDeduplication();
const canSend = await slidingWindow.shouldSend(userId, 'LIKE_NOTIFICATION', 10, 3);</code></pre>

  <h3>精確一次通知（Exactly-once）的挑戰</h3>
  <pre data-lang="text"><code class="language-text">為什麼 Exactly-once 很難實現：

理論上需要：
  原子性：「標記為已發送」和「實際發送」必須是原子操作
  但 Redis（記錄去重）和 FCM/APNs（外部 API）無法放在同一個事務中！

可能的場景：
  場景 A：先發送，再記錄去重 key
    問題：發送成功但記錄失敗 → 重試時重複發送
  場景 B：先記錄去重 key，再發送
    問題：記錄成功但發送失敗 → 通知永遠不會發出（被誤認為已發送）

實務上的「最好努力保證」：
  1. 採用 At-least-once 語義（允許極少數重複）
  2. 用 Idempotency Key 在接收方側去重（降低但不消除重複）
  3. 監控重複率：若重複率 > 0.1%，調查根本原因
  4. 對用戶友好：設計通知的「幂等性」——
     「你的訂單已確認」收到兩次 → 用戶體驗輕微影響，可接受
     「你的賬戶被扣款」收到兩次 → 嚴重問題，需要更強的保證

兩段提交（2PC）方案（極少數場景使用）：
  Phase 1: 在資料庫記錄「pending to send」
  Phase 2: 發送成功後更新為「sent」
  重試時：檢查狀態，只有 pending 才發送
  問題：資料庫是額外的查詢，增加延遲</code></pre>

  <callout-box type="info" title="通知折疊的業務價值">
    <p>精確一次（Exactly-once）在通知系統中通常不是必要的。關鍵判斷是：重複通知的業務影響有多嚴重？OTP 驗證碼收到兩次：輕微不便，可接受。訂單確認收到兩次：稍有困惑，可接受。「您的賬戶已被扣款 $100」收到兩次：嚴重！此類通知需要資料庫事務保證（與帳務系統事務綁定）。</p>
  </callout-box>
</section>

<section id="notification-reliability">
  <h2>DLQ 重試機制與可靠性設計</h2>
  <p>通知系統的可靠性要求：即使下游服務（FCM、SendGrid、SMS 供應商）暫時不可用，通知也不應該丟失。可靠性不只是技術問題，還包括監控、告警和運維流程。</p>

  <h3>Dead Letter Queue（死信佇列）完整設計</h3>
  <pre data-lang="text"><code class="language-text">通知生命週期：

[建立通知]
    │
    ▼
[主佇列：notifications.{channel}.{priority}]
    │
    ▼ Worker 消費
[發送嘗試]─────────────────────────────────────────┐
    │ 成功                                          │ 失敗
    ▼                                              ▼
[記錄送達成功]                          [計算 Retry Delay（指數退避）]
                                               │ 未超過最大次數
                                               ▼
                              [延遲佇列：notifications.delayed]
                              （Redis Sorted Set，score = 下次重試時間）
                                               │ 到期後移回主佇列
                                               ▼
                                        [再次嘗試]
                                               │ 超過最大次數
                                               ▼
                              [Dead Letter Queue（DLQ）]
                              notifications.dlq.{channel}
                                               │
                              ┌────────────────┼────────────────┐
                              ▼                ▼                ▼
                         [監控告警]      [人工排查]        [資料分析]
                         PagerDuty       查看失敗原因      失敗模式統計</code></pre>

  <h3>指數退避重試策略</h3>
  <pre data-lang="typescript"><code class="language-typescript">interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFactor: number;  // 隨機抖動：防止大量失敗通知同時重試（雷群效應）
}

const retryConfigs: Record<string, RetryConfig> = {
  CRITICAL: {
    maxAttempts: 10,
    initialDelayMs: 1_000,    // 1 秒
    maxDelayMs: 60_000,       // 最多 1 分鐘間隔
    backoffMultiplier: 2,
    jitterFactor: 0.1,        // ±10% 抖動
    // 重試序列（含抖動）：1s, 2s, 4s, 8s, 16s, 32s, 60s, 60s, 60s, 60s
  },
  HIGH: {
    maxAttempts: 7,
    initialDelayMs: 5_000,    // 5 秒
    maxDelayMs: 300_000,      // 最多 5 分鐘間隔
    backoffMultiplier: 2,
    jitterFactor: 0.2,
  },
  NORMAL: {
    maxAttempts: 5,
    initialDelayMs: 30_000,   // 30 秒
    maxDelayMs: 600_000,      // 最多 10 分鐘間隔
    backoffMultiplier: 2,
    jitterFactor: 0.3,
  },
  LOW: {
    maxAttempts: 3,
    initialDelayMs: 300_000,  // 5 分鐘
    maxDelayMs: 3_600_000,    // 最多 1 小時間隔
    backoffMultiplier: 3,
    jitterFactor: 0.4,
  },
};

function calculateRetryDelay(attempt: number, config: RetryConfig): number {
  // 指數退避
  const exponentialDelay = config.initialDelayMs *
    Math.pow(config.backoffMultiplier, attempt - 1);
  // 上限截斷
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  // Full Jitter：在 [0, cappedDelay * jitterFactor] 範圍內隨機偏移
  // 比 ±jitterFactor 更分散，更好地防止雷群效應
  const jitter = cappedDelay * config.jitterFactor * Math.random();
  return Math.floor(cappedDelay + jitter);
}

async function handleSendFailure(
  notification: Notification,
  attempt: number,
  error: Error
): Promise<void> {
  const config = retryConfigs[notification.priority];
  const isRetryable = isRetryableError(error); // 區分可重試/不可重試錯誤

  // 不可重試的錯誤：直接進 DLQ（不浪費重試次數）
  // e.g., 無效的設備 Token、無效的 Email 地址
  if (!isRetryable || attempt >= config.maxAttempts) {
    await deadLetterQueue.enqueue({
      notification,
      attempts: attempt,
      lastError: error.message,
      errorCode: (error as any).code,
      failedAt: new Date().toISOString(),
    });

    // 觸發告警（CRITICAL 和 HIGH 通知最終失敗）
    if (['CRITICAL', 'HIGH'].includes(notification.priority)) {
      await alerting.trigger('notification_delivery_failed', {
        notificationId: notification.id,
        userId: notification.userId,
        priority: notification.priority,
        channel: notification.channel,
        error: error.message,
        attempts: attempt,
      });
    }

    // 記錄失敗指標
    metrics.increment('notifications.failed.permanent', {
      priority: notification.priority,
      channel: notification.channel,
      error_type: (error as any).code ?? 'UNKNOWN',
    });
    return;
  }

  // 可重試：計算延遲後放入延遲佇列
  const delayMs = calculateRetryDelay(attempt, config);
  const nextAttemptAt = new Date(Date.now() + delayMs);

  await delayedQueue.enqueue(
    { ...notification, attempt: attempt + 1 },
    nextAttemptAt
  );

  logger.warn('Notification send failed, scheduling retry', {
    notificationId: notification.id,
    attempt,
    maxAttempts: config.maxAttempts,
    nextAttemptAt: nextAttemptAt.toISOString(),
    error: error.message,
  });

  metrics.increment('notifications.retried', {
    priority: notification.priority,
    channel: notification.channel,
    attempt: attempt.toString(),
  });
}

// 區分可重試 vs 不可重試的錯誤
function isRetryableError(error: Error): boolean {
  const nonRetryableCodes = [
    'BadDeviceToken',       // APNs：無效 Token
    'UNREGISTERED',         // FCM：App 已卸載
    'InvalidEmailAddress',  // 無效 Email
    'InvalidPhoneNumber',   // 無效電話號碼
    'MessageTooLong',       // 訊息超過長度限制
  ];

  return !nonRetryableCodes.some(code =>
    error.message.includes(code) || (error as any).code === code
  );
}</code></pre>

  <h3>DLQ 監控與告警</h3>
  <pre data-lang="typescript"><code class="language-typescript">// DLQ 監控：定時統計 DLQ 積壓量
async function monitorDlq(): Promise<void> {
  const channels = ['push', 'email', 'sms'];

  for (const channel of channels) {
    const queueLength = await kafka.getTopicSize(\`notifications.dlq.\${channel}\`);

    // 記錄指標到 Prometheus
    metrics.gauge('notifications.dlq.length', queueLength, { channel });

    // 觸發告警閾值
    if (queueLength > 1000 && channel === 'sms') {
      await alerting.trigger('dlq_high_sms', {
        queueLength,
        severity: 'HIGH',
        message: \`SMS DLQ has \${queueLength} unprocessed notifications\`,
      });
    }

    if (queueLength > 10000 && channel === 'push') {
      await alerting.trigger('dlq_critical_push', {
        queueLength,
        severity: 'CRITICAL',
      });
    }
  }
}

// DLQ 重放：問題解決後將 DLQ 訊息重新投遞
async function replayDlq(
  channel: string,
  filter?: { userId?: string; errorCode?: string; since?: Date }
): Promise<void> {
  const dlqMessages = await dlqStorage.query({ channel, ...filter });
  let replayed = 0, failed = 0;

  for (const message of dlqMessages) {
    try {
      // 重置重試次數，重新加入主佇列
      await mainQueue.enqueue({
        ...message.notification,
        attempt: 1, // 重置
        isReplay: true,
      });
      await dlqStorage.markAsReplayed(message.id);
      replayed++;
    } catch (error) {
      logger.error('Failed to replay DLQ message', { id: message.id, error });
      failed++;
    }
  }

  logger.info(\`DLQ replay completed: \${replayed} replayed, \${failed} failed\`);
}</code></pre>

  <h3>用戶偏好設置（Opt-out）與送達率追蹤</h3>
  <pre data-lang="typescript"><code class="language-typescript">// 全域退訂（Global Opt-out）處理
class UnsubscribeManager {
  // Email 退訂（CAN-SPAM / GDPR 要求在 10 個工作日內處理）
  async handleEmailUnsubscribe(token: string): Promise<void> {
    const payload = verifyUnsubscribeToken(token);
    // 記錄退訂（不可刪除，用於證明已處理）
    await db.query(
      \`INSERT INTO email_unsubscribes (user_id, category, unsubscribed_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE unsubscribed_at = NOW()\`,
      [payload.userId, payload.category]
    );
    // 更新快取（即時生效）
    await redis.sadd(\`user:email:unsubscribed:\${payload.userId}\`, payload.category);
  }

  // Push Token 更新（設備換機或 App 重裝後 Token 會改變）
  async updateDeviceToken(userId: string, oldToken: string, newToken: string): Promise<void> {
    await db.query(
      'UPDATE device_tokens SET token = ?, updated_at = NOW() WHERE user_id = ? AND token = ?',
      [newToken, userId, oldToken]
    );
    // 更新 Redis 快取
    await redis.del(\`user:push:tokens:\${userId}\`);
  }
}

// 送達率追蹤
class DeliveryRateTracker {
  async recordDelivery(notification: Notification, status: 'sent' | 'failed' | 'bounced'): Promise<void> {
    const dateHour = new Date().toISOString().substring(0, 13); // "2025-01-15T10"

    await redis.pipeline()
      .incr(\`delivery:\${notification.channel}:\${notification.priority}:\${status}:\${dateHour}\`)
      .expire(\`delivery:\${notification.channel}:\${notification.priority}:\${status}:\${dateHour}\`, 86400 * 7)
      .exec();
  }

  async getDeliveryRate(channel: string, priority: string, hours = 24): Promise<number> {
    let sent = 0, failed = 0;

    for (let i = 0; i < hours; i++) {
      const date = new Date(Date.now() - i * 3_600_000);
      const key = date.toISOString().substring(0, 13);
      const [s, f] = await Promise.all([
        redis.get(\`delivery:\${channel}:\${priority}:sent:\${key}\`),
        redis.get(\`delivery:\${channel}:\${priority}:failed:\${key}\`),
      ]);
      sent += parseInt(s ?? '0');
      failed += parseInt(f ?? '0');
    }

    const total = sent + failed;
    return total > 0 ? sent / total : 1.0;
  }
}

// 送達率低於閾值時自動告警
async function checkDeliveryRates(): Promise<void> {
  const thresholds = { push: 0.95, email: 0.99, sms: 0.98 };

  for (const [channel, threshold] of Object.entries(thresholds)) {
    const rate = await tracker.getDeliveryRate(channel, 'HIGH', 1);
    if (rate < threshold) {
      await alerting.trigger('low_delivery_rate', {
        channel,
        deliveryRate: rate,
        threshold,
        severity: rate < threshold * 0.9 ? 'CRITICAL' : 'WARNING',
      });
    }
  }
}</code></pre>

  <callout-box type="tip" title="通知系統的業界 SLA">
    <p>業界典型通知 SLA（Service Level Agreement）：CRITICAL（如 OTP）&lt; 5 秒到達率 99.9%，最多允許 1.5 秒/月停機；HIGH（訂單確認）&lt; 1 分鐘到達率 99.5%；NORMAL &lt; 5 分鐘到達率 99%；LOW &lt; 24 小時到達率 95%（行動裝置省電策略、夜間限制等因素可能導致延遲）。注意：Push 通知的到達率受 APNs/FCM 服務穩定性影響，即使系統本身完美，到達率也不可能 100%。</p>
  </callout-box>
</section>
`,
} satisfies ChapterContent;
