import type { ChapterContent } from '../../types.js';

export default {
  title: 'Agent 記憶與知識系統設計',
  content: `
<section id="rag-architecture">
  <h2>RAG（Retrieval-Augmented Generation）架構</h2>
  <p>RAG 是解決 LLM 知識時效性問題的核心技術。LLM 的訓練資料有截止日期，且無法包含企業的私有知識。RAG 透過在生成回應前先檢索相關文件，讓 LLM 能夠利用最新的、特定領域的知識回答問題，同時大幅降低幻覺（Hallucination）的發生率。</p>

  <arch-diagram src="./diagrams/ch25-rag-architecture.json" caption="完整 RAG 系統架構：Indexing Pipeline + Retrieval Pipeline"></arch-diagram>

  <h3>RAG Pipeline 完整設計：Indexing + Retrieval + Generation</h3>

  <p>一個完整的 RAG 系統由兩個相互獨立的 Pipeline 組成：</p>

  <h4>Indexing Pipeline（離線執行，通常是批次或增量更新）</h4>
  <ol>
    <li><strong>文件載入（Document Loading）</strong>：從來源系統（S3、Confluence、資料庫）讀取原始文件。</li>
    <li><strong>文件解析（Document Parsing）</strong>：將 PDF、Word、HTML 等格式轉換為純文字，保留結構資訊（標題層級、表格）。</li>
    <li><strong>文件分塊（Chunking）</strong>：將長文件切割為適合 LLM 處理的小段落（詳見 Chunking 策略章節）。</li>
    <li><strong>向量化（Embedding）</strong>：使用 Embedding 模型將每個 chunk 轉換為高維向量。</li>
    <li><strong>儲存（Indexing）</strong>：將向量和原始文字存入向量資料庫，建立搜尋索引。</li>
  </ol>

  <h4>Retrieval + Generation Pipeline（線上執行，每次查詢觸發）</h4>
  <ol>
    <li><strong>查詢理解（Query Understanding）</strong>：解析使用者意圖，必要時進行查詢擴展或重寫。</li>
    <li><strong>向量搜尋（Vector Search）</strong>：將查詢向量化，在向量資料庫中找出語意最相似的 chunks。</li>
    <li><strong>重排序（Reranking）</strong>（可選但推薦）：使用 Cross-encoder 模型對初步召回結果重新排序，提升精確率。</li>
    <li><strong>Context 注入（Context Augmentation）</strong>：將檢索到的 chunks 格式化並注入 LLM Prompt。</li>
    <li><strong>生成（Generation）</strong>：LLM 基於原始問題 + 注入的 context 生成回應。</li>
  </ol>

  <pre data-lang="python"><code class="language-python">
class RAGPipeline:
    """完整的 RAG 流程實作"""

    def __init__(
        self,
        vector_db: VectorDatabase,
        embedder: EmbeddingModel,
        llm: LLM,
        reranker: Reranker | None = None,
        bm25: BM25Retriever | None = None  # 混合搜尋
    ):
        self.vector_db = vector_db
        self.embedder = embedder
        self.llm = llm
        self.reranker = reranker
        self.bm25 = bm25

    async def query(
        self,
        question: str,
        top_k: int = 5,
        metadata_filters: dict | None = None
    ) -> RAGResponse:
        # 階段 1：查詢理解與擴展
        expanded_queries = await self._expand_query(question)

        # 階段 2：多查詢並行搜尋
        all_candidates = []
        search_tasks = [
            self._search_single_query(q, metadata_filters, top_k * 2)
            for q in expanded_queries
        ]
        results = await asyncio.gather(*search_tasks)
        for r in results:
            all_candidates.extend(r)

        # 去重
        seen_ids = set()
        unique_candidates = []
        for c in all_candidates:
            if c.chunk_id not in seen_ids:
                seen_ids.add(c.chunk_id)
                unique_candidates.append(c)

        # 階段 3：Reranking（用更精確的模型重新排序）
        if self.reranker and len(unique_candidates) > top_k:
            chunks = await self.reranker.rerank(
                query=question,
                documents=[c.content for c in unique_candidates],
                top_k=top_k
            )
        else:
            chunks = unique_candidates[:top_k]

        # 階段 4：Context 注入與生成
        context = self._format_context(chunks)
        prompt = self._build_rag_prompt(question, context)
        response = await self.llm.complete(prompt)

        return RAGResponse(
            answer=response.content,
            sources=[c.metadata for c in chunks],
            retrieval_scores=[c.score for c in chunks],
            query_expanded_to=expanded_queries
        )

    async def _expand_query(self, question: str) -> list[str]:
        """查詢擴展：生成多個角度的查詢，提升召回率"""
        expansion_prompt = f"""
        為以下問題生成 3 個不同角度的搜尋查詢（包含原始問題）。
        每個查詢應該從不同的角度表達相同的資訊需求。
        只回傳查詢列表，每行一個，不需要解釋。

        原始問題：{question}
        """
        response = await self.llm.complete(expansion_prompt)
        queries = [question] + [
            q.strip() for q in response.content.split('\n')
            if q.strip() and q.strip() != question
        ][:3]  # 最多 4 個查詢（原始 + 3 個擴展）
        return queries

    def _build_rag_prompt(self, question: str, context: str) -> str:
        return f"""請根據以下提供的參考資料回答問題。
如果參考資料中沒有足夠的資訊，請說明「根據現有資料無法確定」，不要猜測或使用訓練資料中的知識。
回答時請引用具體的來源（[來源 N]）。

參考資料：
{context}

問題：{question}

回答："""
  </code></pre>

  <h3>Naive RAG vs Advanced RAG vs Modular RAG</h3>
  <table>
    <thead>
      <tr><th>層次</th><th>特性</th><th>技術組成</th><th>適用場景</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Naive RAG</strong></td>
        <td>基礎三步驟：向量搜尋 → 注入 → 生成</td>
        <td>單一 Embedding 模型 + 向量 DB</td>
        <td>快速 POC、需求簡單的場景</td>
      </tr>
      <tr>
        <td><strong>Advanced RAG</strong></td>
        <td>加入查詢優化、Reranking、結果融合</td>
        <td>Hybrid Search + Cross-encoder Reranker + Query Rewriting</td>
        <td>生產環境，召回率要求高</td>
      </tr>
      <tr>
        <td><strong>Modular RAG</strong></td>
        <td>可插拔的模組化架構，動態選擇搜尋策略</td>
        <td>Router 決定使用哪種搜尋；Self-RAG 決定是否需要搜尋</td>
        <td>多樣化查詢類型、複雜企業知識庫</td>
      </tr>
    </tbody>
  </table>

  <h3>Hallucination 減少原理</h3>
  <p>RAG 降低幻覺的機制有三個層面：</p>
  <ul>
    <li><strong>知識錨定（Knowledge Grounding）</strong>：LLM 被要求「只基於提供的參考資料回答」，從 Prompt 層面限制其使用訓練資料中的可能錯誤知識。</li>
    <li><strong>來源引用（Citation）</strong>：要求 LLM 在回答中引用具體來源，使幻覺可被驗證和檢測。</li>
    <li><strong>「不知道」選項</strong>：明確告訴 LLM「如果資料不足，說不確定」，降低 LLM 強行編造答案的可能性。</li>
  </ul>

  <callout-box type="info" title="Advanced RAG 技術">
    基礎 RAG 之外，還有幾個進階技術值得了解：<br/>
    • <strong>HyDE（Hypothetical Document Embeddings）</strong>：先讓 LLM 生成一個假設的理想答案文件，再用這個文件的 embedding 做搜尋，比直接用問題 embedding 效果更好（特別是問題和答案的語言風格不同時）。<br/>
    • <strong>Multi-Query Retrieval</strong>：用 LLM 將一個問題改寫成多個不同角度的查詢，分別搜尋後合併結果，提升召回率。<br/>
    • <strong>Self-RAG</strong>：讓 LLM 自主決定「是否需要搜尋」、「搜尋結果是否有用」，形成自我反思的 RAG 循環。
  </callout-box>

  <h3>RAG 的常見問題與解決方案</h3>
  <table>
    <thead>
      <tr><th>問題</th><th>原因</th><th>解決方案</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>召回率低</td>
        <td>問題與文件的語意距離大（如問題用縮寫，文件用全名）</td>
        <td>查詢擴展（Multi-Query）、HyDE、同義詞擴展</td>
      </tr>
      <tr>
        <td>精確率低</td>
        <td>向量搜尋召回了語意相近但主題不相關的文件</td>
        <td>加入 BM25 關鍵字過濾（Hybrid Search）、Reranking</td>
      </tr>
      <tr>
        <td>答案幻覺</td>
        <td>LLM 不遵循 context，使用訓練資料中的舊知識</td>
        <td>強化 System Prompt 約束、加入引用驗證、Citation Checking</td>
      </tr>
      <tr>
        <td>Context 太長</td>
        <td>召回的 chunks 加起來超過 context window</td>
        <td>減少 top_k、縮小 chunk size、使用長 context 模型</td>
      </tr>
    </tbody>
  </table>
</section>

<section id="vector-database">
  <h2>向量資料庫選型與設計</h2>
  <p>向量資料庫是 RAG 系統的核心儲存元件，負責存放文件的 embedding 向量並支援高效的近似最近鄰搜尋（ANN, Approximate Nearest Neighbor）。選擇正確的向量資料庫對系統的性能、成本和可維護性有深遠影響。</p>

  <h3>向量資料庫全面比較（Pinecone/Weaviate/Qdrant/pgvector）</h3>
  <table>
    <thead>
      <tr><th>資料庫</th><th>類型</th><th>索引算法</th><th>Hybrid Search</th><th>適用場景</th><th>缺點</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>pgvector</strong></td>
        <td>PostgreSQL 擴展</td>
        <td>HNSW / IVFFlat</td>
        <td>需要自行組合 BM25</td>
        <td>已有 PostgreSQL，中小型專案</td>
        <td>超大規模（&gt;10M 向量）時性能不及專用 DB</td>
      </tr>
      <tr>
        <td><strong>Pinecone</strong></td>
        <td>完全托管雲端</td>
        <td>專有（HNSW 變種）</td>
        <td>是（Sparse-Dense）</td>
        <td>快速上線，不想維護基礎設施</td>
        <td>依賴第三方，成本高，無法自托管</td>
      </tr>
      <tr>
        <td><strong>Weaviate</strong></td>
        <td>開源可自托管</td>
        <td>HNSW</td>
        <td>是（內建 BM25 + 向量）</td>
        <td>需要 Hybrid Search 的場景，GraphQL 介面</td>
        <td>記憶體消耗高，配置複雜</td>
      </tr>
      <tr>
        <td><strong>Qdrant</strong></td>
        <td>開源（Rust 實作）</td>
        <td>HNSW</td>
        <td>是（Sparse + Dense）</td>
        <td>高性能、精確 Metadata 過濾</td>
        <td>社群相對較小，文件較少</td>
      </tr>
      <tr>
        <td><strong>Chroma</strong></td>
        <td>開源（本地優先）</td>
        <td>HNSW（基於 hnswlib）</td>
        <td>部分支援</td>
        <td>開發測試、小型專案</td>
        <td>生產環境擴展性有限，無分散式支援</td>
      </tr>
    </tbody>
  </table>

  <h3>HNSW 索引原理：為什麼能快速搜尋百萬向量？</h3>
  <p>HNSW（Hierarchical Navigable Small World）是向量搜尋的黃金標準算法，結合了「跳躍表（Skip List）」和「小世界網絡（Small World Network）」的思想：</p>

  <ul>
    <li><strong>分層圖結構</strong>：HNSW 建立多層圖，頂層圖節點稀疏（長程跳躍），底層圖節點密集（精確搜尋）。搜尋時從頂層快速定位大致範圍，再逐層細化。</li>
    <li><strong>貪心搜尋</strong>：在每一層中，從隨機入口點出發，貪心地向目標向量靠近，直到找到局部最優。</li>
    <li><strong>O(log n) 複雜度</strong>：理論搜尋複雜度約為 O(log n)，對 100 萬向量的搜尋通常在 1-5ms 內完成。</li>
  </ul>

  <table>
    <thead>
      <tr><th>HNSW 參數</th><th>說明</th><th>建議值</th><th>影響</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><code>M</code>（連接數）</td>
        <td>每個節點的最大鄰居數</td>
        <td>16–64</td>
        <td>越大，搜尋更精確但記憶體更多</td>
      </tr>
      <tr>
        <td><code>ef_construction</code></td>
        <td>建索引時的動態候選清單大小</td>
        <td>64–200</td>
        <td>越大，索引品質越好但建索引越慢</td>
      </tr>
      <tr>
        <td><code>ef_search</code></td>
        <td>搜尋時的動態候選清單大小</td>
        <td>50–200</td>
        <td>越大，召回率越高但延遲越長</td>
      </tr>
    </tbody>
  </table>

  <h3>ANN vs Exact Search 的選擇</h3>
  <p>向量搜尋本質上需要在精確度和速度之間權衡：</p>

  <ul>
    <li><strong>Exact Search（精確搜尋）</strong>：遍歷所有向量計算距離，100% 精確但時間複雜度 O(n)。適合向量數量 &lt; 10,000 的場景（如 Chroma 在測試環境的預設行為）。</li>
    <li><strong>ANN（近似最近鄰）</strong>：犧牲一點精確度（通常 95%+ 召回率）換取極大的速度提升（100–1000 倍）。HNSW 是最常用的 ANN 算法，生產環境的向量資料庫幾乎全部使用 ANN。</li>
  </ul>

  <callout-box type="info" title="ANN 的「精確度損失」有多大？">
    在典型的 RAG 場景中，HNSW（ef_search=50）的召回率通常在 95-99%，意味著每 100 個「正確答案」中，有 1-5 個可能被遺漏。對於 RAG 應用，這種損失通常是可接受的，因為你召回了 top_k=5 個結果，只要其中包含答案即可（Recall@K 而非 Recall@1）。
  </callout-box>

  <h3>Metadata Filtering 的設計</h3>
  <p>在多租戶或有嚴格存取控制的系統中，Metadata Filtering 是必須正確設計的功能——確保使用者只能搜尋到他們有權限存取的文件：</p>

  <pre data-lang="python"><code class="language-python">
# pgvector 使用範例（附帶 Metadata 過濾）
from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, String, Integer, Index
from sqlalchemy.dialects.postgresql import JSONB

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True)
    doc_id = Column(String, index=True)
    content = Column(String)
    # 1536 維是 text-embedding-3-small 的維度
    embedding = Column(Vector(1536))
    # Metadata 用於過濾（user_id, org_id, doc_type, created_at 等）
    metadata = Column(JSONB)

    # HNSW 索引（只對向量列建索引，Metadata 過濾用常規 B-tree 索引）
    __table_args__ = (
        Index(
            'ix_embedding_hnsw',
            'embedding',
            postgresql_using='hnsw',
            postgresql_with={'m': 16, 'ef_construction': 64},
            postgresql_ops={'embedding': 'vector_cosine_ops'}
        ),
        # 為常用過濾欄位建立複合索引
        Index('ix_metadata_org_user',
              metadata["org_id"].astext,
              metadata["user_id"].astext),
    )


async def similarity_search_with_filters(
    session: AsyncSession,
    query_vector: list[float],
    org_id: str,
    user_id: str,
    doc_types: list[str] | None = None,
    top_k: int = 5,
    similarity_threshold: float = 0.75
) -> list[dict]:
    """
    帶使用者權限過濾的相似度搜尋
    過濾順序：先過濾 Metadata，再計算向量距離（利用索引）
    """
    query = (
        select(
            DocumentChunk,
            # 計算餘弦相似度（pgvector 使用 <=> 算子）
            (1 - DocumentChunk.embedding.cosine_distance(query_vector)).label('similarity')
        )
        .where(
            # 存取控制過濾（必須在向量搜尋前過濾）
            DocumentChunk.metadata["org_id"].astext == org_id,
        )
        .where(
            # 用戶級別過濾（公開文件 OR 使用者自己的文件）
            or_(
                DocumentChunk.metadata["visibility"].astext == "public",
                DocumentChunk.metadata["owner_id"].astext == user_id
            )
        )
    )

    # 可選的文件類型過濾
    if doc_types:
        query = query.where(
            DocumentChunk.metadata["doc_type"].astext.in_(doc_types)
        )

    # 按相似度排序並限制數量
    query = (
        query
        .order_by(DocumentChunk.embedding.cosine_distance(query_vector))
        .limit(top_k * 2)  # 多取一些，後面根據相似度閾值過濾
    )

    results = await session.execute(query)
    rows = results.all()

    # 過濾低相似度結果
    filtered = [
        {"chunk": row.DocumentChunk, "similarity": row.similarity}
        for row in rows
        if row.similarity >= similarity_threshold
    ]

    return filtered[:top_k]
  </code></pre>

  <h3>Embedding 模型選型</h3>
  <table>
    <thead>
      <tr><th>模型</th><th>維度</th><th>多語言</th><th>成本</th><th>推薦場景</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>text-embedding-3-small</td>
        <td>1536</td>
        <td>是</td>
        <td>低（$0.02/M tokens）</td>
        <td>通用場景，性價比最高</td>
      </tr>
      <tr>
        <td>text-embedding-3-large</td>
        <td>3072</td>
        <td>是</td>
        <td>中（$0.13/M tokens）</td>
        <td>需要高精確度的搜尋</td>
      </tr>
      <tr>
        <td>BGE-M3（開源）</td>
        <td>1024</td>
        <td>是（100+ 語言）</td>
        <td>自托管</td>
        <td>中文搜尋效果優異，自托管節省成本</td>
      </tr>
      <tr>
        <td>Cohere Embed v3</td>
        <td>1024</td>
        <td>是</td>
        <td>中</td>
        <td>支援 int8 壓縮，節省儲存空間</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="warning" title="Embedding 模型一致性原則">
    索引時使用的 Embedding 模型必須與查詢時完全相同。更換 Embedding 模型意味著需要重新計算所有文件的向量（全量重新索引），這在大型知識庫中可能需要數小時甚至數天。在部署前，應通過評估集（Eval Set）充分測試 Embedding 模型的效果再做決定。
  </callout-box>
</section>

<section id="chunking-strategies">
  <h2>Chunking 策略</h2>
  <p>Chunking（文件分塊）是 RAG 系統性能的關鍵因素，直接影響召回率和精確率。一個反直覺的發現是：<strong>更小的 chunk 通常有更高的搜尋精確率</strong>（因為語意更集中），但需要搭配父子分塊策略來確保 LLM 生成時有足夠的上下文。</p>

  <h3>Chunk Size 對召回率的影響</h3>
  <table>
    <thead>
      <tr><th>Chunk Size</th><th>召回精確率</th><th>上下文完整性</th><th>計算成本</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>128 tokens</td>
        <td>高（語意集中）</td>
        <td>低（可能缺少關鍵上下文）</td>
        <td>低</td>
      </tr>
      <tr>
        <td>256–512 tokens</td>
        <td>中高</td>
        <td>中（通常包含完整段落）</td>
        <td>中</td>
      </tr>
      <tr>
        <td>1024 tokens</td>
        <td>中（語意較模糊）</td>
        <td>高</td>
        <td>高</td>
      </tr>
      <tr>
        <td>2048+ tokens</td>
        <td>低（一個 chunk 包含多個主題）</td>
        <td>非常高</td>
        <td>非常高</td>
      </tr>
    </tbody>
  </table>

  <p>業界最佳實踐通常採用 256–512 tokens 的搜尋 chunk，搭配 1024–2048 tokens 的父 chunk（Parent Chunk）供 LLM 生成時使用。</p>

  <h3>Fixed-size Chunking（固定大小分塊）</h3>
  <p>最簡單的策略：按 token 數或字元數強制分割。通常設定 <strong>512 tokens</strong> 每塊，搭配 <strong>50–100 tokens 的重疊（overlap）</strong>，確保語意不在邊界處斷裂。</p>

  <pre data-lang="python"><code class="language-python">
from langchain.text_splitter import RecursiveCharacterTextSplitter

def fixed_size_chunking(
    text: str,
    chunk_size: int = 512,
    overlap: int = 64
) -> list[str]:
    """
    固定大小分塊，使用遞歸字元分割器
    分割優先順序：段落（\\n\\n）→ 句子（\\n）→ 標點（。！？）→ 空格 → 字元
    這確保分塊優先在自然邊界（段落、句子）處分割
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=overlap,
        separators=["\n\n", "\n", "。", "！", "？", "；", "，", " ", ""],
        # 使用 tiktoken 計算真實 token 數（而非字元數）
        length_function=count_tokens
    )
    return splitter.split_text(text)
  </code></pre>

  <h3>Semantic Chunking（語意分塊）</h3>
  <p>語意分塊不按固定大小切割，而是根據語意相似度的變化點來切割。當相鄰句子的 embedding 距離超過閾值時，代表主題發生了轉換，此處設為切割點：</p>

  <pre data-lang="python"><code class="language-python">
import numpy as np
from scipy.signal import find_peaks

async def semantic_chunking(
    text: str,
    embedder: EmbeddingModel,
    breakpoint_percentile: float = 95.0,
    min_chunk_size: int = 100,   # 最小 chunk 大小（避免過短碎片）
    max_chunk_size: int = 1000   # 最大 chunk 大小（避免過長）
) -> list[str]:
    """
    語意分塊：基於相鄰句子 embedding 餘弦距離的突變點切割
    適合論文、技術文件等有清晰主題轉換的內容
    """
    # 1. 分句（支援中文句末標點）
    sentences = re.split(r'(?<=[。！？\n])\s*', text.strip())
    sentences = [s.strip() for s in sentences if s.strip()]

    if len(sentences) < 3:
        return [text]  # 太短，不分割

    # 2. 批次計算句子 embedding（提高效率）
    embeddings = await embedder.embed_batch(sentences)

    # 3. 計算相鄰句子間的語意距離
    distances = []
    for i in range(len(embeddings) - 1):
        # 使用餘弦距離（值越大代表語意越不相關）
        dist = 1 - cosine_similarity(embeddings[i], embeddings[i + 1])
        distances.append(dist)

    # 4. 平滑距離序列（減少噪音影響）
    smoothed_distances = smooth(distances, window_size=3)

    # 5. 找到距離突增的切割點
    threshold = np.percentile(smoothed_distances, breakpoint_percentile)
    breakpoints = [
        i + 1 for i, d in enumerate(smoothed_distances)
        if d > threshold
    ]

    # 6. 按切割點組合句子為 chunks
    chunks = []
    start = 0
    for bp in breakpoints:
        chunk = " ".join(sentences[start:bp])
        # 確保 chunk 大小在合理範圍內
        if count_tokens(chunk) >= min_chunk_size:
            chunks.append(chunk)
        else:
            # 太短：延伸到下一個切割點
            continue
        start = bp

    # 最後一個 chunk
    if start < len(sentences):
        chunks.append(" ".join(sentences[start:]))

    return chunks
  </code></pre>

  <h3>Recursive Chunking（遞歸分塊）</h3>
  <p>遞歸分塊是最平衡的策略，優先在文件的自然結構邊界（標題、段落）分塊，只在必要時才在句子或字元層面分塊：</p>

  <pre data-lang="python"><code class="language-python">
class RecursiveChunker:
    """
    遞歸分塊器：按文件結構層次遞歸切割
    處理 Markdown 文件時效果最佳
    """

    def chunk_markdown(self, text: str, max_chunk_size: int = 512) -> list[Chunk]:
        chunks = []
        # 按標題層次分割（H1 > H2 > H3 > 段落）
        sections = self._split_by_headers(text)

        for section in sections:
            if count_tokens(section.content) <= max_chunk_size:
                chunks.append(Chunk(
                    content=section.content,
                    metadata={
                        "section_title": section.title,
                        "header_level": section.level
                    }
                ))
            else:
                # 遞歸：繼續按段落分割
                sub_chunks = self._split_by_paragraphs(
                    section.content, max_chunk_size
                )
                for sc in sub_chunks:
                    # 繼承父節的標題資訊（重要！幫助 LLM 理解上下文）
                    chunks.append(Chunk(
                        content=sc,
                        metadata={
                            "section_title": section.title,
                            "header_level": section.level
                        }
                    ))
        return chunks
  </code></pre>

  <h3>Overlap 設計的原理</h3>
  <p>Chunk Overlap 是在相鄰 chunks 之間保留重疊的文字，目的是防止在 chunk 邊界處的語意斷裂：</p>
  <ul>
    <li><strong>無 Overlap（overlap=0）</strong>：最節省儲存空間，但可能在句子中間切斷，導致關鍵資訊被分割到兩個 chunk 中，兩個都搜尋不到。</li>
    <li><strong>Overlap 50–100 tokens</strong>：業界最常見的設置。確保相鄰 chunk 的邊界有足夠的語意連接。</li>
    <li><strong>Overlap &gt; 20%</strong>：過大的 overlap 會增加儲存成本和計算成本，且向量搜尋可能返回內容幾乎相同的多個 chunk，浪費 context window。</li>
  </ul>

  <h3>表格和代碼的特殊處理</h3>
  <p>表格和代碼塊是普通文字分塊算法最容易出錯的地方，需要專門處理：</p>

  <pre data-lang="python"><code class="language-python">
class SpecialContentHandler:
    """處理表格、代碼塊等特殊內容格式"""

    def chunk_with_special_content(self, text: str) -> list[Chunk]:
        chunks = []
        # 使用正則匹配特殊內容區塊
        pattern = r'(\`\`\`[\s\S]*?\`\`\`|<table[\s\S]*?</table>|\|.*\|[\s\S]*?\n\n)'
        parts = re.split(pattern, text)

        for part in parts:
            if part.startswith('\`\`\`'):
                # 代碼塊：不分割，整塊保留
                language = re.match(r'\`\`\`(\w*)', part)
                chunks.append(Chunk(
                    content=part,
                    metadata={
                        "content_type": "code",
                        "language": language.group(1) if language else "unknown",
                        "skip_chunking": True  # 標記不要進一步分割
                    }
                ))
            elif part.startswith('|') or '<table' in part:
                # 表格：不分割，但生成一個文字描述作為搜尋用的 embedding
                table_description = self._describe_table(part)
                chunks.append(Chunk(
                    content=part,
                    embed_content=table_description,  # 用描述計算 embedding，保留原始表格
                    metadata={"content_type": "table"}
                ))
            elif part.strip():
                # 普通文字：使用標準分塊
                text_chunks = fixed_size_chunking(part, chunk_size=512)
                chunks.extend([
                    Chunk(content=c, metadata={"content_type": "text"})
                    for c in text_chunks
                ])

        return chunks

    def _describe_table(self, table_html_or_md: str) -> str:
        """讓 LLM 生成表格的自然語言描述，用於計算 embedding"""
        # 這個描述用於向量搜尋，原始表格用於 LLM 生成時的 context
        # 範例：「這是一個比較不同向量資料庫的表格，包含名稱、類型、性能等欄位」
        return llm.complete(
            f"請用一句話描述以下表格的內容和用途：\n{table_html_or_md[:500]}"
        )
  </code></pre>

  <callout-box type="tip" title="父子分塊（Parent-Child Chunking）設計">
    一種高效的策略是維護兩種大小的 chunk：<br/>
    • <strong>子 chunk（Child Chunk，128 tokens）</strong>：用於向量搜尋，小 chunk 精確度更高<br/>
    • <strong>父 chunk（Parent Chunk，512 tokens）</strong>：搜尋命中子 chunk 後，回傳其父 chunk 給 LLM，提供更完整的上下文<br/>
    這種「用小 chunk 搜索，用大 chunk 生成」的策略可以同時提升精確率和上下文品質。實作時，在子 chunk 的 metadata 中儲存 <code>parent_chunk_id</code>，搜尋命中後查詢父 chunk。
  </callout-box>
</section>

<section id="hybrid-search">
  <h2>Hybrid Search：向量 + 關鍵字</h2>
  <p>純向量搜尋（Dense Retrieval）在語意理解上表現優異，但對精確關鍵字匹配（如產品型號 "iPhone 15 Pro Max"、API 函式名稱、特定日期）效果較差。Hybrid Search 結合了向量搜尋的語意理解和 BM25 的精確關鍵字匹配，在大多數場景都有更好的表現。</p>

  <h3>Dense + Sparse 混合搜尋原理</h3>

  <table>
    <thead>
      <tr><th>搜尋方法</th><th>向量類型</th><th>優勢</th><th>劣勢</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Dense Retrieval（向量搜尋）</strong></td>
        <td>Dense Vector（密集向量，每個維度都有值）</td>
        <td>語意理解強，同義詞、近義詞效果好</td>
        <td>精確關鍵字匹配弱（"API v2.3.1" 可能搜不到）</td>
      </tr>
      <tr>
        <td><strong>Sparse Retrieval（BM25）</strong></td>
        <td>Sparse Vector（稀疏向量，大部分維度為 0）</td>
        <td>精確詞彙匹配，可解釋性強</td>
        <td>不理解語意，「買車」和「購買汽車」可能視為不同</td>
      </tr>
      <tr>
        <td><strong>Hybrid Search</strong></td>
        <td>兩者結合</td>
        <td>兼顧語意理解和精確匹配</td>
        <td>系統複雜度較高，需要設計融合策略</td>
      </tr>
    </tbody>
  </table>

  <h3>BM25 + Embedding Fusion（Reciprocal Rank Fusion）</h3>
  <p>RRF（Reciprocal Rank Fusion）是合併多個搜尋結果排名的黃金標準，不需要對不同系統的分數進行歸一化，魯棒性強：</p>

  <pre data-lang="python"><code class="language-python">
from rank_bm25 import BM25Okapi
import jieba  # 中文分詞

class BM25Retriever:
    def __init__(self, documents: list[str]):
        # 對中文文件進行分詞
        tokenized_docs = [list(jieba.cut(doc)) for doc in documents]
        self.bm25 = BM25Okapi(tokenized_docs)
        self.documents = documents

    def search(self, query: str, top_k: int = 20) -> list[tuple[str, float]]:
        tokenized_query = list(jieba.cut(query))
        scores = self.bm25.get_scores(tokenized_query)
        top_indices = sorted(
            range(len(scores)),
            key=lambda i: scores[i],
            reverse=True
        )[:top_k]
        # 過濾零分結果（完全不相關）
        return [
            (self.documents[i], scores[i])
            for i in top_indices
            if scores[i] > 0
        ]


def reciprocal_rank_fusion(
    *ranked_lists: list[tuple[str, float]],
    weights: list[float] | None = None,
    rrf_k: int = 60
) -> list[tuple[str, float]]:
    """
    RRF 合併多個搜尋結果排名
    rrf_k = 60 是業界經驗值，防止頂部排名的文件得分差距過大
    支援多個搜尋系統（不只是兩個）

    公式：RRF_score = Σ weight_i * 1/(k + rank_i)
    """
    if weights is None:
        weights = [1.0 / len(ranked_lists)] * len(ranked_lists)

    doc_scores: dict[str, float] = {}

    for ranked_list, weight in zip(ranked_lists, weights):
        for rank, (doc_id, _) in enumerate(ranked_list):
            rrf_score = weight * (1 / (rrf_k + rank + 1))
            doc_scores[doc_id] = doc_scores.get(doc_id, 0) + rrf_score

    return sorted(doc_scores.items(), key=lambda x: x[1], reverse=True)


class HybridSearchRetriever:
    def __init__(
        self,
        vector_db: VectorDatabase,
        bm25: BM25Retriever,
        embedder: EmbeddingModel,
        vector_weight: float = 0.7,   # 向量搜尋權重（語意理解）
        bm25_weight: float = 0.3      # BM25 權重（精確匹配）
    ):
        self.vector_db = vector_db
        self.bm25 = bm25
        self.embedder = embedder
        self.vector_weight = vector_weight
        self.bm25_weight = bm25_weight

    async def search(
        self,
        query: str,
        top_k: int = 5,
        metadata_filters: dict | None = None
    ) -> list[Chunk]:
        # 並行執行兩種搜尋（減少延遲）
        query_embedding = await self.embedder.embed(query)

        vector_task = asyncio.create_task(
            self.vector_db.search(
                query_embedding,
                top_k=top_k * 3,
                filters=metadata_filters
            )
        )
        bm25_task = asyncio.create_task(
            asyncio.to_thread(self.bm25.search, query, top_k=top_k * 3)
        )
        vector_results, bm25_results = await asyncio.gather(
            vector_task, bm25_task
        )

        # RRF 融合（帶權重）
        fused = reciprocal_rank_fusion(
            vector_results,
            bm25_results,
            weights=[self.vector_weight, self.bm25_weight]
        )

        # 取前 top_k 個結果，並從 DB 取回完整 chunk 內容
        top_ids = [doc_id for doc_id, _ in fused[:top_k]]
        return await self.vector_db.get_by_ids(top_ids)
  </code></pre>

  <h3>Reranking 模型（Cross-encoder）</h3>
  <p>向量搜尋（包括 Hybrid Search）使用的是 Bi-encoder（問題和文件分別編碼），計算效率高但精確度有限。Reranking 使用 Cross-encoder，將問題和候選文件<strong>一起</strong>輸入模型，精確度顯著更高，但速度較慢（因此只用於對初步召回結果重新排序）：</p>

  <pre data-lang="python"><code class="language-python">
from sentence_transformers import CrossEncoder

class CrossEncoderReranker:
    """
    Cross-encoder Reranker：對初步召回結果重新排序
    使用場景：對 Hybrid Search 召回的 top 20 結果重排序，取最終 top 5
    """

    def __init__(self, model_name: str = "BAAI/bge-reranker-v2-m3"):
        # BGE Reranker 是目前性能最好的開源多語言 Reranker
        self.model = CrossEncoder(model_name)

    async def rerank(
        self,
        query: str,
        documents: list[str],
        top_k: int = 5
    ) -> list[tuple[str, float]]:
        """
        對文件列表重新排序
        Cross-encoder 直接計算 (query, document) 對的相關性分數
        """
        # 構建輸入對
        pairs = [(query, doc) for doc in documents]

        # 批次推理（在 CPU 上也能在 100ms 內完成 20 個文件的重排序）
        scores = await asyncio.to_thread(
            self.model.predict, pairs, batch_size=16
        )

        # 按分數排序
        ranked = sorted(
            zip(documents, scores),
            key=lambda x: x[1],
            reverse=True
        )
        return ranked[:top_k]
  </code></pre>

  <h3>Query Expansion（查詢擴展）</h3>
  <p>Query Expansion 是在進行向量搜尋前，將原始查詢擴展為多個相關查詢，提升召回率的技術：</p>

  <table>
    <thead>
      <tr><th>擴展策略</th><th>原理</th><th>適用場景</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>同義詞擴展</strong></td>
        <td>「買車」→「購買汽車、車輛採購、購車」</td>
        <td>專業術語與口語表達差異大的領域</td>
      </tr>
      <tr>
        <td><strong>LLM 多視角改寫</strong></td>
        <td>用 LLM 生成 3 個不同角度的查詢，並行搜尋</td>
        <td>複雜問題、需要高召回率的場景</td>
      </tr>
      <tr>
        <td><strong>HyDE（假設文件）</strong></td>
        <td>讓 LLM 先生成一個假設性的理想答案，用答案的 embedding 搜尋</td>
        <td>問題和答案的語言風格差異大</td>
      </tr>
      <tr>
        <td><strong>Step-back Prompting</strong></td>
        <td>讓 LLM 先推導出更抽象的父問題，再搜尋父問題</td>
        <td>需要背景知識的具體問題</td>
      </tr>
    </tbody>
  </table>

  <h3>搜尋優化的量化指標</h3>
  <p>評估 RAG 系統的搜尋品質需要以下指標：</p>
  <ul>
    <li><strong>Recall@K</strong>：在前 K 個結果中，有多少比例包含了正確答案。目標通常是 Recall@5 &gt; 0.85。</li>
    <li><strong>MRR（Mean Reciprocal Rank）</strong>：正確答案排在第幾位的倒數平均值。MRR 越高代表正確答案排越前面。</li>
    <li><strong>NDCG（Normalized Discounted Cumulative Gain）</strong>：考慮排名位置的加權指標，越前面的正確結果得分越高。</li>
    <li><strong>Answer Faithfulness</strong>：LLM 生成的答案是否忠實於 context，由 LLM-as-Judge 或 NLI 模型評估（RAGAS 框架提供自動化評估）。</li>
  </ul>

  <callout-box type="warning" title="知識庫更新的挑戰">
    RAG 系統的知識庫需要持續更新。設計時需要考慮：<br/>
    • <strong>增量更新</strong>：只對修改的文件重新計算 embedding，而非全量重建。<br/>
    • <strong>刪除同步</strong>：文件從來源系統刪除時，向量資料庫中的對應 chunks 也要同步刪除（防止返回已刪除文件的內容）。<br/>
    • <strong>版本管理</strong>：同一文件的不同版本如何處理？建議以文件 ID + 版本號為 primary key。<br/>
    建議設計一個專門的「知識庫同步服務」，監聽來源系統的變更事件（如 S3 Event、Confluence Webhook），觸發增量索引更新。
  </callout-box>
</section>
`,
} satisfies ChapterContent;
