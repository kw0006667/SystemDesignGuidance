import type { ChapterContent } from '../../types.js';

export default {
  title: '設計影片串流系統（Video Streaming）',
  content: `
<section id="video-upload-pipeline">
  <h2>影片上傳與轉碼 Pipeline</h2>
  <p>影片串流系統（如 YouTube、Netflix）的後端複雜度遠超一般 API。一段 4K 影片可能達到 50GB，需要轉碼成多種解析度和格式，再分散到全球 CDN。讓我們從上傳流程開始。</p>

  <arch-diagram src="./diagrams/ch19-video-streaming.json" caption="影片串流系統架構：從客戶端分塊上傳到轉碼農場（Transcoding Farm）、CDN 分發、播放進度追蹤的完整數據流。"></arch-diagram>

  <h3>直接上傳 vs 分塊上傳</h3>
  <pre data-lang="text"><code class="language-text">直接上傳的問題：
  - 上傳 50GB 影片，中途斷網需要重新上傳全部
  - 瀏覽器記憶體無法容納 50GB
  - HTTP 請求超時（通常 30-60 秒）

分塊上傳（Chunked Upload / Resumable Upload）：
  1. 客戶端將影片分割成 5MB 的塊（chunks）
  2. 依序或並行上傳每個塊
  3. 若中斷，可以從最後成功的塊繼續
  4. 全部塊上傳完成後，伺服器合併成完整影片</code></pre>

  <pre data-lang="typescript"><code class="language-typescript">// 客戶端：分塊上傳實作
class ResumableUploader {
  private chunkSize = 5 * 1024 * 1024; // 5MB

  async upload(file: File): Promise&lt;string&gt; {
    // 1. 初始化上傳，獲取 upload_id
    const { uploadId, uploadedChunks } = await this.initUpload({
      filename: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });

    const totalChunks = Math.ceil(file.size / this.chunkSize);

    // 2. 跳過已上傳的 chunks（斷點續傳）
    for (let chunkIndex = 0; chunkIndex &lt; totalChunks; chunkIndex++) {
      if (uploadedChunks.includes(chunkIndex)) continue;

      const start = chunkIndex * this.chunkSize;
      const end = Math.min(start + this.chunkSize, file.size);
      const chunk = file.slice(start, end);

      await this.uploadChunk(uploadId, chunkIndex, chunk);
    }

    // 3. 通知伺服器完成
    const { videoId } = await this.completeUpload(uploadId);
    return videoId;
  }

  private async uploadChunk(
    uploadId: string,
    chunkIndex: number,
    chunk: Blob
  ): Promise&lt;void&gt; {
    // 使用 Pre-signed URL 直接上傳到 S3（繞過應用伺服器）
    const { presignedUrl } = await api.getChunkPresignedUrl(uploadId, chunkIndex);

    await fetch(presignedUrl, {
      method: 'PUT',
      body: chunk,
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    });

    // 通知後端此 chunk 已完成
    await api.confirmChunk(uploadId, chunkIndex);
  }
}

// 伺服器端：上傳完成後觸發轉碼 Pipeline
async function onUploadComplete(uploadId: string): Promise&lt;void&gt; {
  const upload = await db.getUpload(uploadId);

  // 合併 S3 上的分塊（使用 S3 Multipart Upload API）
  await s3.completeMultipartUpload({
    bucket: 'raw-videos',
    key: upload.rawVideoKey,
    uploadId: upload.s3UploadId,
    parts: upload.parts,
  });

  // 發布轉碼任務到佇列
  await transcodeQueue.publish({
    videoId: upload.videoId,
    rawVideoKey: upload.rawVideoKey,
    userId: upload.userId,
    title: upload.title,
    targetFormats: ['360p', '480p', '720p', '1080p', '4k'],
  });
}
</code></pre>

  <h3>轉碼 Pipeline 詳細步驟</h3>
  <p>轉碼 Pipeline 分為三個主要階段：Pre-processing（前處理）、Encoding（編碼）、Post-processing（後處理）。</p>
  <pre data-lang="text"><code class="language-text">Phase 1 - Pre-processing（前處理）：
  1. 影片驗證（Validation）：
     - 檢查檔案完整性（MD5 校驗）
     - 驗證支援的格式（MP4, MOV, AVI, MKV...）
     - 掃描惡意內容（病毒掃描）
     - 內容安全審查（CSAM 偵測）

  2. 元數據提取（Metadata Extraction）：
     - 分辨率、幀率（FPS）、時長、編碼格式
     - 音訊頻道數、取樣率
     - 使用工具：FFprobe（FFmpeg 的一部分）

  3. 影片重新包裝（Remux）：
     - 將非標準格式轉換為處理用的格式（如 AVI → MP4）
     - 不重新編碼，只是改變容器格式（速度快）

Phase 2 - Encoding（編碼）：
  1. 影片編碼（Video Encoding）：
     - 輸入：原始影片
     - 輸出：多種解析度 (360p, 480p, 720p, 1080p, 4K)
     - 編碼器：H.264（最廣泛相容）、H.265/HEVC（高效率）、VP9（開放格式）

  2. 音訊編碼（Audio Encoding）：
     - AAC 128kbps（標準品質）、256kbps（高品質）
     - 如有多語言，分別處理各語言音軌

  3. 字幕處理（Subtitle Processing）：
     - 提取 SRT/ASS 格式字幕
     - 或使用 AI（Whisper）自動生成字幕

Phase 3 - Post-processing（後處理）：
  1. 縮圖生成（Thumbnail Generation）：
     - 每分鐘提取一幀作為縮圖候選
     - AI 選取最清晰、最具代表性的幀
     - 生成多種尺寸（320x180, 640x360, 1280x720）

  2. 串流清單生成（Manifest Generation）：
     - 生成 HLS master.m3u8 和各解析度 playlist.m3u8
     - 生成 DASH MPD 檔案

  3. CDN 預熱（CDN Warm-up）：
     - 主動推送到距離創作者最近的 CDN 節點
     - 對預計熱門影片預先分發到多個 PoP</code></pre>

  <h3>FFmpeg 基本概念</h3>
  <p>FFmpeg 是業界標準的開源影片處理工具，幾乎所有影片平台都直接或間接使用它。</p>
  <pre data-lang="typescript"><code class="language-typescript">// 轉碼 Worker（使用 FFmpeg）
async function transcodeVideo(job: TranscodeJob): Promise&lt;void&gt; {
  const { videoId, rawVideoKey, targetFormats } = job;

  // 更新狀態
  await db.updateVideoStatus(videoId, 'TRANSCODING');

  for (const format of targetFormats) {
    const outputKey = \`processed/\${videoId}/\${format}.mp4\`;

    // FFmpeg 轉碼命令（概念性展示）
    await ffmpeg.run([
      '-i', \`s3://raw-videos/\${rawVideoKey}\`,
      ...getTranscodeArgs(format),
      \`s3://processed-videos/\${outputKey}\`
    ]);

    // 記錄完成
    await db.addVideoFormat(videoId, { format, s3Key: outputKey });
  }

  // 生成 HLS Manifest
  await generateHlsManifest(videoId);
  await db.updateVideoStatus(videoId, 'PUBLISHED');
}

function getTranscodeArgs(format: string): string[] {
  // FFmpeg 關鍵參數說明：
  // -vf scale=W:H → 縮放到指定分辨率
  // -b:v → 影片碼率（Video Bitrate）
  // -b:a → 音訊碼率（Audio Bitrate）
  // -c:v libx264 → 使用 H.264 編碼器
  // -c:a aac → 使用 AAC 音訊編碼
  // -movflags faststart → 將索引移到檔頭（支援邊下邊播）
  const configs: Record&lt;string, string[]&gt; = {
    '360p':  ['-vf', 'scale=640:360',   '-c:v', 'libx264', '-b:v', '500k',   '-c:a', 'aac', '-b:a', '128k', '-movflags', 'faststart'],
    '480p':  ['-vf', 'scale=854:480',   '-c:v', 'libx264', '-b:v', '1000k',  '-c:a', 'aac', '-b:a', '128k', '-movflags', 'faststart'],
    '720p':  ['-vf', 'scale=1280:720',  '-c:v', 'libx264', '-b:v', '2500k',  '-c:a', 'aac', '-b:a', '192k', '-movflags', 'faststart'],
    '1080p': ['-vf', 'scale=1920:1080', '-c:v', 'libx264', '-b:v', '5000k',  '-c:a', 'aac', '-b:a', '192k', '-movflags', 'faststart'],
    '4k':    ['-vf', 'scale=3840:2160', '-c:v', 'libx265', '-b:v', '20000k', '-c:a', 'aac', '-b:a', '320k', '-movflags', 'faststart'],
  };
  return configs[format] ?? [];
}</code></pre>

  <h3>轉碼農場的資源調度</h3>
  <pre data-lang="text"><code class="language-text">轉碼農場（Transcoding Farm）設計：

硬體選型：
  - 一般轉碼：CPU 密集型 (c5.4xlarge, 16 vCPU)
  - 4K/HDR 轉碼：GPU 加速 (g4dn.xlarge, NVIDIA T4)
  - GPU 比 CPU 快 3-5 倍，但成本更高

優先級佇列：
  - 付費用戶（Premium）：高優先級佇列
  - 免費用戶：低優先級佇列
  - 熱門創作者：優先轉碼（預測流量）

並行轉碼策略：
  一個影片的不同解析度可以並行轉碼：
    Worker 1 → 360p + 480p（輕量）
    Worker 2 → 720p（中量）
    Worker 3 → 1080p + 4K（重量）
  → 三個 Worker 並行，總時間取決於最重的任務

成本估算：
  一部 1 小時 4K 電影（50GB 原始檔）：
  - 轉碼時間：約 2-3 小時（CPU）或 30-45 分鐘（GPU）
  - 轉碼後輸出：~20GB（所有解析度的 HLS Segments）
  - 轉碼成本：約 $0.5-2 美元（雲端 GPU 按時計費）</code></pre>

  <callout-box type="tip" title="影片格式標準演進">
    <p>H.264 (AVC) 是目前相容性最廣的格式，幾乎所有設備都支援。H.265 (HEVC) 在相同品質下體積是 H.264 的一半，但授權費較高。AV1 是 Google/Netflix/Amazon 等聯合開發的開放格式，壓縮效率比 H.265 再好 30%，且免版稅，正逐漸成為新標準。YouTube 已大量使用 VP9/AV1，Netflix 則積極採用 AV1。</p>
  </callout-box>
</section>

<section id="adaptive-bitrate">
  <h2>Adaptive Bitrate Streaming（HLS/DASH）</h2>
  <p>自適應碼率串流（ABR）根據用戶的網路狀況，動態調整影片品質。網路好時播 1080p，網路差時自動降到 360p，確保流暢播放不卡頓。</p>

  <h3>HLS .m3u8 檔案結構詳解</h3>
  <pre data-lang="text"><code class="language-text">HLS 文件結構（完整範例）：

Master Playlist（主清單，master.m3u8）：
  #EXTM3U
  #EXT-X-VERSION:6
  #EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",LANGUAGE="zh-TW",NAME="Chinese",URI="audio_zh.m3u8"
  #EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",LANGUAGE="en",NAME="English",URI="audio_en.m3u8"
  #EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",LANGUAGE="zh-TW",NAME="中文",URI="sub_zh.m3u8"

  #EXT-X-STREAM-INF:BANDWIDTH=500000,RESOLUTION=640x360,CODECS="avc1.42e01e,mp4a.40.2",AUDIO="audio",SUBTITLES="subs"
  360p/playlist.m3u8

  #EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720,CODECS="avc1.4d401f,mp4a.40.2",AUDIO="audio",SUBTITLES="subs"
  720p/playlist.m3u8

  #EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2",AUDIO="audio",SUBTITLES="subs"
  1080p/playlist.m3u8

  #EXT-X-STREAM-INF:BANDWIDTH=20000000,RESOLUTION=3840x2160,CODECS="hvc1.2.4.L150.90,mp4a.40.2",AUDIO="audio",SUBTITLES="subs"
  4k/playlist.m3u8

解析度清單（720p/playlist.m3u8）：
  #EXTM3U
  #EXT-X-VERSION:6
  #EXT-X-TARGETDURATION:6          ← 每個片段最長 6 秒
  #EXT-X-PLAYLIST-TYPE:VOD         ← VOD（點播）vs LIVE（直播）
  #EXT-X-MAP:URI="init.mp4"        ← fMP4 格式的初始化段
  #EXTINF:6.000000,
  segment000.m4s                   ← 0-6 秒（fMP4 格式，更高效）
  #EXTINF:6.000000,
  segment001.m4s
  #EXTINF:6.000000,
  segment002.m4s
  ...
  #EXT-X-ENDLIST                   ← VOD 結束標記（直播沒有此行）</code></pre>

  <h3>DASH vs HLS 對比</h3>
  <pre data-lang="text"><code class="language-text">維度          HLS                     DASH
----------   ----------------------- -------------------------
標準組織      Apple 私有（後開源）     W3C 國際標準（ISO）
主要支援      Apple 設備原生支援       需要 JavaScript Player
容器格式      MPEG-TS 或 fMP4         fMP4
清單格式      .m3u8（文字格式）        .mpd（XML 格式）
加密支援      AES-128 / FairPlay       Widevine / PlayReady
延遲（直播）  5-30 秒（LL-HLS 可到1秒）   3-8 秒
主要採用者   YouTube, Netflix, Twitch  Netflix（部分）, YouTube（部分）

實際部署：
  大多數平台同時提供 HLS 和 DASH
  - Safari / iOS → HLS（原生支援）
  - Chrome / Android → DASH（效率更高）
  - Firefox → 兩者皆支援
  - Smart TV → 依廠商而定</code></pre>

  <h3>ABR 演算法詳解</h3>
  <p>自適應碼率的核心是演算法：如何根據當前網路狀況決定下一個片段的品質？主要有兩種演算法流派。</p>
  <pre data-lang="typescript"><code class="language-typescript">// Buffer-Based ABR（緩衝區導向，BOLA 演算法的簡化版）
// 根據緩衝區長度決定品質，而非單純看帶寬
class BufferBasedABR {
  selectQuality(bufferLengthSec: number): string {
    // 緩衝區越充裕，選擇越高品質
    if (bufferLengthSec > 20) return '1080p';  // 緩衝充足，可以冒險選高品質
    if (bufferLengthSec > 12) return '720p';
    if (bufferLengthSec > 8)  return '480p';
    if (bufferLengthSec > 4)  return '360p';
    return '240p';  // 緩衝危險，選最低品質保證不卡頓
  }
}

// Rate-Based ABR（帶寬導向）
// 根據測量到的下載速度選擇最高可用品質
class AdaptiveBitratePlayer {
  private currentQuality = '720p';
  private bandwidth = 0;       // 估計帶寬（bps）
  private bufferLength = 0;    // 已緩衝秒數

  onSegmentDownloaded(
    segment: VideoSegment,
    downloadTime: number
  ): void {
    // 帶寬 = 文件大小 / 下載時間
    const measuredBandwidth = (segment.byteSize * 8) / downloadTime;

    // 指數加權移動平均（EWMA）避免短暫波動
    this.bandwidth = 0.7 * this.bandwidth + 0.3 * measuredBandwidth;

    this.bufferLength = this.getBufferLength();

    this.selectNextQuality();
  }

  private selectNextQuality(): void {
    const qualities = [
      { name: '1080p', minBandwidth: 5_000_000 },
      { name: '720p',  minBandwidth: 2_500_000 },
      { name: '480p',  minBandwidth: 1_000_000 },
      { name: '360p',  minBandwidth: 500_000 },
    ];

    // 緩衝不足時強制降低品質（防止卡頓優先於品質）
    if (this.bufferLength &lt; 5) {
      this.currentQuality = '360p';
      return;
    }

    // 根據帶寬選擇最高可用品質（保留 20% 安全餘裕）
    const safeBandwidth = this.bandwidth * 0.8;
    const bestQuality = qualities.find(q => safeBandwidth >= q.minBandwidth);
    this.currentQuality = bestQuality?.name ?? '360p';
  }
}
</code></pre>

  <h3>CDN 的 Segment 快取策略</h3>
  <pre data-lang="text"><code class="language-text">HLS Segment 的 CDN 快取設計：

快取時間（Cache-Control）：
  Master Playlist（master.m3u8）：
    → Cache-Control: max-age=300    ← 5 分鐘（可能更新副標語等）

  Variant Playlist（720p/playlist.m3u8）：
    → VOD：Cache-Control: max-age=3600  ← 1 小時（內容不變）
    → LIVE：Cache-Control: max-age=2   ← 2 秒（直播頻繁更新）

  Video Segments（.m4s 或 .ts 檔案）：
    → Cache-Control: max-age=31536000, immutable
    → 永久快取（Segment 一旦生成就不會改變）

CDN 快取命中率的重要性：
  - 一部熱門影片同時有 100,000 人觀看
  - 若快取命中率 99%，只有 1,000 個請求打到 Origin
  - 若快取命中率 90%，有 10,000 個請求打到 Origin（10 倍差距）

Segment 快取命中率的影響因素：
  1. 解析度分佈：720p 是最常用的，快取命中率最高
  2. 觀看進度：影片前 10 分鐘的 Segment 最熱門（大部分用戶不看完）
  3. CDN PoP 選擇：距離用戶越近的 PoP 快取越高效
  4. 快取預熱：熱門影片發布前，主動將 Segment 推到各 PoP</code></pre>

  <callout-box type="info" title="片段大小的取捨">
    <p>HLS 片段大小通常是 2-10 秒。片段越短：切換品質的反應越快（但 HTTP 請求開銷大）；片段越長：壓縮效率更好（但切換延遲高）。直播場景用 2 秒片段；點播場景用 6-10 秒片段。低延遲 HLS（LL-HLS）使用 0.5-1 秒的「部分片段（Partial Segment）」，可以將直播延遲降到 1-2 秒。</p>
  </callout-box>
</section>

<section id="storage-tiers">
  <h2>影片儲存分層策略（Hot/Warm/Cold）</h2>
  <p>YouTube 有超過 800 萬小時的影片，但 80% 的觀看集中在最近上傳的 20% 影片（Power Law 分佈）。儲存分層策略根據存取頻率，將影片放置在不同成本的儲存層。</p>

  <h3>Hot/Warm/Cold 分層標準</h3>
  <pre data-lang="text"><code class="language-text">Hot Storage（熱存儲）：
  媒介：SSD / 高效能 NVMe，搭配 CDN Edge 快取
  成本：$23/TB/月（AWS S3 Standard）
  延遲：毫秒級（CDN 命中時 &lt;10ms）
  分層標準：
    - 上傳後前 7 天（新影片，期待高觀看量）
    - 過去 30 天觀看次數 > 10,000 次
    - 被推薦系統標記的「潛力影片」
  比例：約 5-10% 的影片，貢獻 70% 的流量

Warm Storage（溫存儲）：
  媒介：HDD（旋轉磁碟）
  成本：$12.5/TB/月（AWS S3 Standard-IA = Infrequent Access）
  延遲：首次存取稍慢（需從 S3 IA 取出），後續 CDN 快取
  分層標準：
    - 30-365 天內有觀看的影片
    - 過去 30 天觀看次數 100-10,000 次
  比例：約 20-30% 的影片

Cold Storage（冷存儲）：
  媒介：磁帶（Tape）/ AWS Glacier
  成本：$0.004/TB/月（AWS Glacier Deep Archive）≈ 熱存儲的 1/5750
  延遲：幾小時（需提前預熱才能播放）
  分層標準：
    - 超過 365 天無觀看記錄
    - 法規保存要求（版權保護、企業合規）
    - 帳號被停用但內容需保留（爭議期間）
  比例：約 60-70% 的影片</code></pre>

  <h3>S3 Storage Classes 在影片中的應用</h3>
  <pre data-lang="json"><code class="language-json">{
  "Rules": [
    {
      "ID": "VideoTieringRule",
      "Filter": { "Prefix": "processed-videos/" },
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA",
          "Comment": "30天後轉入 IA，費用降低約 45%"
        },
        {
          "Days": 180,
          "StorageClass": "GLACIER_INSTANT_RETRIEVAL",
          "Comment": "180天後轉入 Glacier Instant，費用降低約 68%，但取出需要幾毫秒到幾秒"
        },
        {
          "Days": 365,
          "StorageClass": "DEEP_ARCHIVE",
          "Comment": "365天後轉入 Deep Archive，費用降低約 99.5%，但取出需要12小時"
        }
      ]
    }
  ]
}</code></pre>

  <h3>影片 CDN 預熱策略</h3>
  <pre data-lang="typescript"><code class="language-typescript">// 智慧分層（根據觀看次數）
async function rebalanceVideoTiers(): Promise&lt;void&gt; {
  const videos = await db.getAllVideos();

  for (const video of videos) {
    const views30d = await analytics.getViews(video.id, 30);
    const currentTier = video.storageTier;
    const targetTier = determineTargetTier(views30d, video.uploadedAt);

    if (targetTier !== currentTier) {
      await migrateVideoTier(video, currentTier, targetTier);
    }
  }
}

function determineTargetTier(
  views30d: number,
  uploadedAt: Date
): StorageTier {
  const daysSinceUpload = daysSince(uploadedAt);

  if (views30d > 10000 || daysSinceUpload &lt; 7) {
    return StorageTier.HOT;
  } else if (views30d > 100 && daysSinceUpload &lt; 365) {
    return StorageTier.WARM;
  } else {
    return StorageTier.COLD;
  }
}

// CDN 預熱策略：在影片轉碼完成後主動推送到 CDN
async function preWarmCdn(videoId: string): Promise&lt;void&gt; {
  const video = await db.getVideo(videoId);

  // 根據創作者的觀眾地理分佈，選擇需要預熱的 CDN PoP
  const targetRegions = await creatorAnalytics.getAudienceRegions(video.creatorId);

  // 預熱最熱門的解析度和前 10 分鐘的 Segments
  const hotSegments = await getFirstNMinutesSegments(videoId, 10, ['720p', '1080p']);

  for (const region of targetRegions.slice(0, 5)) {  // 只預熱前 5 個主要地區
    for (const segmentUrl of hotSegments) {
      // 觸發 CDN 預取請求
      await cdn.prefetch({
        url: segmentUrl,
        region,
        priority: 'high',
      });
    }
  }
}

// 當冷存儲影片被請求時，非同步預熱到熱存儲
async function handleColdVideoRequest(videoId: string): Promise&lt;void&gt; {
  const video = await db.getVideo(videoId);

  if (video.storageTier === StorageTier.COLD) {
    // 返回暫時不可用訊息，同時觸發預熱
    await s3Glacier.restoreObject({
      bucket: 'cold-videos',
      key: video.s3Key,
      restoreRequest: {
        Days: 7,
        GlacierJobParameters: { Tier: 'Expedited' }  // 1-5 分鐘取出（收費）
      },
    });

    await db.updateVideoStatus(videoId, 'RESTORING');

    throw new VideoTemporarilyUnavailableError(
      'This video is being retrieved from archival storage. Please try again in a few minutes.'
    );
  }
}</code></pre>

  <h3>Content Delivery 成本最佳化</h3>
  <pre data-lang="text"><code class="language-text">影片 CDN 成本的主要驅動因素：
  1. 帶寬費用（Bandwidth）：$0.008-0.04 / GB（依地區而異）
  2. 請求數費用（Requests）：每 10,000 次 HTTPS 請求約 $0.01

成本估算（中型平台）：
  假設每日播放 1,000 萬次，平均每次看 15 分鐘
  720p 碼率：2.5 Mbps = 18.75 MB/分鐘
  每日流量：10,000,000 × 15 × 18.75MB = 2,812 TB/天
  CDN 費用：2,812 TB × $0.01/GB = $28,120/天 ≈ $8.4M/年

成本最佳化策略：
  1. CDN 競價（Multi-CDN）：
     - 同時使用多家 CDN（Cloudflare, Fastly, Akamai）
     - 根據即時價格和效能選擇最佳 CDN
     - 可節省 20-40% 的 CDN 費用

  2. 解析度降級（Bitrate Capping）：
     - 手機用戶預設上限為 720p（節省 50% 帶寬 vs 1080p）
     - 需要用戶手動選擇 1080p/4K

  3. 智慧快取策略：
     - 影片的前 30 秒 Segments 永久保留在 CDN（縮圖預覽需要）
     - 其餘 Segments 根據存取頻率決定快取時間

  4. P2P 串流（CDN offloading）：
     - 讓觀看同一影片的用戶互相分享 Segment（BitTorrent 原理）
     - 可減少 30-50% 的 CDN 流量
     - 典型案例：Akamai NetSession, WebRTC-based P2P</code></pre>

  <callout-box type="info" title="Netflix 的 Open Connect CDN">
    <p>Netflix 建立了自己的 CDN（Open Connect），將專用伺服器（OCA, Open Connect Appliance）免費放置在 ISP 的機房內。當 ISP 的用戶觀看 Netflix 時，流量直接在 ISP 內部傳輸，無需經過網際網路骨幹。這讓 Netflix 在節省大量 CDN 費用的同時，提供了更好的觀看品質。目前 Netflix 的 90%+ 流量通過 Open Connect 傳輸。</p>
  </callout-box>
</section>

<section id="playback-progress">
  <h2>播放進度同步設計</h2>
  <p>「上次看到第 35 分 42 秒，下次繼續」是影片平台的基本功能，但在多設備、高頻更新場景下需要謹慎設計。</p>

  <h3>播放進度同步的挑戰</h3>
  <pre data-lang="text"><code class="language-text">挑戰一：更新頻率高
  用戶正在觀看時，每秒都可能需要更新進度
  1,000 個用戶同時觀看 = 1,000 次寫入/秒（每秒）
  10,000 個用戶 = 10,000 次/秒（接近資料庫上限）
  → 解決：客戶端節流（每 10 秒上報一次）+ Redis 緩衝

挑戰二：多設備同步
  手機上看到第 30 分鐘暫停，轉到電視繼續看
  → 電視需要從雲端讀取最新進度
  → 問題：手機的進度可能還在 Redis 的等待批次寫入佇列中，
          電視讀取 DB 可能得到舊數據

  解決：讀取進度時優先讀 Redis（最新狀態），
        Redis 沒有才讀 DB（降級）

挑戰三：進度精確性 vs 效能取捨
  進度誤差在 5-10 秒內對用戶是可接受的
  → 不需要毫秒級精確，每 10 秒上報足夠
  → 但關鍵時刻（暫停、切換 App）需要立即保存

挑戰四：網路斷線時的進度丟失
  用戶在飛機上觀看下載的影片（離線），降落後同步進度
  → 解決：離線時保存到 localStorage，
          重新連線後自動上傳（補報機制）</code></pre>

  <h3>心跳式進度上報（每 10 秒）</h3>
  <pre data-lang="typescript"><code class="language-typescript">class PlaybackProgressTracker {
  private lastSavedPosition = 0;
  private readonly REPORT_INTERVAL = 10_000;  // 每 10 秒上報一次
  private readonly MIN_DELTA = 5;              // 至少移動 5 秒才上報
  private reportTimer: ReturnType&lt;typeof setInterval&gt; | null = null;

  constructor(
    private videoId: string,
    private userId: string,
    private totalDuration: number,
  ) {}

  startTracking(initialPosition: number): void {
    this.lastSavedPosition = initialPosition;

    // 定時上報（主要機制）
    this.reportTimer = setInterval(() => {
      const currentPosition = this.player.getCurrentTime();
      if (Math.abs(currentPosition - this.lastSavedPosition) >= this.MIN_DELTA) {
        this.saveProgress(currentPosition, 'heartbeat');
      }
    }, this.REPORT_INTERVAL);
  }

  stopTracking(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }
  }

  // 以下事件立即儲存（不等 10 秒）
  onPause(position: number): void {
    this.saveProgress(position, 'pause');
  }

  onSeek(newPosition: number): void {
    this.saveProgress(newPosition, 'seek');
  }

  onComplete(): void {
    this.saveProgress(this.totalDuration, 'complete');
  }

  onPageUnload(position: number): void {
    // 頁面關閉時使用 sendBeacon（即使頁面卸載也能完成請求）
    navigator.sendBeacon('/api/progress', JSON.stringify({
      videoId: this.videoId,
      positionSec: Math.floor(position),
      totalDuration: this.totalDuration,
      event: 'unload',
    }));
  }

  private async saveProgress(
    positionSec: number,
    event: string
  ): Promise&lt;void&gt; {
    try {
      await api.put('/api/progress', {
        videoId: this.videoId,
        positionSec: Math.floor(positionSec),
        totalDuration: this.totalDuration,
        watchPercentage: Math.floor((positionSec / this.totalDuration) * 100),
        event,
      });
      this.lastSavedPosition = positionSec;

      // 清除本地暫存（成功上傳後不需要離線補報）
      localStorage.removeItem(\`progress:\${this.videoId}\`);
    } catch (error) {
      // 上傳失敗：保存到 localStorage，等網路恢復後補傳
      localStorage.setItem(
        \`progress:\${this.videoId}\`,
        JSON.stringify({
          positionSec,
          savedAt: Date.now(),
          pendingSync: true,
        })
      );
    }
  }
}</code></pre>

  <h3>Resume Play 實現</h3>
  <pre data-lang="typescript"><code class="language-typescript">// 伺服器端：高效更新策略（Redis 緩衝 + 批量持久化）
app.put('/api/progress', async (req, res) => {
  const { videoId, positionSec, watchPercentage } = req.body;
  const userId = req.user.id;

  // 立即更新 Redis（毫秒級響應）
  const key = \`progress:\${userId}:\${videoId}\`;
  await redis.setex(key, 7 * 86400, JSON.stringify({
    positionSec,
    watchPercentage,
    updatedAt: Date.now(),
  }));

  // 非同步標記需要持久化（避免頻繁寫 DB）
  await progressQueue.add({ userId, videoId, positionSec, watchPercentage }, {
    delay: 30_000,    // 30 秒後批量寫入（同一影片的多次更新合併為一次 DB 寫入）
    jobId: key,       // 相同 jobId 會更新而非新增（去重機制）
    removeOnComplete: true,
  });

  res.status(204).send();
});

// 批量持久化 Worker（每 30 秒處理一批）
async function persistProgressBatch(jobs: ProgressJob[]): Promise&lt;void&gt; {
  // 批量 UPSERT（MySQL ON DUPLICATE KEY UPDATE）
  const values = jobs.map(j => [
    j.userId, j.videoId, j.positionSec, j.watchPercentage, new Date()
  ]);
  await db.query(\`
    INSERT INTO playback_progress (user_id, video_id, position_sec, watch_percentage, updated_at)
    VALUES ?
    ON DUPLICATE KEY UPDATE
      position_sec = VALUES(position_sec),
      watch_percentage = VALUES(watch_percentage),
      updated_at = VALUES(updated_at)
  \`, [values]);
}

// Resume Play：讀取進度（多設備同步）
app.get('/api/progress/:videoId', async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user.id;

  // 優先讀 Redis（最新狀態，考慮剛剛上報但還未寫入 DB 的情況）
  const cachedProgress = await redis.get(\`progress:\${userId}:\${videoId}\`);
  if (cachedProgress) {
    const data = JSON.parse(cachedProgress);
    return res.json({
      positionSec: data.positionSec,
      watchPercentage: data.watchPercentage,
      source: 'redis',
    });
  }

  // 降級讀 DB
  const progress = await db.query(
    'SELECT position_sec, watch_percentage FROM playback_progress WHERE user_id = ? AND video_id = ?',
    [userId, videoId]
  );

  res.json({
    positionSec: progress?.positionSec ?? 0,
    watchPercentage: progress?.watchPercentage ?? 0,
    source: 'database',
  });
});</code></pre>

  <h3>Watch History 設計</h3>
  <pre data-lang="text"><code class="language-text">Watch History（觀看歷史）資料模型：

CREATE TABLE watch_history (
  user_id          UUID NOT NULL,
  video_id         UUID NOT NULL,
  position_sec     INT DEFAULT 0,          -- 上次播放到的位置
  watch_percentage TINYINT DEFAULT 0,      -- 完播百分比（0-100）
  watch_duration   INT DEFAULT 0,          -- 累計觀看秒數（可多次觀看）
  last_watched_at  TIMESTAMP NOT NULL,     -- 最後一次觀看時間
  completed        BOOLEAN DEFAULT FALSE,  -- 是否完播（>90% 算完播）
  PRIMARY KEY (user_id, video_id),
  INDEX idx_user_last_watched (user_id, last_watched_at DESC)
);

Watch History 的用途：
  1. Resume Play：下次打開同一影片，自動跳到上次位置
  2. 繼續觀看列表（Continue Watching）：
     SELECT * FROM watch_history
     WHERE user_id = ? AND completed = FALSE
     ORDER BY last_watched_at DESC
     LIMIT 20;
  3. 推薦系統信號：
     - 完播率高的影片 → 推薦系統正面信號
     - 快速關閉的影片 → 負面信號
  4. 廣告定向：觀看了哪些類型的影片

資料保留策略：
  - 觀看記錄保留 2 年（之後移入冷存儲或刪除）
  - 用戶可以主動清除觀看記錄（GDPR 合規）
  - 清除後只刪除 position_sec（繼續播放功能），
    保留匿名化的統計數據（推薦系統使用）</code></pre>

  <callout-box type="tip" title="完播率追蹤">
    <p>播放進度不只用於「繼續播放」，也是重要的業務指標。追蹤「完播率（Completion Rate）」有助於推薦系統改進和內容品質評估。建議在進度記錄中保留 watch_percentage 欄位（positionSec / totalDurationSec × 100），並在達到 90% 時記錄為「實際完播」。對創作者來說，完播率是評估影片吸引力的關鍵指標，通常比點擊率更能反映影片品質。</p>
  </callout-box>
</section>
`,
} satisfies ChapterContent;
