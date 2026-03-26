import type { ChapterContent } from '../../types.js';

export default {
  title: '可觀測性設計（Observability）',
  content: `
<section id="three-pillars">
  <h2>Logging / Metrics / Tracing 三位一體</h2>
  <p>可觀測性（Observability）是指系統能夠從外部輸出（日誌、指標、追蹤）推斷其內部狀態的能力。一個具備高度可觀測性的系統，工程師可以在不修改程式碼的情況下，快速診斷生產環境中的任何問題。</p>

  <arch-diagram src="./diagrams/ch31-observability.json" caption="可觀測性三支柱架構圖"></arch-diagram>

  <h3>三大支柱的定義與區別</h3>
  <table>
    <thead>
      <tr><th>支柱</th><th>回答的問題</th><th>資料形式</th><th>典型工具</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>日誌（Logging）</strong></td>
        <td>「發生了什麼事？」</td>
        <td>時間戳 + 事件描述（結構化 JSON）</td>
        <td>ELK Stack、Grafana Loki、CloudWatch Logs</td>
      </tr>
      <tr>
        <td><strong>指標（Metrics）</strong></td>
        <td>「系統健康狀況如何？」</td>
        <td>時間序列數字（計數、速率、直方圖、Gauge）</td>
        <td>Prometheus + Grafana、Datadog、CloudWatch Metrics</td>
      </tr>
      <tr>
        <td><strong>追蹤（Tracing）</strong></td>
        <td>「一個請求經過了哪些服務？每步花了多久？」</td>
        <td>有父子關係的 Span 樹（TraceID/SpanID）</td>
        <td>Jaeger、Zipkin、AWS X-Ray、Tempo（Grafana）</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="info" title="為什麼需要三個支柱？">
    三個支柱各有互補的長處，缺一不可：<br/>
    • <strong>只有 Logging</strong>：知道發生了什麼事，但無法快速看趨勢（需要大量查詢才能發現模式）。<br/>
    • <strong>只有 Metrics</strong>：看到 Error Rate 突然升高，但不知道是哪個請求、哪個服務出問題。<br/>
    • <strong>只有 Tracing</strong>：可以追蹤單一請求，但無法看全局趨勢。<br/>
    三者結合，才能實現「<strong>用 Metrics 發現問題 → 用 Tracing 定位服務 → 用 Logging 診斷根因</strong>」的完整工作流。
  </callout-box>

  <h3>工具生態與選型指南</h3>

  <h4>ELK Stack（日誌）</h4>
  <table>
    <thead>
      <tr><th>元件</th><th>職責</th><th>替代方案</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>Elasticsearch</td>
        <td>日誌儲存和全文索引</td>
        <td>OpenSearch（AWS 開源分支）、Loki（更便宜，不建索引）</td>
      </tr>
      <tr>
        <td>Logstash</td>
        <td>日誌收集、解析、轉換</td>
        <td>Fluentd、Fluent Bit（輕量級，適合容器）、Vector</td>
      </tr>
      <tr>
        <td>Kibana</td>
        <td>日誌查詢和視覺化</td>
        <td>Grafana（整合 Loki）、OpenSearch Dashboards</td>
      </tr>
    </tbody>
  </table>

  <h4>Prometheus + Grafana（指標）</h4>
  <p>目前最廣泛採用的開源指標監控組合：</p>
  <ul>
    <li><strong>Prometheus</strong>：時序資料庫 + Scraping（主動拉取各服務的 /metrics 端點）</li>
    <li><strong>Alertmanager</strong>：告警規則引擎，支援去重、靜默、路由到 PagerDuty/Slack</li>
    <li><strong>Grafana</strong>：儀表板視覺化，支援多種資料源</li>
    <li><strong>適用場景</strong>：中小型系統、自建部署、需要完全控制資料</li>
    <li><strong>不適用場景</strong>：超大規模（需要 Thanos 或 Cortex 做水平擴展）、不想維護基礎設施</li>
  </ul>

  <h4>Jaeger / Zipkin / Tempo（分散式追蹤）</h4>
  <table>
    <thead>
      <tr><th>工具</th><th>優點</th><th>缺點</th><th>適用場景</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>Jaeger</td>
        <td>功能豐富、CNCF 畢業專案</td>
        <td>儲存成本高、複雜</td>
        <td>大型企業、需要詳細分析</td>
      </tr>
      <tr>
        <td>Zipkin</td>
        <td>簡單、輕量</td>
        <td>功能相對少</td>
        <td>中小型系統、快速上手</td>
      </tr>
      <tr>
        <td>Grafana Tempo</td>
        <td>與 Grafana 深度整合、成本低</td>
        <td>查詢能力有限</td>
        <td>已有 Grafana Stack 的團隊</td>
      </tr>
      <tr>
        <td>AWS X-Ray</td>
        <td>完全托管、與 AWS 深度整合</td>
        <td>只在 AWS 生態</td>
        <td>AWS-native 系統</td>
      </tr>
    </tbody>
  </table>

  <h3>可觀測性成熟度模型</h3>
  <table>
    <thead>
      <tr><th>層級</th><th>特徵</th><th>適用階段</th><th>建設優先順序</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>L0：無可觀測性</td>
        <td>只有 print/console.log，問題靠猜</td>
        <td>原型階段</td>
        <td>—</td>
      </tr>
      <tr>
        <td>L1：基礎日誌</td>
        <td>結構化日誌，集中收集，可查詢</td>
        <td>MVP 上線</td>
        <td>第一優先</td>
      </tr>
      <tr>
        <td>L2：日誌 + 指標</td>
        <td>RED/USE 指標，基礎 Dashboard，告警</td>
        <td>成長期</td>
        <td>第二優先</td>
      </tr>
      <tr>
        <td>L3：三支柱齊備</td>
        <td>分散式追蹤，Correlation ID 關聯</td>
        <td>規模化</td>
        <td>第三優先</td>
      </tr>
      <tr>
        <td>L4：AI 可觀測性</td>
        <td>LLM 呼叫追蹤、Token 分析、Agent 行為追蹤</td>
        <td>AI 系統</td>
        <td>AI 系統特有</td>
      </tr>
    </tbody>
  </table>
</section>

<section id="structured-logging">
  <h2>Structured Logging 設計原則</h2>
  <p>結構化日誌（Structured Logging）使用固定的 JSON 格式記錄日誌，而非自由格式的字串。這讓日誌可以被機器高效解析、查詢和分析，是現代分散式系統的必備實踐。</p>

  <h3>結構化日誌的 JSON 格式範例</h3>
  <p>一個良好設計的結構化日誌 JSON 事件應包含以下欄位：</p>

  <pre data-lang="json"><code class="language-json">
{
  "timestamp": "2026-03-26T10:30:15.123Z",
  "level": "INFO",
  "service": "order-service",
  "version": "2.4.1",
  "environment": "production",
  "region": "ap-northeast-1",

  "event": "order_created",
  "message": "Order created successfully",

  "trace_id": "4bf92f3577b34da6",
  "span_id": "00f067aa0ba902b7",
  "correlation_id": "req-abc123-def456",

  "user_id": "usr_789",
  "tenant_id": "tenant_acme",

  "order_id": "ORD-12345",
  "amount": 99.90,
  "currency": "TWD",
  "items_count": 3,

  "duration_ms": 45,
  "http_method": "POST",
  "http_path": "/api/orders",
  "http_status": 201
}
  </code></pre>

  <h3>日誌格式設計與 Correlation ID</h3>
  <pre data-lang="python"><code class="language-python">
import structlog
import uuid
from contextvars import ContextVar

# 使用 Context Variable 傳播請求上下文（Thread-safe，支援 async）
correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="")
user_id_var: ContextVar[str] = ContextVar("user_id", default="")
tenant_id_var: ContextVar[str] = ContextVar("tenant_id", default="")

def configure_structured_logging(service_name: str, version: str):
    """配置結構化日誌，輸出 JSON 格式"""
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            add_service_context,
            add_request_context,
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer()  # 輸出 JSON
        ],
        wrapper_class=structlog.BoundLogger,
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory()
    )

def add_service_context(logger, method, event_dict):
    """注入服務級別的靜態上下文"""
    event_dict["service"] = SERVICE_NAME
    event_dict["version"] = SERVICE_VERSION
    event_dict["environment"] = os.getenv("ENV", "production")
    event_dict["region"] = os.getenv("AWS_REGION", "unknown")
    return event_dict

def add_request_context(logger, method, event_dict):
    """注入請求級別的動態上下文（從 ContextVar 讀取）"""
    correlation_id = correlation_id_var.get("")
    if correlation_id:
        event_dict["correlation_id"] = correlation_id
    user_id = user_id_var.get("")
    if user_id:
        event_dict["user_id"] = user_id
    return event_dict

# FastAPI Middleware：設置 Correlation ID
class CorrelationIdMiddleware:
    async def __call__(self, request: Request, call_next):
        # 優先使用上游服務傳來的 Correlation ID（保持跨服務的追蹤連貫性）
        correlation_id = (
            request.headers.get("X-Correlation-ID")
            or request.headers.get("X-Request-ID")
            or str(uuid.uuid4())
        )
        correlation_id_var.set(correlation_id)

        # 從 JWT 或 Session 提取 user_id
        if auth := request.headers.get("Authorization"):
            user_id = extract_user_id_from_token(auth)
            user_id_var.set(user_id or "")

        start_time = time.time()
        response = await call_next(request)
        duration_ms = (time.time() - start_time) * 1000

        # 回應也帶上 Correlation ID，讓客戶端可以追蹤
        response.headers["X-Correlation-ID"] = correlation_id

        # 記錄請求完成日誌
        logger.info(
            "http_request_completed",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=round(duration_ms, 2)
        )

        return response
  </code></pre>

  <h3>日誌採樣策略</h3>
  <p>生產環境中全量記錄所有日誌成本很高。採樣策略可以在保留關鍵資訊的同時降低成本：</p>

  <pre data-lang="python"><code class="language-python">
class LogSamplingConfig:
    """
    動態日誌採樣配置
    不同 Level 和不同事件類型使用不同採樣率
    """

    SAMPLING_RATES = {
        # 關鍵事件：100% 保留
        "payment_completed": 1.0,
        "payment_failed": 1.0,
        "user_signup": 1.0,
        "security_alert": 1.0,

        # ERROR 和 WARNING：100% 保留
        "ERROR": 1.0,
        "WARNING": 1.0,
        "CRITICAL": 1.0,

        # 正常業務事件：10% 採樣（高流量服務）
        "api_request": 0.10,
        "cache_hit": 0.01,     # 快取命中事件極多，只保留 1%
        "cache_miss": 0.10,

        # DEBUG：生產環境不記錄
        "DEBUG": 0.0,
    }

    def should_log(self, level: str, event: str) -> bool:
        """決定是否記錄此日誌"""
        rate = (
            self.SAMPLING_RATES.get(event)          # 事件特定採樣率優先
            or self.SAMPLING_RATES.get(level, 1.0)  # 其次是 Level 採樣率
        )

        if rate >= 1.0:
            return True
        if rate <= 0.0:
            return False

        return random.random() < rate
  </code></pre>

  <h3>PII 脫敏（Sensitive Data Masking）</h3>
  <p>日誌中不應包含個人識別資訊（PII）。需要在日誌記錄前自動脫敏：</p>

  <pre data-lang="python"><code class="language-python">
import re

class PIIRedactor:
    """
    在日誌寫入前自動脫敏 PII
    防止個人資料洩露到日誌系統
    """

    PII_PATTERNS = [
        # 信用卡號碼（保留前 4 和後 4 碼）
        (r'\b(\d{4})\s?\d{4}\s?\d{4}\s?(\d{4})\b', r'\\1 **** **** \\1'),
        # 電子郵件（保留 @ 前兩個字符）
        (r'\b([a-zA-Z0-9._%+-]{2})[a-zA-Z0-9._%+-]*(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b', r'\\1***\\2'),
        # 台灣身分證字號（保留前 3 碼）
        (r'\b([A-Z]\d{2})\d{7}\b', r'\\1*******'),
        # 電話號碼（只保留後 4 碼）
        (r'\b(0[2-9]\d{1,2}|09\d{2})[-\s]?(\d{3,4}[-\s]?\d{4})\b',
         lambda m: '****-' + m.group(2)[-4:]),
    ]

    SENSITIVE_FIELD_NAMES = {
        "password", "passwd", "secret", "token", "api_key",
        "credit_card", "card_number", "cvv", "ssn", "id_number",
        "phone", "email", "address", "birth_date"
    }

    def redact_dict(self, data: dict) -> dict:
        """遞迴脫敏字典中的 PII"""
        redacted = {}
        for key, value in data.items():
            if key.lower() in self.SENSITIVE_FIELD_NAMES:
                redacted[key] = "[REDACTED]"
            elif isinstance(value, str):
                redacted[key] = self.redact_string(value)
            elif isinstance(value, dict):
                redacted[key] = self.redact_dict(value)
            else:
                redacted[key] = value
        return redacted

    def redact_string(self, text: str) -> str:
        """對字串中的 PII pattern 進行脫敏"""
        for pattern, replacement in self.PII_PATTERNS:
            text = re.sub(pattern, replacement, text)
        return text
  </code></pre>

  <h3>日誌級別的正確使用</h3>
  <table>
    <thead>
      <tr><th>級別</th><th>使用場景</th><th>生產環境是否記錄</th><th>是否觸發告警</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>DEBUG</td>
        <td>詳細的診斷資訊（函式入口參數、中間計算結果）</td>
        <td>否（成本過高）</td>
        <td>否</td>
      </tr>
      <tr>
        <td>INFO</td>
        <td>正常業務事件（訂單建立、使用者登入、任務完成）</td>
        <td>採樣記錄</td>
        <td>否</td>
      </tr>
      <tr>
        <td>WARNING</td>
        <td>非預期但可處理（快取 miss、重試成功、資源接近限制）</td>
        <td>是</td>
        <td>可選（趨勢告警）</td>
      </tr>
      <tr>
        <td>ERROR</td>
        <td>錯誤但服務仍可繼續（單一請求失敗、第三方 API 錯誤）</td>
        <td>是（100%）</td>
        <td>是（Error Rate 告警）</td>
      </tr>
      <tr>
        <td>CRITICAL</td>
        <td>服務無法繼續（資料庫連線失敗、OOM、安全事件）</td>
        <td>是（100%）</td>
        <td>立即通知（PagerDuty）</td>
      </tr>
    </tbody>
  </table>
</section>

<section id="distributed-tracing">
  <h2>Distributed Tracing（OpenTelemetry）</h2>
  <p>分散式追蹤讓你能夠追蹤一個請求在多個微服務之間的完整旅程。OpenTelemetry（OTel）是目前業界最廣泛採用的可觀測性標準，它提供了統一的 SDK 和語意約定，讓你的追蹤資料可以傳送到任何後端（Jaeger、Zipkin、Datadog 等）。</p>

  <h3>TraceID / SpanID / ParentSpanID 的傳播</h3>
  <p>分散式追蹤的核心是 Trace Context 的傳播機制：</p>

  <table>
    <thead>
      <tr><th>概念</th><th>說明</th><th>示例值</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Trace ID</strong></td>
        <td>整個請求鏈路的唯一識別符（16 bytes，128 bit）</td>
        <td>4bf92f3577b34da6a3ce929d0e0e4736</td>
      </tr>
      <tr>
        <td><strong>Span ID</strong></td>
        <td>單個操作的識別符（8 bytes，64 bit）</td>
        <td>00f067aa0ba902b7</td>
      </tr>
      <tr>
        <td><strong>Parent Span ID</strong></td>
        <td>父操作的 Span ID（根 Span 沒有 Parent）</td>
        <td>a2fb4a1d1a96d312</td>
      </tr>
      <tr>
        <td><strong>traceparent header</strong></td>
        <td>W3C 標準的 Trace Context 傳播格式</td>
        <td>00-4bf92f35...-00f067aa...-01</td>
      </tr>
    </tbody>
  </table>

  <pre data-lang="python"><code class="language-python">
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

def setup_tracing(service_name: str, service_version: str):
    """初始化 OpenTelemetry 追蹤"""
    # Resource 描述這個服務（會附加到所有 Span 上）
    resource = Resource.create({
        "service.name": service_name,
        "service.version": service_version,
        "deployment.environment": os.getenv("ENV", "production"),
        "service.instance.id": os.getenv("HOSTNAME", "unknown"),
    })

    provider = TracerProvider(resource=resource)

    # 使用 BatchSpanProcessor（非同步批次導出，不阻塞請求）
    # 替代方案：SimpleSpanProcessor（同步，僅用於開發）
    exporter = OTLPSpanExporter(
        endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector:4317"),
        insecure=True  # 生產環境應啟用 TLS
    )
    provider.add_span_processor(
        BatchSpanProcessor(
            exporter,
            max_queue_size=2048,       # 佇列最大 Span 數
            schedule_delay_millis=5000, # 每 5 秒批次導出一次
            max_export_batch_size=512  # 每次最多導出 512 個 Span
        )
    )
    trace.set_tracer_provider(provider)

    # 自動 instrumentation（零程式碼修改）
    FastAPIInstrumentor.instrument()       # HTTP 請求自動追蹤
    HTTPXClientInstrumentor.instrument()   # HTTP 客戶端呼叫自動追蹤
    SQLAlchemyInstrumentor.instrument()    # 資料庫查詢自動追蹤
    # RedisInstrumentor.instrument()       # Redis 操作追蹤

# 手動 instrumentation：為自定義業務邏輯添加 Span
tracer = trace.get_tracer("order-service", "2.4.1")

async def process_order(order_id: str) -> Order:
    with tracer.start_as_current_span(
        "process_order",
        kind=trace.SpanKind.INTERNAL
    ) as span:
        # 設置 Span 屬性（可在 Jaeger/Tempo 中搜尋和過濾）
        span.set_attribute("order.id", order_id)
        span.set_attribute("order.service", "order-processor")

        order = await fetch_order_from_db(order_id)
        span.set_attribute("order.amount", float(order.amount))
        span.set_attribute("order.currency", order.currency)

        try:
            payment_result = await charge_payment(order)
            span.set_attribute("payment.status", payment_result.status)
            span.set_attribute("payment.provider", "stripe")
            return await finalize_order(order, payment_result)
        except PaymentError as e:
            # 記錄錯誤到 Span（會在 Jaeger 中顯示為紅色的錯誤 Span）
            span.record_exception(e)
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise
  </code></pre>

  <h3>Sampling 策略：Head-based vs Tail-based</h3>
  <p>全量追蹤所有請求成本很高。採樣策略決定保留哪些 Trace：</p>

  <table>
    <thead>
      <tr><th>策略</th><th>描述</th><th>優點</th><th>缺點</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Head-based Sampling（頭部採樣）</strong></td>
        <td>請求開始時就決定是否採樣（通常是隨機 1%）</td>
        <td>簡單、低開銷</td>
        <td>可能漏掉重要的錯誤 Trace（只有 1% 的錯誤被記錄）</td>
      </tr>
      <tr>
        <td><strong>Tail-based Sampling（尾部採樣）</strong></td>
        <td>請求完成後，根據結果決定是否保留（錯誤的一定保留）</td>
        <td>100% 保留錯誤 Trace，同時節省正常請求的成本</td>
        <td>需要緩衝全部 Trace 直到請求完成，記憶體消耗大</td>
      </tr>
      <tr>
        <td><strong>Adaptive Sampling（自適應採樣）</strong></td>
        <td>根據請求速率動態調整採樣率（高峰期降低採樣率）</td>
        <td>自動控制 Trace 數量，避免過載</td>
        <td>實現複雜</td>
      </tr>
    </tbody>
  </table>

  <pre data-lang="python"><code class="language-python">
from opentelemetry.sdk.trace.sampling import (
    ALWAYS_ON,
    ALWAYS_OFF,
    TraceIdRatioBased,
    ParentBased
)

# 推薦的混合採樣策略：
# 1. 如果父 Span 已採樣 → 繼承（保持 Trace 完整性）
# 2. 如果是新的 Trace → 1% 的隨機採樣
sampler = ParentBased(
    root=TraceIdRatioBased(0.01),  # 1% 的新 Trace 被採樣
    remote_parent_sampled=ALWAYS_ON,  # 上游採樣了，我也採樣
    remote_parent_not_sampled=ALWAYS_OFF,  # 上游沒採樣，我也不採
)

# 尾部採樣的 OTel Collector 配置（YAML）
TAIL_SAMPLING_COLLECTOR_CONFIG = """
processors:
  tail_sampling:
    decision_wait: 30s  # 等待 30 秒後才做決定
    num_traces: 100000  # 最多緩衝 10 萬個 Trace
    expected_new_traces_per_sec: 1000
    policies:
      # 策略 1：所有包含錯誤的 Trace 保留
      - name: error-policy
        type: status_code
        status_code:
          status_codes: [ERROR]

      # 策略 2：延遲超過 2 秒的 Trace 保留
      - name: latency-policy
        type: latency
        latency:
          threshold_ms: 2000

      # 策略 3：其他 Trace，1% 隨機採樣
      - name: random-policy
        type: probabilistic
        probabilistic:
          sampling_percentage: 1
"""
  </code></pre>
</section>

<section id="slo-monitoring">
  <h2>SLO / Error Budget 監控</h2>
  <p>SLO（Service Level Objective）是團隊對服務可靠性的內部目標，是 SLA（Service Level Agreement）的基礎。Error Budget 是「允許失敗的餘量」，是在不違反 SLO 的前提下，可以容忍多少錯誤。</p>

  <h3>SLO 設計的最佳實踐</h3>
  <pre data-lang="python"><code class="language-python">
# SLO 定義範例
SLO_DEFINITIONS = {
    "api_availability": {
        "description": "API 可用性：成功請求 / 總請求",
        "good_event": "http_status < 500",    # 2xx 和 4xx 都算成功（客戶端錯誤不算服務失敗）
        "metric": "sum(rate(http_requests_total{status!~'5..'}[5m])) / sum(rate(http_requests_total[5m]))",
        "target": 0.999,          # 99.9%
        "window": "30d",          # 滾動 30 天視窗
        "error_budget_minutes": 43.2  # 每 30 天允許約 43 分鐘不可用
    },
    "api_latency": {
        "description": "API 延遲 SLO：99% 的請求延遲 < 500ms",
        "good_event": "request_duration_ms < 500",
        "metric": "histogram_quantile(0.99, rate(http_request_duration_ms_bucket[5m]))",
        "target": 0.99,
        "window": "7d",
        "error_budget_minutes": 100.8
    },
    "llm_response_quality": {
        "description": "LLM 回應品質：95% 的 LLM 回應通過品質評估",
        "good_event": "llm_quality_score >= 0.7",
        "metric": "avg(llm_quality_score)",
        "target": 0.95,
        "window": "7d",
        "error_budget_minutes": 504  # 7 天的 5%
    }
}
  </code></pre>

  <h3>SLO Dashboard 設計</h3>
  <p>一個有效的 SLO Dashboard 應包含以下 Panel：</p>

  <table>
    <thead>
      <tr><th>Panel 名稱</th><th>顯示內容</th><th>告警條件</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>SLO 達成率（當前視窗）</td>
        <td>當前 30 天視窗的實際達成率 vs 目標</td>
        <td>低於目標 0.1% 時告警</td>
      </tr>
      <tr>
        <td>Error Budget 剩餘量</td>
        <td>本月剩餘的 Error Budget（分鐘）和消耗百分比</td>
        <td>消耗 75% 時告警</td>
      </tr>
      <tr>
        <td>Burn Rate（消耗速率）</td>
        <td>當前的 Error Budget 消耗速率（vs 正常速率）</td>
        <td>1h Burn Rate &gt; 14.4 時立即告警</td>
      </tr>
      <tr>
        <td>SLO 歷史趨勢</td>
        <td>過去 3 個月的 SLO 達成率折線圖</td>
        <td>可視化觀察，無自動告警</td>
      </tr>
    </tbody>
  </table>

  <h3>Error Budget 自動化計算</h3>
  <pre data-lang="python"><code class="language-python">
class ErrorBudgetMonitor:
    """Error Budget 監控與多時間窗口 Burn Rate 告警"""

    def calculate_error_budget_status(
        self,
        slo_name: str
    ) -> ErrorBudgetStatus:
        slo = SLO_DEFINITIONS[slo_name]
        window_minutes = self._parse_window_to_minutes(slo["window"])

        # 計算實際成功率（過去 30 天）
        actual_rate = self.prometheus.query(slo["metric"])

        # Error Budget 消耗計算
        allowed_error_rate = 1.0 - slo["target"]
        actual_error_rate = 1.0 - actual_rate
        budget_consumed_ratio = actual_error_rate / allowed_error_rate

        remaining_budget_minutes = slo["error_budget_minutes"] * (1 - budget_consumed_ratio)

        return ErrorBudgetStatus(
            slo_name=slo_name,
            target=slo["target"],
            actual=actual_rate,
            budget_consumed_percent=budget_consumed_ratio * 100,
            remaining_budget_minutes=max(0, remaining_budget_minutes),
            is_over_budget=budget_consumed_ratio >= 1.0
        )
  </code></pre>

  <h3>Burn Rate Alerts（多時間窗口告警）</h3>
  <p>Google SRE 推薦的多時間窗口 Burn Rate 告警，可以在不同嚴重程度下及時發現問題：</p>

  <pre data-lang="yaml"><code class="language-yaml">
# Prometheus Alertmanager 規則（multi-window burn rate alerts）
groups:
  - name: slo-alerts
    rules:
      # 嚴重告警：快速消耗 Error Budget
      # 1 小時內消耗超過 2%（相當於 14.4x 正常速率）
      - alert: SLO_ErrorBudgetBurning_Critical
        expr: |
          (
            1 - (
              sum(rate(http_requests_total{status!~"5.."}[1h]))
              / sum(rate(http_requests_total[1h]))
            )
          ) / (1 - 0.999) > 14.4
        for: 2m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "SLO Error Budget 正在快速消耗（1 小時視窗）"
          description: "當前 Burn Rate 為 {{ $value }}x 正常速率，預計 {{ printf \"%.1f\" (100 / $value) }} 天內耗盡本月 Error Budget"

      # 警告告警：中速消耗 Error Budget
      # 6 小時內消耗超過 5%（相當於 6x 正常速率）
      - alert: SLO_ErrorBudgetBurning_Warning
        expr: |
          (
            1 - (
              sum(rate(http_requests_total{status!~"5.."}[6h]))
              / sum(rate(http_requests_total[6h]))
            )
          ) / (1 - 0.999) > 6
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "SLO Error Budget 消耗偏快（6 小時視窗）"

      # 資訊告警：Error Budget 已消耗 75%
      - alert: SLO_ErrorBudgetLow
        expr: |
          (
            sum_over_time(slo_error_budget_consumed_ratio[30d])
          ) > 0.75
        labels:
          severity: info
        annotations:
          summary: "本月 Error Budget 已消耗 75%，建議減少高風險發布"
  </code></pre>

  <h3>SLO 違反的 Runbook 設計</h3>
  <p>當 SLO 告警觸發時，工程師需要快速的 Runbook 指引：</p>

  <pre data-lang="markdown"><code class="language-markdown">
# SLO Runbook：API 可用性 SLO 違反

## 觸發條件
Burn Rate > 14.4x（1 小時視窗）或 > 6x（6 小時視窗）

## 影響評估
1. 查看 Grafana: [SLO Dashboard](https://grafana.example.com/slo)
2. 計算剩餘 Error Budget：當前消耗 X%，還剩 Y 分鐘
3. 確認影響的使用者範圍（使用 user_id 篩選日誌）

## 排查步驟

### Step 1：確認問題範圍（2 分鐘）
- 查看 Error Rate 是全域性的還是特定端點？
  \`\`\`
  sum by (path) (rate(http_requests_total{status=~"5.."}[5m]))
  \`\`\`
- 問題從什麼時候開始？（對應最近的部署）

### Step 2：查看最近部署（2 分鐘）
- 檢查部署記錄：[Deployment Dashboard](https://ci.example.com)
- 如果有最近 30 分鐘的部署，考慮回滾

### Step 3：查看錯誤日誌（5 分鐘）
- Kibana 查詢：\`level:ERROR AND @timestamp:[now-30m TO now]\`
- 找到主要錯誤類型和 Stack Trace

### Step 4：行動
- 如果是已知問題：啟用 Feature Flag 關閉問題功能
- 如果是未知問題：立即通知 On-call 工程師
- 如果需要回滾：執行 [回滾手冊](./rollback-runbook.md)

## 恢復確認
SLO 告警解除，Burn Rate 回到正常水位（< 1x）
  </code></pre>
</section>

<section id="ai-observability">
  <h2>AI Agent 的可觀測性挑戰</h2>
  <p>傳統的可觀測性工具設計用於確定性系統，而 AI Agent 引入了新的可觀測性挑戰：LLM 呼叫的非確定性、長鏈推理的中間狀態、Token 使用成本追蹤，以及幻覺率的量化等。</p>

  <h3>LLM 的可觀測性挑戰</h3>
  <table>
    <thead>
      <tr><th>挑戰</th><th>傳統系統的類比</th><th>AI 系統的特殊性</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>非確定性</td>
        <td>函式相同輸入總有相同輸出</td>
        <td>相同 Prompt 可能產生不同結果（temperature &gt; 0）</td>
      </tr>
      <tr>
        <td>Token 消耗成本</td>
        <td>CPU/Memory 是基礎設施成本</td>
        <td>每次 LLM 呼叫直接產生可計算的費用（Input/Output tokens）</td>
      </tr>
      <tr>
        <td>延遲分佈</td>
        <td>延遲相對穩定</td>
        <td>LLM 延遲差異極大（1秒 到 60秒），且隨 Output Token 數線性增長</td>
      </tr>
      <tr>
        <td>輸出品質</td>
        <td>正確/錯誤是二元的</td>
        <td>輸出品質是連續的（好/一般/差），需要人工或自動評估</td>
      </tr>
      <tr>
        <td>幻覺（Hallucination）</td>
        <td>不存在</td>
        <td>LLM 可能自信地輸出錯誤資訊，需要特殊檢測機制</td>
      </tr>
    </tbody>
  </table>

  <h3>LLM 可觀測性的關鍵指標</h3>
  <pre data-lang="python"><code class="language-python">
class LLMObservabilityLayer:
    """
    LLM 呼叫的可觀測性包裝層
    包裝所有 LLM 呼叫，自動記錄追蹤、指標和日誌
    """

    async def traced_complete(
        self,
        prompt: str,
        model: str,
        agent_id: str,
        task_id: str,
        purpose: str  # 用於分類成本（如 "intent_classification", "response_generation"）
    ) -> LLMResponse:
        with self.tracer.start_as_current_span("llm.complete") as span:
            # 追蹤屬性
            span.set_attribute("llm.model", model)
            span.set_attribute("llm.purpose", purpose)
            span.set_attribute("agent.id", agent_id)
            span.set_attribute("task.id", task_id)
            span.set_attribute("llm.input_tokens", count_tokens(prompt))
            # 注意：不記錄完整 prompt，可能含 PII
            span.set_attribute("llm.prompt_preview", prompt[:200])

            start_time = time.time()

            try:
                response = await self._actual_llm_call(prompt, model)
                latency_ms = (time.time() - start_time) * 1000

                # 追蹤指標
                span.set_attribute("llm.output_tokens", response.usage.completion_tokens)
                span.set_attribute("llm.total_tokens", response.usage.total_tokens)
                span.set_attribute("llm.latency_ms", round(latency_ms, 2))
                span.set_attribute("llm.finish_reason", response.finish_reason)

                # 計算並記錄成本（USD）
                cost = self._calculate_cost(model, response.usage)
                span.set_attribute("llm.cost_usd", cost)

                # Prometheus 指標（用於 Dashboard 和告警）
                self.metrics.histogram(
                    "llm_latency_ms",
                    latency_ms,
                    labels={"model": model, "purpose": purpose}
                )
                self.metrics.counter(
                    "llm_tokens_total",
                    response.usage.total_tokens,
                    labels={"model": model, "type": "total", "purpose": purpose}
                )
                self.metrics.counter(
                    "llm_cost_usd_total",
                    cost,
                    labels={"model": model, "purpose": purpose}
                )

                return response

            except Exception as e:
                span.record_exception(e)
                span.set_status(trace.StatusCode.ERROR)
                self.metrics.counter(
                    "llm_errors_total", 1,
                    labels={"model": model, "error": type(e).__name__}
                )
                raise

    def _calculate_cost(self, model: str, usage: LLMUsage) -> float:
        """根據模型定價計算 LLM 費用"""
        PRICING = {
            "gpt-4o": {"input": 2.5, "output": 10.0},       # USD per 1M tokens
            "gpt-4o-mini": {"input": 0.15, "output": 0.60},
            "claude-3-5-sonnet": {"input": 3.0, "output": 15.0},
        }
        price = PRICING.get(model, {"input": 5.0, "output": 15.0})
        return (
            usage.prompt_tokens / 1_000_000 * price["input"]
            + usage.completion_tokens / 1_000_000 * price["output"]
        )
  </code></pre>

  <h3>LangSmith 和 Langfuse 工具簡介</h3>
  <p>除了自建可觀測性層，也可以使用專為 LLM 應用設計的平台：</p>

  <table>
    <thead>
      <tr><th>工具</th><th>類型</th><th>核心功能</th><th>適用場景</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>LangSmith</strong></td>
        <td>SaaS（LangChain 官方）</td>
        <td>Trace 追蹤、Prompt 管理、Playground 重放、Dataset 管理</td>
        <td>使用 LangChain 的團隊、快速上手</td>
      </tr>
      <tr>
        <td><strong>Langfuse</strong></td>
        <td>開源（可自托管）</td>
        <td>類似 LangSmith，支援多框架、評估功能強</td>
        <td>需要資料留存在自己環境的團隊</td>
      </tr>
      <tr>
        <td><strong>Helicone</strong></td>
        <td>SaaS（代理模式）</td>
        <td>作為 LLM API 的代理，零程式碼整合</td>
        <td>快速獲得可觀測性，不想改程式碼</td>
      </tr>
    </tbody>
  </table>

  <pre data-lang="python"><code class="language-python">
# Langfuse 整合範例（只需幾行代碼）
from langfuse import Langfuse
from langfuse.decorators import observe, langfuse_context

langfuse = Langfuse(
    public_key=os.getenv("LANGFUSE_PUBLIC_KEY"),
    secret_key=os.getenv("LANGFUSE_SECRET_KEY"),
)

@observe()  # 裝飾器自動追蹤此函式的 LLM 呼叫
async def classify_intent(message: str, model: str = "gpt-4o-mini") -> dict:
    # 設置此 Trace 的元數據
    langfuse_context.update_current_trace(
        name="intent_classification",
        user_id=current_user_id(),
        tags=["customer-service", "intent"],
        metadata={"message_length": len(message)}
    )

    response = await openai.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": message}]
    )

    # 記錄評估分數（用於品質追蹤）
    langfuse_context.score_current_trace(
        name="classification_confidence",
        value=extract_confidence(response),
    )

    return json.loads(response.choices[0].message.content)
  </code></pre>

  <h3>Agent 的行為追蹤</h3>
  <p>Multi-Agent 系統的追蹤需要記錄 Agent 的完整行為鏈，包括工具呼叫和推理步驟：</p>

  <pre data-lang="python"><code class="language-python">
class AgentExecutionTracer:
    """
    追蹤 Agent 執行的完整行為鏈
    包含：思考步驟、工具呼叫、LLM 呼叫
    """

    def emit_agent_metrics(self, agent_run: AgentRun):
        """記錄 Agent 執行的完整指標"""
        self.metrics.histogram(
            "agent_run_duration_ms",
            agent_run.duration_ms,
            labels={"agent_type": agent_run.agent_type}
        )
        self.metrics.histogram(
            "agent_steps_count",
            agent_run.steps_taken,
            labels={"agent_type": agent_run.agent_type}
        )
        self.metrics.counter(
            "agent_tool_calls_total",
            agent_run.tool_calls_count,
            labels={"agent_type": agent_run.agent_type}
        )

        # 記錄 Agent 執行日誌（包含思考鏈摘要）
        self.logger.info(
            "agent_run_completed",
            agent_id=agent_run.agent_id,
            agent_type=agent_run.agent_type,
            task_id=agent_run.task_id,
            success=agent_run.success,
            steps_taken=agent_run.steps_taken,
            tokens_used=agent_run.tokens_used,
            duration_ms=agent_run.duration_ms,
            tool_calls=[t.tool_name for t in agent_run.tool_calls],
            # 思考鏈摘要（截斷以控制日誌大小）
            reasoning_summary=agent_run.reasoning[:500] if agent_run.reasoning else None,
            # 最終結果摘要（不含完整內容）
            result_preview=agent_run.result[:200] if agent_run.result else None
        )

  </code></pre>

  <h3>AI 系統的 Dashboard 關鍵指標</h3>
  <table>
    <thead>
      <tr><th>指標類別</th><th>指標名稱</th><th>告警條件</th><th>Dashboard 視覺化</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>延遲</td>
        <td>llm_latency_p50 / p95 / p99</td>
        <td>p99 &gt; 10s 連續 5 分鐘</td>
        <td>Heatmap（延遲分佈）</td>
      </tr>
      <tr>
        <td>成本</td>
        <td>llm_cost_usd_total（按模型和 purpose 分類）</td>
        <td>每小時成本超過預算 150%</td>
        <td>時序折線圖 + 預算線</td>
      </tr>
      <tr>
        <td>Token 消耗</td>
        <td>llm_tokens_per_request（Input vs Output 比例）</td>
        <td>Output/Input 比例異常（可能有 Prompt Injection）</td>
        <td>堆疊柱狀圖</td>
      </tr>
      <tr>
        <td>可靠性</td>
        <td>agent_success_rate</td>
        <td>低於 95% 連續 10 分鐘</td>
        <td>儀表盤（Gauge）</td>
      </tr>
      <tr>
        <td>品質</td>
        <td>output_validation_fail_rate</td>
        <td>高於 5% 連續 5 分鐘</td>
        <td>時序折線圖</td>
      </tr>
      <tr>
        <td>安全性</td>
        <td>guardrail_trigger_rate（按類型）</td>
        <td>高於 1%（可能有 Prompt Injection 攻擊）</td>
        <td>Pie Chart（各類型比例）</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="tip" title="幻覺率（Hallucination Rate）的量化">
    幻覺率是 AI 系統最難量化的指標之一。幾種實際可用的量化方法：<br/>
    1. <strong>基於知識庫的驗證</strong>：對於有明確正確答案的問題（FAQ、事實查詢），用標準答案比對 LLM 的回答，計算準確率。<br/>
    2. <strong>LLM-as-Judge</strong>：使用更強的 LLM（如 GPT-4o）評估另一個 LLM 的輸出是否事實正確，規模化評估。<br/>
    3. <strong>使用者回饋信號</strong>：「這個回答有幫助嗎？」的負面回饋率，是幻覺率的間接指標。<br/>
    4. <strong>關鍵事實提取</strong>：從 LLM 輸出中提取關鍵事實，逐條驗證真實性（適合特定領域的系統）。
  </callout-box>
</section>
`,
} satisfies ChapterContent;
