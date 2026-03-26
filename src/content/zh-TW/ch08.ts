import type { ChapterContent } from '../../types.js';

export default {
  title: '物件儲存與 CDN',
  content: `
<section id="storage-types">
  <h2>Block / File / Object Storage 差異</h2>
  <p>
    雲端儲存有三種根本不同的抽象層次，分別對應不同的應用場景。
    在系統設計中選錯儲存類型，可能導致高昂的成本、效能瓶頸或維運困難。
  </p>

  <h3>Block Storage（區塊儲存）</h3>
  <p>
    最低層次的儲存抽象，像是一塊裸磁碟。作業系統可以直接在上面建立檔案系統（ext4、NTFS 等）。
    Block Storage 提供固定大小的「區塊（Block）」，由作業系統或資料庫軟體自行管理如何讀寫。
  </p>
  <ul>
    <li><strong>特性：</strong>低延遲（微秒級）、高 IOPS、支援隨機讀寫</li>
    <li><strong>代表服務：</strong>AWS EBS（Elastic Block Store）、GCP Persistent Disk</li>
    <li><strong>典型場景：</strong>資料庫的存儲後端（MySQL data directory、PostgreSQL data）、
    虛擬機器的系統磁碟</li>
    <li><strong>缺點：</strong>通常只能掛載到一台機器；不支援多機器同時讀寫（除非是 SAN）</li>
  </ul>

  <h3>File Storage（檔案儲存 / NAS）</h3>
  <p>
    在 Block Storage 之上加了一層檔案系統，提供目錄和檔案的抽象。
    多台機器可以透過 NFS（Network File System）或 SMB 協定同時掛載和讀寫。
  </p>
  <ul>
    <li><strong>特性：</strong>支援多機器共享存取、熟悉的檔案目錄操作</li>
    <li><strong>代表服務：</strong>AWS EFS（Elastic File System）、Azure Files、NFS Server</li>
    <li><strong>典型場景：</strong>多台應用伺服器共享設定檔、CI/CD 的 Build Cache、
    內容管理系統的媒體檔案共享</li>
    <li><strong>缺點：</strong>效能比 Block Storage 低；成本高；大規模時擴展困難</li>
  </ul>

  <h3>Object Storage（物件儲存）</h3>
  <p>
    最高層次的抽象。沒有目錄、沒有檔案系統，只有「桶（Bucket）」和「物件（Object）」。
    每個物件有唯一的 Key（如 <code>users/123/avatar.jpg</code>），透過 HTTP API 存取。
    物件一旦寫入，通常是<strong>不可變（Immutable）</strong>的——修改需要重新寫入（上傳新版本）。
  </p>
  <ul>
    <li><strong>特性：</strong>無限擴展（理論上）、高可靠（通常 11 個 9 的持久性）、低成本、透過 HTTP 全球存取</li>
    <li><strong>代表服務：</strong>AWS S3、Google Cloud Storage、Azure Blob Storage</li>
    <li><strong>典型場景：</strong>用戶上傳的圖片/影片、網站靜態資源（HTML、CSS、JS）、
    資料備份和歸檔、資料湖（Data Lake）</li>
    <li><strong>缺點：</strong>不支援隨機讀寫（必須下載整個物件再修改再上傳）；延遲比 Block Storage 高（毫秒級）</li>
  </ul>

  <h3>詳細比較表</h3>
  <table>
    <thead>
      <tr>
        <th>特性</th>
        <th>Block Storage</th>
        <th>File Storage</th>
        <th>Object Storage</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>存取方式</td>
        <td>SCSI/NVMe 協定</td>
        <td>NFS / SMB</td>
        <td>HTTP API (REST)</td>
      </tr>
      <tr>
        <td>延遲</td>
        <td>微秒（μs）</td>
        <td>毫秒（ms）</td>
        <td>毫秒（ms）</td>
      </tr>
      <tr>
        <td>可擴展性</td>
        <td>有限（需預先配置）</td>
        <td>中等</td>
        <td>幾乎無限</td>
      </tr>
      <tr>
        <td>多機器存取</td>
        <td>通常只能一台（EBS）</td>
        <td>支援</td>
        <td>支援（全球）</td>
      </tr>
      <tr>
        <td>成本（相對）</td>
        <td>最高</td>
        <td>中等</td>
        <td>最低</td>
      </tr>
      <tr>
        <td>隨機讀寫</td>
        <td>支援（高效能）</td>
        <td>支援（中等效能）</td>
        <td>不支援（整個物件讀寫）</td>
      </tr>
      <tr>
        <td>目錄結構</td>
        <td>作業系統層建立</td>
        <td>原生支援</td>
        <td>模擬（Key 中的 / 僅是命名慣例）</td>
      </tr>
    </tbody>
  </table>

  <h3>具體使用場景</h3>
  <table>
    <thead>
      <tr>
        <th>使用場景</th>
        <th>推薦儲存類型</th>
        <th>AWS 服務</th>
        <th>理由</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>MySQL / PostgreSQL 資料庫</td>
        <td>Block Storage</td>
        <td>EBS (gp3/io2)</td>
        <td>需要高 IOPS 和低延遲隨機讀寫</td>
      </tr>
      <tr>
        <td>虛擬機器系統磁碟</td>
        <td>Block Storage</td>
        <td>EBS (gp3)</td>
        <td>OS 需要 Block 層掛載</td>
      </tr>
      <tr>
        <td>多台 App Server 共用設定</td>
        <td>File Storage</td>
        <td>EFS</td>
        <td>需要多機器同時讀寫同一份目錄</td>
      </tr>
      <tr>
        <td>CI/CD Build Cache</td>
        <td>File Storage</td>
        <td>EFS</td>
        <td>多台 Build Worker 共享快取目錄</td>
      </tr>
      <tr>
        <td>用戶上傳圖片/影片</td>
        <td>Object Storage</td>
        <td>S3</td>
        <td>低成本、高可靠、CDN 配合分發</td>
      </tr>
      <tr>
        <td>靜態網站資源（HTML/CSS/JS）</td>
        <td>Object Storage</td>
        <td>S3 + CloudFront</td>
        <td>全球 CDN 分發，成本極低</td>
      </tr>
      <tr>
        <td>資料湖（Data Lake）</td>
        <td>Object Storage</td>
        <td>S3</td>
        <td>PB 級儲存，配合 Athena/Spark 查詢</td>
      </tr>
      <tr>
        <td>備份與歸檔</td>
        <td>Object Storage（冷資料）</td>
        <td>S3 Glacier</td>
        <td>成本極低，S3 Standard 的 1/5 到 1/23</td>
      </tr>
    </tbody>
  </table>

  <h3>AWS EBS vs EFS vs S3 對應關係</h3>
  <pre data-lang="text"><code class="language-text">AWS 儲存服務對應表：

Block Storage 系列（EBS）：
  EBS gp3 （General Purpose SSD）：適合大多數工作負載（DB、App Server）
  EBS io2  （Provisioned IOPS SSD）：高效能 DB（Oracle、SQL Server）
  EBS st1  （Throughput HDD）：大數據批次處理（Hadoop、Kafka Log 存儲）
  ● 只能掛載到單一 EC2（除 EBS Multi-Attach，限 io1/io2）
  ● 每 GB 費用：gp3 約 $0.08/月

File Storage 系列（EFS）：
  EFS Standard：多 AZ 高可用，支援數千個 EC2 同時掛載
  EFS Standard-IA：不常存取，成本更低
  ● 自動擴縮容（不需預先配置容量）
  ● 每 GB 費用：EFS Standard 約 $0.30/月（比 S3 貴 10 倍）

Object Storage 系列（S3）：
  S3 Standard → Standard-IA → Glacier → Deep Archive
  ● 不需掛載，透過 HTTP API 存取
  ● 每 GB 費用：S3 Standard 約 $0.023/月（最便宜）</code></pre>
  <callout-box type="warning" title="EFS 成本陷阱">
    AWS EFS 的費用約為 S3 Standard 的 13 倍，是 EBS gp3 的 3.75 倍。
    很多工程師在不需要多機器共享存取時誤用 EFS，導致儲存成本大幅超支。
    如果只是需要持久化存儲（非多機器共享），EBS 通常是更好的選擇。
    如果是靜態媒體文件，S3 則成本遠低於 EFS。
  </callout-box>
</section>

<section id="s3-design">
  <h2>S3/Blob Storage 設計哲學</h2>
  <arch-diagram src="./diagrams/ch08-storage-cdn.json" caption="物件儲存與 CDN 完整架構：用戶透過 Pre-signed URL 直接上傳到 S3，CDN 從 S3 拉取後在全球 Edge Node 快取，靜態資源不經過應用伺服器"></arch-diagram>
  <p>
    AWS S3 是物件儲存的事實標準，其背後的設計哲學深刻影響了無數系統。
    理解 S3 的設計原則，能幫助你避免誤用並充分利用其特性。
  </p>

  <h3>核心設計原則 1：不可變物件（Immutable Objects）</h3>
  <p>
    S3 的物件一旦上傳，就<strong>不能被原地修改</strong>（In-place Modification）。
    「修改」在 S3 中意味著：上傳一個相同 Key 的新物件，舊版本被覆蓋（或透過版本控制保留）。
  </p>
  <p>這個設計帶來幾個重要影響：</p>
  <ul>
    <li><strong>適合讀多寫少：</strong>圖片、影片、文件下載，上傳一次，讀取百萬次</li>
    <li><strong>不適合頻繁更新的資料：</strong>資料庫日誌、需要原地追加的場景</li>
    <li><strong>天然防止腐化（Corruption）：</strong>不能部分覆寫，避免了 half-written 物件</li>
  </ul>

  <h3>核心設計原則 2：一致性模型</h3>
  <p>
    S3 在全球多個資料中心複製資料。值得注意的是，AWS 在 2020 年宣布 S3 現在提供
    <strong>強一致性（Strong Consistency）</strong>用於 PUT/DELETE 後的 GET 操作，
    覆蓋了舊的最終一致性問題。但在跨區域複製（Cross-Region Replication, CRR）場景下，
    仍是最終一致性（非同步複製，可能有秒到分鐘的延遲）。
  </p>
  <pre data-lang="text"><code class="language-text">S3 一致性模型（2020 年更新後）：

單一 Region 內（強一致性）：
  PUT s3://bucket/photo.jpg
  GET s3://bucket/photo.jpg → 立即返回最新版本（不會返回舊版本）
  LIST s3://bucket/         → 立即包含剛上傳的 photo.jpg

跨 Region 複製（CRR，最終一致性）：
  ap-northeast-1 中 PUT s3://bucket/photo.jpg
  us-east-1 中 GET s3://bucket/photo.jpg → 可能延遲幾秒到幾分鐘才能看到新物件
  → 不能依賴 CRR 的即時一致性做業務邏輯判斷</code></pre>

  <h3>99.999999999% Durability 是如何實現的？</h3>
  <p>
    AWS S3 宣稱 11 個 9（99.999999999%）的物件持久性，
    意味著存儲 10,000,000 個物件，平均每 10,000 年才遺失一個。
    這是如何實現的？
  </p>
  <pre data-lang="text"><code class="language-text">S3 的資料可靠性架構：

1. 多 AZ 複製（Multi-AZ Replication）
   每個物件至少複製到同一 Region 的 3 個可用區（AZ）
   每個 AZ 有獨立的電力、網路、建築
   → 任一 AZ 完全故障，資料不遺失

2. 磁碟級別的 Erasure Coding（糾刪碼）
   在 AZ 內部，資料使用類似 RAID 的 Erasure Coding 存儲
   即使磁碟故障，也能從冗餘碎片重建資料

3. 資料完整性校驗
   S3 定期對所有物件計算 Checksum（MD5/CRC）
   自動偵測並修復靜默資料損毀（Silent Data Corruption）

4. 硬體更換不中斷服務
   磁碟即將故障時自動遷移資料，再替換硬體

計算：如果單個磁碟年故障率是 4%（業界平均）
  三個 AZ、每 AZ 三份副本 → 需要同時故障 9 台磁碟才遺失資料
  機率 = 0.04^9 ≈ 4 × 10^-13 → 遠低於 11 個 9 的遺失率</code></pre>

  <h3>S3 的儲存類型（Storage Classes）</h3>
  <table>
    <thead>
      <tr>
        <th>儲存類型</th>
        <th>適用場景</th>
        <th>取回時間</th>
        <th>成本（相對）</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>S3 Standard</td>
        <td>頻繁存取的資料（熱資料）</td>
        <td>毫秒</td>
        <td>高</td>
      </tr>
      <tr>
        <td>S3 Intelligent-Tiering</td>
        <td>存取模式不確定</td>
        <td>毫秒</td>
        <td>中（自動優化）</td>
      </tr>
      <tr>
        <td>S3 Standard-IA</td>
        <td>不常存取但需快速取回（每月1-2次）</td>
        <td>毫秒</td>
        <td>中低（取回有額外費用）</td>
      </tr>
      <tr>
        <td>S3 Glacier Instant Retrieval</td>
        <td>每季存取一次的歸檔資料</td>
        <td>毫秒</td>
        <td>低</td>
      </tr>
      <tr>
        <td>S3 Glacier Flexible Retrieval</td>
        <td>每年1-2次的合規歸檔</td>
        <td>1-12 小時（可選急速 1-5 分鐘）</td>
        <td>更低</td>
      </tr>
      <tr>
        <td>S3 Glacier Deep Archive</td>
        <td>每年存取不到一次的法規要求歸檔</td>
        <td>12 小時</td>
        <td>最低（Standard 的 1/23）</td>
      </tr>
    </tbody>
  </table>
  <callout-box type="tip" title="S3 Lifecycle Policy 省成本">
    透過 S3 Lifecycle Policy，可以自動將資料在不同儲存類型之間遷移：
    例如，用戶上傳的影片在前 30 天放 Standard，30-90 天移到 Standard-IA，
    90 天後移到 Glacier。這種冷熱分層能大幅降低儲存成本（節省 50-90%）。
  </callout-box>
  <pre data-lang="text"><code class="language-text">S3 Lifecycle Policy 設定範例（YAML 描述）：

Bucket: user-uploads
Rules:
  - ID: video-lifecycle
    Filter: { Prefix: "videos/" }
    Transitions:
      - Days: 30,  StorageClass: STANDARD_IA     # 30 天後移到 IA
      - Days: 90,  StorageClass: GLACIER          # 90 天後移到 Glacier
      - Days: 365, StorageClass: DEEP_ARCHIVE     # 1 年後移到 Deep Archive
    Expiration:
      Days: 2555  # 7 年後刪除（滿足部分法規保留要求）</code></pre>

  <h3>S3 Versioning（版本控制）</h3>
  <p>
    開啟 Versioning 後，每次 PUT 都會產生新版本，舊版本保留（除非顯式刪除）。
    Delete 操作不會真正刪除物件，而是加上一個「刪除標記（Delete Marker）」。
  </p>
  <pre data-lang="text"><code class="language-text">Versioning 開啟後的操作示例：

PUT users/123/avatar.jpg  → Version ID: aaa111
PUT users/123/avatar.jpg  → Version ID: bbb222（新版本）
PUT users/123/avatar.jpg  → Version ID: ccc333（最新版本）

GET users/123/avatar.jpg           → 返回最新版本 ccc333
GET users/123/avatar.jpg?versionId=aaa111  → 返回舊版本 aaa111

DELETE users/123/avatar.jpg        → 加上 Delete Marker，邏輯刪除
GET users/123/avatar.jpg           → 返回 404（最新「版本」是 Delete Marker）
GET users/123/avatar.jpg?versionId=ccc333  → 還能取回被刪除前的版本！

使用場景：
  - 防止誤刪（意外刪除後可恢復）
  - 防止惡意覆蓋（勒索軟體加密覆蓋舊版本後可恢復）
  - 審計需求（需要保留所有版本記錄）</code></pre>

  <h3>MFA Delete（多因素驗證刪除）</h3>
  <p>
    在合規要求高的場景（金融、醫療），可以在 Bucket 上啟用 MFA Delete：
    任何刪除版本或關閉 Versioning 的操作，都必須提供 MFA 一次性密碼。
    這能防止即使 Root 憑證洩漏，攻擊者也無法刪除歷史版本資料。
  </p>
  <callout-box type="warning" title="Versioning 成本注意事項">
    開啟 Versioning 後，每個舊版本都會佔用儲存空間（並計費）。
    一個 100MB 的檔案被更新 100 次，舊版本共佔用 10GB。
    必須配合 Lifecycle Policy 設定舊版本的過期規則
    （如保留最近 5 個版本，或舊版本 90 天後移到 Glacier）。
  </callout-box>

  <h3>大檔案上傳：Multipart Upload</h3>
  <p>
    S3 建議超過 100MB 的檔案使用 Multipart Upload，將大檔案切分成多個 Part 並行上傳：
  </p>
  <pre data-lang="python"><code class="language-python">import boto3

s3 = boto3.client('s3')

# 初始化 Multipart Upload
response = s3.create_multipart_upload(Bucket='my-bucket', Key='large-video.mp4')
upload_id = response['UploadId']

# 並行上傳各個 Part（每個 Part 至少 5MB）
parts = []
for i, chunk in enumerate(read_file_in_chunks('video.mp4', chunk_size=10*1024*1024)):
    part = s3.upload_part(
        Bucket='my-bucket', Key='large-video.mp4',
        UploadId=upload_id, PartNumber=i+1, Body=chunk
    )
    parts.append({'PartNumber': i+1, 'ETag': part['ETag']})

# 完成上傳，S3 將各 Part 合併
s3.complete_multipart_upload(
    Bucket='my-bucket', Key='large-video.mp4',
    UploadId=upload_id,
    MultipartUpload={'Parts': parts}
)</code></pre>
</section>

<section id="cdn-push-pull">
  <h2>CDN Push vs Pull 模式</h2>
  <p>
    CDN（Content Delivery Network）是分布在全球各地的快取伺服器網絡（稱為 Edge Node 或 PoP，Point of Presence）。
    用戶請求靜態資源時，從最近的 Edge Node 獲取，而非從遠在千里的 Origin Server。
    一個歐洲用戶從倫敦 Edge Node 取得圖片，延遲可能是 10ms，而從台灣的 Origin Server 取得則需要 150ms。
  </p>

  <h3>CDN 架構概覽</h3>
  <pre data-lang="text"><code class="language-text">全球 CDN 架構：

Origin Server（台灣 ap-northeast-1）
  ├── PoP 東京（Edge）  ← 日本、韓國用戶
  ├── PoP 新加坡（Edge）← 東南亞用戶
  ├── PoP 倫敦（Edge）  ← 英國、歐洲用戶
  ├── PoP 法蘭克福（Edge） ← 中歐用戶
  ├── PoP 紐約（Edge）  ← 美東用戶
  └── PoP 洛杉磯（Edge）← 美西用戶

CloudFront 全球有 400+ PoP；Fastly 有 80+ PoP；
CDN 的選擇通常考慮：PoP 覆蓋範圍、延遲、頻寬成本、功能豐富性</code></pre>

  <h3>Pull 模式（懶加載，最常見）</h3>
  <p>
    Edge Node<strong>不主動拉取</strong>內容。當用戶第一次請求某個 URL 時，
    Edge Node 向 Origin Server 獲取內容，快取在本地，並設定 TTL。
    後續請求直接從 Edge Node 命中。
  </p>
  <pre data-lang="text"><code class="language-text">首次請求（Cache Miss）：
  用戶（東京） → CDN Edge（東京） ──Cache Miss──→ Origin Server（台灣）
  Origin → Edge（東京）：快取內容，TTL=24h
  Edge → 用戶：返回內容

後續請求（Cache Hit）：
  用戶（東京） → CDN Edge（東京） ──Cache Hit──→ 直接返回（無需回源）</code></pre>
  <ul>
    <li><strong>優點：</strong>簡單、只有被請求的內容才會快取（節省 Edge 儲存空間）</li>
    <li><strong>缺點：</strong>首次請求（Cache Cold Start）需要回源，延遲高；
    當同一時間大量用戶首次請求同一資源（如新發布的熱門影片），會產生大量回源流量（Cache Stampede）</li>
    <li><strong>適用：</strong>大多數靜態資源（圖片、JS、CSS）；內容量大但熱點分布不均</li>
  </ul>

  <h3>Push 模式（主動推送）</h3>
  <p>
    內容發布者<strong>主動將內容推送</strong>到所有（或指定的）Edge Node，
    在用戶請求之前就已經快取好。通常由 CDN 管理控制台或 API 觸發。
  </p>
  <pre data-lang="text"><code class="language-text">內容發布後立刻推送：
  Origin Server → CDN API：「推送 new-release.jpg 到所有 Edge」
  CDN → Edge（東京、新加坡、倫敦、紐約...）：預先快取

用戶請求時：
  用戶（任何地區） → 最近的 Edge Node → Cache Hit（100% 命中）</code></pre>
  <ul>
    <li><strong>優點：</strong>首次請求也能命中快取；適合可預期的大流量（如軟體發布日、球賽）</li>
    <li><strong>缺點：</strong>需要手動管理推送和失效；佔用所有 Edge Node 的儲存空間，
    即使某些地區的用戶從不請求該資源</li>
    <li><strong>適用：</strong>已知的大流量活動；軟體下載包；影片首播</li>
  </ul>

  <h3>Pull vs Push 適用場景對比</h3>
  <table>
    <thead>
      <tr>
        <th>場景特徵</th>
        <th>推薦模式</th>
        <th>原因</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>內容量大（TB 級），但每個內容的存取頻率差異大</td>
        <td>Pull</td>
        <td>Push 模式存儲成本過高，大多數內容可能根本不被請求</td>
      </tr>
      <tr>
        <td>首次發布即有大流量（電影首播、軟體新版本）</td>
        <td>Push</td>
        <td>避免 Cache Miss 時大量回源衝擊 Origin</td>
      </tr>
      <tr>
        <td>用戶分布全球均勻</td>
        <td>Pull</td>
        <td>各地自然建立快取，無需預先知道哪裡有用戶</td>
      </tr>
      <tr>
        <td>用戶集中在特定地區</td>
        <td>Push 到特定 PoP</td>
        <td>只推送到用戶在的地區，節省儲存成本</td>
      </tr>
      <tr>
        <td>內容更新頻繁（每小時更新）</td>
        <td>Pull + 短 TTL</td>
        <td>Push 模式推送頻率過高，運維複雜</td>
      </tr>
    </tbody>
  </table>

  <h3>Cache-Control Headers 設計</h3>
  <p>
    CDN 的快取行為由 HTTP Response Header 中的 <code>Cache-Control</code> 指令控制。
    正確設計 Cache-Control 是 CDN 優化的關鍵：
  </p>
  <pre data-lang="text"><code class="language-text">Cache-Control 常用指令：

靜態資源（帶版本號的 JS/CSS）：
  Cache-Control: public, max-age=31536000, immutable
  → CDN 和瀏覽器快取一年；immutable 告訴瀏覽器內容不會變，不需驗證

HTML 頁面（動態內容）：
  Cache-Control: no-store
  → 不快取，每次都回源取得最新頁面

API 回應（部分可快取）：
  Cache-Control: public, max-age=60, s-maxage=300
  → 瀏覽器快取 60 秒；CDN 快取 300 秒（s-maxage 只影響 CDN）

帶 ETag 的條件請求：
  ETag: "abc123"
  Cache-Control: no-cache  → 每次請求都向 CDN 驗證 ETag
  → 若內容未改變（ETag 匹配），CDN 返回 304 Not Modified（不傳輸 Body）</code></pre>
  <pre data-lang="python"><code class="language-python">from flask import Flask, send_file, make_response
import hashlib

app = Flask(__name__)

@app.route('/static/app.js')
def serve_js():
    # 版本化靜態資源：使用 Content Hash 作為 URL 的一部分
    # 如 /static/app.a3f8c2.js，內容變化時 URL 也變化
    response = make_response(send_file('static/app.js'))
    response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    return response

@app.route('/api/products')
def get_products():
    products = fetch_products_from_db()
    etag = hashlib.md5(str(products).encode()).hexdigest()

    # 檢查客戶端的 ETag 是否匹配
    if request.headers.get('If-None-Match') == etag:
        return '', 304  # 內容未改變，省去傳輸 Body

    response = make_response(jsonify(products))
    response.headers['ETag'] = etag
    response.headers['Cache-Control'] = 'public, max-age=60, s-maxage=300'
    return response</code></pre>

  <h3>CDN Purge / Invalidation（快取失效）</h3>
  <p>
    當 Origin 的內容更新時，CDN 不會自動感知。需要明確的失效操作：
  </p>
  <pre data-lang="text"><code class="language-text">快取失效的三種策略：

策略 1：TTL 過期（被動等待）
  等 TTL 到期後，下次請求自動回源取得新內容
  優點：零運維；缺點：在 TTL 期間用戶看到舊版本
  適用：非緊急的內容更新（如 CSS 微調）

策略 2：主動 Purge（立即清除，推薦）
  呼叫 CDN API 清除指定 URL 的所有 Edge 快取
  AWS CloudFront 範例：
    aws cloudfront create-invalidation \
      --distribution-id E1234567890 \
      --paths "/images/banner.jpg" "/css/*"
  優點：立即生效；缺點：CloudFront Purge 有費用（每月 1000 次免費，之後 $0.005/次）

策略 3：URL 版本化（最佳實踐）
  將 Content Hash 或版本號加入 URL：
    /static/app.a3f8c2.js  → 修改後變成 /static/app.d1e4f7.js
  舊 URL 和新 URL 並存，TTL 設定為極長（immutable）
  優點：零 Purge 費用、瀏覽器也能長期快取；
  缺點：HTML 本身不能版本化（需設 no-cache 或短 TTL）</code></pre>
  <callout-box type="info" title="CDN Cache Invalidation（快取失效）">
    當 Origin 的內容更新時，CDN 不會自動感知。需要明確的失效操作：
    1. <strong>TTL 過期：</strong>等 TTL 到期後，下次請求自動回源。適合不緊急的更新。
    2. <strong>主動 Purge（清除）：</strong>呼叫 CDN API 立即清除指定 URL 的快取。適合緊急的內容更正。
    3. <strong>URL 版本化：</strong>在靜態資源 URL 中加入版本號或 Hash（如 <code>app.a3f8c2.js</code>），
    新版本用新 URL，避免失效問題。這是前端工程的最佳實踐。
  </callout-box>
</section>

<section id="presigned-url">
  <h2>Pre-signed URL 安全設計</h2>
  <p>
    在設計檔案上傳/下載功能時，有一個常見的錯誤方案：讓用戶的上傳請求先打到後端伺服器，
    再由後端轉存到 S3。這樣做會：
  </p>
  <ul>
    <li>消耗後端伺服器大量頻寬（付兩次流量費）</li>
    <li>後端成為上傳瓶頸（大檔案上傳會佔用 thread/connection）</li>
    <li>增加後端延遲和複雜度</li>
  </ul>
  <p>
    正確的方案是 <strong>Pre-signed URL</strong>（預簽名 URL）：
    讓用戶直接與 S3 交互，後端只負責生成臨時的、有權限的 URL。
  </p>

  <h3>Pre-signed URL 的安全原理</h3>
  <p>
    Pre-signed URL 的本質是一個帶有簽名（Signature）的臨時憑證 URL。
    AWS 使用 IAM 服務帳號的 Access Key 對以下資訊進行 HMAC-SHA256 簽名：
  </p>
  <pre data-lang="text"><code class="language-text">Pre-signed URL 的組成：

https://bucket.s3.amazonaws.com/users/123/avatar.jpg
  ?X-Amz-Algorithm=AWS4-HMAC-SHA256
  &X-Amz-Credential=AKIAIOSFODNN7EXAMPLE/20240315/ap-northeast-1/s3/aws4_request
  &X-Amz-Date=20240315T120000Z
  &X-Amz-Expires=300                    ← 有效期：300 秒
  &X-Amz-SignedHeaders=host;content-type
  &X-Amz-Signature=abc123def456...      ← HMAC-SHA256 簽名

簽名覆蓋了：
  - Bucket 名稱和 Object Key（不能改路徑）
  - HTTP 方法（PUT or GET，不能混用）
  - 到期時間（篡改後簽名無效）
  - Content-Type（PUT 時限制上傳的檔案類型）

如果攻擊者修改了任何參數，簽名驗證失敗，S3 返回 403 Forbidden</code></pre>

  <h3>Pre-signed URL 的工作流程</h3>
  <pre data-lang="text"><code class="language-text">上傳流程：
  1. 用戶端 → 後端：「我想上傳一個頭像」
  2. 後端：驗證用戶身份、生成 Pre-signed PUT URL（有效期 5 分鐘）
  3. 後端 → 用戶端：返回 Pre-signed URL
     （https://bucket.s3.amazonaws.com/users/123/avatar.jpg?X-Amz-Signature=...）
  4. 用戶端 → S3：直接 PUT 到 Pre-signed URL（不經過後端！）
  5. 用戶端上傳完成 → 後端：通知後端更新資料庫

下載流程：
  1. 用戶端請求私有文件 → 後端
  2. 後端驗證用戶有權限，生成 Pre-signed GET URL（有效期 1 小時）
  3. 用戶端用此 URL 直接從 S3 下載</code></pre>

  <h3>有效期設計</h3>
  <p>
    Pre-signed URL 的有效期設計需要在安全性和使用者體驗之間取得平衡：
  </p>
  <table>
    <thead>
      <tr>
        <th>用途</th>
        <th>建議有效期</th>
        <th>理由</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>用戶頭像/圖片上傳</td>
        <td>5-15 分鐘</td>
        <td>上傳操作很快完成，短有效期降低洩漏風險</td>
      </tr>
      <tr>
        <td>大檔案上傳（影片）</td>
        <td>1-2 小時</td>
        <td>上傳大檔案可能需要更長時間（含重試）</td>
      </tr>
      <tr>
        <td>私有文件下載（內部報告）</td>
        <td>1-24 小時</td>
        <td>用戶可能需要時間點擊，但不應長期有效</td>
      </tr>
      <tr>
        <td>Email 中的下載連結</td>
        <td>7 天</td>
        <td>用戶可能過幾天才看到 Email</td>
      </tr>
      <tr>
        <td>公開資源（頭像、產品圖）</td>
        <td>永久（設為 Public）</td>
        <td>公開資源不需要 Pre-signed URL，直接設 Bucket/Object 為公開</td>
      </tr>
    </tbody>
  </table>

  <h3>Pre-signed URL vs 服務端上傳的對比</h3>
  <table>
    <thead>
      <tr>
        <th>比較面向</th>
        <th>服務端代理上傳</th>
        <th>Pre-signed URL 直傳</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>頻寬成本</td>
        <td>高（後端同時消耗入站和出站流量）</td>
        <td>低（流量直接走 S3，不經後端）</td>
      </tr>
      <tr>
        <td>後端負載</td>
        <td>高（大文件佔用 connection 和記憶體）</td>
        <td>低（後端只生成 URL，幾乎無負載）</td>
      </tr>
      <tr>
        <td>上傳速度</td>
        <td>慢（兩跳：用戶→後端→S3）</td>
        <td>快（一跳：用戶→S3，S3 在最近的 PoP）</td>
      </tr>
      <tr>
        <td>安全性</td>
        <td>後端完全控制（可以做更複雜的驗證）</td>
        <td>需要在 Pre-signed URL 參數中限制</td>
      </tr>
      <tr>
        <td>適用場景</td>
        <td>小文件、需要即時處理（如縮圖生成）</td>
        <td>大多數媒體上傳場景</td>
      </tr>
    </tbody>
  </table>

  <h3>Pre-signed URL 的安全設計要點</h3>
  <pre data-lang="python"><code class="language-python">import boto3
import uuid
from datetime import timedelta

s3_client = boto3.client('s3', region_name='ap-northeast-1')

def generate_upload_presigned_url(user_id: str, file_type: str) -> dict:
    """
    為用戶生成安全的上傳 Pre-signed URL
    """
    # 安全性措施 1：限制 Key 路徑，防止用戶覆蓋其他用戶的檔案
    object_key = f"users/{user_id}/avatars/{uuid.uuid4()}.jpg"

    # 安全性措施 2：設定 Content-Type 限制，防止上傳惡意檔案
    # 安全性措施 3：設定短暫的有效期
    presigned_url = s3_client.generate_presigned_url(
        'put_object',
        Params={
            'Bucket': 'user-uploads',
            'Key': object_key,
            'ContentType': 'image/jpeg',        # 限制只能上傳 JPEG
            'ContentLength': 5 * 1024 * 1024,  # 限制最大 5MB
        },
        ExpiresIn=300  # 5 分鐘有效期
    )

    return {
        'upload_url': presigned_url,
        'object_key': object_key
    }

def generate_download_presigned_url(object_key: str, user_id: str) -> str:
    """
    生成有時效性的下載連結
    """
    # 驗證用戶有權存取此 Key（業務邏輯）
    if not has_permission(user_id, object_key):
        raise PermissionError("無存取權限")

    return s3_client.generate_presigned_url(
        'get_object',
        Params={'Bucket': 'private-files', 'Key': object_key},
        ExpiresIn=3600  # 1 小時有效期
    )</code></pre>
  <callout-box type="warning" title="Pre-signed URL 的安全考量">
    <ul>
      <li><strong>URL 不能洩露：</strong>Pre-signed URL 包含完整憑證，任何人拿到都能存取。不要記錄在日誌中。</li>
      <li><strong>有效期要短：</strong>上傳 URL 5-15 分鐘，下載 URL 1 小時到 1 天（依業務需求）。</li>
      <li><strong>Key 命名要安全：</strong>Key 中包含用戶 ID，防止路徑遍歷攻擊（Path Traversal）。</li>
      <li><strong>Content-Type 要驗證：</strong>即使前端限制了檔案類型，後端也要在 S3 Event 觸發時再次用 Magic Bytes 驗證真實的檔案類型。</li>
    </ul>
  </callout-box>

  <h3>S3 Transfer Acceleration</h3>
  <p>
    當用戶與 S3 Bucket 所在的 Region 距離遙遠時（如東南亞用戶上傳到 us-east-1 的 Bucket），
    可以啟用 <strong>S3 Transfer Acceleration</strong>，讓上傳流量先走到最近的 CloudFront Edge PoP，
    再透過 AWS 的全球骨幹網路傳輸到目標 Region——比直接走公共互聯網快 50%-500%。
  </p>
  <pre data-lang="text"><code class="language-text">S3 Transfer Acceleration 架構：

普通上傳路徑（慢）：
  用戶（新加坡）────公共互聯網────→ S3（us-east-1 北維吉尼亞）
  延遲：~200ms，受公共互聯網擁塞影響

Transfer Acceleration 路徑（快）：
  用戶（新加坡）──→ CloudFront Edge（新加坡 PoP，~5ms）
                    ──→ AWS 全球骨幹網路（低延遲、高頻寬）
                         ──→ S3（us-east-1）
  延遲大幅降低，且骨幹網路不受公共互聯網擁塞影響

使用方式：
  普通端點：bucket.s3.amazonaws.com
  加速端點：bucket.s3-accelerate.amazonaws.com
  費用：每 GB 額外 $0.04（從 S3 Standard Transfer 費用 $0.09 增加）</code></pre>
  <callout-box type="tip" title="什麼時候需要 Transfer Acceleration？">
    S3 Transfer Acceleration 適合以下場景：
    1) 用戶分布全球，需要跨 Region 上傳大檔案（影片、設計檔案）；
    2) 業務上必須統一使用單一 Region 的 Bucket（如合規要求資料存在特定國家）；
    3) 上傳速度是用戶體驗的關鍵指標。
    若用戶和 Bucket 在同一 Region，不需要 Transfer Acceleration（已很快）。
  </callout-box>
</section>
`,
} satisfies ChapterContent;
