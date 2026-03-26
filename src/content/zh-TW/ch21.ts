import type { ChapterContent } from '../../types.js';

export default {
  title: '設計搜尋自動補全（Typeahead Search）',
  content: `
<section id="trie-structure">
  <h2>Trie 資料結構與分散式實作</h2>
  <p>Typeahead Search（自動補全）是搜尋引擎的基礎功能：用戶輸入「sys」時，立即顯示「system design」、「syscall」、「syslog」等建議。這個功能的核心資料結構是 <strong>Trie（字首樹）</strong>。</p>

  <arch-diagram src="./diagrams/ch21-typeahead.json" caption="搜尋自動補全系統架構：Trie 服務、Redis 多層快取、搜尋頻率統計 Pipeline，以及個人化補全的整體設計。"></arch-diagram>

  <h3>Trie 的完整資料結構</h3>
  <pre data-lang="text"><code class="language-text">儲存：["apple", "app", "application", "apply", "apt"]

Trie 結構（每個節點儲存子節點 Map + 是否為詞的標記）：
  root
   └── a
        └── p
             ├── p (word: "app", count: 5000)
             │    ├── l
             │    │    ├── e (word: "apple", count: 3000)
             │    │    └── i
             │    │         └── c
             │    │              └── a
             │    │                   └── t
             │    │                        └── i
             │    │                             └── o
             │    │                                  └── n (word: "application", count: 8000)
             │    └── y (word: "apply", count: 2000)
             └── t (word: "apt", count: 1500)

複雜度分析：
  插入一個長度 L 的詞：O(L) 時間，O(L) 空間
  搜尋前綴（長度 P）：O(P) 到達前綴節點
  收集所有後代詞：O(N) 其中 N 是子樹節點數
  使用 Top-K 快取後的搜尋：O(P)（常數級別）

空間複雜度：
  一個包含 M 個詞、平均詞長 L 的 Trie：
  最壞情況：O(M × L) 個節點
  實際情況：因為共享前綴，通常遠少於 M × L</code></pre>

  <h3>Trie 節點實作</h3>
  <pre data-lang="typescript"><code class="language-typescript">class TrieNode {
  children: Map&lt;string, TrieNode&gt; = new Map();
  isWord: boolean = false;
  frequency: number = 0;         // 此詞的搜尋頻率
  topSuggestions: string[] = []; // 快取此前綴下的 Top-K 建議（優化）
}

class Trie {
  private root = new TrieNode();
  private readonly TOP_K = 10;

  // 插入詞彙（O(word.length) 時間複雜度）
  insert(word: string, frequency: number): void {
    let node = this.root;
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
    }
    node.isWord = true;
    node.frequency = frequency;

    // 更新路徑上每個節點的 Top-K 快取
    this.updateTopSuggestionsOnPath(word, frequency);
  }

  private updateTopSuggestionsOnPath(word: string, frequency: number): void {
    let node = this.root;
    for (const char of word) {
      node = node.children.get(char)!;
      // 將此詞加入當前節點的 Top-K（如果頻率足夠高）
      const suggestions = node.topSuggestions;
      if (!suggestions.includes(word)) {
        suggestions.push(word);
        // 按頻率排序，保留前 TOP_K 個
        suggestions.sort((a, b) =>
          this.getFrequency(b) - this.getFrequency(a)
        );
        if (suggestions.length > this.TOP_K) {
          suggestions.pop();
        }
      }
    }
  }

  // 搜尋前綴，返回 Top-K 建議
  search(prefix: string): Array&lt;{ word: string; frequency: number }&gt; {
    let node = this.root;
    for (const char of prefix) {
      if (!node.children.has(char)) return [];
      node = node.children.get(char)!;
    }

    // 使用 Top-K 快取（O(1) 返回，利用預計算）
    if (node.topSuggestions.length > 0) {
      return node.topSuggestions.map(word => ({
        word,
        frequency: this.getFrequency(word),
      }));
    }

    // 降級：DFS 遍歷子樹
    const results: Array&lt;{ word: string; frequency: number }&gt; = [];
    this.dfs(node, prefix, results);
    return results
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, this.TOP_K);
  }

  private dfs(
    node: TrieNode,
    prefix: string,
    results: Array&lt;{ word: string; frequency: number }&gt;
  ): void {
    if (node.isWord) {
      results.push({ word: prefix, frequency: node.frequency });
    }
    for (const [char, child] of node.children) {
      this.dfs(child, prefix + char, results);
    }
  }

  private getFrequency(word: string): number {
    let node = this.root;
    for (const char of word) {
      if (!node.children.has(char)) return 0;
      node = node.children.get(char)!;
    }
    return node.isWord ? node.frequency : 0;
  }
}</code></pre>

  <h3>壓縮 Trie（Radix Tree）</h3>
  <p>標準 Trie 在長詞匯或稀疏情況下浪費大量空間。Radix Tree（基數樹）透過壓縮只有單個子節點的路徑來節省空間。</p>
  <pre data-lang="text"><code class="language-text">標準 Trie 的問題：
  儲存 ["application", "apple"] 時：
  a → p → p → l → i → c → a → t → i → o → n（11 個節點）
             └──→ e（單獨分支）

Radix Tree（壓縮 Trie）：
  將單一鏈條壓縮為一個邊：
  root → "app" → "l" → "ication"（成詞）
                    └──→ "e"（成詞）

  節點數從 13 個減少到 5 個！

空間節省：
  英語字典約 17 萬個詞，平均詞長 7 字符
  標準 Trie：~120 萬個節點
  Radix Tree：~40 萬個節點（節省約 66%）

業界採用：
  Linux 核心使用 Radix Tree 管理記憶體頁
  IP 路由表使用 Radix Tree 做最長前綴匹配
  Nginx 使用 Radix Tree 儲存 HTTP 路由規則</code></pre>

  <h3>分散式 Trie：一致性雜湊分片</h3>
  <pre data-lang="text"><code class="language-text">問題：單機 Trie 無法儲存所有詞彙（Google 有千億個搜尋詞）

解決方案：根據前綴分片 Trie

分片策略（按首字母分片）：
  Shard 1: a-f（所有以 a,b,c,d,e,f 開頭的搜尋詞）
  Shard 2: g-m
  Shard 3: n-s
  Shard 4: t-z
  特殊處理：數字、特殊字符、非拉丁字母

查詢路由：
  用戶輸入 "sys" → 前綴以 's' 開頭 → 路由到 Shard 3

問題：流量不均勻（'s', 't' 比 'q', 'x' 多得多）

更好的策略：根據歷史流量動態調整分片邊界
  - 統計每個首字母的查詢量
  - 熱門字母獨立分片（如 's' 可能需要 3 個分片）
  - 冷門字母合併分片（如 q, x, z 合併為一個分片）

分散式查詢：
  1. 用戶輸入前綴 → API Gateway
  2. Gateway 根據前綴路由到正確的 Trie Shard
  3. Shard 返回 Top-K 建議
  4. （可選）Gateway 合併來自多個 Shard 的結果

副本機制：
  每個 Shard 有 2-3 個副本（讀寫分離）
  寫入（詞頻更新）→ 主節點，同步到副本
  讀取（查詢）→ 任意副本（負載均衡）</code></pre>
</section>

<section id="frequency-pipeline">
  <h2>搜尋詞頻統計 Pipeline</h2>
  <p>Trie 中儲存的詞頻需要定期從真實的搜尋日誌中更新。這是一個典型的大資料批次處理（Batch Processing）或串流處理（Stream Processing）問題。</p>

  <h3>資料流設計</h3>
  <pre data-lang="text"><code class="language-text">搜尋日誌收集：
  1. 用戶每次搜尋，記錄到日誌（Kafka）
     { "query": "system design", "userId": "...", "timestamp": "...", "clicked": true }

  2. 每 5 分鐘的實時聚合（Flink）：
     → 統計最近 5 分鐘每個詞的搜尋次數
     → 更新 Redis Sorted Set（實時詞頻）

  3. 每日批次全量統計（Spark/MapReduce）：
     → 統計過去 7 天每個詞的搜尋次數
     → 更新 Trie 的詞頻
     → 重建 Trie（每週全量更新）</code></pre>

  <h3>MapReduce 詞頻統計設計</h3>
  <p>在大規模場景下（每日數十億次搜尋），MapReduce 是計算詞頻的標準工具。</p>
  <pre data-lang="text"><code class="language-text">MapReduce 詞頻統計流程（概念性）：

Map 階段：
  輸入：搜尋日誌的一行記錄
    {"query": "system design", "clicked": true, "timestamp": "2025-01-01T09:00:00"}

  輸出（鍵值對）：
    ("system design", 1)   ← 只統計點擊了的搜尋（品質過濾）

Shuffle 階段：
  將相同 key 的記錄分組到同一個 Reducer

Reduce 階段：
  輸入：("system design", [1, 1, 1, 1, ...])
  輸出：("system design", 50000)  ← 7 天內的搜尋次數

時間加權（詞頻衰減）：
  最近的搜尋比舊的搜尋更有價值
  加權公式：weighted_count = Σ count_i × decay_factor^(days_ago_i)
  decay_factor = 0.9（每天衰減 10%）

  計算示例：
    今天：1000 次 × 0.9^0 = 1000
    昨天：1200 次 × 0.9^1 = 1080
    2天前：800 次 × 0.9^2 = 648
    ...
    7天前：500 次 × 0.9^7 ≈ 239

    加權總計 ≈ 5,234（比直接相加的 6,500 更準確反映最新趨勢）</code></pre>

  <h3>每日批次更新 vs 實時更新</h3>
  <pre data-lang="python"><code class="language-python"># Spark 實作（每日批次更新）
from pyspark.sql import SparkSession
from pyspark.sql import functions as F

spark = SparkSession.builder.appName("TypeaheadFrequency").getOrCreate()

# 讀取過去 7 天的搜尋日誌
search_logs = spark.read.parquet("s3://logs/search/date=2025-01-*/")

# 計算時間加權詞頻
query_frequency = (
    search_logs
    .filter(F.col("clicked") == True)   # 只統計有點擊的搜尋
    .withColumn("normalized_query", F.trim(F.lower(F.col("query"))))
    .filter(F.length("normalized_query") >= 2)
    # 計算距今天數並套用衰減因子
    .withColumn(
        "days_ago",
        F.datediff(F.current_date(), F.to_date(F.col("timestamp")))
    )
    .withColumn(
        "weighted_count",
        F.pow(F.lit(0.9), F.col("days_ago"))  # 0.9^days_ago
    )
    .groupBy("normalized_query")
    .agg(F.sum("weighted_count").alias("weighted_frequency"))
    .filter(F.col("weighted_frequency") >= 50)  # 過濾低品質詞
    .orderBy(F.col("weighted_frequency").desc())
    .limit(10_000_000)  # 只保留前 1000 萬個詞
)

# 寫出到 S3，觸發 Trie 重建
query_frequency.write.parquet("s3://typeahead/frequency/latest/")
trigger_trie_rebuild("s3://typeahead/frequency/latest/")</code></pre>

  <h3>Trie 更新策略（Blue-Green 部署）</h3>
  <pre data-lang="text"><code class="language-text">問題：在高流量時直接更新 Trie 會阻塞查詢請求

解決方案：Blue-Green Trie 部署（雙緩衝）

部署流程：
  1. 線上：Trie A（舊版本，正在服務 100% 流量）
  2. 後台：Trie B（使用新詞頻資料重建中...）
     → 重建期間：從 S3 讀取新詞頻，重新插入所有詞彙
     → 預計重建時間：數分鐘到數小時（取決於詞彙量）
  3. Trie B 重建完成後：
     → 預熱：先讀取最熱門的 1,000 個前綴，確認正常返回
     → 原子切換：更新 Redis 中的 active 標記
     → 流量切換：100% 流量切換到 Trie B
  4. Trie A 進入待機狀態，下次更新時使用

Redis 實作：
  "trie:active" → "A" 或 "B"

  讀取邏輯：
    const active = await redis.get("trie:active");
    const suggestions = await trieServices[active].search(prefix);

  更新後切換：
    await redis.set("trie:active", active === "A" ? "B" : "A");

故障回滾：
  如果新 Trie 出問題，只需將 active 切回舊值
  舊 Trie 仍在記憶體中，回滾是即時的（&lt;1 秒）</code></pre>
</section>

<section id="personalized-typeahead">
  <h2>個人化補全 vs 全局補全</h2>
  <p>全局補全返回對所有用戶最受歡迎的建議，個人化補全則結合用戶的歷史搜尋記錄，返回對這個用戶最相關的建議。</p>

  <h3>個人化模型設計</h3>
  <pre data-lang="text"><code class="language-text">個人化補全的數據來源：

1. 用戶歷史搜尋記錄（最近 90 天）：
   → 時間衰減：越近的搜尋加權越高
   → 重複搜尋：同一詞搜尋多次，加分更高

2. 用戶點擊 / 購買記錄：
   → 搜尋後點擊了特定結果 → 強烈信號
   → 搜尋後購買 → 最強信號

3. 地理位置（位置感知補全）：
   → 搜尋 "coffee" → 顯示附近的 "Coffee 三號店" 等

4. 語言偏好：
   → 繁體中文用戶 → 中文建議優先
   → 多語言用戶 → 根據最近使用語言決定

5. 設備和平台：
   → 手機用戶 → 更短的補全（手機鍵盤輸入較短）
   → 桌面用戶 → 可以顯示更長的補全

個人化 vs 全局補全的混合策略：
  最終結果 = 個人化建議（前 2-3 名）+ 全局補全（填滿至 10 名）

  例如，輸入 "sy" 時：
    個人化（優先）：
      1. "system design"（我上週搜過 5 次）
      2. "syscall linux"（我上個月搜過）
    全局（補充）：
      3. "synonym"
      4. "syntax error"
      ... (至 10 個)</code></pre>

  <h3>混合排名算法</h3>
  <pre data-lang="typescript"><code class="language-typescript">async function rankSuggestions(
  prefix: string,
  userId: string | null,
  globalSuggestions: Suggestion[]
): Promise&lt;Suggestion[]&gt; {
  // 無登入用戶 = 全局頻率排名
  if (!userId) {
    return globalSuggestions.sort((a, b) => b.globalFreq - a.globalFreq);
  }

  // 查詢用戶的個人化信號
  const userSignals = await getUserSignals(userId, prefix);

  // 混合排名分數計算
  const scored = globalSuggestions.map(suggestion => {
    // 基礎分：全局頻率（對數縮放，防止超熱門詞彙過度主導）
    const baseScore = Math.log(suggestion.globalFreq + 1) * 10;

    // 個人化加成
    let personalBoost = 0;

    // 用戶最近搜尋過此詞（強信號）
    const recentSearch = userSignals.recentSearches.find(
      s => s.query === suggestion.word
    );
    if (recentSearch) {
      const daysAgo = daysSince(recentSearch.timestamp);
      // 最近 7 天：高加成；更久：逐漸降低
      personalBoost += Math.max(0, 10 - daysAgo) * 2;
    }

    // 用戶點擊過此建議的搜尋結果（中加成）
    if (userSignals.clickedQueries.includes(suggestion.word)) {
      personalBoost += 8;
    }

    // 地理位置相關性
    if (suggestion.isLocationBased &&
        isNearby(suggestion.location, userSignals.location, 5000)) {  // 5km 內
      personalBoost += 10;
    }

    return { ...suggestion, score: baseScore + personalBoost };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

// 個人化補全（從用戶歷史記錄中搜尋）
async function getPersonalizedSuggestions(
  prefix: string,
  userId: string
): Promise&lt;Suggestion[]&gt; {
  // 從 Redis Sorted Set 讀取用戶最近的搜尋詞
  // Score = 時間戳，ZREVRANGEBYSCORE 按時間倒序
  const recentSearches = await redis.zrevrangebyscore(
    \`user:searches:\${userId}\`,
    '+inf', '-inf',
    'LIMIT', 0, 200  // 讀取最近 200 條搜尋
  );

  return recentSearches
    .filter(search => search.toLowerCase().startsWith(prefix.toLowerCase()))
    .slice(0, 5)
    .map(word => ({ word, source: 'personal', score: 100 }));
}</code></pre>

  <h3>A/B Testing 在 Typeahead 中</h3>
  <pre data-lang="text"><code class="language-text">Typeahead 的 A/B Testing 設計：

實驗維度：
  1. 演算法實驗：全局補全 vs 個人化補全 vs 混合
  2. UI 實驗：顯示 5 個建議 vs 10 個建議
  3. 觸發實驗：輸入 1 個字符開始建議 vs 2 個字符
  4. 排序實驗：頻率優先 vs 個人化優先

分配策略：
  按 userId 的雜湊值分組（確保同一用戶始終看到一致的版本）
  hash(userId) % 100 → [0, 50) = Control A, [50, 100) = Treatment B

評估指標（Typeahead 特有）：
  1. 點擊率（CTR）：顯示建議後，用戶是否點擊了補全結果
  2. 補全採納率（Completion Adoption Rate）：
     用戶輸入後按下補全建議的比例（vs 繼續手動輸入）
  3. 搜尋成功率：最終找到想要內容的比例
  4. 延遲（P99）：99% 的請求在多少毫秒內返回

成功標準範例：
  個人化補全 vs 全局補全：
  → 補全採納率：+8%（用戶更願意點擊個人化建議）
  → 搜尋成功率：+3%
  → P99 延遲：&lt;200ms（個人化不能顯著增加延遲）</code></pre>

  <h3>多語言搜尋</h3>
  <pre data-lang="text"><code class="language-text">多語言 Typeahead 的挑戰：

1. 字符集問題：
   中文：約 7 萬個常用漢字，每個字符都是一個 Trie 節點
   英文：26 個字符，Trie 比較淺但寬
   日文：平假名、片假名各 46 個，加上漢字

2. 分詞問題：
   英文：按空格分詞（簡單）
   中文：「系統設計」如何分？「系統」+ 「設計」還是「系」+「統」+「設」+「計」？
   → 使用分詞庫（Jieba for Chinese, MeCab for Japanese）
   → 或對每個字符做前綴索引

3. 多語言分片策略：
   按語言代碼分片：
     zh-TW Shard：繁體中文搜尋詞的 Trie
     zh-CN Shard：簡體中文
     en Shard：英文
     ja Shard：日文
   查詢時，根據請求的 Accept-Language 路由到對應 Shard

4. 混合語言輸入（Code Mixing）：
   用戶可能輸入「iPhone 推薦」（中英混合）
   → 在多個語言的 Shard 中同時查詢，合併結果</code></pre>

  <callout-box type="tip" title="個人化的隱私考量">
    <p>個人化搜尋需要儲存用戶行為資料。應遵循資料最小化原則：只保留必要的資料（如搜尋詞，而非完整的搜尋上下文）；設定合理的資料保留期（如 90 天自動清除）；讓用戶可以清除自己的搜尋記錄；在 GDPR 規範下，用戶有權要求刪除所有個人化數據（Right to be Forgotten）。</p>
  </callout-box>
</section>

<section id="typeahead-cache">
  <h2>熱門詞彙快取策略</h2>
  <p>自動補全系統對延遲要求極高——用戶每輸入一個字符，系統就需要在 100ms 以內返回建議（否則用戶已經繼續輸入了）。多層快取是達到這個目標的關鍵。</p>

  <h3>多級快取設計</h3>
  <pre data-lang="text"><code class="language-text">Layer 1：瀏覽器記憶體快取（Browser Cache）
  位置：客戶端 JavaScript 記憶體（Map 物件）
  命中率：~30%（用戶在同一會話中重複查詢相同前綴）
  延遲：0ms（記憶體查詢）
  TTL：頁面會話結束時清除（不持久化）
  容量：~1,000 個前綴的快取（記憶體有限）

Layer 2：CDN Edge Cache
  位置：最近的 CDN PoP（如 Cloudflare 在台北的節點）
  命中率：~60%（帕累托分佈：20% 的前綴貢獻 80% 的查詢）
  延遲：1-5ms（網路延遲 + CDN 命中）
  TTL：5 分鐘（HTTP Cache-Control 頭）
  容量：幾乎無限（CDN 有大量 SSD 儲存）
  注意：CDN 快取的是靜態結果，無個人化

Layer 3：Redis Cluster
  位置：應用層的共享快取
  命中率：~90-95%（包含長尾前綴）
  延遲：1-2ms（本地網路內的 Redis）
  TTL：1 小時（詞頻更新後讓快取自然過期）
  容量：受記憶體限制，通常只快取活躍前綴

Layer 4：Trie Service（內存）
  位置：Trie Server 的 JVM/Node.js 記憶體
  命中率：100%（所有請求的最終落點）
  延遲：5-20ms（計算時間，取決於前綴長度和子樹大小）</code></pre>

  <h3>前綴樹快取策略</h3>
  <pre data-lang="typescript"><code class="language-typescript">class TypeaheadCache {
  private readonly CACHE_TTL = 3600;  // 1 小時
  private readonly HOT_PREFIX_TTL = 300;  // 熱門前綴 5 分鐘（更頻繁更新）

  async getSuggestions(
    prefix: string,
    locale: string
  ): Promise&lt;Suggestion[] | null&gt; {
    const cacheKey = \`typeahead:\${locale}:\${prefix.toLowerCase()}\`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      metrics.increment('typeahead.cache.hit', { prefix_length: prefix.length });
      return JSON.parse(cached);
    }

    metrics.increment('typeahead.cache.miss');
    return null;
  }

  async setSuggestions(
    prefix: string,
    locale: string,
    suggestions: Suggestion[]
  ): Promise&lt;void&gt; {
    const cacheKey = \`typeahead:\${locale}:\${prefix.toLowerCase()}\`;
    // 短前綴（1-2 字符）流量更大，使用更短的 TTL 確保及時更新
    const ttl = prefix.length &lt;= 2 ? this.HOT_PREFIX_TTL : this.CACHE_TTL;
    await redis.setex(cacheKey, ttl, JSON.stringify(suggestions));
  }

  // 前綴樹快取策略：快取上層前綴，自動覆蓋下層
  // 例如：快取了 "sy" 的結果後，"sys" 可能直接從父節點的快取過濾
  async getWithPrefixTree(
    prefix: string,
    locale: string
  ): Promise&lt;Suggestion[] | null&gt; {
    // 先嘗試精確匹配
    const exact = await this.getSuggestions(prefix, locale);
    if (exact) return exact;

    // 如果前綴長度 &gt; 3，嘗試從更短的父前綴快取中過濾
    if (prefix.length &gt; 3) {
      const parentPrefix = prefix.slice(0, -1);  // 去掉最後一個字符
      const parentSuggestions = await this.getSuggestions(parentPrefix, locale);
      if (parentSuggestions) {
        // 從父快取中過濾以 prefix 開頭的建議
        const filtered = parentSuggestions
          .filter(s => s.word.toLowerCase().startsWith(prefix.toLowerCase()));
        if (filtered.length > 0) {
          // 暫存這個過濾結果
          await this.setSuggestions(prefix, locale, filtered);
          return filtered;
        }
      }
    }

    return null;
  }

  // 預熱快取：提前計算熱門前綴
  async warmupCache(): Promise&lt;void&gt; {
    const hotPrefixes = await analytics.getTopPrefixes(10_000);  // 前 1 萬個熱門前綴

    for (const { prefix, locale } of hotPrefixes) {
      const cached = await redis.exists(\`typeahead:\${locale}:\${prefix}\`);
      if (!cached) {
        const suggestions = await trieService.search(prefix, locale);
        await this.setSuggestions(prefix, locale, suggestions);
      }
    }

    console.log(\`Cache warmup completed: \${hotPrefixes.length} prefixes\`);
  }
}</code></pre>

  <h3>快取更新頻率設計</h3>
  <pre data-lang="text"><code class="language-text">快取失效策略：

主動失效（Event-Driven Invalidation）：
  → 當 Trie 重建完成後，廣播失效事件
  → 接收到事件的 Redis 節點刪除相關快取 Key
  → 適合：詞頻更新頻率低（每日一次）的場景

被動失效（TTL-Based）：
  → 快取 Key 設置 TTL，到期自動失效
  → 無需額外的失效通知機制
  → 適合：大多數 Typeahead 場景（延遲幾分鐘到幾小時可接受）

熱門前綴 vs 長尾前綴的差異策略：
  熱門前綴（如 "ap", "is", "the"）：
    → 流量大，快取命中率高
    → TTL 可以設長一些（1 小時），減少 Trie 查詢
    → 但 Trie 重建後需要立即失效（不能等 TTL）

  長尾前綴（如 "zymurgy"）：
    → 流量小，快取效益低
    → TTL 設短（5 分鐘），或不快取（直接查 Trie）
    → 節省 Redis 記憶體

Redis 記憶體優化：
  使用 Redis LFU（Least Frequently Used）淘汰策略
  最少被使用的快取 Key 自動被淘汰
  配置：maxmemory-policy allkeys-lfu</code></pre>

  <h3>前端優化：輸入防抖與預取</h3>
  <pre data-lang="typescript"><code class="language-typescript">// 用戶輸入時的防抖：避免每個按鍵都發送請求
function useTypeahead(debounceMs = 150) {
  const [suggestions, setSuggestions] = useState&lt;string[]&gt;([]);
  const [query, setQuery] = useState('');
  const cache = useRef(new Map&lt;string, string[]&gt;());

  const debouncedSearch = useMemo(
    () => debounce(async (prefix: string) => {
      if (prefix.length &lt; 2) { setSuggestions([]); return; }

      // 查詢本地快取
      if (cache.current.has(prefix)) {
        setSuggestions(cache.current.get(prefix)!);
        return;
      }

      const result = await fetch(\`/api/typeahead?q=\${encodeURIComponent(prefix)}\`);
      const { suggestions } = await result.json();

      cache.current.set(prefix, suggestions);
      setSuggestions(suggestions);

      // 預取下一層前綴（用戶很可能繼續輸入）
      // 只預取最常見的幾個繼續字符，避免浪費
      const topContinuations = 'etaoinshrdlcumwfgypbvkjxqz';
      for (const char of topContinuations.slice(0, 8)) {
        const nextPrefix = prefix + char;
        if (!cache.current.has(nextPrefix)) {
          fetch(\`/api/typeahead?q=\${encodeURIComponent(nextPrefix)}\`)
            .then(r => r.json())
            .then(data => cache.current.set(nextPrefix, data.suggestions))
            .catch(() => {});
        }
      }
    }, debounceMs),
    []
  );

  const onInputChange = useCallback((value: string) => {
    setQuery(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  return { query, suggestions, onInputChange };
}

// API 端點
app.get('/api/typeahead', async (req, res) => {
  const { q: prefix, locale = 'zh-TW' } = req.query as Record&lt;string, string&gt;;

  if (!prefix || prefix.length &lt; 1 || prefix.length > 50) {
    return res.status(400).json({ error: 'Invalid prefix' });
  }

  // 1. 嘗試讀快取
  const cached = await typeaheadCache.getWithPrefixTree(prefix, locale);
  if (cached) {
    res.setHeader('Cache-Control', 'public, max-age=300');  // CDN 快取 5 分鐘
    return res.json({ suggestions: cached, source: 'cache' });
  }

  // 2. 從 Trie 服務查詢
  const suggestions = await trieService.search(prefix, locale);

  // 3. 寫入快取（非同步，不阻塞回應）
  typeaheadCache.setSuggestions(prefix, locale, suggestions).catch(console.error);

  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.json({ suggestions, source: 'trie' });
});</code></pre>

  <callout-box type="info" title="Typeahead 系統的設計取捨">
    <p><strong>延遲 vs 準確性</strong>：詞頻每小時更新一次（快取更新）vs 實時更新（複雜度高）。對大多數場景，小時級別的更新已足夠。</p>
    <p><strong>全局 vs 個人化</strong>：全局建議簡單、可共享 CDN 快取；個人化建議更相關，但無法共享快取，成本更高。通常在全局建議的頂部插入 2-3 個個人化建議。</p>
    <p><strong>服務端 Trie vs 資料庫全文搜尋</strong>：Trie 延遲更低（5-20ms vs 50-200ms），但需要維護額外的資料結構；Elasticsearch 的 prefix query 也可以實現自動補全，適合中小規模系統，且支援模糊搜尋（用戶拼寫錯誤時仍能找到結果）。</p>
  </callout-box>
</section>
`,
} satisfies ChapterContent;
