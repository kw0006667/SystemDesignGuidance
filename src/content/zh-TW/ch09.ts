import type { ChapterContent } from '../../types.js';

export default {
  title: '搜尋系統設計',
  content: `
<section id="inverted-index">
  <h2>倒排索引原理</h2>
  <p>
    搜尋系統的核心資料結構是<strong>倒排索引（Inverted Index）</strong>。
    理解它的工作原理，是設計任何搜索功能的基礎。
    「倒排」的意思是：傳統資料庫是從文件→詞彙，而倒排索引是從詞彙→文件。
  </p>

  <h3>正向索引 vs 倒排索引</h3>
  <pre data-lang="text"><code class="language-text">【文件資料】
文件 1：「台灣 系統 設計 面試」
文件 2：「系統 設計 入門 教學」
文件 3：「台灣 軟體 工程師 面試」

【正向索引（Forward Index）】：從文件找詞彙
文件 1 → [台灣, 系統, 設計, 面試]
文件 2 → [系統, 設計, 入門, 教學]
文件 3 → [台灣, 軟體, 工程師, 面試]

【倒排索引（Inverted Index）】：從詞彙找文件
台灣  → [文件 1(位置:0), 文件 3(位置:0)]
系統  → [文件 1(位置:1), 文件 2(位置:0)]
設計  → [文件 1(位置:2), 文件 2(位置:1)]
面試  → [文件 1(位置:3), 文件 3(位置:3)]
入門  → [文件 2(位置:2)]
教學  → [文件 2(位置:3)]
軟體  → [文件 3(位置:1)]
工程師 → [文件 3(位置:2)]</code></pre>

  <p>
    當用戶搜索「系統設計」時，搜尋引擎查找倒排索引，找出包含「系統」的文件集合
    和包含「設計」的文件集合，再取交集（AND 操作）——在毫秒內就能從數十億文件中找到相關結果。
  </p>

  <h3>倒排索引的詳細結構</h3>
  <p>
    每個詞彙（Term）對應一個<strong>Posting List（發布列表）</strong>，
    每個 Posting 記錄了：
  </p>
  <ul>
    <li><strong>文件 ID（Document ID）：</strong>哪些文件包含這個詞</li>
    <li><strong>詞頻（Term Frequency, TF）：</strong>這個詞在文件中出現幾次（用於相關性評分）</li>
    <li><strong>位置資訊（Position）：</strong>詞彙在文件中的位置（用於短語搜索，如精確匹配 "系統設計"）</li>
  </ul>
  <pre data-lang="text"><code class="language-text">更完整的倒排索引結構：
設計 → [
  (doc_id=1, tf=1, positions=[2]),
  (doc_id=2, tf=1, positions=[1]),
  (doc_id=5, tf=3, positions=[0,4,9])   ← tf=3 表示出現3次
]

短語搜索「系統設計」：
  系統 的位置集合 ∩ 設計 的位置集合（設計的位置 = 系統的位置 + 1）
  → 找出「系統」和「設計」相鄰出現的文件</code></pre>

  <h3>倒排索引的完整構建過程</h3>
  <p>
    從原始文件到可搜索的倒排索引，需要以下完整流程：
  </p>
  <pre data-lang="text"><code class="language-text">Step 1：文件收集（Document Collection）
  爬蟲或資料管道收集原始文件
  → {doc_id: 1, content: "台灣系統設計面試", created_at: "2024-01-15"}

Step 2：文字處理（Text Analysis）
  分詞 → 正規化 → 停用詞過濾 → 詞幹提取
  → Tokens: [台灣, 系統, 設計, 面試]

Step 3：建立 Posting List
  對每個 Token，記錄 (doc_id, tf, positions)
  台灣  → (1, tf=1, pos=[0])
  系統  → (1, tf=1, pos=[1])
  設計  → (1, tf=1, pos=[2])
  面試  → (1, tf=1, pos=[3])

Step 4：排序和壓縮（Sort & Compress）
  所有 Posting 按 (Term, doc_id) 排序
  對 doc_id 使用 Delta Encoding（差分編碼）壓縮

Step 5：寫入 Segment 檔案
  排序後的 Posting List 寫入不可變的 Segment 檔案
  同時建立 Term Dictionary（詞彙字典）和 Offset Index（偏移索引）</code></pre>

  <h3>Segment 合併（Segment Merge）</h3>
  <p>
    Lucene（Elasticsearch 底層）不會直接修改已有的 Segment，
    而是定期將多個小 Segment 合併成大 Segment：
  </p>
  <pre data-lang="text"><code class="language-text">Segment 生命週期：

寫入階段：
  新文件 → In-memory Buffer（記憶體緩衝）
          ↓ 每秒 Refresh（預設）
  Segment 1（小）：10,000 個文件
  Segment 2（小）：10,000 個文件
  Segment 3（小）：5,000 個文件

背景合併（Background Merge）：
  Segment 1 + Segment 2 → Segment 4（大）：20,000 個文件
  （合併完成後，Segment 1 和 Segment 2 被刪除）

合併的好處：
  - 減少 Segment 數量（查詢時需要掃描的 Segment 越少越快）
  - 真正刪除已標記刪除（Tombstoned）的文件（釋放磁碟空間）
  - 減少 File Handle 佔用

合併的代價：
  - I/O 密集（需要讀取舊 Segment，寫入新 Segment）
  - 合併期間可能影響查詢效能（磁碟競爭）
  → Elasticsearch 支援在低峰期才執行 Merge（force_merge API）</code></pre>

  <h3>DocID 壓縮：Delta Encoding</h3>
  <p>
    Posting List 中的 DocID 是有序的整數列表，使用 Delta Encoding（差分編碼）可大幅壓縮：
  </p>
  <pre data-lang="text"><code class="language-text">原始 DocID 列表（「設計」這個詞出現在以下文件）：
  [1, 5, 8, 12, 15, 100, 102, 500]

Delta Encoding（存儲相鄰差值而非絕對值）：
  第一個值：1
  後續差值：4, 3, 4, 3, 85, 2, 398
  → Delta 後：[1, 4, 3, 4, 3, 85, 2, 398]

壓縮效果：
  原始：每個 DocID 可能需要 4 bytes（int32）
  Delta 後：小差值用較少的 bits 表示（Variable-Length Encoding）
  例如差值 3 只需要 2 bits，不需要 32 bits
  → 對於頻繁出現的詞彙，壓縮率可達 5-10 倍

搜索時解壓縮：
  從磁碟讀取壓縮後的 Delta 列表
  → 快速解壓縮（累加還原）：[1, 1+4=5, 5+3=8, 8+4=12, ...]</code></pre>

  <h3>倒排索引 vs B-tree 索引</h3>
  <p>
    資料庫（MySQL、PostgreSQL）使用 B-tree 索引，而搜索引擎使用倒排索引。
    兩者有根本性的差異，理解這點有助於做出正確的技術選型：
  </p>
  <table>
    <thead>
      <tr>
        <th>比較面向</th>
        <th>B-tree 索引（資料庫）</th>
        <th>倒排索引（搜索引擎）</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>適用查詢</td>
        <td>精確匹配、範圍查詢（WHERE id=5、WHERE age BETWEEN 20 AND 30）</td>
        <td>全文搜索（包含某些詞彙的文件）</td>
      </tr>
      <tr>
        <td>模糊搜索</td>
        <td>LIKE '%design%' 極慢（全表掃描）</td>
        <td>天然支援，這是設計目標</td>
      </tr>
      <tr>
        <td>相關性排序</td>
        <td>不支援（只能精確排序）</td>
        <td>支援 TF-IDF、BM25 評分排序</td>
      </tr>
      <tr>
        <td>更新效能</td>
        <td>高（支援原地更新）</td>
        <td>低（Segment 不可變，更新需要標記刪除+新增）</td>
      </tr>
      <tr>
        <td>多詞交集</td>
        <td>需要全表掃描或多次查詢合併</td>
        <td>高效（Posting List 的 AND/OR 合併）</td>
      </tr>
    </tbody>
  </table>
  <callout-box type="info" title="Elasticsearch 的倒排索引存儲">
    Elasticsearch（底層使用 Apache Lucene）將倒排索引存儲在<strong>不可變的 Segment 檔案</strong>中。
    新文件寫入時先進 In-memory Buffer，定期 Flush 成新的 Segment。
    背景的 Merge 進程定期合併小 Segment 為大 Segment，刪除已標記刪除的文件。
    這種 Append-Only 設計讓寫入高效且原子性。
  </callout-box>
</section>

<section id="text-processing">
  <h2>Tokenization / Stemming / Stop Words</h2>
  <p>
    原始文字在建立倒排索引前，需要經過一系列的文字處理（Text Processing）步驟，
    讓不同形式的相關詞彙都能被搜索到。
  </p>

  <h3>文字處理流程</h3>
  <pre data-lang="text"><code class="language-text">原始文字：「The quick brown FOXES are JUMPING over the lazy dogs」

Step 1 - Character Filtering（字符過濾）：
  移除 HTML 標籤、特殊符號轉換
  → 「The quick brown FOXES are JUMPING over the lazy dogs」

Step 2 - Tokenization（斷詞）：
  按空格、標點符號切分為 Token
  → [The, quick, brown, FOXES, are, JUMPING, over, the, lazy, dogs]

Step 3 - Lowercasing（大小寫正規化）：
  → [the, quick, brown, foxes, are, jumping, over, the, lazy, dogs]

Step 4 - Stop Words Removal（停用詞移除）：
  移除高頻但無意義的詞（the, are, over, a, is, ...）
  → [quick, brown, foxes, jumping, lazy, dogs]

Step 5 - Stemming（詞幹提取）：
  將詞彙還原到詞根形式（foxes→fox, jumping→jump, dogs→dog）
  → [quick, brown, fox, jump, lazi, dog]

最終存入倒排索引的 Token：[quick, brown, fox, jump, lazi, dog]</code></pre>

  <h3>Stemming 示例（running → run）</h3>
  <p>
    Stemming 的核心目標是讓詞彙的不同形式（時態、單複數、詞性）在索引中合併，
    提高召回率（Recall）：
  </p>
  <pre data-lang="text"><code class="language-text">Stemming 的效果（Porter Stemmer 演算法）：

動詞變形：
  run, running, runs, runner → run
  design, designing, designed, designs → design
  search, searching, searched, searches → search

名詞單複數：
  fox, foxes → fox
  dog, dogs → dog
  system, systems → system

形容詞比較級：
  fast, faster, fastest → fast
  good, better → good（Stemming 無法處理，需 Lemmatization）

搜索效果：
  用戶搜索 "running" → 可以找到包含 "run"、"runs"、"ran" 的文件
  用戶搜索 "系統設計" → 可以找到 "設計系統"、"系統的設計" 的文件（需正確斷詞）</code></pre>

  <h3>Stemming vs Lemmatization</h3>
  <table>
    <thead>
      <tr>
        <th>方法</th>
        <th>描述</th>
        <th>範例</th>
        <th>特點</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Stemming（詞幹提取）</td>
        <td>粗暴地切掉詞尾，取近似詞幹</td>
        <td>running → run<br>studies → studi</td>
        <td>快速、簡單，但結果有時不是真實詞彙</td>
      </tr>
      <tr>
        <td>Lemmatization（詞形還原）</td>
        <td>基於詞彙語義，還原到字典形式</td>
        <td>running → run<br>better → good</td>
        <td>準確，但需要語言模型，較慢</td>
      </tr>
    </tbody>
  </table>

  <h3>停用詞表設計</h3>
  <p>
    停用詞（Stop Words）是頻繁出現但對搜索無意義的詞彙。
    移除停用詞能大幅縮小索引大小（通常佔文本 30-40%）並提高搜索效率：
  </p>
  <pre data-lang="text"><code class="language-text">英文常見停用詞：
  the, a, an, is, are, was, were, be, been, have, has, had,
  do, does, did, will, would, could, should, may, might, must,
  and, or, but, not, in, on, at, to, for, of, with, by, from

中文常見停用詞：
  的、了、在、是、我、有、和、就、不、人、都、一、一個、
  上、也、很、到、說、要、去、你、會、著、沒有、看、好、
  自己、這、那

自訂停用詞的場景：
  電商搜索：「一件」「一個」「適合」「可以」等購物通用詞
  技術文檔：「請注意」「如果」「例如」等通用描述詞
  → 業務特定的停用詞需要根據搜索日誌分析（高頻但無區分度）

注意：停用詞過濾有時會影響精確短語搜索
  搜索 "to be or not to be"（哈姆雷特名句）
  → 過濾停用詞後剩空白，搜索結果不正確
  解決方案：啟用 Elasticsearch 的 "enable_position_increments" 保留位置資訊</code></pre>

  <h3>中文分詞：jieba vs HanLP vs IK Analyzer</h3>
  <p>
    中文沒有空格分隔詞彙，斷詞是中文搜尋的核心難題。
    「系統設計面試」可以斷成正確的 [系統, 設計, 面試]，
    也可能斷成錯誤的 [系統設, 計面, 試]。
  </p>
  <p>常見的中文分詞工具比較：</p>
  <table>
    <thead>
      <tr>
        <th>工具</th>
        <th>語言/平台</th>
        <th>特點</th>
        <th>適用場景</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>jieba（結巴）</td>
        <td>Python/Java/Go</td>
        <td>基於統計和詞典，速度快，支援自訂詞典</td>
        <td>Python 應用、NLP 原型</td>
      </tr>
      <tr>
        <td>HanLP</td>
        <td>Java/Python</td>
        <td>基於深度學習，準確率高，支援詞性標注</td>
        <td>高準確度要求的 NLP 任務</td>
      </tr>
      <tr>
        <td>IK Analyzer</td>
        <td>Java（Elasticsearch 插件）</td>
        <td>Elasticsearch 最常用的中文插件，支援細粒度/粗粒度分詞</td>
        <td>Elasticsearch 中文搜索</td>
      </tr>
      <tr>
        <td>CKIP Tagger</td>
        <td>Python</td>
        <td>台灣中央研究院開發，繁體中文優化</td>
        <td>繁體中文 NLP、台灣用語</td>
      </tr>
      <tr>
        <td>analysis-smartcn</td>
        <td>Elasticsearch 內建</td>
        <td>Lucene 內建，準確率一般，但無需額外安裝</td>
        <td>簡單的中文搜索需求</td>
      </tr>
    </tbody>
  </table>
  <pre data-lang="python"><code class="language-python">import jieba

# 基本分詞
text = "台灣系統設計面試準備"
tokens = jieba.cut(text, cut_all=False)  # 精確模式（預設）
print(list(tokens))  # ['台灣', '系統', '設計', '面試', '準備']

# 加入自訂詞典（防止專業術語被切碎）
jieba.add_word("系統設計")  # 加入「系統設計」作為整體詞彙
jieba.add_word("微服務架構")

tokens = jieba.cut("微服務架構的系統設計", cut_all=False)
print(list(tokens))  # ['微服務架構', '的', '系統設計']</code></pre>
  <pre data-lang="javascript"><code class="language-javascript">// Elasticsearch 使用 IK Analyzer 的 Mapping 設定
PUT /articles
{
  "settings": {
    "analysis": {
      "analyzer": {
        "ik_smart_analyzer": {
          "type": "custom",
          "tokenizer": "ik_smart",        // 智慧粗粒度分詞
          "filter": ["lowercase", "stop"]
        },
        "ik_max_analyzer": {
          "type": "custom",
          "tokenizer": "ik_max_word",     // 細粒度分詞（更多 Token）
          "filter": ["lowercase"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "ik_max_word",        // 索引時用細粒度（提高召回）
        "search_analyzer": "ik_smart"     // 搜索時用粗粒度（提高精確）
      }
    }
  }
}</code></pre>
  <callout-box type="tip" title="索引時細粒度，搜索時粗粒度">
    IK Analyzer 的最佳實踐是：索引時使用 ik_max_word（細粒度，拆更多 Token），
    搜索時使用 ik_smart（粗粒度，保留語義）。
    這樣既能提高召回率（細粒度索引確保各種搜法都能找到），
    又能提高精確率（粗粒度搜索避免匹配過多無關文件）。
  </callout-box>
</section>

<section id="scoring">
  <h2>TF-IDF vs BM25 評分機制</h2>
  <p>
    找到包含關鍵字的文件只是搜索的第一步。接下來要解決的是：
    <strong>如何排名（Ranking）</strong>——哪些文件最相關？
    TF-IDF 和 BM25 是兩種主流的相關性評分演算法。
  </p>

  <h3>TF-IDF：詞頻-逆文件頻率</h3>
  <p>TF-IDF 基於一個直觀的假設：</p>
  <ul>
    <li><strong>TF（Term Frequency）：</strong>詞彙在文件中出現越頻繁，文件越相關（但需要正規化避免長文件優勢）</li>
    <li><strong>IDF（Inverse Document Frequency）：</strong>詞彙在越少文件中出現，它越有辨識力
    （「的」在所有文件都出現，IDF 趨近 0；「BM25」在很少文件出現，IDF 很高）</li>
  </ul>

  <h3>TF-IDF 公式推導</h3>
  <pre data-lang="text"><code class="language-text">TF-IDF 公式推導：

TF（詞頻）的基本形式：
  TF_raw(t, d) = 詞彙 t 在文件 d 中的出現次數
  問題：長文件出現次數多，有不公平優勢
  → 正規化：TF(t, d) = TF_raw(t, d) / 文件 d 的總詞彙數

IDF（逆文件頻率）：
  IDF(t) = log( N / df(t) )
  其中 N = 總文件數，df(t) = 包含詞彙 t 的文件數

  極端情況：
    若「的」出現在 100% 的文件：IDF = log(1) = 0 → 完全無區分度
    若「KV-Store」只出現在 1% 的文件：IDF = log(100) = 4.6 → 高區分度

  平滑處理（避免 df=0 的除零錯誤）：
  IDF(t) = log( (N + 1) / (df(t) + 1) ) + 1

最終 TF-IDF 分數：
  Score(t, d) = TF(t, d) × IDF(t)

多詞查詢（如「系統 設計」）：
  Score(d) = Score(系統, d) + Score(設計, d)

範例計算：
  語料庫：10,000 個文件
  詞彙「系統設計」出現在 100 個文件中
  IDF = log(10000 / 100) = log(100) ≈ 4.6

  文件 A（500 詞）：「系統設計」出現 5 次
  TF = 5/500 = 0.01
  Score_A = 0.01 × 4.6 = 0.046

  文件 B（100 詞）：「系統設計」出現 3 次
  TF = 3/100 = 0.03
  Score_B = 0.03 × 4.6 = 0.138  ← 文件 B 排名更高（密度更高）</code></pre>

  <h3>TF-IDF 的缺陷</h3>
  <p>
    TF-IDF 有兩個主要問題：
  </p>
  <ul>
    <li><strong>TF 無上限：</strong>一篇文章重複提到某個詞 1000 次，不代表它比提到 10 次的文章相關 100 倍。這種「重複填充關鍵字」的手法曾被 SEO 濫用。</li>
    <li><strong>文件長度偏差：</strong>即使做了 TF 正規化，長文件仍然可能有系統性優勢，因為它們有更多機會提到各種詞彙。</li>
  </ul>

  <h3>BM25：TF-IDF 的改進版</h3>
  <p>
    BM25（Best Match 25）引入了<strong>飽和函數（Saturation）</strong>和<strong>文件長度正規化</strong>：
  </p>
  <pre data-lang="text"><code class="language-text">BM25 Score(t, d) = IDF(t) × [TF(t,d) × (k1+1)] / [TF(t,d) + k1 × (1-b + b × |d|/avgdl)]

參數說明：
  k1（飽和係數）= 1.2 ~ 2.0
    控制 TF 的影響程度。k1 越高，TF 對分數影響越大（越接近 TF-IDF）
    k1 越低，TF 飽和越快（重複出現的邊際增益越小）
    k1 = 0：純粹 IDF，完全不考慮 TF
    預設 k1 = 1.2

  b（長度正規化係數）= 0 ~ 1.0
    b = 0：完全不考慮文件長度（不做長度正規化）
    b = 1：完全正規化（短文件和長文件完全公平）
    預設 b = 0.75（適度考慮長度，但不過度懲罰長文件）

  |d| = 當前文件的詞彙數
  avgdl = 語料庫中所有文件的平均詞彙數

飽和效果示例（k1 = 1.2）：
  TF = 1：分數 ≈ 2.2 × IDF / (1 + 1.2) ≈ 1.0 × IDF
  TF = 5：分數 ≈ 6.2 × IDF / (5 + 1.2) ≈ 1.0 × IDF × 1.76（非 5 倍）
  TF = 100：分數 ≈ 101.2 × IDF / (100 + 1.2) ≈ 1.0 × IDF × 1.97（非 100 倍！）
  → TF 從 5 到 100，分數只增加 ~12%（飽和效應）</code></pre>

  <h3>BM25 參數調整</h3>
  <pre data-lang="javascript"><code class="language-javascript">// Elasticsearch 自訂 BM25 參數
PUT /products
{
  "settings": {
    "similarity": {
      "custom_bm25": {
        "type": "BM25",
        "k1": 1.5,   // 提高 k1：更重視詞頻（適合描述詳細的商品）
        "b": 0.6     // 降低 b：減少長度懲罰（商品描述長度差異大）
      }
    }
  },
  "mappings": {
    "properties": {
      "description": {
        "type": "text",
        "similarity": "custom_bm25"  // 使用自訂 BM25
      }
    }
  }
}</code></pre>
  <p>
    Elasticsearch 5.0 起預設使用 BM25，取代了之前的 TF-IDF。
    實驗表明 BM25 在大多數搜索場景下比 TF-IDF 效果更好。
  </p>

  <h3>向量相似度搜尋（Vector Search）簡介</h3>
  <p>
    BM25 是基於「詞彙匹配」的相關性評分——如果文件和查詢不共享同樣的詞彙，即使語義相似也無法匹配。
    例如搜索 "laptop" 無法找到只包含 "notebook computer" 的文件。
    <strong>向量搜尋（Vector Search / Semantic Search）</strong>解決了這個問題：
  </p>
  <pre data-lang="text"><code class="language-text">向量搜尋的核心思路：

1. 將文件和查詢都轉換成高維向量（Embedding）
   使用預訓練的 Embedding 模型（如 BERT、OpenAI Ada）
   "laptop" → [0.2, -0.5, 0.8, ..., 0.1]  （768 維向量）
   "notebook computer" → [0.18, -0.48, 0.75, ..., 0.12]  （相似的向量！）

2. 計算查詢向量和文件向量的相似度
   常用度量：Cosine Similarity、Dot Product、Euclidean Distance

3. 近似最近鄰搜索（ANN，Approximate Nearest Neighbor）
   精確 K-NN 搜索需要與所有文件計算相似度（O(n)，太慢）
   ANN 演算法（HNSW、IVF）在接受輕微精確度損失的前提下大幅加速
   Elasticsearch 8.x 內建 ANN 支援（knn query）

向量搜尋 vs 關鍵字搜尋：
  關鍵字搜尋（BM25）：
    優點：可解釋性高、無需 GPU、支援精確匹配
    缺點：詞彙不匹配時完全無法召回（Zero Recall）

  向量搜尋：
    優點：語義理解（同義詞、多語言、錯別字容忍）
    缺點：需要 GPU 推理、結果難以解釋、需要大量訓練資料

  混合搜尋（Hybrid Search）：BM25 + 向量搜尋融合排名（最佳實踐）</code></pre>
  <callout-box type="tip" title="相關性評分只是排名的一部分">
    在真實的搜索引擎（Google、Elasticsearch）中，最終排名綜合了多個信號：
    BM25 相關性分數、用戶點擊率（CTR）、頁面 PageRank、新鮮度（文件發布時間）、
    個人化因素（用戶歷史）。BM25 是基礎，但不是全部。
  </callout-box>
</section>

<section id="elasticsearch-arch">
  <h2>Elasticsearch 架構</h2>
  <arch-diagram src="./diagrams/ch09-search-system.json" caption="搜尋系統完整架構：資料從業務資料庫經過 CDC/ETL 同步到 Elasticsearch，搜索請求由 Coordinating Node 分發到各 Shard，結果合併後返回用戶"></arch-diagram>
  <p>
    Elasticsearch 是目前最流行的分散式搜尋引擎，廣泛用於電商搜索、日誌分析（ELK Stack）、
    和全站搜尋功能。理解其架構，能幫助你在系統設計中正確評估 ES 的能力與限制。
  </p>

  <h3>Index / Shard / Replica 架構</h3>
  <table>
    <thead>
      <tr>
        <th>概念</th>
        <th>類比</th>
        <th>說明</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Index</td>
        <td>資料庫</td>
        <td>文件的邏輯集合（如 products、logs-2024-01）</td>
      </tr>
      <tr>
        <td>Document</td>
        <td>資料庫的一行記錄</td>
        <td>一個 JSON 物件，有唯一的 _id</td>
      </tr>
      <tr>
        <td>Primary Shard（主分片）</td>
        <td>資料庫的 Partition</td>
        <td>Index 的水平切片，每個 Shard 是一個獨立的 Lucene 實例；數量建立後不可更改</td>
      </tr>
      <tr>
        <td>Replica Shard（副本分片）</td>
        <td>Read Replica</td>
        <td>Primary Shard 的備份，提供高可用（Primary 故障時接管）和讀取擴展（分擔查詢）</td>
      </tr>
      <tr>
        <td>Node</td>
        <td>伺服器</td>
        <td>運行 Elasticsearch 的機器，持有若干 Shard</td>
      </tr>
      <tr>
        <td>Cluster</td>
        <td>資料庫集群</td>
        <td>多個 Node 組成的集群，共同服務一組 Index</td>
      </tr>
    </tbody>
  </table>
  <pre data-lang="text"><code class="language-text">Shard 分布示例（3 個 Node、6 個 Primary Shard、1 個 Replica）：

Node 1：P0[Primary], P3[Primary], P1[Replica], P4[Replica]
Node 2：P1[Primary], P4[Primary], P2[Replica], P5[Replica]
Node 3：P2[Primary], P5[Primary], P0[Replica], P3[Replica]

ES 確保：每個 Shard 的 Primary 和 Replica 在不同 Node 上
→ 任何一個 Node 宕機，不會同時失去 Primary 和 Replica
→ 高可用：Node 1 宕機後，Node 2 和 Node 3 仍有完整資料</code></pre>

  <h3>Master / Data / Coordinating Node 角色</h3>
  <p>
    在大型 Elasticsearch 集群中，Node 通常按角色劃分，避免單一節點負擔過重：
  </p>
  <table>
    <thead>
      <tr>
        <th>Node 角色</th>
        <th>職責</th>
        <th>建議配置</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Master Node（主節點）</td>
        <td>管理集群元數據：Index 創建/刪除、Shard 分配、Node 加入/離開、Leader 選舉</td>
        <td>3 個 Dedicated Master（奇數，防止腦裂），低 CPU/RAM</td>
      </tr>
      <tr>
        <td>Data Node（資料節點）</td>
        <td>存儲 Shard 資料，執行搜索和索引操作（最耗資源）</td>
        <td>多個，高 RAM（搜索快取）+ 高吞吐 SSD</td>
      </tr>
      <tr>
        <td>Coordinating Node（協調節點）</td>
        <td>接收客戶端請求，分發到 Data Node，合併結果返回客戶端（無狀態）</td>
        <td>2-3 個 Dedicated Coordinating（可作為 Load Balancer 後端）</td>
      </tr>
      <tr>
        <td>Ingest Node（攝取節點）</td>
        <td>文件寫入前的轉換（類似 Logstash 的 Pipeline 功能）</td>
        <td>按需配置，處理複雜轉換邏輯時獨立部署</td>
      </tr>
    </tbody>
  </table>
  <callout-box type="warning" title="腦裂問題（Split Brain）">
    若集群網路分區導致部分 Master Node 無法通訊，可能選出兩個 Master，
    各自管理不同的 Shard 狀態——這就是「腦裂（Split Brain）」。
    ES 透過設定 minimum_master_nodes（quorum）防止腦裂：
    只有超過半數的 Master Node 同意，才能選出新 Master。
    這就是為何建議部署奇數個（通常 3 個）Dedicated Master Node。
  </callout-box>

  <h3>寫入流程（Indexing Flow）</h3>
  <pre data-lang="text"><code class="language-text">文件寫入的完整流程：

1. 客戶端 → Coordinating Node（接收寫入請求）
2. Coordinating Node：根據 document_id 計算目標 Primary Shard
   shard_id = hash(doc_id) % number_of_primary_shards
3. Coordinating Node → Primary Shard 所在的 Data Node（轉發請求）
4. Primary Shard：
   a. 寫入 Transaction Log（Translog）—— 類似 WAL，防止崩潰遺失資料
   b. 寫入 In-memory Buffer（記憶體緩衝）
5. Primary Shard → 所有 Replica Shard（並行同步寫入）
6. Replica Shard 確認收到 → Primary Shard 確認 → Coordinating Node 返回成功

後台操作（非同步）：
  每秒 Refresh：In-memory Buffer → 新的 Lucene Segment（文件變得可搜索）
  每 30 分鐘或 Translog 過大：Flush → Segment 寫入磁碟，清空 Translog</code></pre>

  <h3>Near-real-time Search（近即時搜索）</h3>
  <p>
    Elasticsearch 的一個重要設計特性是「近即時（Near-real-time, NRT）」搜索——
    新寫入的文件在大約 1 秒後就能被搜索到（非立即）：
  </p>
  <pre data-lang="text"><code class="language-text">NRT 原理：

寫入時：
  文件 → In-memory Buffer（不可搜索）
         ↓ 每 1 秒（預設）Refresh
  新 Segment（可搜索，但還未 fsync 到磁碟）
         ↓ 每 30 分鐘 Flush
  Segment 持久化到磁碟

為什麼是「近」即時？
  Refresh 操作每秒執行一次（預設），
  因此剛寫入的文件最多需要等待 1 秒才能被搜索到。
  如果需要立即可搜索，可以在寫入後手動呼叫 Refresh API（但有效能代價）

調整 Refresh 頻率：
  # 大量寫入時（如重建索引），可暫時關閉 Refresh 提高寫入速度
  PUT /products/_settings
  {"index": {"refresh_interval": "-1"}}  # 關閉自動 Refresh

  # 大量寫入完成後恢復
  PUT /products/_settings
  {"index": {"refresh_interval": "1s"}}  # 恢復預設</code></pre>

  <h3>搜尋請求的完整流程（Scatter-Gather）</h3>
  <pre data-lang="text"><code class="language-text">用戶搜索「系統設計」

1. 請求到達 Coordinating Node（協調節點）
2. 協調節點將查詢廣播到所有相關的 Primary/Replica Shard（Query Phase）
3. 每個 Shard 在本地搜尋，返回 Top N 個文件 ID 和分數（Lightweight）
4. 協調節點合併所有 Shard 的結果，做全局排名，取 Top K
5. 根據最終 Top K 的文件 ID，從各 Shard 取完整文件（Fetch Phase）
6. 返回最終結果給用戶

這個「Scatter-Gather」模式是分散式搜尋的核心設計。

效能考量：
  若 Index 有 10 個 Shard，每個 Shard 返回 Top 100 結果
  Coordinating Node 需要合併 10 × 100 = 1000 個結果，取 Top 10
  → Shard 越多，Coordinating Node 的記憶體和 CPU 負擔越大（稱為 Deep Pagination 問題）</code></pre>

  <h3>Shard 數量的設計原則</h3>
  <p>
    Shard 數量在 Index 建立時確定，之後無法更改（需要 Reindex）。
    因此需要提前規劃：
  </p>
  <ul>
    <li><strong>太少 Shard：</strong>單個 Shard 過大，搜尋慢，難以擴展</li>
    <li><strong>太多 Shard：</strong>每個查詢都要協調更多 Shard，overhead 增加；
    每個 Shard 有固定的 JVM 記憶體開銷（約 10-30MB per Shard）</li>
    <li><strong>經驗法則：</strong>每個 Shard 大小保持在 10GB - 50GB；
    每個 Node 持有的 Shard 數不超過 Node 記憶體（GB）× 20</li>
  </ul>
  <pre data-lang="text"><code class="language-text">Shard 數量規劃示例：

場景：電商商品搜索，預計 1 億個商品，每個 Document 約 2KB
總資料量：1億 × 2KB ≈ 200GB

若每個 Shard 目標 20GB：
  Primary Shards = 200GB / 20GB = 10 個
  Replica = 1（每個 Primary 1 個副本）
  總 Shard 數 = 10 × 2 = 20 個

若 Data Node 各有 32GB RAM：
  每個 Node 最多 32 × 20 = 640 個 Shard（理論上限）
  但建議每個 Node 的 Shard 數量 × Shard 大小 ≤ Node RAM 的 50%
  → 10 × 20GB Shard，至少需要 4GB RAM per Node（Shard 堆疊）
  → 建議至少 3 個 Data Node（20 個 Shard 均分 ≈ 7 個/Node）</code></pre>
  <callout-box type="warning" title="Elasticsearch 不是強一致性資料庫">
    Elasticsearch 的寫入有輕微延遲（預設每秒 Refresh 一次），剛寫入的文件不會立刻可搜索。
    此外，ES 不支援 ACID 事務。設計系統時，ES 應作為查詢引擎，
    而不是業務資料的 Source of Truth。業務資料應存在 PostgreSQL 或 MongoDB，
    再同步到 ES 用於搜尋（透過 CDC 或 Dual Write）。
  </callout-box>
</section>

<section id="typeahead-intro">
  <h2>Typeahead / Autocomplete 思路</h2>
  <p>
    搜索框的自動補全（Autocomplete / Typeahead）是現代搜索體驗的標配功能。
    用戶輸入「sys」時，自動建議「system design」、「syscall」等候選詞。
    這個看似簡單的功能，背後涉及有趣的設計挑戰。
  </p>

  <h3>功能需求分解</h3>
  <ul>
    <li>用戶每輸入一個字符，立即返回 Top 5 建議詞（延遲 &lt; 100ms）</li>
    <li>建議詞按搜索頻率排序（熱門詞優先）</li>
    <li>支援數十億次/天的查詢</li>
  </ul>

  <h3>自動補全的完整架構</h3>
  <pre data-lang="text"><code class="language-text">Typeahead 完整系統架構：

【資料收集層】
  用戶搜索日誌 → Kafka → Flink/Spark Streaming
  → 即時統計各詞彙的搜索頻率（過去 7 天滾動視窗）
  → 存入 HBase 或 Redis（詞彙 → 頻率 映射）

【索引建立層（離線批次，每日）】
  搜索頻率 DB → Spark 批次作業
  → 篩選 Top N 詞彙（如 Top 500 萬個）
  → 建立 Trie 資料結構
  → 序列化並上傳到物件儲存（S3）

【服務層（線上服務）】
  Trie Server（多副本，讀取 S3 中的 Trie）
  └── 每日熱更新（Blue-Green 切換新版 Trie）
  Redis 快取（熱點前綴的搜索結果）
  Load Balancer → Trie Server

【請求流程】
  用戶輸入 "sys" → API Gateway
  → 先查 Redis（命中率 ~95%）
  → Cache Miss：查 Trie Server（&lt; 5ms）
  → 返回 Top 5 建議詞</code></pre>

  <h3>核心資料結構：Trie（前綴樹）</h3>
  <p>
    Trie 是為前綴查詢優化的樹狀資料結構。每個節點代表一個字符，
    從根到葉節點的路徑代表一個完整詞彙。
  </p>
  <pre data-lang="text"><code class="language-text">Trie 結構（包含 "system", "sys", "syscall", "sync"）：

root
└── s
    └── y
        └── s
            ├── （詞彙終點：score=10000）← "sys"
            ├── t
            │   └── e
            │       └── m
            │           └── （詞彙終點：score=50000）← "system"
            ├── c
            │   └── a
            │       └── l
            │           └── l
            │               └── （詞彙終點：score=5000）← "syscall"
            └── n
                └── c
                    └── （詞彙終點：score=8000）← "sync"

查詢前綴 "sys"：
→ 找到 "sys" 節點
→ 列出所有子節點的詞彙並按 score 排序
→ 返回：[system(50000), sys(10000), sync(8000), syscall(5000)]</code></pre>

  <h3>頻率統計設計</h3>
  <p>
    Trie 中每個詞彙的分數（score）來自搜索頻率統計。
    頻率統計系統需要解決幾個工程問題：
  </p>
  <pre data-lang="text"><code class="language-text">頻率統計的挑戰和解決方案：

問題 1：如何統計「最近 7 天」的搜索頻率？
  方案：滑動視窗計數（Sliding Window）
  Redis ZSet：member=詞彙，score=7 天內的搜索次數
  每次搜索：ZINCRBY search:freq "system design" 1
  每天：移除 7 天前的資料（需額外記錄每天的增量）
  或：使用 7 個桶（每天一個），每天清空最舊的桶並重建 ZSet

問題 2：如何處理極長尾的詞彙（數十億個唯一搜索詞）？
  方案：只追蹤 Top N 詞彙（如 Top 500 萬）
  Count-Min Sketch：使用有界的概率資料結構估算頻率，記憶體佔用是精確計數的 1/100
  實際應用：先用 Count-Min Sketch 過濾低頻詞，只對高頻詞精確計數

問題 3：如何防止刷量（Spam）？
  方案：同一用戶/IP 的相同搜索詞，在一定時間視窗內只計 1 次
  用 Redis 的 Bloom Filter 快速判斷是否需要去重</code></pre>

  <h3>個人化搜尋補全</h3>
  <p>
    基礎的 Typeahead 對所有用戶返回相同結果（全域熱門詞）。
    個人化補全則結合用戶個人的搜索歷史，提供更相關的建議：
  </p>
  <pre data-lang="text"><code class="language-text">個人化補全架構：

全域分數（Global Score）：
  所有用戶的搜索頻率統計
  "system design" → score: 500,000

個人化分數（Personalized Score）：
  用戶 A 的搜索歷史：曾多次搜索 "system design interview"
  → 對用戶 A，"system design interview" 的個人分數提高

混合排名：
  Final Score = α × Global Score + (1-α) × Personalized Score
  α = 0.7（70% 全域，30% 個人）

個人化資料存儲：
  用戶最近 30 天的搜索詞 → Redis（用戶維度的 ZSet）
  user:search:userA → {("system design", 5), ("kafka", 3), ...}

個人化補全流程：
  1. 查全域 Trie → 全域 Top 10 候選詞
  2. 查用戶搜索歷史（Redis）→ 過濾出符合前綴的個人詞彙
  3. 混合排名 → 返回最終 Top 5

隱私考量：
  - 個人化搜索記錄屬於敏感資料，需加密存儲
  - 提供「清除搜索歷史」功能
  - GDPR/台灣個資法要求用戶可以刪除個人資料</code></pre>

  <h3>分散式 Trie 的挑戰</h3>
  <p>
    單機 Trie 可以放進記憶體（英文詞彙的 Trie 通常只需幾 GB），
    但對於支援全球用戶的系統，需要以下優化：
  </p>
  <ul>
    <li>
      <strong>Trie 分片：</strong>按前綴分片（a-m 的詞彙放 Shard 1，n-z 放 Shard 2）
    </li>
    <li>
      <strong>快取熱點前綴：</strong>99% 的查詢都是常見前綴（如 "the", "a", "how"），
      將熱點前綴的查詢結果快取在 Redis，命中率可達 95% 以上
    </li>
    <li>
      <strong>離線更新 Trie：</strong>不在線上 Trie 上直接插入新詞彙（影響查詢效能）。
      改為：搜索日誌 → Kafka → Spark 批次統計詞頻 → 每週重建 Trie → 熱更新（Blue-Green 切換）
    </li>
  </ul>

  <h3>Elasticsearch Completion Suggester</h3>
  <p>
    如果不想自行實作 Trie，Elasticsearch 提供了內建的 Completion Suggester，
    底層也是基於 FST（Finite State Transducer，比 Trie 更緊湊）：
  </p>
  <pre data-lang="javascript"><code class="language-javascript">// 建立 Index 時定義 Completion 欄位
PUT /search_terms
{
  "mappings": {
    "properties": {
      "suggest": {
        "type": "completion"  // 特殊的 Completion 類型
      },
      "weight": { "type": "integer" }
    }
  }
}

// 索引詞彙
POST /search_terms/_doc
{
  "suggest": {
    "input": ["system design", "system"],
    "weight": 50000  // 搜索頻率作為權重
  }
}

// 查詢（極低延遲，通常 &lt; 5ms）
POST /search_terms/_search
{
  "suggest": {
    "completion": {
      "prefix": "sys",
      "completion": {
        "field": "suggest",
        "size": 5
      }
    }
  }
}</code></pre>

  <h3>與後面章節的連接</h3>
  <p>
    本章介紹的是搜索系統的核心元件：倒排索引、文字處理、相關性評分、Elasticsearch 架構，
    以及 Typeahead 的基礎思路。這些是系統設計面試中「設計搜索功能」題目的核心知識。
  </p>
  <p>在後續章節中，我們將深入探討幾個重要的延伸主題：</p>
  <ul>
    <li>
      <strong>第 21 章：設計搜索自動補全系統</strong>——完整的分散式 Trie 設計、
      每日 Trie 更新流程（資料管道 → 批次計算 → Trie 建立 → 熱更新）、
      個人化補全的完整實現、以及如何在每秒百萬次查詢下保持 &lt;100ms 延遲。
    </li>
    <li>
      <strong>第 22 章：設計 YouTube / Netflix 搜索</strong>——如何處理影片的多語言元資料、
      基於用戶觀看行為的個人化排名、以及 A/B Testing 搜索相關性改進。
    </li>
  </ul>
  <callout-box type="tip" title="面試答題框架">
    面試中被問到「設計搜索功能」時，建議的答題框架：
    1) 釐清功能需求（全文搜索 vs 精確匹配？是否需要 Autocomplete？排名如何？）；
    2) 資料索引方案（倒排索引、Elasticsearch 選型、資料同步方式）；
    3) 查詢服務設計（Scatter-Gather、快取策略、分頁設計）；
    4) 相關性優化（BM25 基礎排名 → 個人化 → 向量搜索升級）；
    5) 系統可靠性（Shard 數量規劃、ES 不是 Source of Truth）。
  </callout-box>
</section>
`,
} satisfies ChapterContent;
