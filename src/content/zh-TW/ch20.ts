import type { ChapterContent } from '../../types.js';

export default {
  title: '設計分散式任務排程系統（Job Scheduler）',
  content: `
<section id="cron-design">
  <h2>Cron-like 排程設計</h2>
  <p>任務排程系統（Job Scheduler）是現代分散式系統的基礎設施，用於執行定時任務（如每日報表、資料備份、Email 行銷活動）和延遲任務（如訂單超時取消、通知延遲發送）。</p>

  <arch-diagram src="./diagrams/ch20-job-scheduler.json" caption="分散式任務排程系統架構：Scheduler Leader、任務佇列、Worker Pool、狀態機，以及 DAG 工作流引擎的完整設計。"></arch-diagram>

  <h3>Cron 表達式解析</h3>
  <pre data-lang="text"><code class="language-text">Cron 表達式：5 個欄位
  ┌─── 分鐘 (0-59)
  │ ┌─── 小時 (0-23)
  │ │ ┌─── 日期 (1-31)
  │ │ │ ┌─── 月份 (1-12)
  │ │ │ │ ┌─── 星期 (0-7，0 和 7 都代表週日)
  │ │ │ │ │
  * * * * *

常見範例：
  "0 9 * * 1-5"    → 週一到週五 上午 9:00
  "*/15 * * * *"   → 每 15 分鐘
  "0 0 1 * *"      → 每月 1 日午夜
  "0 2 * * 0"      → 每週日 凌晨 2:00（資料庫備份）
  "30 23 L * *"    → 每月最後一天 23:30（Quartz Cron 擴展）
  "0 9-17 * * 1-5" → 週一到週五的 9:00-17:00，每整點執行
  "@daily"         → 等同 "0 0 * * *"（日常簡寫）</code></pre>

  <h3>At-most-once vs At-least-once 排程語義</h3>
  <p>在分散式系統中，任務執行的語義需要明確定義。網路故障或節點崩潰時，系統無法同時保證「不重複執行」和「不遺漏執行」。</p>
  <pre data-lang="text"><code class="language-text">At-most-once（最多執行一次）：
  → 語義：任務可能被跳過，但絕不重複執行
  → 適用：發送一次性通知、觸發不可逆操作（付款）
  → 實作：任務 dispatch 後立即標記為 QUEUED，
          即使 Worker 崩潰也不重試
  → 代價：偶發性任務遺漏

At-least-once（至少執行一次）：
  → 語義：任務一定會執行，但可能重複執行
  → 適用：統計彙總（重複執行只是多算幾次）、冪等操作
  → 實作：任務 dispatch 後，若 Worker 超時未完成，
          系統自動重新排隊重試
  → 代價：需要 Worker 邏輯是冪等的

Exactly-once（恰好執行一次）：
  → 語義：任務精確執行一次
  → 現實：在分散式系統中極難保證（CAP 定理的限制）
  → 近似方案：At-least-once + 冪等性設計（業界常用方案）
  → 冪等性實作：使用唯一 idempotency_key 在 DB 層去重

任務超時處理：
  1. 設定 max_execution_time（如 5 分鐘）
  2. Worker 啟動時在 DB 記錄 started_at
  3. Watchdog 進程每分鐘掃描：started_at + max_execution_time &lt; NOW()
  4. 超時任務自動標記為 TIMEOUT，觸發重試或 DLQ</code></pre>

  <h3>Quartz Scheduler 架構</h3>
  <p>Quartz Scheduler 是 Java 生態中最廣泛使用的任務排程框架，其設計思想為業界提供了寶貴的參考。</p>
  <pre data-lang="text"><code class="language-text">Quartz Scheduler 的核心組件：

1. Scheduler（調度器）：
   - 協調所有組件的主入口
   - 管理 Job 的生命週期

2. JobDetail（任務定義）：
   - 包含 Job 的類別、名稱、群組
   - 可攜帶 JobDataMap（任務參數）

3. Trigger（觸發器）：
   - SimpleTrigger：固定間隔重複執行
   - CronTrigger：基於 Cron 表達式
   - CalendarIntervalTrigger：基於日曆（如每月第一個工作日）

4. JobStore（持久化層）：
   - RAMJobStore：記憶體中，快速但不持久
   - JDBCJobStore：資料庫持久化（MySQL/PostgreSQL）
   - 分散式部署時必須使用 JDBCJobStore

5. ThreadPool（執行緒池）：
   - 決定同時可執行的任務數量
   - 預設 10 個執行緒

Quartz 的分散式 HA 模式：
  - 多個 Quartz 節點共享同一個 DB（JDBCJobStore）
  - 使用 DB 行鎖確保同一任務只有一個節點執行
  - 節點故障時，其他節點透過 DB 鎖競爭接管任務</code></pre>

  <h3>下次執行時間計算（Next Run Algorithm）</h3>
  <pre data-lang="typescript"><code class="language-typescript">// 計算 Cron 表達式的下次執行時間
function getNextRunTime(cronExpr: string, after: Date = new Date()): Date {
  const [minute, hour, dayOfMonth, month, dayOfWeek] = cronExpr.split(' ');

  let candidate = new Date(after);
  candidate.setSeconds(0, 0);  // 取整到分鐘
  candidate.setMinutes(candidate.getMinutes() + 1);  // 至少在 after 之後

  // 最多嘗試 4 年（處理邊緣情況）
  const maxAttempts = 4 * 365 * 24 * 60;
  let attempts = 0;

  while (attempts++ &lt; maxAttempts) {
    if (!matchesField(month, candidate.getMonth() + 1, 1, 12)) {
      candidate.setMonth(candidate.getMonth() + 1);
      candidate.setDate(1);
      candidate.setHours(0, 0, 0, 0);
      continue;
    }
    if (!matchesField(dayOfMonth, candidate.getDate(), 1, 31)) {
      candidate.setDate(candidate.getDate() + 1);
      candidate.setHours(0, 0, 0, 0);
      continue;
    }
    if (!matchesField(dayOfWeek, candidate.getDay(), 0, 7)) {
      candidate.setDate(candidate.getDate() + 1);
      candidate.setHours(0, 0, 0, 0);
      continue;
    }
    if (!matchesField(hour, candidate.getHours(), 0, 23)) {
      candidate.setHours(candidate.getHours() + 1, 0, 0, 0);
      continue;
    }
    if (!matchesField(minute, candidate.getMinutes(), 0, 59)) {
      candidate.setMinutes(candidate.getMinutes() + 1, 0, 0);
      continue;
    }

    return candidate;
  }

  throw new Error('No valid next run time found');
}

function matchesField(
  field: string,
  value: number,
  min: number,
  max: number
): boolean {
  if (field === '*') return true;

  // 處理步長：*/15 → [0, 15, 30, 45]
  if (field.startsWith('*/')) {
    const step = parseInt(field.slice(2));
    return (value - min) % step === 0;
  }

  // 處理範圍：1-5 → [1, 2, 3, 4, 5]
  if (field.includes('-')) {
    const [start, end] = field.split('-').map(Number);
    return value &gt;= start && value &lt;= end;
  }

  // 處理列表：1,3,5 → [1, 3, 5]
  if (field.includes(',')) {
    return field.split(',').map(Number).includes(value);
  }

  return parseInt(field) === value;
}</code></pre>

  <h3>排程任務的資料模型</h3>
  <pre data-lang="sql"><code class="language-sql">CREATE TABLE scheduled_jobs (
  job_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(200) NOT NULL,
  cron_expression   VARCHAR(100),        -- NULL 代表一次性任務
  job_type          VARCHAR(50) NOT NULL, -- 'SEND_EMAIL', 'GENERATE_REPORT', etc.
  payload           JSONB,               -- 任務參數
  next_run_at       TIMESTAMP NOT NULL,  -- 下次執行時間（預先計算好）
  last_run_at       TIMESTAMP,
  last_status       VARCHAR(20),         -- 'SUCCESS', 'FAILED', 'RUNNING'
  retry_count       INT DEFAULT 0,
  max_retries       INT DEFAULT 3,
  max_execution_sec INT DEFAULT 300,     -- 最大執行時間（秒），超過視為 TIMEOUT
  timezone          VARCHAR(50) DEFAULT 'UTC',
  enabled           BOOLEAN DEFAULT TRUE,
  idempotency_key   VARCHAR(200),        -- 防重複執行的唯一鍵
  created_at        TIMESTAMP DEFAULT NOW()
);

-- 索引：快速找到需要執行的任務
CREATE INDEX idx_next_run ON scheduled_jobs(next_run_at, enabled)
  WHERE enabled = TRUE AND last_status != 'RUNNING';</code></pre>
</section>

<section id="leader-election">
  <h2>分散式 Leader Election</h2>
  <p>任務排程系統最大的挑戰之一是：如何確保在有多個排程節點的情況下，每個任務只被執行一次？這需要 Leader Election（領導者選舉）機制。</p>

  <h3>為什麼需要 Leader Election？</h3>
  <pre data-lang="text"><code class="language-text">問題場景：
  Scheduler Node 1 ─┐
  Scheduler Node 2 ─┼─→ 同時掃描資料庫，都發現任務 A 需要執行
  Scheduler Node 3 ─┘    → 任務 A 被執行了 3 次！

不能只有一個節點的原因：
  → 單點故障（SPOF）：節點掛掉，所有排程停止
  → 需要多個節點組成 HA 叢集</code></pre>

  <h3>Bully Algorithm vs Ring Election</h3>
  <pre data-lang="text"><code class="language-text">Bully Algorithm（霸道演算法）：
  原理：
    1. 任何節點偵測到 Leader 失聯，發起選舉
    2. 向所有 ID 更高的節點發送 Election 訊息
    3. 收到 Election 訊息的較高 ID 節點回應 OK，
       表示「我來接手」，繼續向更高 ID 的節點詢問
    4. 如果沒有更高 ID 的節點回應，自己成為 Leader
    5. 新 Leader 廣播 Coordinator 訊息通知所有節點

  優點：簡單、選出最大 ID 的節點（最強壯的節點）
  缺點：網路訊息量大（O(N²)），在大型叢集中效率低

Ring Election（環形演算法）：
  原理：
    1. 所有節點排列在邏輯環上（按 ID 順序）
    2. 發起選舉的節點向後繼節點發送包含自己 ID 的 Election 訊息
    3. 每個節點比較訊息中的 ID 和自己的 ID，保留較大的繼續傳遞
    4. 訊息繞環一圈後，最大 ID 即為新 Leader

  優點：訊息量少（O(N)）
  缺點：環需要預先定義，節點加入/離開需要重建環</code></pre>

  <h3>ZooKeeper Ephemeral Node 選主</h3>
  <pre data-lang="text"><code class="language-text">ZooKeeper 使用 Ephemeral Sequential 節點實現選主：

1. 所有節點在 /election 目錄下建立臨時有序節點：
   Node 1 建立：/election/lock-0000000001
   Node 2 建立：/election/lock-0000000002
   Node 3 建立：/election/lock-0000000003

2. 每個節點查詢 /election 的子節點，
   序號最小的（lock-0000000001）成為 Leader

3. 非 Leader 節點監聽（Watch）比自己小一號的節點
   （如果監聽所有節點，Leader 掛掉時會有「羊群效應（Herd Effect）」）

4. 如果 Leader（Node 1）掛掉：
   /election/lock-0000000001 自動消失（Ephemeral 節點特性）
   Node 2 收到 Watch 通知，發現自己序號最小 → 成為新 Leader
   選主時間：通常在 1-3 秒內完成

優點：強一致性保證（ZAB 協議），業界廣泛使用
缺點：需要維護 ZooKeeper 叢集（3 或 5 個節點）</code></pre>

  <h3>Raft 選主簡介</h3>
  <pre data-lang="text"><code class="language-text">Raft 協議的 Leader Election：

核心概念：
  - Term（任期）：單調遞增的整數，每次選舉開始 Term 加 1
  - 節點狀態：Follower（跟隨者）、Candidate（候選人）、Leader（領導者）

選舉過程：
  1. 初始狀態：所有節點都是 Follower，等待 Leader 的心跳
  2. 超時：如果 Follower 在選舉超時（150-300ms 隨機）內沒收到心跳，
           轉為 Candidate，開始新選舉
  3. 投票：Candidate 向所有節點發送 RequestVote，
           包含自己的 Term 和日誌索引
  4. 當選：收到超過半數投票（Majority），成為 Leader
  5. 廣播：新 Leader 立即發送心跳（AppendEntries），
           阻止其他節點再次選舉

優點：
  - 比 Paxos 更易理解和實現
  - 被 etcd（Kubernetes 的基礎）、CockroachDB 採用
  - 強一致性保證（線性化讀寫）

與 ZooKeeper 的比較：
  ZooKeeper 使用 ZAB（ZooKeeper Atomic Broadcast）協議，
  在語義上與 Raft 類似，都保證強一致性</code></pre>

  <h3>Leader Lease 機制</h3>
  <pre data-lang="typescript"><code class="language-typescript">class DistributedLeaderElection {
  private isLeader = false;
  private heartbeatInterval: ReturnType&lt;typeof setInterval&gt; | null = null;
  private readonly leaderKey = 'scheduler:leader';
  private readonly leaseDuration = 30;  // 秒：Lease 的有效期
  private readonly renewInterval = 10;  // 秒：每 10 秒更新一次（保留 2/3 餘裕）

  // Leader Lease：Leader 持有一個帶有 TTL 的鎖
  // 在 TTL 到期前持續更新（Renew），若更新失敗則自動釋放 Leadership
  async tryBecomeLeader(): Promise&lt;boolean&gt; {
    // 嘗試設置 Leader Key（NX = 只在不存在時設置）
    const result = await etcd.lease(this.leaseDuration)
      .put(this.leaderKey)
      .value(this.nodeId)
      .ifNotExists()
      .commit();

    if (result.succeeded) {
      this.isLeader = true;
      this.startLeaseRenewal();
      console.log(\`Node \${this.nodeId} became leader (lease: \${this.leaseDuration}s)\`);
      return true;
    }

    return false;
  }

  private startLeaseRenewal(): void {
    this.heartbeatInterval = setInterval(async () => {
      try {
        // Lease Renewal：更新 TTL（證明自己還活著）
        await this.renewLease();
      } catch (error) {
        // 更新失敗（網路問題、etcd 不可用），主動放棄 Leadership
        // 這避免了「腦裂（Split-Brain）」：兩個節點都認為自己是 Leader
        this.isLeader = false;
        clearInterval(this.heartbeatInterval!);
        console.error('Failed to renew lease, stepping down');

        // 延遲嘗試重新競選（讓現有 Lease 先過期）
        setTimeout(() => this.tryBecomeLeader(), this.leaseDuration * 1000);
      }
    }, this.renewInterval * 1000);
  }

  async stepDown(): Promise&lt;void&gt; {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    await etcd.delete(this.leaderKey).exec();
    this.isLeader = false;
  }
}

// Scheduler 主迴圈
class SchedulerNode {
  async run(): Promise&lt;void&gt; {
    const election = new DistributedLeaderElection(this.nodeId);

    while (true) {
      if (!election.isLeader) {
        const elected = await election.tryBecomeLeader();
        if (!elected) {
          await sleep(5000);
          continue;
        }
      }

      // 作為 Leader，執行排程掃描
      await this.schedulerTick();
      await sleep(1000);  // 每秒掃描一次
    }
  }

  private async schedulerTick(): Promise&lt;void&gt; {
    const now = new Date();
    const dueJobs = await db.query(\`
      SELECT * FROM scheduled_jobs
      WHERE next_run_at &lt;= ? AND enabled = TRUE AND last_status != 'RUNNING'
      ORDER BY next_run_at ASC
      LIMIT 100
    \`, [now]);

    for (const job of dueJobs) {
      await this.dispatchJob(job);
    }
  }
}</code></pre>

  <callout-box type="warning" title="腦裂（Split-Brain）問題">
    <p>在網路分區時，可能出現兩個節點都認為自己是 Leader 的情況（腦裂）。例如：Node A 作為 Leader 正在更新 Lease，但因網路分區導致 etcd 回應超時。此時 Lease 可能已過期，Node B 搶到了 Leadership。若 Node A 繼續執行任務，就會出現雙 Leader。</p>
    <p>防止腦裂的關鍵：Leader 在執行任何操作前，必須先確認自己的 Lease 仍然有效（稱為 Fencing）。在操作資料庫時，可以帶上 Lease Token（單調遞增），資料庫拒絕帶有舊 Token 的請求。</p>
  </callout-box>
</section>

<section id="job-state-machine">
  <h2>任務狀態機設計</h2>
  <p>每個任務從建立到完成都會經歷一系列狀態轉換。清晰的狀態機設計確保系統能夠正確處理失敗、重試和超時情況。</p>

  <h3>完整狀態機定義</h3>
  <pre data-lang="text"><code class="language-text">任務完整狀態機：

  ┌─────────────────────────────────────────────────┐
  │                                                 │
  PENDING ──► QUEUED ──► RUNNING ──► SUCCESS        │
                │            │                      │
                │            ├──► FAILED            │
                │            │       │              │
                │            │       ├── retry &lt;= max_retries
                │            │       │   ↓          │
                │            │       └──► RETRYING ─┘
                │            │                ↓（等待退避時間）
                │            │           重新入隊（QUEUED）
                │            │
                │            └──► TIMEOUT ──► 同 FAILED 的重試邏輯
                │
                └──► CANCELLED（隨時可取消，除非已 RUNNING）

  最終狀態（Terminal States）：
    SUCCESS   - 任務成功完成，不可再轉換
    DEAD      - 超過最大重試次數，永久失敗（進入 DLQ）
    CANCELLED - 人工或系統取消

  說明：
    PENDING：已建立，等待 Leader 調度（next_run_at 未到）
    QUEUED：next_run_at 已到，已加入執行佇列
    RUNNING：Worker 正在執行中（持有分散式鎖）
    SUCCESS：執行成功，更新 next_run_at（如果是週期性任務）
    FAILED：執行失敗（業務邏輯拋出例外）
    RETRYING：等待指數退避後重新 QUEUED
    TIMEOUT：執行時間超過 max_execution_sec
    DEAD：超過 max_retries，放棄執行，送入 Dead Letter Queue
    CANCELLED：人工取消或程序性取消</code></pre>

  <h3>狀態持久化設計</h3>
  <pre data-lang="typescript"><code class="language-typescript">enum JobStatus {
  PENDING   = 'PENDING',
  QUEUED    = 'QUEUED',
  RUNNING   = 'RUNNING',
  SUCCESS   = 'SUCCESS',
  FAILED    = 'FAILED',
  RETRYING  = 'RETRYING',
  DEAD      = 'DEAD',
  CANCELLED = 'CANCELLED',
  TIMEOUT   = 'TIMEOUT',
}

// 合法的狀態轉換（防止無效轉換污染資料）
const validTransitions: Record&lt;JobStatus, JobStatus[]&gt; = {
  [JobStatus.PENDING]:   [JobStatus.QUEUED, JobStatus.CANCELLED],
  [JobStatus.QUEUED]:    [JobStatus.RUNNING, JobStatus.CANCELLED],
  [JobStatus.RUNNING]:   [JobStatus.SUCCESS, JobStatus.FAILED, JobStatus.TIMEOUT],
  [JobStatus.FAILED]:    [JobStatus.RETRYING, JobStatus.DEAD, JobStatus.CANCELLED],
  [JobStatus.RETRYING]:  [JobStatus.QUEUED, JobStatus.CANCELLED],
  [JobStatus.TIMEOUT]:   [JobStatus.RETRYING, JobStatus.DEAD],
  [JobStatus.SUCCESS]:   [],  // 終態，不可再轉換
  [JobStatus.DEAD]:      [],
  [JobStatus.CANCELLED]: [],
};

// 原子性狀態轉換（樂觀鎖，防止並行競爭）
async function transitionJob(
  jobId: string,
  fromStatus: JobStatus,
  targetStatus: JobStatus,
  metadata?: Record&lt;string, unknown&gt;
): Promise&lt;void&gt; {
  if (!validTransitions[fromStatus].includes(targetStatus)) {
    throw new InvalidStateTransitionError(
      \`Cannot transition from \${fromStatus} to \${targetStatus}\`
    );
  }

  const result = await db.query(\`
    UPDATE jobs
    SET
      status = ?,
      \${targetStatus === JobStatus.RUNNING ? 'started_at = NOW(),' : ''}
      \${[JobStatus.SUCCESS, JobStatus.DEAD].includes(targetStatus) ? 'completed_at = NOW(),' : ''}
      updated_at = NOW(),
      metadata = JSON_MERGE_PATCH(COALESCE(metadata, '{}'), ?)
    WHERE job_id = ?
      AND status = ?  -- 使用樂觀鎖：只有當前狀態符合時才更新
    \`,
    [targetStatus, JSON.stringify(metadata ?? {}), jobId, fromStatus]
  );

  if (result.affectedRows === 0) {
    throw new StaleStateError(
      \`Job \${jobId} state has changed, expected \${fromStatus}\`
    );
  }
}

// Worker 執行任務
async function executeJob(job: Job): Promise&lt;void&gt; {
  // 獲取分散式鎖（防止重複執行）
  const lockKey = \`job:lock:\${job.jobId}\`;
  const acquired = await redis.set(lockKey, this.workerId, {
    NX: true,            // 只在不存在時設置（原子操作）
    EX: job.maxExecutionTimeSec,  // 自動過期（Worker 崩潰時鎖自動釋放）
  });

  if (!acquired) {
    console.log(\`Job \${job.jobId} already being executed by another worker\`);
    return;
  }

  await transitionJob(job.jobId, JobStatus.QUEUED, JobStatus.RUNNING);

  try {
    const handler = this.getHandler(job.jobType);
    await handler(job.payload);
    await transitionJob(job.jobId, JobStatus.RUNNING, JobStatus.SUCCESS);

    // 週期性任務：計算下次執行時間
    if (job.cronExpression) {
      const nextRunAt = getNextRunTime(job.cronExpression);
      await db.query(
        'UPDATE jobs SET next_run_at = ?, retry_count = 0 WHERE job_id = ?',
        [nextRunAt, job.jobId]
      );
    }
  } catch (error) {
    await handleJobFailure(job, error as Error);
  } finally {
    await redis.del(lockKey);
  }
}

async function handleJobFailure(job: Job, error: Error): Promise&lt;void&gt; {
  const newRetryCount = job.retryCount + 1;

  if (newRetryCount &lt;= job.maxRetries) {
    // 指數退避：1s, 2s, 4s, 8s, 16s... 最多 5 分鐘
    const delayMs = Math.min(
      1000 * Math.pow(2, job.retryCount),
      300_000
    );
    const nextRetryAt = new Date(Date.now() + delayMs);

    await db.query(\`
      UPDATE jobs
      SET status = ?, retry_count = ?, next_run_at = ?, last_error = ?
      WHERE job_id = ?
    \`, [JobStatus.RETRYING, newRetryCount, nextRetryAt, error.message, job.jobId]);
  } else {
    // 超過最大重試次數
    await transitionJob(job.jobId, JobStatus.RUNNING, JobStatus.DEAD, {
      finalError: error.message,
      totalRetries: newRetryCount,
    });
    await deadLetterQueue.enqueue(job);
    await alerting.notify('job_permanently_failed', job);
  }
}</code></pre>

  <h3>任務取消機制</h3>
  <pre data-lang="typescript"><code class="language-typescript">// 取消正在等待的任務（PENDING 或 QUEUED 狀態）
async function cancelJob(jobId: string, reason: string): Promise&lt;void&gt; {
  const job = await db.getJob(jobId);

  if (job.status === JobStatus.RUNNING) {
    // 正在執行中：發送取消信號給 Worker
    await redis.publish(\`job:cancel:\${jobId}\`, reason);
    // Worker 需要監聽此 Channel 並在適當時候停止
    // 注意：無法強制立即停止，Worker 需要配合
    throw new Error('Cannot immediately cancel a running job. Cancel signal sent.');
  }

  await transitionJob(jobId, job.status, JobStatus.CANCELLED, { reason });
}

// Worker 中的取消檢測（協作式取消）
async function executeCancellableJob(job: Job): Promise&lt;void&gt; {
  let cancelled = false;

  // 訂閱取消信號
  const cancelSub = redis.subscribe(\`job:cancel:\${job.jobId}\`, () => {
    cancelled = true;
  });

  try {
    // 在長時間任務的關鍵點檢查取消標記
    for (const item of largeDataset) {
      if (cancelled) {
        await transitionJob(job.jobId, JobStatus.RUNNING, JobStatus.CANCELLED);
        return;
      }
      await processItem(item);
    }
    await transitionJob(job.jobId, JobStatus.RUNNING, JobStatus.SUCCESS);
  } finally {
    cancelSub.unsubscribe();
  }
}</code></pre>

  <callout-box type="warning" title="超時檢測">
    <p>RUNNING 狀態的任務如果長時間不返回（Worker 崩潰），需要一個外部 Watchdog 進行超時檢測。通常由 Leader 節點每分鐘掃描 RUNNING 但超過 max_execution_sec 的任務，將其轉換為 TIMEOUT 狀態並觸發重試。Redis 鎖的 TTL 也起到兜底作用：若 Worker 崩潰，鎖自動在 max_execution_sec 後過期，任務可被其他 Worker 重新拾取。</p>
  </callout-box>
</section>

<section id="dag-execution">
  <h2>任務依賴圖（DAG）設計</h2>
  <p>複雜的工作流通常包含多個有依賴關係的任務。例如「每日資料 ETL 流程」需要先完成資料提取，再進行轉換，最後才能載入。這種依賴關係用有向無環圖（DAG, Directed Acyclic Graph）表示。</p>

  <h3>DAG 的資料模型</h3>
  <pre data-lang="sql"><code class="language-sql">-- 工作流定義（DAG 結構）
CREATE TABLE workflows (
  workflow_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(200) NOT NULL,
  description  TEXT,
  cron_expr    VARCHAR(100),   -- 週期性觸發
  enabled      BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMP DEFAULT NOW()
);

-- 工作流中的任務節點
CREATE TABLE workflow_tasks (
  task_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id  UUID REFERENCES workflows(workflow_id),
  name         VARCHAR(200) NOT NULL,
  job_type     VARCHAR(50) NOT NULL,
  payload      JSONB,
  retry_count  INT DEFAULT 3,
  timeout_sec  INT DEFAULT 3600
);

-- 任務依賴關係（有向邊）
CREATE TABLE task_dependencies (
  task_id      UUID REFERENCES workflow_tasks(task_id),  -- 下游任務
  depends_on   UUID REFERENCES workflow_tasks(task_id),  -- 上游任務（必須先完成）
  PRIMARY KEY (task_id, depends_on)
);

-- 工作流執行實例（每次觸發建立一個 Run）
CREATE TABLE workflow_runs (
  run_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id  UUID REFERENCES workflows(workflow_id),
  status       VARCHAR(20),  -- RUNNING, SUCCESS, FAILED, CANCELLED
  triggered_by VARCHAR(50),  -- 'CRON', 'MANUAL', 'API'
  started_at   TIMESTAMP,
  completed_at TIMESTAMP
);

-- 每個任務在此次執行中的狀態
CREATE TABLE task_runs (
  run_id      UUID REFERENCES workflow_runs(run_id),
  task_id     UUID REFERENCES workflow_tasks(task_id),
  status      VARCHAR(20),  -- PENDING, QUEUED, RUNNING, SUCCESS, FAILED
  started_at  TIMESTAMP,
  completed_at TIMESTAMP,
  error_msg   TEXT,
  PRIMARY KEY (run_id, task_id)
);</code></pre>

  <h3>DAG 的拓撲排序執行</h3>
  <pre data-lang="typescript"><code class="language-typescript">// Kahn's Algorithm 拓撲排序（BFS 方式）
function topologicalSort(tasks: Task[], dependencies: Dependency[]): Task[][] {
  const inDegree = new Map&lt;string, number&gt;();
  const adjacency = new Map&lt;string, string[]&gt;();

  tasks.forEach(task => {
    inDegree.set(task.id, 0);
    adjacency.set(task.id, []);
  });

  dependencies.forEach(dep => {
    adjacency.get(dep.dependsOn)!.push(dep.taskId);
    inDegree.set(dep.taskId, (inDegree.get(dep.taskId) ?? 0) + 1);
  });

  // 按層次分組（同一層的任務可以並行執行）
  const levels: Task[][] = [];
  let currentLevel = tasks.filter(t => inDegree.get(t.id) === 0);

  while (currentLevel.length > 0) {
    levels.push(currentLevel);
    const nextLevel: Task[] = [];

    for (const task of currentLevel) {
      for (const nextTaskId of adjacency.get(task.id)!) {
        const newDegree = inDegree.get(nextTaskId)! - 1;
        inDegree.set(nextTaskId, newDegree);
        if (newDegree === 0) {
          nextLevel.push(tasks.find(t => t.id === nextTaskId)!);
        }
      }
    }

    currentLevel = nextLevel;
  }

  // 檢查是否有循環依賴
  const totalProcessed = levels.reduce((sum, level) => sum + level.length, 0);
  if (totalProcessed !== tasks.length) {
    throw new CyclicDependencyError('DAG contains a cycle');
  }

  return levels;  // 每個 level 內的任務可以並行執行
}

// DAG 執行引擎
class DagExecutionEngine {
  async executeWorkflow(workflowId: string): Promise&lt;string&gt; {
    const tasks = await db.getWorkflowTasks(workflowId);
    const deps = await db.getTaskDependencies(workflowId);

    // 建立執行實例
    const runId = await db.createWorkflowRun(workflowId);
    await db.initTaskRuns(runId, tasks.map(t => t.id));

    // 找到可以立即執行的任務（入度為 0，無依賴）
    const readyTasks = tasks.filter(t =>
      !deps.some(d => d.taskId === t.id)
    );

    // 並行啟動初始任務
    await Promise.all(readyTasks.map(task =>
      this.dispatchTask(runId, task)
    ));

    return runId;
  }

  // 任務完成後，觸發下游任務
  async onTaskCompleted(runId: string, completedTaskId: string): Promise&lt;void&gt; {
    const allDeps = await db.getDependenciesForRun(runId);
    const taskRuns = await db.getTaskRunStatuses(runId);

    // 找到以 completedTaskId 為上游的下游任務
    const downstreamTaskIds = allDeps
      .filter(d => d.dependsOn === completedTaskId)
      .map(d => d.taskId);

    for (const taskId of downstreamTaskIds) {
      // 檢查此任務的所有上游是否都已成功完成
      const upstreamDeps = allDeps.filter(d => d.taskId === taskId);
      const allUpstreamDone = upstreamDeps.every(dep => {
        const depRun = taskRuns.find(tr => tr.taskId === dep.dependsOn);
        return depRun?.status === JobStatus.SUCCESS;
      });

      if (allUpstreamDone) {
        const task = await db.getTask(taskId);
        await this.dispatchTask(runId, task);
      }
    }

    // 檢查工作流是否全部完成
    const allTaskRuns = await db.getTaskRunStatuses(runId);
    const allDone = allTaskRuns.every(tr =>
      [JobStatus.SUCCESS, JobStatus.FAILED, JobStatus.DEAD].includes(tr.status)
    );
    const anyFailed = allTaskRuns.some(tr =>
      [JobStatus.FAILED, JobStatus.DEAD].includes(tr.status)
    );

    if (allDone) {
      await db.updateWorkflowRunStatus(runId, anyFailed ? 'FAILED' : 'SUCCESS');
    }
  }
}</code></pre>

  <h3>失敗任務的 Partial Retry</h3>
  <p>DAG 中某個任務失敗時，不需要重新執行整個工作流，只需從失敗的節點開始重試（Partial Retry）。</p>
  <pre data-lang="typescript"><code class="language-typescript">// Partial Retry：只重新執行失敗的任務及其下游
async function retryFromFailedTask(
  runId: string,
  failedTaskId: string
): Promise&lt;void&gt; {
  const allDeps = await db.getAllDependencies(runId);

  // 找出需要重新執行的任務：失敗的任務 + 所有下游任務
  const tasksToRetry = new Set&lt;string&gt;([failedTaskId]);

  // BFS 找出所有下游任務
  const queue = [failedTaskId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const downstream = allDeps.filter(d => d.dependsOn === current);
    for (const dep of downstream) {
      if (!tasksToRetry.has(dep.taskId)) {
        tasksToRetry.add(dep.taskId);
        queue.push(dep.taskId);
      }
    }
  }

  // 重置這些任務的狀態（成功的其他任務不重跑）
  await db.resetTaskRuns(runId, [...tasksToRetry]);

  // 只重新啟動失敗的任務（其上游已成功，可以直接執行）
  const failedTask = await db.getTask(failedTaskId);
  await this.dispatchTask(runId, failedTask);
}</code></pre>

  <h3>Apache Airflow 架構簡介</h3>
  <pre data-lang="text"><code class="language-text">Apache Airflow 是最流行的 DAG 排程系統，廣泛用於數據工程（ETL 管道）。

核心組件：
  1. Webserver：提供 UI 介面（查看 DAG、觸發任務、查看日誌）
  2. Scheduler：掃描 DAG 檔案，決定任務的執行順序和時間
  3. Worker：實際執行任務（可以是 Celery Worker 或 K8s Pod）
  4. Metadata Database（PostgreSQL/MySQL）：
     存儲 DAG 定義、任務狀態、執行歷史
  5. Message Broker（Redis/RabbitMQ）：
     Scheduler 和 Worker 之間的任務佇列

Airflow DAG 定義（Python）：
  from airflow import DAG
  from airflow.operators.python import PythonOperator
  from datetime import datetime, timedelta

  with DAG(
      'daily_etl',
      schedule_interval='0 2 * * *',  # 每天凌晨 2:00
      start_date=datetime(2025, 1, 1),
      catchup=False,  # 不補跑歷史任務
  ) as dag:
      extract = PythonOperator(task_id='extract', python_callable=extract_data)
      transform = PythonOperator(task_id='transform', python_callable=transform_data)
      load = PythonOperator(task_id='load', python_callable=load_data)

      extract >> transform >> load  # 定義依賴關係（>> 運算子）

與自建排程系統的比較：
  Airflow 優點：豐富的 UI、內建 retry、完整的監控告警
  Airflow 缺點：架構複雜、Python 限制（定義必須用 Python）
  自建優點：完全控制、可與業務系統深度整合
  自建缺點：需要大量工程投入</code></pre>

  <callout-box type="info" title="DAG 執行引擎的業界實踐">
    <p>Apache Airflow 是最流行的 DAG 任務排程系統，廣泛用於資料工程（ETL 管道）。Temporal.io 則是更現代的選擇，提供持久化工作流和程式碼級別的狀態管理，適合微服務間的長時間業務工作流。AWS Step Functions 是雲原生方案，適合已使用 AWS 的團隊。在面試中，提到這些工具能展示對業界實踐的了解。</p>
  </callout-box>
</section>
`,
} satisfies ChapterContent;
