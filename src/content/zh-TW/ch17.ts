import type { ChapterContent } from '../../types.js';

export default {
  title: '設計社群媒體動態牆（News Feed）',
  content: `
<section id="fanout-approaches">
  <h2>Fan-out on Write vs Fan-out on Read</h2>
  <p>動態牆（News Feed）系統的核心問題是：當用戶 A 發布一篇貼文，如何讓 A 的所有追蹤者（followers）在自己的動態牆上看到這篇貼文？這個「擴散」過程稱為 Fan-out。這是系統設計中最經典的「寫入放大 vs 讀取放大」取捨問題。</p>

  <h3>方案一：Fan-out on Write（推送模式，預計算 Timeline）</h3>
  <p>用戶發布貼文時，<strong>立即</strong>將貼文推送到所有追蹤者的 Feed Cache（預計算的時間軸）。</p>
  <pre data-lang="text"><code class="language-text">用戶 A（擁有 1000 個追蹤者）發布貼文：
1. 貼文存入 Posts 資料庫
   INSERT INTO posts (id, user_id, content, created_at) VALUES (...)
2. 異步任務：查詢 A 的所有 1000 個追蹤者（分頁查詢，避免一次性讀取大量數據）
3. 對每個追蹤者，將 post_id 寫入其 Feed Cache（Redis Sorted Set）
   ZADD feed:user:follower1 {timestamp} {post_id}
   ZADD feed:user:follower2 {timestamp} {post_id}
   ... × 1000
   （可批量：MULTI / PIPELINE 減少 RTT）
4. 限制 Feed 長度（只保留最近 1000 筆）
   ZREMRANGEBYRANK feed:user:{followerId} 0 -1001

用戶 B 查看動態牆（讀取路徑，極快）：
1. ZREVRANGEBYSCORE feed:user:B +inf -inf LIMIT 0 20
   → 直接返回 20 個 post_id（O(log N)）
2. 批量查詢 Posts 詳情（MGET 或 IN 查詢）
3. 返回結果（無需複雜計算）</code></pre>

  <p><strong>Fan-out on Write 的詳細優缺點分析：</strong></p>
  <pre data-lang="text"><code class="language-text">優點：
  ✓ 讀取速度極快（預計算完成，O(1) 讀取）
  ✓ 讀取路徑簡單，無需複雜查詢邏輯
  ✓ 適合讀多寫少系統（讀寫比 > 10:1）
  ✓ Feed 資料在 Redis，天然支援快取

缺點：
  ✗ 寫入放大（Write Amplification）：1 篇貼文 → N 次寫入（N = 追蹤者數）
    Twitter 早期資料：平均追蹤者 200，每天 5M 貼文
    → 每天 Fan-out 寫入：5M × 200 = 10 億次 Redis ZADD
  ✗ 名人問題（Celebrity Problem）：1M 追蹤者 × 1 篇貼文 = 1M 次寫入
  ✗ 非活躍用戶的 Feed 浪費：不活躍用戶的 Redis 記憶體純粹浪費
  ✗ Fan-out 延遲：追蹤者眾多時，追蹤者可能要等幾秒才看到新貼文
  ✗ 刪除貼文複雜：需要從所有追蹤者的 Feed 中移除（1M 次 ZREM）</code></pre>

  <h3>方案二：Fan-out on Read（拉取模式，查詢合併）</h3>
  <p>用戶查看動態牆時，<strong>實時</strong>聚合所有關注對象的貼文。</p>
  <pre data-lang="text"><code class="language-text">用戶 B（關注了 500 個帳號）查看動態牆：
1. 查詢 B 的所有 following（500 個 user_id）
   SELECT following_id FROM follows WHERE follower_id = B

2. 查詢 500 個用戶的最新貼文（合併查詢）
   選項 A：單一大查詢（N+1 問題優化版）
     SELECT * FROM posts
     WHERE user_id IN (id1, id2, ..., id500)
     ORDER BY created_at DESC LIMIT 20

   選項 B：並發查詢（分散到多個分片）
     Promise.all(shards.map(shard =>
       shard.query('SELECT ... WHERE user_id IN (...) LIMIT 20')
     ))

3. 在記憶體中 K-way Merge 排序，取前 20 條
4. 返回結果</code></pre>

  <p><strong>Fan-out on Read 的詳細優缺點分析：</strong></p>
  <pre data-lang="text"><code class="language-text">優點：
  ✓ 寫入成本低（只寫一次 Posts 表，無擴散）
  ✓ 資料永遠最新（無需同步問題）
  ✓ 適合名人帳號（無 Celebrity Problem）
  ✓ 刪除貼文簡單（只需刪 Posts 表）
  ✓ 適合關注列表頻繁變化的場景

缺點：
  ✗ 讀取延遲高：每次都要做複雜查詢（N+1 問題）
  ✗ 難以有效快取（每個用戶的 Feed 都是動態計算的）
  ✗ 資料庫壓力大：高峰期大量並發查詢可能壓垮 DB
  ✗ 關注 500 人 → 最多 500 次 DB 查詢（即使用 IN 查詢也很重）
  ✗ 排序算法複雜：500 個結果集的 K-way Merge</code></pre>

  <arch-diagram src="./diagrams/ch17-news-feed-fanout.json" caption="Fan-out on Write vs Fan-out on Read 對比：左側展示寫入時的 Fanout 流程，右側展示讀取時的即時聚合流程，以及混合策略的決策點。"></arch-diagram>

  <callout-box type="info" title="兩種方案的量化比較">
    <p>假設用戶平均關注 500 人，每天發 1 篇貼文，系統有 100M 用戶，讀寫比 100:1：</p>
    <ul>
      <li><strong>Fan-out on Write</strong>：寫放大 500x → 每天 500M × 100M/N_active 次 Fan-out 寫入；但每次讀取是 O(1)，延遲 &lt; 1ms</li>
      <li><strong>Fan-out on Read</strong>：每次讀取需 500 次 DB 查詢；以 100:1 讀寫比計算，讀取負載是寫入的 100 倍，每次讀取延遲 100-500ms</li>
    </ul>
    <p>對於 Twitter 這樣的系統，大多數用戶追蹤者不多，Fan-out on Write 整體更優。但名人帳號需要特殊處理。</p>
  </callout-box>

  <pre data-lang="typescript"><code class="language-typescript">// Fan-out on Write 的詳細實作
async function fanoutPost(authorId: string, postId: string, createdAt: Date): Promise<void> {
  // 步驟一：獲取所有追蹤者（分頁，避免一次性載入過多）
  let cursor = 0;
  const BATCH_SIZE = 1000;

  while (true) {
    const followers = await db.query(
      \`SELECT follower_id FROM follows
       WHERE following_id = ? AND cursor_id > ?
       ORDER BY cursor_id ASC LIMIT ?\`,
      [authorId, cursor, BATCH_SIZE]
    );

    if (followers.length === 0) break;

    // 步驟二：批量寫入 Feed Cache（使用 Pipeline 減少 RTT）
    const pipeline = redis.pipeline();
    for (const follower of followers) {
      // 只對活躍用戶（7 天內有登入）執行 Fan-out（節省記憶體）
      const isActive = await userActivityCache.isActive(follower.follower_id);
      if (!isActive) continue;

      // score = 時間戳（毫秒），支援按時間排序
      pipeline.zadd(
        \`feed:\${follower.follower_id}\`,
        createdAt.getTime(),
        postId
      );
      // 限制 Feed 長度（只保留最近 1000 筆，節省記憶體）
      pipeline.zremrangebyrank(\`feed:\${follower.follower_id}\`, 0, -1001);
    }
    await pipeline.exec();

    cursor = followers[followers.length - 1].cursor_id;

    // 批次間短暫讓步（避免 Redis 過載，影響其他請求）
    if (followers.length === BATCH_SIZE) {
      await sleep(10); // 10ms
    } else {
      break;
    }
  }
}

// Fan-out on Read 的查詢合併
async function readFeedOnDemand(userId: string, limit = 20): Promise<Post[]> {
  // 步驟一：獲取關注列表（使用快取，關注列表變化不頻繁）
  let followings = await redis.smembers(\`user:followings:\${userId}\`);
  if (followings.length === 0) {
    followings = await db.query(
      'SELECT following_id FROM follows WHERE follower_id = ?', [userId]
    ).then(rows => rows.map((r: any) => r.following_id));
    await redis.sadd(\`user:followings:\${userId}\`, ...followings);
    await redis.expire(\`user:followings:\${userId}\`, 3600); // 快取 1 小時
  }

  if (followings.length === 0) return [];

  // 步驟二：按 DB Shard 分組（減少跨 Shard 查詢）
  const shardGroups = groupByShardKey(followings);

  // 步驟三：並發查詢各 Shard
  const results = await Promise.all(
    Object.entries(shardGroups).map(([shardKey, userIds]) =>
      dbShards[shardKey].query(
        \`SELECT id, user_id, content, created_at, like_count, comment_count
         FROM posts
         WHERE user_id IN (?) AND created_at > NOW() - INTERVAL 7 DAY
         ORDER BY created_at DESC LIMIT ?\`,
        [userIds, limit]
      )
    )
  );

  // 步驟四：K-way Merge（合併多個有序列表）
  const merged = results.flat().sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return merged.slice(0, limit);
}</code></pre>
</section>

<section id="celebrity-problem">
  <h2>Celebrity 問題（Hotspot User）處理</h2>
  <p>擁有數百萬追蹤者的名人帳號（如 Elon Musk 有 1.7 億 Twitter 追蹤者）在 Fan-out on Write 模式下會造成嚴重的「寫入風暴」。這不是邊緣案例，而是大型社群平台必須解決的核心問題。</p>

  <h3>問題的量化</h3>
  <pre data-lang="text"><code class="language-text">名人（1 億追蹤者）發布一則推文：

Fan-out on Write 的代價：
  Redis ZADD 操作：1 億次
  Redis 寫入速度上限：~100K 操作/秒（單節點）
  完成時間：1億 / 100K = 1,000 秒 ≈ 17 分鐘！

問題清單：
  1. 追蹤者看到貼文的延遲：最多 17 分鐘（不可接受）
  2. Redis 叢集在 17 分鐘內持續高壓（影響所有其他用戶）
  3. Fan-out 期間的 Redis 記憶體峰值：1億 × (8 bytes score + ~20 bytes post_id) = 2.8 GB（僅此一篇貼文）
  4. 名人每天發 10 篇推文：10 億次 ZADD/天，22.8 TB 峰值記憶體

更複雜的場景：
  多個名人同時發文（如重大新聞事件）
  → 多個 Fan-out 任務並發執行
  → Redis 和 DB 同時承壓
  → 整個系統性能崩潰</code></pre>

  <h3>熱點用戶的定義閾值</h3>
  <pre data-lang="typescript"><code class="language-typescript">// 動態分類：根據追蹤者數量決定 Fanout 策略
// 閾值需要根據系統容量動態調整

enum FanoutStrategy {
  WRITE_TIME = 'write_time',     // 純 Fan-out on Write
  HYBRID = 'hybrid',             // 混合策略
  READ_TIME = 'read_time',       // 純 Fan-out on Read（名人）
}

const FANOUT_THRESHOLDS = {
  // 普通用戶：Fan-out on Write（讀取快）
  NORMAL_USER_MAX_FOLLOWERS: 10_000,

  // 中等用戶：非同步 Fan-out on Write（稍有延遲可接受）
  MEDIUM_USER_MAX_FOLLOWERS: 100_000,

  // 大 V / KOL：混合策略
  LARGE_USER_MAX_FOLLOWERS: 1_000_000,

  // 超級名人：純 Fan-out on Read（如 Musk、Obama）
  // > 1_000_000：READ_TIME
};

async function getFanoutStrategy(userId: string): Promise<FanoutStrategy> {
  // 從快取取（追蹤者數量變化不太頻繁）
  const cacheKey = \`user:fanout:strategy:\${userId}\`;
  const cached = await redis.get(cacheKey);
  if (cached) return cached as FanoutStrategy;

  const followerCount = await followerCountService.getCount(userId);

  let strategy: FanoutStrategy;
  if (followerCount <= FANOUT_THRESHOLDS.NORMAL_USER_MAX_FOLLOWERS) {
    strategy = FanoutStrategy.WRITE_TIME;
  } else if (followerCount <= FANOUT_THRESHOLDS.LARGE_USER_MAX_FOLLOWERS) {
    strategy = FanoutStrategy.HYBRID;
  } else {
    strategy = FanoutStrategy.READ_TIME;
  }

  // 快取 1 小時（追蹤者數量增長相對緩慢）
  await redis.setex(cacheKey, 3600, strategy);
  return strategy;
}

// 發文時根據策略選擇 Fanout 方式
async function onPostCreated(authorId: string, postId: string): Promise<void> {
  const strategy = await getFanoutStrategy(authorId);

  switch (strategy) {
    case FanoutStrategy.WRITE_TIME:
      // 普通用戶：直接非同步 Fanout
      await fanoutQueue.enqueue({ authorId, postId, priority: 'NORMAL' });
      break;

    case FanoutStrategy.HYBRID:
      // 中等用戶：Fanout 但排低優先級（讓 CRITICAL 任務優先）
      await fanoutQueue.enqueue({ authorId, postId, priority: 'LOW' });
      // 同時更新自己的 Post Cache（供 Pull 合併使用）
      await updateCelebrityPostCache(authorId, postId);
      break;

    case FanoutStrategy.READ_TIME:
      // 超級名人：只更新 Post Cache，完全不 Fanout
      await updateCelebrityPostCache(authorId, postId);
      break;
  }
}</code></pre>

  <h3>混合策略的動態切換邏輯</h3>
  <pre data-lang="text"><code class="language-text">混合策略的推拉結合邊界設計：

【發文時（Push 部分）】
  普通用戶（< 10K 追蹤者）：
    → Fanout 到所有追蹤者的 Feed Cache
    → 追蹤者讀取 Feed：直接從 Redis 取，O(1)

  大 V（10K ~ 1M 追蹤者）：
    → Fanout 到活躍追蹤者的 Feed Cache（跳過非活躍）
    → 非活躍追蹤者下次登入時：補充 Hydrate

  超級名人（> 1M 追蹤者）：
    → 完全不 Fanout
    → 只更新「名人 Post Cache」（Redis Sorted Set，保留最近 1000 篇）

【讀取時（Pull 部分）】
  用戶 B 讀取 Feed：
    1. 從 Redis 取預計算的 Feed（普通用戶的貼文）
    2. 查詢 B 關注的名人列表（從快取）
    3. 從每個名人的 Post Cache 取最新貼文
    4. 合併 + 排序（K-way Merge）
    5. 返回最終 Feed

【邊界設計的精妙之處】
  普通追蹤者：完全不知道背後是 Push 還是 Pull，看到的 Feed 一樣快
  名人的貼文：有「熱點 Cache」作為中介，不是實時查 DB，也很快
  合併查詢：名人列表通常 < 100，不會造成大量 Pull 查詢</code></pre>

  <pre data-lang="typescript"><code class="language-typescript">// 名人 Post Cache 的維護
async function updateCelebrityPostCache(
  authorId: string,
  postId: string,
  createdAt = Date.now()
): Promise<void> {
  const cacheKey = \`celebrity:posts:\${authorId}\`;

  const pipeline = redis.pipeline();
  // 加入新貼文（score = 時間戳）
  pipeline.zadd(cacheKey, createdAt, postId);
  // 只保留最近 1000 篇（節省記憶體）
  pipeline.zremrangebyrank(cacheKey, 0, -1001);
  // TTL：7 天（名人帳號通常高度活躍，快取長期有效）
  pipeline.expire(cacheKey, 86400 * 7);
  await pipeline.exec();

  // 預載入貼文詳情到快取（避免後續的 DB 查詢）
  const postDetail = await postService.getPostById(postId);
  await redis.setex(\`post:detail:\${postId}\`, 86400, JSON.stringify(postDetail));
}

// 帳號類型動態轉換（粉絲數突破閾值時）
async function onFollowerCountChanged(userId: string, newCount: number): Promise<void> {
  const oldStrategy = await redis.get(\`user:fanout:strategy:\${userId}\`);
  await redis.del(\`user:fanout:strategy:\${userId}\`); // 清除快取，強制重新計算

  const newStrategy = await getFanoutStrategy(userId); // 重新計算

  if (oldStrategy === FanoutStrategy.WRITE_TIME && newStrategy === FanoutStrategy.READ_TIME) {
    // 升格為名人：不需要做任何遷移（舊的 Fan-out 資料會隨 TTL 自然過期）
    // 新建立名人 Post Cache
    await backfillCelebrityPostCache(userId);
    logger.info(\`User \${userId} graduated to celebrity strategy\`, { followerCount: newCount });
  }
}</code></pre>
</section>

<section id="timeline-hybrid">
  <h2>Timeline 混合策略完整設計</h2>
  <p>即使不考慮名人問題，生產環境中的 Feed 系統需要同時考慮多個維度的優化：非活躍用戶的資源節省、Feed 的排序算法、Cursor-based 分頁等。混合策略的完整設計遠比「簡單的推拉結合」複雜。</p>

  <h3>決策維度矩陣</h3>
  <pre data-lang="text"><code class="language-text">維度 1：發布者的追蹤者數量（決定 Fanout 策略）
  < 10K：同步 Fanout（發布者等待 Fanout 完成後返回）
  10K - 100K：非同步 Fanout（發布後立即返回，後台完成）
  100K - 1M：部分 Fanout（只對活躍追蹤者 Fanout）
  > 1M：僅更新 Celebrity Cache

維度 2：讀取者的活躍度（決定是否維護 Feed Cache）
  活躍（7 天內登入）：預計算 Feed，存入 Redis
  非活躍（> 7 天）：跳過 Fanout，登入時 Hydrate
  新用戶（首次登入）：冷啟動策略（推薦熱門內容）

維度 3：內容的時效性（決定 Fanout 優先級）
  即時性強（Breaking News 標記）：最高優先級 Fanout
  普通內容：正常優先級佇列
  低時效性（回顧/精選）：低優先級

維度 4：系統當前負載（動態降級）
  正常：Fan-out on Write
  中等負載（CPU > 70%）：增加 Fanout 批次間隔
  高負載（CPU > 90%）：暫停低優先級 Fanout，積壓至低峰
  極端負載（限流觸發）：所有非 CRITICAL 均降級為 Fan-out on Read</code></pre>

  <h3>普通用戶 Push + 大 V Pull 的合併查詢</h3>
  <pre data-lang="typescript"><code class="language-typescript">async function getNewsFeed(
  userId: string,
  cursor?: string,
  limit = 20
): Promise<FeedResult> {
  // === 第一部分：從 Feed Cache 讀取普通用戶的預計算貼文 ===
  const feedCacheKey = \`feed:\${userId}\`;
  const cursorScore = cursor
    ? parseFloat(Buffer.from(cursor, 'base64').toString())
    : '+inf';

  const cachedPostIds = await redis.zrevrangebyscore(
    feedCacheKey,
    cursorScore,
    '-inf',
    'WITHSCORES',
    'LIMIT', 0, limit * 2 // 多取一些，和 Celebrity 合併後截取
  );

  // 解析 [postId, score, postId, score, ...]
  const normalFeedItems: Array<{ postId: string; score: number }> = [];
  for (let i = 0; i < cachedPostIds.length; i += 2) {
    normalFeedItems.push({
      postId: cachedPostIds[i] as string,
      score: parseFloat(cachedPostIds[i + 1] as string),
    });
  }

  // === 第二部分：從 Celebrity Cache 讀取大 V 的最新貼文 ===
  const celebrities = await getCelebrityFollowings(userId); // 從快取取，< 100 個

  const celebrityItems: Array<{ postId: string; score: number }> = [];
  if (celebrities.length > 0) {
    // 並發讀取所有名人的 Post Cache
    const celebrityResults = await Promise.all(
      celebrities.map(celebId =>
        redis.zrevrangebyscore(
          \`celebrity:posts:\${celebId}\`,
          cursorScore,
          '-inf',
          'WITHSCORES',
          'LIMIT', 0, 10 // 每個名人最多取 10 篇
        )
      )
    );

    for (const result of celebrityResults) {
      for (let i = 0; i < result.length; i += 2) {
        celebrityItems.push({
          postId: result[i] as string,
          score: parseFloat(result[i + 1] as string),
        });
      }
    }
  }

  // === 第三部分：K-way Merge 合併並排序 ===
  const allItems = [...normalFeedItems, ...celebrityItems]
    .sort((a, b) => b.score - a.score) // 按時間戳降序
    .slice(0, limit);

  if (allItems.length === 0) {
    // Feed Cache 為空 → 可能是非活躍用戶首次使用或剛啟動 Hydrate
    await hydrateInactiveFeed(userId);
    return getNewsFeed(userId, cursor, limit); // 重試一次
  }

  // === 第四部分：批量獲取貼文詳情 ===
  const postIds = allItems.map(item => item.postId);
  const posts = await batchGetPostDetails(postIds);

  // 過濾已刪除的貼文
  const validPosts = posts.filter(p => p && !p.deleted);

  // === 構造 Cursor（下一頁的起始位置）===
  const lastItem = allItems[allItems.length - 1];
  const nextCursor = lastItem
    ? Buffer.from(lastItem.score.toString()).toString('base64')
    : null;

  return {
    posts: validPosts,
    nextCursor,
    hasMore: allItems.length === limit,
  };
}

// 批量獲取貼文詳情（先查 Redis，再查 DB）
async function batchGetPostDetails(postIds: string[]): Promise<Post[]> {
  // L1 快取：Redis MGET
  const cacheKeys = postIds.map(id => \`post:detail:\${id}\`);
  const cachedValues = await redis.mget(...cacheKeys);

  const result: Post[] = [];
  const missingIds: string[] = [];
  const missingIndices: number[] = [];

  cachedValues.forEach((val, index) => {
    if (val !== null) {
      result[index] = JSON.parse(val);
    } else {
      missingIds.push(postIds[index]);
      missingIndices.push(index);
    }
  });

  // 快取未命中：查 DB
  if (missingIds.length > 0) {
    const dbPosts = await db.query(
      \`SELECT id, user_id, content, created_at, like_count, comment_count, deleted
       FROM posts WHERE id IN (?)\`,
      [missingIds]
    );

    const dbPostMap = new Map(dbPosts.map((p: Post) => [p.id, p]));
    const pipeline = redis.pipeline();

    missingIndices.forEach((resultIndex, i) => {
      const post = dbPostMap.get(missingIds[i]);
      if (post) {
        result[resultIndex] = post;
        pipeline.setex(\`post:detail:\${post.id}\`, 3600, JSON.stringify(post));
      }
    });

    await pipeline.exec();
  }

  return result.filter(Boolean);
}</code></pre>

  <h3>排序算法（按時間 vs 按熱度）</h3>
  <pre data-lang="typescript"><code class="language-typescript">// 排序策略一：純時間序（簡單，Twitter 早期）
function sortByTime(posts: Post[]): Post[] {
  return posts.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

// 排序策略二：Reddit 熱度算法（混合時間和互動）
// score = log10(upvotes - downvotes) + age_factor
function redditScore(post: Post): number {
  const ageHours = (Date.now() - new Date(post.created_at).getTime()) / 3_600_000;
  const interactionScore = Math.log10(Math.max(post.like_count, 1));
  const timePenalty = ageHours / 12; // 每 12 小時衰減 1 個對數單位
  return interactionScore - timePenalty;
}

// 排序策略三：個性化排序（機器學習，Instagram/Twitter 現在的做法）
// 考慮因素：用戶歷史互動、發布者的互動率、帖子類型偏好、時間新鮮度
interface PostFeature {
  ageMinutes: number;          // 發布時長
  likeCount: number;
  commentCount: number;
  authorEngagementRate: number; // 發布者近期帖子的平均互動率
  userViewedSimilarContent: boolean; // 用戶是否互動過類似內容
  isSponsored: boolean;
}

async function personalizedSort(posts: Post[], userId: string): Promise<Post[]> {
  // 提取特徵
  const features = await Promise.all(
    posts.map(post => extractFeatures(post, userId))
  );

  // 呼叫 ML 排序服務（通常是預訓練的 LightGBM 或 Neural Network）
  const scores = await rankingService.score({
    userId,
    items: features.map((feat, i) => ({ postId: posts[i].id, features: feat })),
  });

  // 按 ML 分數排序
  return posts
    .map((post, i) => ({ post, score: scores[i] }))
    .sort((a, b) => b.score - a.score)
    .map(({ post }) => post);
}

// 混合排序：80% 時間序 + 20% 熱度（簡單可控的版本）
function hybridSort(posts: Post[], timeWeight = 0.8): Post[] {
  const maxTime = Math.max(...posts.map(p => new Date(p.created_at).getTime()));
  const maxLikes = Math.max(...posts.map(p => p.like_count), 1);

  return posts.sort((a, b) => {
    const timeScoreA = new Date(a.created_at).getTime() / maxTime;
    const timeScoreB = new Date(b.created_at).getTime() / maxTime;
    const hotScoreA = a.like_count / maxLikes;
    const hotScoreB = b.like_count / maxLikes;

    const finalScoreA = timeWeight * timeScoreA + (1 - timeWeight) * hotScoreA;
    const finalScoreB = timeWeight * timeScoreB + (1 - timeWeight) * hotScoreB;
    return finalScoreB - finalScoreA;
  });
}</code></pre>
</section>

<section id="counter-service">
  <h2>計數器服務（Counter Service）</h2>
  <p>社群媒體中的計數器（按讚數、評論數、分享數、觀看數）面臨極高的讀寫壓力。計數器設計的核心取捨是：<strong>精確性 vs 速度</strong>——完全精確的計數需要強一致性，代價是高延遲；近似計數可以極高速度，但有小幅誤差。</p>

  <h3>精確性 vs 速度的取捨框架</h3>
  <pre data-lang="text"><code class="language-text">業務場景             精確性要求    推薦方案
──────────────────────────────────────────────────────
按讚/收藏數          ± 1% 可接受  Redis INCR + 批量寫回
觀看次數（YouTube）   ± 1% 可接受  分片計數 + 批量聚合
評論數               精確         Write-through（每次都更新 DB）
粉絲數               精確         Write-through
訂單數（計費相關）    完全精確     資料庫事務（悲觀鎖）
庫存數量（防超賣）    完全精確     資料庫行鎖 / Redis DECR + 補償

核心原則：
  如果誤差對用戶體驗無影響 → 用最快的近似計數
  如果誤差影響業務決策（計費、庫存）→ 犧牲速度換精確</code></pre>

  <h3>Redis INCR + 批量寫回（高速計數的標準方案）</h3>
  <pre data-lang="typescript"><code class="language-typescript">// 按讚操作：原子操作，無鎖，極高並發
async function likePost(userId: string, postId: string): Promise<LikeResult> {
  // 防重複按讚（使用 Redis Set 記錄「誰按了讚」）
  // 注意：超熱門貼文的 Set 可能很大（1M 個 userId），需要考慮記憶體
  const likeKey = \`post:likers:\${postId}\`;
  const isNew = await redis.sadd(likeKey, userId); // SADD 返回新增的元素數量

  if (isNew === 0) {
    // 已按過讚
    return { success: false, reason: 'Already liked' };
  }

  // 設置 TTL（避免長期佔用記憶體，1 年後過期）
  await redis.expire(likeKey, 86400 * 365);

  // 原子遞增計數器
  const newCount = await redis.incr(\`counter:likes:\${postId}\`);

  // 非同步發佈事件（通知作者、Fanout 到粉絲等）
  await eventBus.publish('post.liked', {
    userId,
    postId,
    timestamp: Date.now(),
    currentLikeCount: newCount,
  });

  return { success: true, likeCount: newCount };
}

// 取消按讚
async function unlikePost(userId: string, postId: string): Promise<void> {
  const removed = await redis.srem(\`post:likers:\${postId}\`, userId);
  if (removed > 0) {
    await redis.decr(\`counter:likes:\${postId}\`);
    await eventBus.publish('post.unliked', { userId, postId, timestamp: Date.now() });
  }
}

// 批量寫回 DB（定時任務，每 30 秒執行一次）
async function flushCountersToDatabase(): Promise<void> {
  // 取得所有計數器 Key（生產環境：使用 SCAN 代替 KEYS，避免阻塞）
  const stream = redis.scanStream({ match: 'counter:likes:*', count: 1000 });

  const updates: Array<{ postId: string; count: number }> = [];

  for await (const keys of stream) {
    if (keys.length === 0) continue;

    // 批量讀取計數值
    const values = await redis.mget(...keys);
    keys.forEach((key: string, index: number) => {
      const count = parseInt(values[index] ?? '0');
      if (!isNaN(count) && count > 0) {
        updates.push({
          postId: key.replace('counter:likes:', ''),
          count,
        });
      }
    });
  }

  if (updates.length === 0) return;

  // 批量 UPSERT（使用絕對值，冪等操作）
  // MySQL 的 INSERT ... ON DUPLICATE KEY UPDATE
  const values = updates.map(u => [u.postId, u.count]);
  await db.query(
    \`INSERT INTO post_counters (post_id, like_count, updated_at)
     VALUES ?
     ON DUPLICATE KEY UPDATE like_count = VALUES(like_count), updated_at = NOW()\`,
    [values]
  );

  logger.info(\`Flushed \${updates.length} counters to DB\`);
  metrics.gauge('counters.flushed_count', updates.length);
}

// 讀取計數：多層快取策略
async function getLikeCount(postId: string): Promise<number> {
  // L1：Redis 計數器（最新值）
  const redisCount = await redis.get(\`counter:likes:\${postId}\`);
  if (redisCount !== null) return parseInt(redisCount);

  // L2：資料庫（Redis 快取 miss，可能是冷數據）
  const dbRecord = await db.query(
    'SELECT like_count FROM post_counters WHERE post_id = ?', [postId]
  );
  const count = dbRecord?.like_count ?? 0;

  // 回寫 Redis 快取（預熱，下次可以直接命中）
  await redis.setex(\`counter:likes:\${postId}\`, 3600, count.toString());
  return count;
}</code></pre>

  <h3>分散式計數器（Approximate Counting）</h3>
  <pre data-lang="typescript"><code class="language-typescript">// 場景：極高並發（如 1M+ QPS 的計數）
// 問題：單個 Redis Key 的更新頻率達到 10K+ ops/sec 時，
//       即使 INCR 是 O(1)，網路往返（RTT ~1ms）也成為瓶頸
//       1 萬個並發客戶端 × 每次 1ms = 10 秒完成（不可接受）

// 解決：Sharded Counter（分片計數器）
class ShardedCounter {
  constructor(private readonly shardCount = 64) {}

  // 寫入：隨機選擇一個分片，降低單個 Key 的競爭
  async increment(counterKey: string, amount = 1): Promise<void> {
    const shardIndex = Math.floor(Math.random() * this.shardCount);
    await redis.incrby(\`\${counterKey}:shard:\${shardIndex}\`, amount);
  }

  // 讀取：合計所有分片
  async get(counterKey: string): Promise<number> {
    const pipeline = redis.pipeline();
    for (let i = 0; i < this.shardCount; i++) {
      pipeline.get(\`\${counterKey}:shard:\${i}\`);
    }
    const results = await pipeline.exec();
    return (results ?? []).reduce((sum, result) => {
      const val = result?.[1] as string | null;
      return sum + (val ? parseInt(val) : 0);
    }, 0);
  }

  // 合併（定時將分片計數合併為單一計數，降低讀取開銷）
  async consolidate(counterKey: string): Promise<number> {
    const total = await this.get(counterKey);

    // 重置所有分片
    const pipeline = redis.pipeline();
    for (let i = 0; i < this.shardCount; i++) {
      pipeline.del(\`\${counterKey}:shard:\${i}\`);
    }
    pipeline.set(counterKey, total); // 合併到主計數器
    await pipeline.exec();

    return total;
  }
}

// 在瀏覽器客戶端累積計數（減少網路請求）
// 觀看計數：每 5 秒或用戶離開時，批量上報累積的觀看時長
// 而不是每秒都請求一次 API
class ClientSideCounter {
  private pendingViews = new Map<string, number>();

  recordView(postId: string): void {
    this.pendingViews.set(postId, (this.pendingViews.get(postId) ?? 0) + 1);
  }

  async flush(): Promise<void> {
    if (this.pendingViews.size === 0) return;
    const batch = Object.fromEntries(this.pendingViews);
    this.pendingViews.clear();
    await api.post('/counters/batch', { views: batch });
  }
}</code></pre>

  <h3>Like/Follow 計數的原子性保證</h3>
  <pre data-lang="typescript"><code class="language-typescript">// 問題：在分散式系統中，「按讚」操作涉及多個步驟：
// 1. 記錄「誰按讚」（防重複）
// 2. 遞增計數器
// 3. 發送通知事件
// 如何保證原子性？

// 方案一：Lua 腳本（Redis 內的原子操作）
const luaLike = \`
  local likeKey = KEYS[1]
  local counterKey = KEYS[2]
  local userId = ARGV[1]

  -- 嘗試新增 userId 到 Set
  local added = redis.call('SADD', likeKey, userId)

  if added == 0 then
    return {0, redis.call('GET', counterKey)}  -- 已按讚，返回 0
  end

  -- 遞增計數器
  local newCount = redis.call('INCR', counterKey)
  redis.call('EXPIRE', likeKey, 31536000)  -- 1 年 TTL
  return {1, newCount}  -- 新按讚，返回 1 和新計數
\`;

async function atomicLike(userId: string, postId: string): Promise<[boolean, number]> {
  const result = await redis.eval(
    luaLike,
    2, // 2 個 KEYS
    \`post:likers:\${postId}\`,
    \`counter:likes:\${postId}\`,
    userId // ARGV[1]
  ) as [number, string];

  return [result[0] === 1, parseInt(result[1])];
}

// Follow/Unfollow 計數的原子性
// 場景：Follow 操作需要同時更新兩個計數器
//   被追蹤者的 followers_count += 1
//   追蹤者的 following_count += 1
// 且要防止重複 Follow

async function atomicFollow(followerId: string, followeeId: string): Promise<boolean> {
  // 使用資料庫事務保證一致性（Follow 關係不如 Like 頻繁，DB 事務可接受）
  return db.transaction(async (trx) => {
    // 插入 Follow 記錄（UNIQUE 約束防重複）
    const [inserted] = await trx.query(
      \`INSERT IGNORE INTO follows (follower_id, following_id, created_at)
       VALUES (?, ?, NOW())\`,
      [followerId, followeeId]
    );

    if (inserted.affectedRows === 0) {
      return false; // 已關注
    }

    // 原子更新兩個計數器（在同一事務中）
    await Promise.all([
      trx.query('UPDATE users SET following_count = following_count + 1 WHERE id = ?', [followerId]),
      trx.query('UPDATE users SET followers_count = followers_count + 1 WHERE id = ?', [followeeId]),
    ]);

    return true;
  });
}

// 觀看計數的特殊處理（防刷）
class ViewCounter {
  // 同一 IP 在 5 分鐘內多次觀看同一影片，只計 1 次
  async recordView(postId: string, ipAddress: string): Promise<void> {
    const dedupeKey = \`view:dedup:\${postId}:\${ipAddress}\`;
    const isNew = await redis.set(dedupeKey, '1', { NX: true, EX: 300 }); // 5 分鐘
    if (isNew) {
      await redis.incr(\`counter:views:\${postId}\`);
    }
  }
}</code></pre>

  <callout-box type="tip" title="計數器的一致性取捨實務">
    <p>計數器設計的實務原則：(1) 顯示層面接受最終一致性：「1,234 讚」vs「1,237 讚」對用戶體驗幾乎無影響，允許 Redis 和 DB 有 30 秒的不一致；(2) 業務層面拒絕丟失：即使有誤差，批量寫回 DB 必須保證最終正確；(3) 特殊計數器需要精確：庫存、餘額、計費計數必須使用資料庫強一致性；(4) 超熱門帖子的計數考慮分片（Sharded Counter），避免單 Key 成為瓶頸；(5) 定期與 DB 對帳（Reconciliation）：每日批次計算精確值，修正 Redis 的累積誤差。</p>
  </callout-box>
</section>
`,
} satisfies ChapterContent;
