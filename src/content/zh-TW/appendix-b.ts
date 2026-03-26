import type { ChapterContent } from '../../types.js';

export default {
  title: '附錄 B：常用工具與技術棧速查',
  content: `
<section id="tech-selection-table">
  <h2>各場景推薦技術選型</h2>
  <p>系統設計面試中，面試官期望你能快速選出適合場景的技術工具，並給出有依據的理由。本附錄提供按使用場景分類的技術選型速查表，覆蓋 10 大類別，幫助你在面試中做出快速、有依據的技術決策。記住：說出「為什麼選它，以及它的主要限制是什麼」，遠比只說工具名稱更有說服力。</p>

  <h3>1. 快取系統</h3>
  <table>
    <thead>
      <tr><th>工具</th><th>適用場景</th><th>核心優勢</th><th>主要限制</th><th>推薦使用情境</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Redis</strong></td>
        <td>通用快取、Session 儲存、分散式鎖、Rate Limiting、排行榜</td>
        <td>豐富資料類型（String/Hash/List/Set/ZSet）、Lua 腳本原子操作、Pub/Sub、持久化</td>
        <td>單執行緒（CPU 密集場景受限）；記憶體費用高；叢集模式下多 Key 事務複雜</td>
        <td>大多數需要快取的場景首選；需要計數器、分散式鎖、排行榜時必選</td>
      </tr>
      <tr>
        <td><strong>Memcached</strong></td>
        <td>簡單的鍵值快取、大量小物件、純快取場景</td>
        <td>多執行緒（更好的多核利用）；記憶體效率更高；運維更簡單</td>
        <td>僅支援字串；無持久化；無複製功能；無 Lua 腳本</td>
        <td>只需要簡單 K/V 快取、對多核利用率有要求、希望運維最簡單時</td>
      </tr>
      <tr>
        <td><strong>Caffeine（本地快取）</strong></td>
        <td>JVM 應用的本地快取；L1 快取層</td>
        <td>極低延遲（L1 Cache 級別）；無網路開銷；支援多種淘汰策略（W-TinyLFU）</td>
        <td>僅限單一 JVM 進程；多實例資料不一致；JVM 記憶體佔用</td>
        <td>Java 應用的熱點資料；讀取頻率極高（萬次/秒以上）；與 Redis 組成兩層快取</td>
      </tr>
      <tr>
        <td><strong>Varnish（HTTP 快取）</strong></td>
        <td>HTTP 回應快取；靜態資源；API 回應加速</td>
        <td>HTTP 語義感知；靈活的 VCL 配置語言；高效的頻寬利用</td>
        <td>只能快取 HTTP；HTTPS 需要額外配置；無法快取個人化內容</td>
        <td>自建 CDN 替代方案；需要細粒度 HTTP 快取控制；內部 API 閘道快取</td>
      </tr>
    </tbody>
  </table>

  <h3>2. 關聯式資料庫</h3>
  <table>
    <thead>
      <tr><th>工具</th><th>適用場景</th><th>核心優勢</th><th>主要限制</th><th>推薦使用情境</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>PostgreSQL</strong></td>
        <td>複雜查詢、ACID 事務、JSONB、全文搜尋、時序資料（TimescaleDB 擴充）</td>
        <td>功能最完整；豐富的擴充套件生態；強大的 JSONB 支援；活躍社群</td>
        <td>垂直擴展上限明顯；複雜的分片方案（需要 Citus）；複製配置比 MySQL 複雜</td>
        <td>面試中的預設選擇；需要 ACID、複雜 JOIN、PostGIS（地理資料）時必選</td>
      </tr>
      <tr>
        <td><strong>MySQL</strong></td>
        <td>Web 應用、電商、傳統業務系統</td>
        <td>成熟生態、豐富的運維工具（Percona Toolkit）；InnoDB 事務穩定；主從複製簡單</td>
        <td>JSONB 支援不如 PostgreSQL；全文搜尋能力較弱；部分 SQL 標準支援不完整</td>
        <td>既有系統大多使用 MySQL；業務功能以簡單 CRUD 為主時</td>
      </tr>
      <tr>
        <td><strong>CockroachDB</strong></td>
        <td>分散式 SQL、全球分散部署、需要 ACID 的水平擴展場景</td>
        <td>原生分散式；支援全球資料分布（Geo-partitioning）；PostgreSQL 協議相容；強一致性</td>
        <td>延遲比單節點 PostgreSQL 高；學習曲線；部分 PostgreSQL 功能不支援；成本較高</td>
        <td>需要全球分散、強一致性的金融系統；需要跨多資料中心的 ACID 事務</td>
      </tr>
      <tr>
        <td><strong>Amazon Aurora</strong></td>
        <td>AWS 雲端上的關聯式資料庫；需要高可用和自動擴展</td>
        <td>讀取節點可達 15 個；儲存自動擴展（最大 128 TB）；Serverless v2 自動擴縮</td>
        <td>廠商綁定；成本比自建 RDS 高；某些進階功能僅 Aurora 特有</td>
        <td>AWS 環境的生產資料庫首選；需要讀取擴展和自動 Failover</td>
      </tr>
    </tbody>
  </table>

  <h3>3. NoSQL 文件型資料庫</h3>
  <table>
    <thead>
      <tr><th>工具</th><th>適用場景</th><th>核心優勢</th><th>主要限制</th><th>推薦使用情境</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>MongoDB</strong></td>
        <td>半結構化資料、Schema 頻繁變更、嵌套文件、內容管理系統</td>
        <td>Schema 靈活；嵌套文件查詢；豐富的查詢運算符；地理位置索引；Atlas 雲服務</td>
        <td>JOIN 能力弱（需要 $lookup，效能差）；不支援多文件 ACID（需要版本 4.0+）；記憶體使用量高</td>
        <td>產品目錄、用戶設定、CMS；Schema 需要頻繁演化的場景</td>
      </tr>
      <tr>
        <td><strong>DynamoDB</strong></td>
        <td>AWS 雲端原生、超高 QPS、簡單 K/V 或 K/Sort-Key 查詢</td>
        <td>全託管；個位數毫秒延遲；無限水平擴展；On-demand 定價；DynamoDB Streams</td>
        <td>查詢模式受限（必須預先設計 Access Pattern）；強 AWS 綁定；跨分區查詢昂貴</td>
        <td>已知查詢模式的高吞吐量系統；AWS Serverless 架構；用戶 Session、事件日誌</td>
      </tr>
      <tr>
        <td><strong>Firestore</strong></td>
        <td>即時資料同步、移動應用後端、Firebase 生態</td>
        <td>即時監聽（Realtime Updates）；離線支援；Google Cloud 整合；安全規則</td>
        <td>查詢能力有限（不支援 OR 查詢組合）；費用按讀取/寫入次數計費；GCP 綁定</td>
        <td>移動應用需要即時資料同步；多人協作功能（如共享文件）</td>
      </tr>
    </tbody>
  </table>

  <h3>4. Wide-Column 資料庫</h3>
  <table>
    <thead>
      <tr><th>工具</th><th>適用場景</th><th>核心優勢</th><th>主要限制</th><th>推薦使用情境</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Apache Cassandra</strong></td>
        <td>時序資料、高寫入吞吐量（IoT、日誌）、訊息歷史、跨資料中心複製</td>
        <td>寫入極度優化（LSM-tree）；線性水平擴展；多資料中心複製；無單點故障</td>
        <td>不支援複雜 JOIN；讀取延遲比寫入高；Schema 設計必須以查詢為導向；運維複雜</td>
        <td>每秒百萬次寫入的時序場景；訊息系統的歷史記錄；多資料中心高可用</td>
      </tr>
      <tr>
        <td><strong>Apache HBase</strong></td>
        <td>大資料分析、Hadoop 生態、隨機讀寫的大型表格</td>
        <td>與 HDFS/Hadoop 深度整合；強一致性讀寫；支援大型稀疏表格；行級事務</td>
        <td>依賴 HDFS（複雜架構）；冷啟動延遲高；雲端選擇較少；學習曲線陡峭</td>
        <td>已有 Hadoop 生態的大資料平台；需要對大型表格做快速隨機讀寫</td>
      </tr>
    </tbody>
  </table>

  <h3>5. 訊息佇列與事件流</h3>
  <table>
    <thead>
      <tr><th>工具</th><th>適用場景</th><th>核心優勢</th><th>主要限制</th><th>推薦使用情境</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Apache Kafka</strong></td>
        <td>高吞吐量事件流、日誌收集、事件溯源、多消費者訂閱、CDC（Change Data Capture）</td>
        <td>分區式持久化；可重播歷史；高吞吐量（百萬 TPS）；豐富的 Connector 生態</td>
        <td>運維複雜（ZooKeeper/KRaft）；不支援訊息優先級；延遲略高於 RabbitMQ（ms 級）</td>
        <td>事件驅動架構的核心；需要多個消費者獨立消費相同事件流；事件溯源</td>
      </tr>
      <tr>
        <td><strong>RabbitMQ</strong></td>
        <td>任務佇列、工作分發、需要靈活路由（Exchange）、需要死信佇列（DLQ）</td>
        <td>靈活的路由（Direct/Topic/Fanout Exchange）；ACK 機制；豐富的插件；低延遲（微秒級）</td>
        <td>訊息不可重播（消費後刪除）；吞吐量低於 Kafka；需要專門運維</td>
        <td>後台任務分發（發送 Email、圖片處理）；需要複雜路由邏輯的場景</td>
      </tr>
      <tr>
        <td><strong>AWS SQS</strong></td>
        <td>雲端原生任務佇列、無伺服器 Lambda 觸發、簡單任務分發</td>
        <td>完全託管；與 Lambda/ECS 深度整合；自動伸縮；SQS FIFO 保證順序</td>
        <td>無 Pub/Sub（需配合 SNS）；不可重播；訊息最大 256 KB；延遲略高</td>
        <td>AWS 環境的任務佇列首選；Serverless 架構的非同步處理</td>
      </tr>
      <tr>
        <td><strong>Apache Pulsar</strong></td>
        <td>多租戶環境、需要同時支援佇列和流處理、地理複製</td>
        <td>原生多租戶；儲存和運算分離；同時支援 Queue 和 Stream 語義；跨資料中心複製</td>
        <td>生態不如 Kafka 成熟；學習曲線高；社群規模較小</td>
        <td>SaaS 平台需要嚴格的多租戶隔離；需要 Geo-replication 的訊息系統</td>
      </tr>
    </tbody>
  </table>

  <h3>6. 搜尋引擎</h3>
  <table>
    <thead>
      <tr><th>工具</th><th>適用場景</th><th>核心優勢</th><th>主要限制</th><th>推薦使用情境</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Elasticsearch</strong></td>
        <td>全文搜尋、Log 分析（ELK Stack）、複雜過濾聚合、地理位置搜尋</td>
        <td>豐富的查詢 DSL；強大的聚合功能；分散式架構；Kibana 視覺化</td>
        <td>資源消耗大；運維複雜（需要調整 JVM Heap）；不適合頻繁更新的資料</td>
        <td>電商商品搜尋；日誌分析平台；企業全文搜尋</td>
      </tr>
      <tr>
        <td><strong>OpenSearch</strong></td>
        <td>與 Elasticsearch 相似，但完全開源；AWS 雲端搜尋</td>
        <td>AWS 完全託管；與 Elasticsearch 7.x API 相容；無授權限制</td>
        <td>部分新特性落後於 Elasticsearch；AWS 綁定</td>
        <td>AWS 環境中的搜尋服務；不想被 Elastic 授權限制的場景</td>
      </tr>
      <tr>
        <td><strong>Meilisearch</strong></td>
        <td>簡單快速的全文搜尋、開發者工具搜尋、小型專案</td>
        <td>配置極簡（10 分鐘上線）；搜尋速度極快；錯字容忍；支援多語言</td>
        <td>不支援複雜聚合；分散式能力有限；資料量大（&gt;1 億文件）效能下降</td>
        <td>快速原型；文件搜尋；需要在一天內上線搜尋功能</td>
      </tr>
      <tr>
        <td><strong>Typesense</strong></td>
        <td>即時全文搜尋、自動完成（Auto-complete）、電商搜尋</td>
        <td>C++ 實作（記憶體效率高）；搜尋結果即時性強；配置比 ES 簡單；開源</td>
        <td>分析聚合能力有限；日誌分析不適用；社群比 ES 小</td>
        <td>需要即時搜尋建議（如輸入框自動完成）；中小型電商商品搜尋</td>
      </tr>
    </tbody>
  </table>

  <h3>7. 物件儲存</h3>
  <table>
    <thead>
      <tr><th>工具</th><th>適用場景</th><th>核心優勢</th><th>主要限制</th><th>推薦使用情境</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Amazon S3</strong></td>
        <td>圖片、影片、備份、靜態網站、資料湖</td>
        <td>11 個 9 耐久性；多儲存類別（Standard→Deep Archive）；生命週期管理；Pre-signed URL；Versioning</td>
        <td>Egress 費用高；強 AWS 綁定；非 VPC 存取有延遲</td>
        <td>AWS 環境的儲存首選；資料湖的基礎層；靜態資源分發</td>
      </tr>
      <tr>
        <td><strong>Google Cloud Storage（GCS）</strong></td>
        <td>與 BigQuery 整合的資料湖、多媒體儲存</td>
        <td>與 BigQuery/Dataflow 深度整合；全球統一命名空間；強一致性</td>
        <td>GCP 綁定；Egress 費用高</td>
        <td>GCP 環境的儲存；BigQuery 資料湖</td>
      </tr>
      <tr>
        <td><strong>Azure Blob Storage</strong></td>
        <td>Azure 環境的物件儲存</td>
        <td>與 Azure Data Factory/Synapse 整合；Blob 分層（Hot/Cool/Archive）</td>
        <td>Azure 綁定；S3 API 不完全相容</td>
        <td>Azure 環境首選；與 Microsoft 生態整合的企業系統</td>
      </tr>
      <tr>
        <td><strong>MinIO</strong></td>
        <td>私有雲、本地部署、Kubernetes 原生儲存</td>
        <td>S3 API 完全相容；開源自託管；Kubernetes Operator；高效能（可達 325 GB/s）</td>
        <td>需要自行運維；硬體成本；不如雲端服務的耐久性（需要自建冗餘）</td>
        <td>不能用公有雲的場景（資料主權、私有化部署）；本地開發模擬 S3</td>
      </tr>
    </tbody>
  </table>

  <h3>8. 向量資料庫</h3>
  <table>
    <thead>
      <tr><th>工具</th><th>適用場景</th><th>核心優勢</th><th>主要限制</th><th>推薦使用情境</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Pinecone</strong></td>
        <td>生產級 RAG、語意搜尋、推薦系統</td>
        <td>完全託管；低延遲 ANN 搜尋；支援 Metadata 過濾；Serverless 定價</td>
        <td>強廠商綁定；費用較高；不支援自託管</td>
        <td>快速上線 AI 應用；不想管理基礎設施；生產級 RAG 系統</td>
      </tr>
      <tr>
        <td><strong>Weaviate</strong></td>
        <td>多模態搜尋（文字+圖片+音頻）、知識圖譜結合向量搜尋</td>
        <td>支援多模態；原生 GraphQL API；模組化架構（可整合不同向量化模型）；開源</td>
        <td>資源消耗大；設定比 Qdrant 複雜；文件有時不夠清楚</td>
        <td>需要多模態搜尋；圖文結合的知識庫；有自託管需求</td>
      </tr>
      <tr>
        <td><strong>Qdrant</strong></td>
        <td>高效能向量搜尋、需要自託管的 RAG</td>
        <td>Rust 實作（高效能、低記憶體）；豐富的過濾條件；支援 On-disk 索引；開源</td>
        <td>社群比 Pinecone 小；雲服務功能不如 Pinecone 豐富</td>
        <td>效能敏感的向量搜尋；需要自託管控制成本；Kubernetes 部署</td>
      </tr>
      <tr>
        <td><strong>pgvector（PostgreSQL 擴充）</strong></td>
        <td>中小規模向量搜尋、已有 PostgreSQL 的系統</td>
        <td>零額外基礎設施（在現有 PostgreSQL 上啟用）；可以向量搜尋和關聯查詢組合</td>
        <td>百萬向量以上效能不如專用向量資料庫；ANN 準確性略低</td>
        <td>資料量 &lt;500 萬向量；希望用 SQL 結合向量搜尋；快速原型驗證</td>
      </tr>
    </tbody>
  </table>

  <h3>9. 監控與可觀測性</h3>
  <table>
    <thead>
      <tr><th>工具</th><th>適用場景</th><th>核心優勢</th><th>主要限制</th><th>推薦使用情境</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Prometheus + Grafana</strong></td>
        <td>基礎設施和應用指標監控、自建告警</td>
        <td>開源免費；豐富的 Exporter 生態；強大的 PromQL；Grafana 視覺化</td>
        <td>長期儲存需要 Thanos/Cortex；配置複雜；無分散式追蹤</td>
        <td>Kubernetes 環境的監控標準配置；需要自定義指標；成本敏感</td>
      </tr>
      <tr>
        <td><strong>Datadog</strong></td>
        <td>全棧可觀測性（APM + Infrastructure + Logs + Traces）</td>
        <td>Agent 自動發現；APM 開箱即用；AI 輔助告警（Watchdog）；介面友好</td>
        <td>費用高（高流量系統每月可達萬元美金）；Agent 在 Host 上消耗資源</td>
        <td>中大型工程團隊需要完整 Observability；願意付費換取低運維成本</td>
      </tr>
      <tr>
        <td><strong>New Relic</strong></td>
        <td>APM 為主的效能監控</td>
        <td>深度 APM 追蹤；程式碼層級效能分析；User Session 監控</td>
        <td>費用高；與 Datadog 相比整合深度稍遜</td>
        <td>以應用效能優化為主要目標；User Experience 監控</td>
      </tr>
      <tr>
        <td><strong>AWS CloudWatch</strong></td>
        <td>AWS 原生服務的監控和日誌</td>
        <td>與所有 AWS 服務原生整合；零配置獲取 EC2/RDS/Lambda 指標；Logs Insights 查詢</td>
        <td>AWS 綁定；Log 查詢效能差（大量日誌時）；視覺化能力不如 Grafana</td>
        <td>AWS 環境的基礎監控（通常與 Grafana 組合使用）；Lambda 函式監控</td>
      </tr>
    </tbody>
  </table>

  <h3>10. CI/CD 與部署</h3>
  <table>
    <thead>
      <tr><th>工具</th><th>適用場景</th><th>核心優勢</th><th>主要限制</th><th>推薦使用情境</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>GitHub Actions</strong></td>
        <td>GitHub 倉庫的 CI/CD；自動化工作流程</td>
        <td>與 GitHub 深度整合；豐富的 Marketplace Action；YAML 配置直觀；免費額度充足</td>
        <td>大型 Mono-repo 構建慢；自建 Runner 需要額外配置；Secrets 管理基礎</td>
        <td>大多數中小型 GitHub 專案的首選；開源專案 CI/CD</td>
      </tr>
      <tr>
        <td><strong>GitLab CI</strong></td>
        <td>GitLab 倉庫的 CI/CD；企業自託管需求</td>
        <td>與 GitLab 深度整合；自託管支援完整；Auto DevOps；Review Apps</td>
        <td>使用 GitHub 的團隊需要遷移倉庫；介面比 GitHub Actions 複雜</td>
        <td>使用 GitLab 的企業；需要完整自託管 CI/CD 的場景</td>
      </tr>
      <tr>
        <td><strong>ArgoCD</strong></td>
        <td>Kubernetes GitOps 部署；多叢集管理</td>
        <td>GitOps 原生（Git 即 Source of Truth）；視覺化 Kubernetes 資源狀態；自動同步</td>
        <td>僅適用於 Kubernetes；需要 Git 倉庫作為配置來源；學習曲線</td>
        <td>Kubernetes 環境的 CD 層；GitOps 工作流程；多叢集 Kubernetes 管理</td>
      </tr>
      <tr>
        <td><strong>Jenkins</strong></td>
        <td>複雜的 CI/CD Pipeline；遺留系統整合；需要完全控制</td>
        <td>高度可客製化；豐富的插件生態（1800+）；自託管完全控制</td>
        <td>運維負擔重；UI 老舊；安全漏洞需要持續更新；不如現代工具直觀</td>
        <td>已有 Jenkins 基礎設施的企業；需要特殊整合的遺留系統</td>
      </tr>
    </tbody>
  </table>
</section>

<section id="capacity-cheatsheet">
  <h2>容量估算速查卡</h2>
  <p>面試時快速估算是關鍵能力。以下速查卡整理了最常用的數字，建議熟記。在面試中，估算的「量級正確」比「精確」更重要——差一個數量級是問題，差 2 倍可以接受。</p>

  <h3>儲存單位換算表</h3>
  <table>
    <thead>
      <tr><th>單位</th><th>大小</th><th>約等於</th><th>記憶方式</th></tr>
    </thead>
    <tbody>
      <tr><td><strong>1 Byte</strong></td><td>8 bits</td><td>1 個 ASCII 字符</td><td>最小單位</td></tr>
      <tr><td><strong>1 KB</strong></td><td>1,024 Bytes ≈ 10³</td><td>一條推文（500字元）、一封短 Email</td><td>短文本</td></tr>
      <tr><td><strong>1 MB</strong></td><td>1,024 KB ≈ 10⁶</td><td>一張高解析縮圖、1000 條推文</td><td>一張圖片縮圖</td></tr>
      <tr><td><strong>1 GB</strong></td><td>1,024 MB ≈ 10⁹</td><td>一部高畫質電影、1 小時 1080p 影片</td><td>一部電影</td></tr>
      <tr><td><strong>1 TB</strong></td><td>1,024 GB ≈ 10¹²</td><td>500 小時高畫質影片、1000 部電影</td><td>個人硬碟上限</td></tr>
      <tr><td><strong>1 PB</strong></td><td>1,024 TB ≈ 10¹⁵</td><td>100 萬 GB；中等規模資料湖</td><td>大型資料湖</td></tr>
      <tr><td><strong>1 EB</strong></td><td>1,024 PB ≈ 10¹⁸</td><td>Facebook 每天處理 4 EB 資料</td><td>超大規模平台</td></tr>
    </tbody>
  </table>

  <h3>時間換算（容量估算必備）</h3>
  <table>
    <thead>
      <tr><th>時間單位</th><th>精確值</th><th>近似值（方便計算）</th><th>用途</th></tr>
    </thead>
    <tbody>
      <tr><td>1 分鐘</td><td>60 秒</td><td>60 秒</td><td>限流窗口</td></tr>
      <tr><td>1 小時</td><td>3,600 秒</td><td>3,600 秒（約 3.6K）</td><td>小時級 Rate Limiting</td></tr>
      <tr><td>1 天</td><td>86,400 秒</td><td>10 萬秒（估算用）</td><td><strong>最常用：QPS 計算的分母</strong></td></tr>
      <tr><td>1 月（30天）</td><td>2,592,000 秒</td><td>250 萬秒（約 2.5M）</td><td>月度費用計算</td></tr>
      <tr><td>1 年</td><td>31,536,000 秒</td><td>3,150 萬秒（約 31.5M）</td><td>年度增長估算</td></tr>
      <tr><td>3 年</td><td>94,608,000 秒</td><td>約 1 億秒</td><td>Reserved Instance 週期</td></tr>
    </tbody>
  </table>

  <h3>常用 QPS 估算公式</h3>
  <pre data-lang="python"><code class="language-python">
# ====== QPS 估算的黃金公式 ======
# 平均 QPS = DAU × 每用戶每日請求次數 ÷ 86,400

# 面試中常用的快速估算（記住這些數字）:
# - 1 億 DAU × 10 req/day ÷ 86,400 = 約 11,600 QPS（平均）
# - 峰值 = 平均 × 5–10（考慮流量峰谷比）

def qps_estimation(dau: int, requests_per_user_per_day: int,
                   peak_factor: float = 10.0) -> dict:
    avg_qps = dau * requests_per_user_per_day / 86_400
    return {
        "avg_qps":  round(avg_qps),
        "peak_qps": round(avg_qps * peak_factor),
    }

# 常見系統的 QPS 範圍（面試時的對照參考）
TYPICAL_QPS = {
    "小型 SaaS（1萬 DAU）":     qps_estimation(10_000,    50),
    "中型應用（100萬 DAU）":    qps_estimation(1_000_000, 50),
    "大型平台（1億 DAU）":      qps_estimation(100_000_000, 100),
    "Twitter 規模（3億 DAU）":  qps_estimation(300_000_000, 60),
}
# 小型: avg 5.8 QPS, peak 58 QPS
# 中型: avg 578 QPS, peak 5,787 QPS
# 大型: avg 115,740 QPS, peak 1,157,407 QPS
# Twitter 規模: avg 208,333 QPS, peak 2,083,333 QPS


# ====== 儲存增長估算 ======
def storage_estimation(
    writes_per_day: int,           # 每天新增的寫入次數
    bytes_per_write: int,          # 每次寫入的大小（bytes）
    retention_years: int = 5,      # 保留年數
    replication_factor: int = 3,   # 複製因子
) -> dict:
    raw_per_day = writes_per_day * bytes_per_write
    raw_total   = raw_per_day * 365 * retention_years
    with_replication = raw_total * replication_factor

    return {
        "每日新增":       f"{raw_per_day / 1e9:.1f} GB",
        "5年原始總量":    f"{raw_total / 1e12:.1f} TB",
        "5年含複製總量":  f"{with_replication / 1e12:.1f} TB",
    }

# 示例：Twitter-like 系統
# 1 億用戶每天發 10 條推文，每條 500 bytes
twitter_storage = storage_estimation(
    writes_per_day=1_000_000_000,  # 10億條推文/天
    bytes_per_write=500,
    retention_years=5,
)
# 結果：每日新增 500 GB，5年原始 912 TB，含複製 2.7 PB
  </code></pre>

  <h3>Jeff Dean 延遲數字表（每個工程師都應該記住）</h3>
  <table>
    <thead>
      <tr><th>操作</th><th>延遲</th><th>記憶倍率</th><th>面試應用場景</th></tr>
    </thead>
    <tbody>
      <tr><td>L1 Cache 讀取</td><td>1 ns</td><td>基準</td><td>—</td></tr>
      <tr><td>L2 Cache 讀取</td><td>4 ns</td><td>4× L1</td><td>—</td></tr>
      <tr><td>L3 Cache 讀取</td><td>40 ns</td><td>40× L1</td><td>—</td></tr>
      <tr><td>Main Memory（RAM）讀取</td><td>100 ns</td><td>100× L1</td><td>Redis 操作的下限參考</td></tr>
      <tr><td>Redis 讀取（本機）</td><td>&lt;1 ms</td><td>—</td><td>快取目標延遲</td></tr>
      <tr><td>NVMe SSD 隨機讀取</td><td>100 µs（0.1ms）</td><td>1000× RAM</td><td>—</td></tr>
      <tr><td>SSD 隨機讀取</td><td>1 ms</td><td>—</td><td>資料庫有索引查詢的參考值</td></tr>
      <tr><td>PostgreSQL 簡單查詢（有索引）</td><td>1–5 ms</td><td>—</td><td>資料庫查詢延遲基準</td></tr>
      <tr><td>HDD 隨機讀取（Seek）</td><td>10 ms</td><td>10000× RAM</td><td>說明為什麼 SSD 重要</td></tr>
      <tr><td>同機房網路 Round Trip</td><td>0.5 ms</td><td>—</td><td>微服務內部呼叫的延遲開銷</td></tr>
      <tr><td>跨 AZ 網路 Round Trip</td><td>1–2 ms</td><td>—</td><td>Multi-AZ 架構的代價</td></tr>
      <tr><td>跨大陸網路（美西↔台灣）</td><td>150 ms</td><td>—</td><td>為什麼需要 Multi-Region CDN</td></tr>
      <tr><td>LLM API 回應（GPT-4o）</td><td>1,000–5,000 ms</td><td>—</td><td>AI 功能為何需要非同步處理</td></tr>
      <tr><td>S3 GET 請求（跨 Region）</td><td>200–500 ms</td><td>—</td><td>為什麼需要 CDN 和 VPC Endpoint</td></tr>
    </tbody>
  </table>

  <h3>常見系統容量數字參考（面試對照表）</h3>
  <table>
    <thead>
      <tr><th>系統</th><th>用戶規模</th><th>主要 QPS</th><th>儲存量級</th><th>特殊挑戰</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Twitter / X</strong></td>
        <td>3 億 MAU，1 億 DAU</td>
        <td>寫入 6,000/s；讀取 600,000/s</td>
        <td>Timeline 快取數 TB</td>
        <td>Celebrity 問題（推特名人有數百萬粉絲，Fan-out 時間長）</td>
      </tr>
      <tr>
        <td><strong>Instagram</strong></td>
        <td>20 億 MAU</td>
        <td>圖片上傳 50,000/s</td>
        <td>媒體儲存 PB 級</td>
        <td>上傳高峰（早晨 9 點、傍晚 6 點）需要 5× 峰值容量</td>
      </tr>
      <tr>
        <td><strong>YouTube</strong></td>
        <td>20 億 MAU，8,000 萬 DAU</td>
        <td>500 小時影片/分鐘上傳</td>
        <td>影片儲存 EB 級</td>
        <td>影片轉碼需要多種格式；CDN 是核心基礎設施</td>
      </tr>
      <tr>
        <td><strong>WhatsApp</strong></td>
        <td>20 億 MAU</td>
        <td>消息傳送 10 萬/s</td>
        <td>媒體 PB 級；訊息文字 TB 級</td>
        <td>端對端加密；離線訊息快取；多裝置同步</td>
      </tr>
      <tr>
        <td><strong>Uber</strong></td>
        <td>1.3 億 MAU（乘客+司機）</td>
        <td>位置更新 100 萬/s</td>
        <td>行程歷史 TB 級</td>
        <td>地理位置實時更新；司機和乘客的雙向配對演算法</td>
      </tr>
      <tr>
        <td><strong>Netflix</strong></td>
        <td>2.7 億 訂閱用戶</td>
        <td>峰值串流 1,500 萬並發</td>
        <td>影片庫 PB 級</td>
        <td>串流品質自適應（ABR）；全球 CDN 是最大成本</td>
      </tr>
    </tbody>
  </table>

  <h3>分片數估算公式</h3>
  <pre data-lang="python"><code class="language-python">
def estimate_shards(
    total_data_tb: float,           # 總資料量 (TB)
    max_shard_size_gb: float = 500, # 每個分片的最大大小 (GB)，通常 200–500 GB
    target_qps: int = 0,            # 目標 QPS
    max_qps_per_shard: int = 10000, # 每個分片的最大 QPS
    growth_buffer: float = 2.0,     # 增長緩衝倍數（留 2x 空間）
) -> dict:
    """估算資料庫需要的分片數量"""

    # 基於儲存估算
    shards_by_storage = (total_data_tb * 1024 / max_shard_size_gb) * growth_buffer

    # 基於 QPS 估算
    shards_by_qps = (target_qps / max_qps_per_shard) * growth_buffer if target_qps else 0

    recommended_shards = max(shards_by_storage, shards_by_qps)

    # 分片數建議取 2 的冪次（方便 Consistent Hashing 重新分片）
    import math
    power_of_two = 2 ** math.ceil(math.log2(max(recommended_shards, 1)))

    return {
        "基於儲存的分片數": round(shards_by_storage, 1),
        "基於QPS的分片數":  round(shards_by_qps, 1),
        "建議分片數（2的冪）": power_of_two,
    }

# 示例：Twitter 的用戶資料（10億用戶，每條記錄 1 KB，5年 + 索引）
user_data_tb = 1_000_000_000 * 1024 / 1e12 * 2  # 約 2 TB（含索引）
result = estimate_shards(
    total_data_tb=user_data_tb,
    target_qps=100_000,
    max_qps_per_shard=5000,
)
# 建議：8–16 個分片
  </code></pre>

  <h3>CDN 命中率對伺服器負載的影響</h3>
  <table>
    <thead>
      <tr><th>CDN 命中率</th><th>到達 Origin 的流量比例</th><th>Origin 需要處理的 QPS</th><th>成本影響</th></tr>
    </thead>
    <tbody>
      <tr><td>0%（無 CDN）</td><td>100%</td><td>全部 100,000 QPS</td><td>基準成本</td></tr>
      <tr><td>50%</td><td>50%</td><td>50,000 QPS</td><td>Origin 成本降低 50%</td></tr>
      <tr><td>80%</td><td>20%</td><td>20,000 QPS</td><td>Origin 成本降低 80%；常見的靜態資源場景</td></tr>
      <tr><td>95%（最佳化後）</td><td>5%</td><td>5,000 QPS</td><td>Origin 成本降低 95%；適當的 Cache-Control 設定可達到</td></tr>
      <tr><td>99%</td><td>1%</td><td>1,000 QPS</td><td>幾乎只有動態內容到達 Origin</td></tr>
    </tbody>
  </table>
</section>

<section id="tradeoffs">
  <h2>系統設計 25 個核心 Trade-off 速查表</h2>
  <p>每個系統設計決策都涉及 Trade-off。以下是最常被問到的 25 個 Trade-off，每個都附上決策框架：選 A 的信號（何時應該選 A）和選 B 的信號（何時應該選 B）。</p>

  <callout-box type="info" title="使用本表的正確方式">
    Trade-off 不是非此即彼的選擇——許多情況下答案是「在不同場景下選不同方案」或「兩者結合」。面試時說出「在 X 條件下選 A，在 Y 條件下選 B，因為...」遠比直接說「選 A」更有說服力。
  </callout-box>

  <h3>資料一致性與可用性</h3>
  <table>
    <thead>
      <tr><th>#</th><th>Trade-off</th><th>選 A 的信號</th><th>選 B 的信號</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td><strong>Consistency（A）vs Availability（B）</strong><br/>（CAP 定理）</td>
        <td>金融交易、庫存扣減、分散式鎖；錯誤讀取有業務損失；用戶能接受偶爾的服務不可用</td>
        <td>社交媒體動態、推薦系統、分析報表；略舊的資料對用戶影響可接受；必須保持高可用</td>
      </tr>
      <tr>
        <td>2</td>
        <td><strong>Strong Consistency（A）vs Eventual Consistency（B）</strong></td>
        <td>需要嚴格的讀後讀一致性；用戶必須立即看到自己的修改生效；資料錯誤有法律責任</td>
        <td>DNS 更新、商品庫存展示（略舊可接受）、消息通知；希望最大化可用性和效能</td>
      </tr>
      <tr>
        <td>3</td>
        <td><strong>Normalization（A）vs Denormalization（B）</strong></td>
        <td>寫入頻繁，需要保持資料一致性；儲存空間有限；業務邏輯複雜，JOIN 不可避免</td>
        <td>讀取頻繁（讀寫比 &gt;10:1）；允許資料冗餘；查詢效能比儲存節省更重要</td>
      </tr>
      <tr>
        <td>4</td>
        <td><strong>Cache-aside（A）vs Read-through（B）</strong></td>
        <td>快取失效策略複雜；需要對快取內容有細粒度控制；快取不需要和資料庫完全同步</td>
        <td>希望快取邏輯對應用透明；不希望在業務程式碼中處理快取 Miss；讀多寫少</td>
      </tr>
      <tr>
        <td>5</td>
        <td><strong>At-least-once（A）vs Exactly-once（B）</strong></td>
        <td>訊息處理是冪等的（重複處理結果相同）；允許偶爾重複；效能優先</td>
        <td>金融扣款、訂單建立等絕對不能重複的操作；系統複雜度不是瓶頸</td>
      </tr>
    </tbody>
  </table>

  <h3>資料庫與儲存</h3>
  <table>
    <thead>
      <tr><th>#</th><th>Trade-off</th><th>選 A 的信號</th><th>選 B 的信號</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>6</td>
        <td><strong>SQL（A）vs NoSQL（B）</strong></td>
        <td>複雜 JOIN 和事務；Schema 穩定；有 ACID 要求；團隊熟悉 SQL</td>
        <td>Schema 頻繁變更；高寫入吞吐量；資料結構靈活多樣；需要水平擴展</td>
      </tr>
      <tr>
        <td>7</td>
        <td><strong>Read-heavy 優化（A）vs Write-heavy 優化（B）</strong></td>
        <td>讀寫比 &gt;10:1；查詢延遲敏感；可以接受寫入時的額外開銷（維護索引、副本）</td>
        <td>寫入吞吐量是瓶頸（IoT、日誌、事件流）；可以接受讀取時做更多工作（Merge）</td>
      </tr>
      <tr>
        <td>8</td>
        <td><strong>Sharding by Range（A）vs Sharding by Hash（B）</strong></td>
        <td>需要範圍查詢（時間範圍、ID 範圍）；資料有自然的範圍語義（如按日期分片）</td>
        <td>防止 Hot Spot（熱點分片）；隨機存取模式；不需要範圍查詢；資料分布不均</td>
      </tr>
      <tr>
        <td>9</td>
        <td><strong>Fan-out on Write（A）vs Fan-out on Read（B）</strong></td>
        <td>讀取頻繁（每次讀取要聚合多個來源）；大多數用戶沒有百萬粉絲（普通用戶）</td>
        <td>有大量 Celebrity（百萬粉絲）；不希望寫入操作有高延遲；粉絲數量差異極大</td>
      </tr>
      <tr>
        <td>10</td>
        <td><strong>Pagination: Offset（A）vs Cursor（B）</strong></td>
        <td>需要跳頁（用戶直接到第 100 頁）；資料更新頻率低；實作簡單</td>
        <td>資料頻繁插入/刪除（Offset 會出現重複或跳過）；需要高效的「下一頁」操作；無限滾動</td>
      </tr>
    </tbody>
  </table>

  <h3>架構與通訊</h3>
  <table>
    <thead>
      <tr><th>#</th><th>Trade-off</th><th>選 A 的信號</th><th>選 B 的信號</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>11</td>
        <td><strong>Monolith（A）vs Microservices（B）</strong></td>
        <td>早期階段（&lt;20 工程師）；需求快速變化，邊界不清；分散式系統複雜度超過團隊能力</td>
        <td>不同模組有截然不同的擴展需求；需要獨立部署；不同技術棧最優；有足夠的運維能力</td>
      </tr>
      <tr>
        <td>12</td>
        <td><strong>Sync Communication（A）vs Async（B）</strong></td>
        <td>用戶等待結果（搜尋、下單確認）；簡單的請求-回應模式；需要立即回饋</td>
        <td>任務可以延遲處理；需要削峰填谷；後台任務（發通知、生成報告）；服務解耦</td>
      </tr>
      <tr>
        <td>13</td>
        <td><strong>REST（A）vs gRPC（B）</strong></td>
        <td>公開的外部 API；瀏覽器客戶端；需要人類可讀的請求；生態工具豐富</td>
        <td>內部服務通訊；需要低延遲和高效序列化（Protocol Buffers）；需要 Streaming；效能敏感</td>
      </tr>
      <tr>
        <td>14</td>
        <td><strong>Push（A）vs Pull（B）</strong></td>
        <td>即時通知（IM、股價更新）；服務器知道何時有更新；用戶對延遲敏感</td>
        <td>客戶端決定存取頻率；實現簡單（輪詢）；不需要維護持久連線；間歇性連線</td>
      </tr>
      <tr>
        <td>15</td>
        <td><strong>L4 Load Balancer（A）vs L7 Load Balancer（B）</strong></td>
        <td>需要極低延遲；不需要基於 HTTP 內容的路由；TCP/UDP 流量</td>
        <td>需要基於 URL/Header 路由；需要 SSL 終止；需要 WAF 整合；需要 Cookie 親和性</td>
      </tr>
    </tbody>
  </table>

  <h3>擴展性與高可用</h3>
  <table>
    <thead>
      <tr><th>#</th><th>Trade-off</th><th>選 A 的信號</th><th>選 B 的信號</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>16</td>
        <td><strong>Horizontal Scaling（A）vs Vertical Scaling（B）</strong></td>
        <td>Web/API 層的無狀態服務；需要線性擴展；防止單點故障</td>
        <td>有狀態服務（資料庫）；垂直升級比水平拆分簡單；短期快速解決效能問題</td>
      </tr>
      <tr>
        <td>17</td>
        <td><strong>Active-Active HA（A）vs Active-Passive（B）</strong></td>
        <td>需要最高可用性；可以處理跨節點的一致性問題；流量可以分散到多個節點</td>
        <td>簡化架構；接受 Failover 切換時間（30–60 秒）；一致性要求高（Active-Active 複雜）</td>
      </tr>
      <tr>
        <td>18</td>
        <td><strong>Hot Standby（A）vs Warm Standby（B）vs Cold Standby（C）</strong></td>
        <td>A：RTO &lt;秒，成本不敏感；B：RTO 分鐘級，平衡成本和可用性；C：RTO 小時級，成本極度敏感</td>
        <td>取決於業務的 RTO 和 RPO 要求。金融系統選 A，一般 SaaS 選 B，資料歸檔選 C。</td>
      </tr>
      <tr>
        <td>19</td>
        <td><strong>Round Robin（A）vs Least Connections（B）</strong></td>
        <td>所有後端節點處理請求的時間相同（同質化）；簡單場景</td>
        <td>請求處理時間差異大（有長耗時請求）；防止部分節點過載；異質化後端節點</td>
      </tr>
      <tr>
        <td>20</td>
        <td><strong>Sticky Session（A）vs Stateless（B）</strong></td>
        <td>有狀態的應用（如 WebSocket 會話）；無法共享的本地 Session；遷移成本高</td>
        <td>首選（可以讓任何節點處理任何請求）；Session 存在 Redis 中；有利於自動擴展</td>
      </tr>
    </tbody>
  </table>

  <h3>CDN 與快取</h3>
  <table>
    <thead>
      <tr><th>#</th><th>Trade-off</th><th>選 A 的信號</th><th>選 B 的信號</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>21</td>
        <td><strong>CDN Push（A）vs CDN Pull（B）</strong></td>
        <td>已知哪些內容需要快取（如每次發布後 Push）；內容變化頻率低；想要精確控制快取內容</td>
        <td>內容量大，無法全部 Push；根據用戶請求自動快取熱門內容；長尾內容多</td>
      </tr>
      <tr>
        <td>22</td>
        <td><strong>JWT（A）vs Session Token（B）</strong></td>
        <td>無狀態服務（不需要在伺服器儲存 Session）；跨服務的 Token 傳遞；移動應用</td>
        <td>需要立即撤銷 Token（JWT 在過期前無法撤銷）；Token 不能洩漏給客戶端；簡單 Web 應用</td>
      </tr>
    </tbody>
  </table>

  <h3>批次與流處理</h3>
  <table>
    <thead>
      <tr><th>#</th><th>Trade-off</th><th>選 A 的信號</th><th>選 B 的信號</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>23</td>
        <td><strong>Batch Processing（A）vs Stream Processing（B）</strong></td>
        <td>資料可以延遲處理；輸出是完整的聚合結果（如日報表）；計算成本敏感（Batch 便宜）</td>
        <td>需要即時結果（詐欺偵測、即時推薦）；資料是持續到達的流；延遲 &gt;秒級是不可接受的</td>
      </tr>
      <tr>
        <td>24</td>
        <td><strong>On-demand（A）vs Reserved（B）vs Spot（C）</strong></td>
        <td>A：不可預測的短期負載、Dev/Test；B：穩定的基礎負載（節省 40–60%）；C：可中斷的批次任務（節省 70–90%）</td>
        <td>最佳策略是混合：基礎負載用 Reserved，彈性部分用 Spot，突增用 On-demand。</td>
      </tr>
    </tbody>
  </table>

  <h3>AI / LLM</h3>
  <table>
    <thead>
      <tr><th>#</th><th>Trade-off</th><th>選 A 的信號</th><th>選 B 的信號</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>25</td>
        <td><strong>RAG（A）vs Fine-tuning（B）</strong></td>
        <td>知識庫頻繁更新（新聞、公司文件）；需要引用來源；無需訓練資料；快速上線</td>
        <td>需要改變模型的語氣/風格；特定領域的格式輸出（醫療、法律術語）；推理速度優先（Fine-tuned 推理更快）；知識庫相對靜態</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="tip" title="使用速查表的正確方式">
    速查表是「提醒」而非「答案」。面試時不要機械地背誦這些選擇，而是能夠在說出推薦技術的同時，解釋你的推理過程：<br/><br/>
    「我會選 Cassandra，因為這個場景有高寫入吞吐量（每秒 100 萬次寫入）和時間範圍查詢需求。Cassandra 的 LSM-tree 結構對寫入極度優化，而且它的分區鍵設計允許我按時間高效查詢。代價是讀取延遲比 PostgreSQL 高，且不支援複雜的跨分區查詢。在我們的場景中這個代價是可以接受的，因為我們的查詢模式都是針對特定用戶的時間範圍查詢，不需要跨分區 JOIN。」<br/><br/>
    這樣的回答展現的是思考深度，而非記憶能力。
  </callout-box>
</section>
`,
} satisfies ChapterContent;
