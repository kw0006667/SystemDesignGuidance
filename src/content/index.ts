import type { Chapter, Part } from '../types.js';

export const parts: Part[] = [
  { id: 1, title: 'Part 1：基礎建設篇',      chapters: [1, 2, 3],                               difficulty: 'Entry Level' },
  { id: 2, title: 'Part 2：核心元件篇',      chapters: [4, 5, 6, 7, 8, 9],                      difficulty: 'Junior → Mid' },
  { id: 3, title: 'Part 3：架構設計篇',      chapters: [10, 11, 12, 13, 14],                    difficulty: 'Mid → Senior' },
  { id: 4, title: 'Part 4：實戰場景篇',      chapters: [15, 16, 17, 18, 19, 20, 21, 22],        difficulty: 'Senior' },
  { id: 5, title: 'Part 5：Multi-Agentic 篇', chapters: [23, 24, 25, 26, 27, 28, 29, 30],       difficulty: 'Senior → Staff' },
  { id: 6, title: 'Part 6：工程卓越篇',      chapters: [31, 32, 33],                            difficulty: 'Staff' },
  { id: 7, title: '附錄',                   chapters: ['appA', 'appB'],                         difficulty: '' },
];

export const chapters: Chapter[] = [
  // ── Part 1 ──────────────────────────────────────────────
  {
    id: 1, slug: 'chapter-1', title: '什麼是系統設計？', part: 1, difficulty: 'entry',
    sections: [
      { slug: 'what-is-system-design', title: '系統設計 vs 物件導向設計' },
      { slug: 'functional-nonfunctional', title: 'Functional vs Non-Functional 需求' },
      { slug: 'cap-theorem-intro', title: 'CAP Theorem 初探' },
      { slug: 'sla-slo-sli', title: 'SLA / SLO / SLI' },
    ],
  },
  {
    id: 2, slug: 'chapter-2', title: '容量估算與規模思考', part: 1, difficulty: 'entry',
    sections: [
      { slug: 'estimation-basics', title: '估算的基本思維' },
      { slug: 'qps-storage-bandwidth', title: 'QPS、儲存與頻寬估算' },
      { slug: 'latency-numbers', title: 'Latency Numbers Every Engineer Should Know' },
      { slug: 'traffic-patterns', title: 'Traffic Pattern 分析' },
    ],
  },
  {
    id: 3, slug: 'chapter-3', title: '網路基礎與通訊協定', part: 1, difficulty: 'entry',
    sections: [
      { slug: 'http-evolution', title: 'HTTP/1.1 → HTTP/2 → HTTP/3 演進' },
      { slug: 'tcp-vs-udp', title: 'TCP vs UDP 的選擇邏輯' },
      { slug: 'rest-graphql-grpc', title: 'REST vs GraphQL vs gRPC' },
      { slug: 'realtime-protocols', title: 'WebSocket / SSE / Long Polling' },
    ],
  },

  // ── Part 2 ──────────────────────────────────────────────
  {
    id: 4, slug: 'chapter-4', title: '負載平衡器（Load Balancer）', part: 2, difficulty: 'junior-mid',
    sections: [
      { slug: 'why-load-balancer', title: '為什麼需要負載平衡？' },
      { slug: 'l4-vs-l7', title: 'L4 vs L7 Load Balancer' },
      { slug: 'lb-algorithms', title: '常見演算法' },
      { slug: 'ha-patterns', title: 'Active-Active vs Active-Passive' },
    ],
  },
  {
    id: 5, slug: 'chapter-5', title: '快取系統（Caching）', part: 2, difficulty: 'junior-mid',
    sections: [
      { slug: 'cache-fundamentals', title: '快取的本質與層次' },
      { slug: 'cache-strategies', title: 'Cache-aside / Read-through / Write-through' },
      { slug: 'cache-invalidation', title: 'Cache Invalidation 三大難題' },
      { slug: 'cache-eviction', title: 'LRU / LFU / TTL 淘汰策略' },
      { slug: 'cache-pitfalls', title: 'Cache Stampede 與 Cache Penetration 防禦' },
    ],
  },
  {
    id: 6, slug: 'chapter-6', title: '資料庫設計與選型', part: 2, difficulty: 'junior-mid',
    sections: [
      { slug: 'sql-vs-nosql', title: '關聯式 vs 非關聯式資料庫' },
      { slug: 'database-types', title: '各類型資料庫適用場景' },
      { slug: 'acid-vs-base', title: 'ACID vs BASE' },
      { slug: 'sharding-replication', title: 'Sharding 與 Read Replica' },
      { slug: 'index-design', title: 'Database Index 設計原則' },
    ],
  },
  {
    id: 7, slug: 'chapter-7', title: '訊息佇列與事件驅動架構', part: 2, difficulty: 'junior-mid',
    sections: [
      { slug: 'sync-vs-async', title: '同步 vs 非同步通訊的取捨' },
      { slug: 'message-queue-vs-streaming', title: 'Message Queue vs Event Streaming' },
      { slug: 'kafka-rabbitmq-sqs', title: 'Kafka vs RabbitMQ vs SQS' },
      { slug: 'delivery-guarantees', title: 'At-least-once / Exactly-once Delivery' },
      { slug: 'dlq-backpressure', title: 'Dead Letter Queue 與 Backpressure' },
    ],
  },
  {
    id: 8, slug: 'chapter-8', title: '物件儲存與 CDN', part: 2, difficulty: 'junior-mid',
    sections: [
      { slug: 'storage-types', title: 'Block / File / Object Storage 差異' },
      { slug: 's3-design', title: 'S3/Blob Storage 設計哲學' },
      { slug: 'cdn-push-pull', title: 'CDN Push vs Pull 模式' },
      { slug: 'presigned-url', title: 'Pre-signed URL 安全設計' },
    ],
  },
  {
    id: 9, slug: 'chapter-9', title: '搜尋系統設計', part: 2, difficulty: 'junior-mid',
    sections: [
      { slug: 'inverted-index', title: '倒排索引原理' },
      { slug: 'text-processing', title: 'Tokenization / Stemming / Stop Words' },
      { slug: 'scoring', title: 'TF-IDF vs BM25 評分機制' },
      { slug: 'elasticsearch-arch', title: 'Elasticsearch 架構' },
      { slug: 'typeahead-intro', title: 'Typeahead / Autocomplete 思路' },
    ],
  },

  // ── Part 3 ──────────────────────────────────────────────
  {
    id: 10, slug: 'chapter-10', title: '單體 vs 微服務架構', part: 3, difficulty: 'mid-senior',
    sections: [
      { slug: 'monolith-vs-microservices', title: 'Monolith 不是壞事' },
      { slug: 'when-to-split', title: '何時拆分服務？' },
      { slug: 'strangler-fig', title: 'Strangler Fig Pattern' },
      { slug: 'service-mesh', title: 'Service Mesh 與 API Gateway' },
      { slug: 'distributed-fallacies', title: '分散式系統的 Fallacies' },
    ],
  },
  {
    id: 11, slug: 'chapter-11', title: '高可用性設計（High Availability）', part: 3, difficulty: 'mid-senior',
    sections: [
      { slug: 'sla-math', title: '99.9% vs 99.99% 的現實意義' },
      { slug: 'redundancy', title: '冗餘（Redundancy）設計' },
      { slug: 'circuit-breaker', title: 'Circuit Breaker Pattern' },
      { slug: 'bulkhead', title: 'Bulkhead Pattern' },
      { slug: 'graceful-degradation', title: 'Graceful Degradation vs Fail Fast' },
    ],
  },
  {
    id: 12, slug: 'chapter-12', title: '一致性與分散式事務', part: 3, difficulty: 'mid-senior',
    sections: [
      { slug: 'cap-deep-dive', title: 'CAP Theorem 深度解析' },
      { slug: 'consistency-models', title: 'Strong vs Eventual Consistency' },
      { slug: 'saga-pattern', title: 'Saga Pattern：Choreography vs Orchestration' },
      { slug: 'distributed-lock', title: 'Distributed Lock（Redis Redlock）' },
      { slug: 'idempotency', title: 'Idempotency Key 設計' },
    ],
  },
  {
    id: 13, slug: 'chapter-13', title: 'API 設計最佳實踐', part: 3, difficulty: 'mid-senior',
    sections: [
      { slug: 'restful-principles', title: 'RESTful 設計原則' },
      { slug: 'pagination', title: 'Pagination：Offset vs Cursor-based' },
      { slug: 'rate-limiting', title: 'Rate Limiting：Token Bucket vs Leaky Bucket' },
      { slug: 'api-versioning', title: 'API 版本管理策略' },
      { slug: 'webhook-design', title: 'Webhook 設計與安全驗證' },
    ],
  },
  {
    id: 14, slug: 'chapter-14', title: '安全性設計', part: 3, difficulty: 'mid-senior',
    sections: [
      { slug: 'authn-authz', title: 'Authentication vs Authorization' },
      { slug: 'jwt-vs-session', title: 'JWT vs Session Token 的取捨' },
      { slug: 'oauth-oidc', title: 'OAuth 2.0 / OIDC 流程設計' },
      { slug: 'common-attacks', title: 'SQL Injection / XSS / CSRF 防禦' },
      { slug: 'zero-trust', title: 'Zero Trust Architecture' },
    ],
  },

  // ── Part 4 ──────────────────────────────────────────────
  {
    id: 15, slug: 'chapter-15', title: '設計短網址服務（URL Shortener）', part: 4, difficulty: 'senior',
    sections: [
      { slug: 'url-requirements', title: '需求分析與容量估算' },
      { slug: 'base62-encoding', title: 'Base62 編碼選擇' },
      { slug: 'redirect-strategy', title: '301 vs 302 Redirect' },
      { slug: 'url-analytics', title: 'Analytics 資料收集架構' },
    ],
  },
  {
    id: 16, slug: 'chapter-16', title: '設計通知系統（Notification System）', part: 4, difficulty: 'senior',
    sections: [
      { slug: 'notification-channels', title: 'Push / Email / SMS 多渠道抽象' },
      { slug: 'priority-queue', title: '優先級佇列設計' },
      { slug: 'deduplication', title: '防止重複通知（Deduplication）' },
      { slug: 'notification-reliability', title: 'DLQ 重試機制' },
    ],
  },
  {
    id: 17, slug: 'chapter-17', title: '設計社群媒體動態牆（News Feed）', part: 4, difficulty: 'senior',
    sections: [
      { slug: 'fanout-approaches', title: 'Fan-out on Write vs Fan-out on Read' },
      { slug: 'celebrity-problem', title: 'Celebrity 問題（Hotspot User）處理' },
      { slug: 'timeline-hybrid', title: 'Timeline 混合策略' },
      { slug: 'counter-service', title: '計數器服務（Counter Service）' },
    ],
  },
  {
    id: 18, slug: 'chapter-18', title: '設計即時聊天系統（Chat System）', part: 4, difficulty: 'senior',
    sections: [
      { slug: 'websocket-management', title: 'WebSocket 連線管理' },
      { slug: 'message-storage', title: '訊息儲存：HBase / Cassandra' },
      { slug: 'read-receipt', title: '已讀回執（Read Receipt）設計' },
      { slug: 'presence-service', title: '線上狀態（Presence）服務' },
      { slug: 'group-chat-fanout', title: '群組聊天 Fan-out 策略' },
    ],
  },
  {
    id: 19, slug: 'chapter-19', title: '設計影片串流系統（Video Streaming）', part: 4, difficulty: 'senior',
    sections: [
      { slug: 'video-upload-pipeline', title: '影片上傳與轉碼 Pipeline' },
      { slug: 'adaptive-bitrate', title: 'Adaptive Bitrate Streaming（HLS/DASH）' },
      { slug: 'storage-tiers', title: '影片儲存分層策略（Hot/Warm/Cold）' },
      { slug: 'playback-progress', title: '播放進度同步設計' },
    ],
  },
  {
    id: 20, slug: 'chapter-20', title: '設計分散式任務排程系統（Job Scheduler）', part: 4, difficulty: 'senior',
    sections: [
      { slug: 'cron-design', title: 'Cron-like 排程設計' },
      { slug: 'leader-election', title: '分散式 Leader Election' },
      { slug: 'job-state-machine', title: '任務狀態機設計' },
      { slug: 'dag-execution', title: '任務依賴圖（DAG）設計' },
    ],
  },
  {
    id: 21, slug: 'chapter-21', title: '設計搜尋自動補全（Typeahead Search）', part: 4, difficulty: 'senior',
    sections: [
      { slug: 'trie-structure', title: 'Trie 資料結構與分散式實作' },
      { slug: 'frequency-pipeline', title: '搜尋詞頻統計 Pipeline' },
      { slug: 'personalized-typeahead', title: '個人化補全 vs 全局補全' },
      { slug: 'typeahead-cache', title: '熱門詞彙快取策略' },
    ],
  },
  {
    id: 22, slug: 'chapter-22', title: '設計分散式鍵值儲存（Key-Value Store）', part: 4, difficulty: 'senior',
    sections: [
      { slug: 'consistent-hashing', title: 'Consistent Hashing 實作' },
      { slug: 'replication-quorum', title: '資料複製策略（Quorum）' },
      { slug: 'gossip-protocol', title: 'Gossip Protocol' },
      { slug: 'vector-clock', title: 'Vector Clock 衝突解決' },
    ],
  },

  // ── Part 5 ──────────────────────────────────────────────
  {
    id: 23, slug: 'chapter-23', title: 'AI Agent 系統設計基礎', part: 5, difficulty: 'senior-staff',
    sections: [
      { slug: 'what-is-agent', title: '什麼是 AI Agent？' },
      { slug: 'react-framework', title: 'ReAct 框架思想' },
      { slug: 'agent-memory-types', title: 'Agent Memory 四種類型' },
      { slug: 'tool-use-design', title: 'Tool Use / Function Calling 設計模式' },
    ],
  },
  {
    id: 24, slug: 'chapter-24', title: 'Multi-Agent 協作架構模式', part: 5, difficulty: 'senior-staff',
    sections: [
      { slug: 'why-multi-agent', title: '為什麼需要 Multi-Agent？' },
      { slug: 'orchestrator-worker', title: 'Orchestrator-Worker Pattern' },
      { slug: 'pipeline-pattern', title: 'Pipeline Pattern' },
      { slug: 'agent-communication', title: 'Agent 間通訊協定設計' },
    ],
  },
  {
    id: 25, slug: 'chapter-25', title: 'Agent 記憶與知識系統設計', part: 5, difficulty: 'senior-staff',
    sections: [
      { slug: 'rag-architecture', title: 'RAG（Retrieval-Augmented Generation）架構' },
      { slug: 'vector-database', title: '向量資料庫選型與設計' },
      { slug: 'chunking-strategies', title: 'Chunking 策略' },
      { slug: 'hybrid-search', title: 'Hybrid Search：向量 + 關鍵字' },
    ],
  },
  {
    id: 26, slug: 'chapter-26', title: 'Agent 工具系統（Tool Ecosystem）設計', part: 5, difficulty: 'senior-staff',
    sections: [
      { slug: 'tool-registry', title: 'Tool Registry 設計' },
      { slug: 'tool-schema', title: 'Tool Schema 標準化（OpenAPI）' },
      { slug: 'human-in-the-loop', title: 'Human-in-the-loop 設計' },
      { slug: 'mcp-protocol', title: 'MCP（Model Context Protocol）規範' },
    ],
  },
  {
    id: 27, slug: 'chapter-27', title: 'Multi-Agent 任務規劃與執行引擎', part: 5, difficulty: 'senior-staff',
    sections: [
      { slug: 'task-decomposition', title: 'Task Decomposition 策略' },
      { slug: 'dag-execution-engine', title: 'DAG 任務編排引擎' },
      { slug: 'dynamic-planning', title: 'Dynamic vs Static Planning' },
      { slug: 'checkpoint-design', title: '人工介入點（Checkpoint）設計' },
    ],
  },
  {
    id: 28, slug: 'chapter-28', title: 'Multi-Agent 系統的可靠性設計', part: 5, difficulty: 'senior-staff',
    sections: [
      { slug: 'output-validation', title: 'Agent 輸出驗證（Guardrails）' },
      { slug: 'hallucination-detection', title: 'Hallucination 偵測策略' },
      { slug: 'cost-control', title: 'Token Budget 管理' },
      { slug: 'audit-trail', title: 'Agent 行為稽核日誌' },
    ],
  },
  {
    id: 29, slug: 'chapter-29', title: '實戰：設計 AI 驅動的客服系統', part: 5, difficulty: 'senior-staff',
    sections: [
      { slug: 'customer-service-arch', title: '整體架構設計' },
      { slug: 'intent-routing', title: 'Intent Routing 設計' },
      { slug: 'context-management', title: '對話狀態管理' },
      { slug: 'escalation-trigger', title: '升級人工客服的觸發條件' },
    ],
  },
  {
    id: 30, slug: 'chapter-30', title: '實戰：設計 AI 程式碼審查系統', part: 5, difficulty: 'senior-staff',
    sections: [
      { slug: 'code-review-arch', title: '整體架構設計' },
      { slug: 'parallel-agents', title: '並行審查 Agent 設計' },
      { slug: 'synthesis-agent', title: 'Synthesis Agent 合併意見' },
      { slug: 'github-integration', title: 'GitHub PR 整合設計' },
    ],
  },

  // ── Part 6 ──────────────────────────────────────────────
  {
    id: 31, slug: 'chapter-31', title: '可觀測性設計（Observability）', part: 6, difficulty: 'staff',
    sections: [
      { slug: 'three-pillars', title: 'Logging / Metrics / Tracing 三位一體' },
      { slug: 'structured-logging', title: 'Structured Logging 設計原則' },
      { slug: 'distributed-tracing', title: 'Distributed Tracing（OpenTelemetry）' },
      { slug: 'slo-monitoring', title: 'SLO / Error Budget 監控' },
      { slug: 'ai-observability', title: 'AI Agent 的可觀測性挑戰' },
    ],
  },
  {
    id: 32, slug: 'chapter-32', title: '部署策略與 CI/CD', part: 6, difficulty: 'staff',
    sections: [
      { slug: 'blue-green', title: 'Blue-Green Deployment' },
      { slug: 'canary-release', title: 'Canary Release' },
      { slug: 'feature-flags', title: 'Feature Flags 設計' },
      { slug: 'db-migration-safety', title: 'Database Migration 安全策略' },
      { slug: 'rollback-design', title: 'Rollback 機制設計' },
    ],
  },
  {
    id: 33, slug: 'chapter-33', title: '成本最佳化設計', part: 6, difficulty: 'staff',
    sections: [
      { slug: 'cost-model', title: '計算、儲存、網路的成本模型' },
      { slug: 'storage-tiering', title: '冷熱資料分層儲存策略' },
      { slug: 'llm-cost-control', title: 'LLM 成本控制策略' },
      { slug: 'instance-strategy', title: 'Spot vs Reserved Instance 選擇' },
    ],
  },

  // ── Appendices ──────────────────────────────────────────
  {
    id: 'appA', slug: 'appendix-a', title: '附錄 A：系統設計面試攻略', part: 7,
    isAppendix: true,
    sections: [
      { slug: 'interview-framework', title: '面試框架與時間分配' },
      { slug: 'common-followups', title: '常見追問與應答策略' },
      { slug: 'level-expectations', title: 'Entry → Senior → Staff 層級期望差異' },
    ],
  },
  {
    id: 'appB', slug: 'appendix-b', title: '附錄 B：常用工具與技術棧速查', part: 7,
    isAppendix: true,
    sections: [
      { slug: 'tech-selection-table', title: '各場景推薦技術選型' },
      { slug: 'capacity-cheatsheet', title: '容量估算速查卡' },
      { slug: 'tradeoffs', title: '系統設計常見 Trade-off 清單' },
    ],
  },
];

export function getChapterById(id: number | string): Chapter | undefined {
  return chapters.find((ch) => ch.id === id);
}

export function getPartForChapter(chapterId: number | string): Part | undefined {
  const ch = getChapterById(chapterId);
  if (!ch) return undefined;
  return parts.find((p) => (p.chapters as (number | string)[]).includes(chapterId));
}

export function getPrevNext(chapterId: number | string): { prev: Chapter | null; next: Chapter | null } {
  const idx = chapters.findIndex((ch) => ch.id === chapterId);
  return {
    prev: idx > 0 ? chapters[idx - 1] : null,
    next: idx < chapters.length - 1 ? chapters[idx + 1] : null,
  };
}
