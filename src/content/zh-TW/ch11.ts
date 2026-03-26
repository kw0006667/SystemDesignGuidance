import type { ChapterContent } from '../../types.js';

export default {
  title: '高可用性設計（High Availability）',
  content: `
<section id="sla-math">
  <h2>99.9% vs 99.99% 的現實意義</h2>
  <p>
    「五個 9 的可用性」聽起來令人印象深刻，但它在現實中意味著什麼？
    理解 SLA 背後的數學，才能做出務實的高可用設計決策。
    更重要的是，理解「為什麼每多一個 9 都需要數倍的工程投入」。
  </p>

  <h3>可用性數字對應的停機時間</h3>
  <table>
    <thead>
      <tr>
        <th>可用性</th>
        <th>年停機時間</th>
        <th>月停機時間</th>
        <th>週停機時間</th>
        <th>難度</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>99%（兩個 9）</td>
        <td>87.6 小時</td>
        <td>7.2 小時</td>
        <td>1.68 小時</td>
        <td>容易</td>
      </tr>
      <tr>
        <td>99.9%（三個 9）</td>
        <td>8.76 小時</td>
        <td>43.8 分鐘</td>
        <td>10.1 分鐘</td>
        <td>中等</td>
      </tr>
      <tr>
        <td>99.95%</td>
        <td>4.38 小時</td>
        <td>21.9 分鐘</td>
        <td>5 分鐘</td>
        <td>中等偏高</td>
      </tr>
      <tr>
        <td>99.99%（四個 9）</td>
        <td>52.6 分鐘</td>
        <td>4.38 分鐘</td>
        <td>1 分鐘</td>
        <td>高</td>
      </tr>
      <tr>
        <td>99.999%（五個 9）</td>
        <td>5.26 分鐘</td>
        <td>26.3 秒</td>
        <td>6.05 秒</td>
        <td>非常高（電信等級）</td>
      </tr>
    </tbody>
  </table>

  <h3>計劃停機 vs 非計劃停機</h3>
  <p>
    SLA 的停機時間通常包含所有類型的停機，但工程上需要區分兩種性質完全不同的停機：
  </p>
  <table>
    <thead>
      <tr>
        <th>類型</th>
        <th>說明</th>
        <th>範例</th>
        <th>解決方案</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>計劃停機（Planned Downtime）</td>
        <td>事先排程的維護窗口</td>
        <td>資料庫版本升級、Schema 遷移、資料中心切換</td>
        <td>零停機部署（Blue-Green、Rolling Update）、線上 Schema 遷移</td>
      </tr>
      <tr>
        <td>非計劃停機（Unplanned Downtime）</td>
        <td>意外的故障和事故</td>
        <td>硬體故障、軟體 Bug、流量突增、外部攻擊</td>
        <td>冗餘設計、自動 Failover、Circuit Breaker、Auto-scaling</td>
      </tr>
    </tbody>
  </table>
  <p>
    從三個 9 提升到四個 9，計劃停機的貢獻往往被低估：
    傳統的「週末維護窗口（2 小時）」每月一次，就已消耗掉四個 9 的全部停機預算（4.38 分鐘/月）。
    達到四個 9 意味著<strong>每次部署都必須是零停機部署</strong>，完全消除計劃停機。
  </p>

  <h3>串聯系統的可用性計算（乘法效應）</h3>
  <p>
    當請求鏈路上有多個服務時，整體可用性是各服務可用性的乘積。
    這個「乘法效應」讓達到高可用性比想象中難得多：
  </p>
  <pre data-lang="text"><code class="language-text">請求鏈路：負載平衡器 → 應用伺服器 → 快取 → 資料庫

各元件可用性（假設）：
  負載平衡器：99.99%
  應用伺服器：99.99%
  Redis 快取：99.99%
  資料庫：    99.99%

整體可用性 = 0.9999 × 0.9999 × 0.9999 × 0.9999
           = 0.9999^4 ≈ 99.96%

→ 雖然每個元件都有四個 9，整個系統只有 99.96%（每月約 17 分鐘停機）

更現實的場景（10 個微服務串聯，各 99.99%）：
  = 0.9999^10 ≈ 99.90%（每月約 43 分鐘停機！）

→ 這就是為什麼微服務架構反而可能降低整體可用性，
  除非每個服務的可用性都極高，或使用優雅降級設計</code></pre>

  <h3>並聯系統的可用性計算（冗餘的力量）</h3>
  <p>
    透過冗餘（Redundancy），並聯兩個元件可以大幅提升可用性：
  </p>
  <pre data-lang="text"><code class="language-text">並聯可用性公式：= 1 - (1 - P)^n
  其中 P = 單個元件的可用性，n = 並聯元件數量

兩個 99% 可用性的元件並聯：
  = 1 - (1 - 0.99)^2 = 1 - 0.0001 = 99.99%
  → 兩個兩個 9 的元件並聯，得到四個 9！

兩個 99.9% 可用性的元件並聯：
  = 1 - (1 - 0.999)^2 = 1 - 0.000001 = 99.9999%
  → 並聯兩個三個 9 的元件，可以得到六個 9 的可用性！

三個 AZ 並聯（各自可用性 99.95%）：
  = 1 - (1 - 0.9995)^3 = 1 - 0.000000125 ≈ 99.99999%
  → 跨三個 AZ 部署，理論上可達七個 9（實際受其他因素限制）</code></pre>

  <callout-box type="info" title="從 99.9% 到 99.99% 的代價">
    從三個 9 提升到四個 9，停機時間從 43 分鐘降到 4 分鐘，聽起來只少了 39 分鐘。
    但架構上的代價是：
    需要多 AZ 部署（保持各 AZ 容量充足）、
    自動 Failover（資料庫 RDS Multi-AZ 等）、
    零停機部署（Blue-Green Deploy 或 Rolling Update）、
    更複雜的監控和告警（需要 1 分鐘級別的告警，而非 5 分鐘）、
    Chaos Engineering（定期測試故障恢復能力）。
    每提升一個 9，工程投入和成本大約增加 10 倍。
    <strong>先問：你的業務真的需要那個 9 嗎？
    一個內部工具和一個金融交易系統對 SLA 的要求是完全不同的。</strong>
  </callout-box>

  <h3>跨 AZ 部署的可用性改善</h3>
  <p>
    以 AWS 的 Multi-AZ RDS 為例，實際數字是有說服力的：
  </p>
  <table>
    <thead>
      <tr>
        <th>部署方式</th>
        <th>AWS 官方 SLA</th>
        <th>典型 Failover 時間</th>
        <th>適用場景</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>單 AZ RDS</td>
        <td>99.5%</td>
        <td>手動，15-30 分鐘</td>
        <td>開發/測試環境</td>
      </tr>
      <tr>
        <td>Multi-AZ RDS</td>
        <td>99.95%</td>
        <td>自動，1-2 分鐘</td>
        <td>生產環境標配</td>
      </tr>
      <tr>
        <td>Multi-AZ RDS（Multi Standby）</td>
        <td>99.99%</td>
        <td>自動，&lt; 35 秒</td>
        <td>關鍵業務系統</td>
      </tr>
      <tr>
        <td>Aurora Global Database</td>
        <td>99.99%+</td>
        <td>跨 Region Failover &lt; 1 分鐘</td>
        <td>全球業務、極端 DR 需求</td>
      </tr>
    </tbody>
  </table>
</section>

<section id="redundancy">
  <h2>冗餘（Redundancy）設計</h2>
  <p>
    冗餘是高可用的核心手段：消除系統中的所有「單點故障（Single Point of Failure, SPOF）」。
    每一個 SPOF 都是系統可用性的天花板——無論其他部分設計得多好，
    只要有一個 SPOF，整個系統的可用性就受限於那個最脆弱的元件。
  </p>

  <h3>識別系統中的 SPOF</h3>
  <p>問自己：「如果這個元件現在立刻故障，系統會受影響嗎？能自動恢復嗎？」</p>
  <ul>
    <li>單台負載平衡器 → 使用 Active-Passive 或 Active-Active LB 對（AWS ALB 天然跨 AZ）</li>
    <li>單台資料庫 → 使用主從複製（Primary-Replica）或 Multi-AZ</li>
    <li>單個機房（AZ）→ 跨 AZ 部署（Multi-AZ）</li>
    <li>單個 DNS 服務商 → 使用多個 DNS 服務商（Route53 + Cloudflare）</li>
    <li>單個雲端供應商 → Multi-Cloud（成本很高，謹慎評估）</li>
    <li>單一外部依賴（如第三方支付 API）→ 預備備用供應商或降級策略</li>
  </ul>

  <h3>Active-Active vs Active-Passive</h3>
  <p>冗餘部署有兩種基本模式：</p>
  <table>
    <thead>
      <tr>
        <th>特性</th>
        <th>Active-Active</th>
        <th>Active-Passive（Hot Standby）</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>正常狀態</td>
        <td>兩個（或多個）節點都在處理流量</td>
        <td>主節點處理流量，備節點閒置等待</td>
      </tr>
      <tr>
        <td>資源利用率</td>
        <td>高（兩個節點都在工作）</td>
        <td>低（備節點平時不工作，資源浪費）</td>
      </tr>
      <tr>
        <td>Failover 速度</td>
        <td>極快（流量自動重新分配）</td>
        <td>需要幾十秒到幾分鐘（備節點接管）</td>
      </tr>
      <tr>
        <td>複雜度</td>
        <td>高（需要處理狀態共享、衝突）</td>
        <td>低（備節點只需同步，無衝突）</td>
      </tr>
      <tr>
        <td>適用場景</td>
        <td>無狀態服務（API Server）、讀寫分離的資料庫</td>
        <td>有狀態服務（資料庫 Primary）、難以水平擴展的元件</td>
      </tr>
      <tr>
        <td>典型範例</td>
        <td>多個 API Server 節點、Cassandra 叢集</td>
        <td>MySQL Primary/Replica、RDS Multi-AZ</td>
      </tr>
    </tbody>
  </table>

  <h3>多可用區（Multi-AZ）部署架構</h3>
  <p>
    AWS 等雲端平台提供「可用區（Availability Zone, AZ）」的概念：
    同一地區內的多個物理隔離的資料中心。
    AZ 之間有獨立的電力、網路和冷卻系統，單個 AZ 故障（如火災、電力中斷）不影響其他 AZ。
  </p>
  <pre data-lang="text"><code class="language-text">ap-northeast-1（東京地區）完整 Multi-AZ 架構：

┌──────────────────────────────────────────────────────────┐
│                     Route 53（DNS）                       │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│              Application Load Balancer（跨 AZ）           │
└──────────┬────────────────────────────┬───────────────────┘
           │                            │
┌──────────▼──────────┐    ┌────────────▼────────────────┐
│  ap-northeast-1a    │    │  ap-northeast-1c             │
│  ─────────────────  │    │  ─────────────────────────   │
│  App Servers × 3    │    │  App Servers × 3             │
│  Redis Primary      │    │  Redis Replica               │
│  RDS Primary ◄──────┼────┼──► RDS Standby（同步複製）  │
│  ElasticSearch      │    │  ElasticSearch               │
└─────────────────────┘    └─────────────────────────────┘

當 AZ-A 完全故障時：
  1. ALB 在 &lt; 30 秒內停止路由到 AZ-A（健康檢查失敗）
  2. RDS 自動 Failover：Standby 升為 Primary（約 60-120 秒）
  3. Redis Sentinel 觸發選主，Replica 升為 Primary
  4. Auto-scaling 在 AZ-C 補充缺失的 App Server 容量
  → 整體 Failover 時間：約 2-3 分鐘（期間部分請求失敗）</code></pre>

  <h3>Geographic Redundancy（地理冗餘）</h3>
  <p>
    對於需要抵抗整個地區（Region）故障的業務（如自然災害、重大地區性網路事故），
    需要跨 Region 的地理冗餘部署。這比 Multi-AZ 複雜得多：
  </p>
  <ul>
    <li><strong>Active-Passive（主動-被動）：</strong>
    一個 Region 處理所有流量，另一個 Region 保持溫備（Warm Standby）或冷備。
    Failover 時間通常 5-30 分鐘，有資料遺失風險（RPO > 0）。
    成本相對較低。</li>
    <li><strong>Active-Active（雙活）：</strong>
    兩個或多個 Region 同時處理流量，用戶就近路由。
    幾乎零 RPO（取決於複製延遲）。
    需要解決跨 Region 的資料衝突問題，技術複雜度和成本最高。
    適合金融、電商等不能有停機的業務。</li>
  </ul>

  <h3>資料複製策略</h3>
  <table>
    <thead>
      <tr>
        <th>複製類型</th>
        <th>說明</th>
        <th>RPO（資料遺失）</th>
        <th>寫入延遲</th>
        <th>適用場景</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>同步複製（Synchronous）</td>
        <td>寫入需等待所有副本確認才返回成功</td>
        <td>0（零資料遺失）</td>
        <td>高（等待最慢的副本）</td>
        <td>金融交易、不能有任何資料遺失的場景</td>
      </tr>
      <tr>
        <td>非同步複製（Asynchronous）</td>
        <td>寫入只等待 Primary 確認，副本非同步更新</td>
        <td>秒到分鐘級（複製延遲）</td>
        <td>低</td>
        <td>讀寫分離（讀可以稍微過時）、跨 Region 複製</td>
      </tr>
      <tr>
        <td>半同步複製（Semi-sync）</td>
        <td>至少等待一個 Replica 確認，其餘非同步</td>
        <td>接近零（至少有一個副本有最新資料）</td>
        <td>略高於非同步</td>
        <td>MySQL 預設的高可用設定</td>
      </tr>
      <tr>
        <td>Quorum 寫入（如 Cassandra W=QUORUM）</td>
        <td>需要多數節點（N/2+1）確認</td>
        <td>接近零</td>
        <td>中（取決於節點數和網路）</td>
        <td>分散式資料庫的強一致性寫入</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="info" title="RPO vs RTO：兩個最重要的災難恢復指標">
    <strong>RPO（Recovery Point Objective，恢復點目標）</strong>：
    故障發生時，最多可以接受遺失多長時間的資料？
    RPO = 0 意味著零資料遺失（需要同步複製）；RPO = 1 小時意味著可以接受遺失最多 1 小時的資料。
    <br/><br/>
    <strong>RTO（Recovery Time Objective，恢復時間目標）</strong>：
    從故障發生到系統恢復服務，最多允許花多少時間？
    RTO = 5 分鐘意味著 5 分鐘內系統必須恢復。
    <br/><br/>
    RPO 和 RTO 越小，架構成本越高。在設計 SLA 時，必須先和業務方確認可接受的 RPO 和 RTO。
  </callout-box>
</section>

<section id="circuit-breaker">
  <h2>Circuit Breaker Pattern</h2>
  <p>
    Circuit Breaker（熔斷器）Pattern 源自電路的保險絲設計哲學：
    當電路過載時，保險絲熔斷，保護整個電路系統不受損壞。
    在軟體中，熔斷器保護服務不因下游故障而陷入無謂等待，
    防止連鎖故障（Cascading Failure）蔓延，讓上下游服務都有恢復的機會。
  </p>
  <arch-diagram src="./diagrams/ch11-circuit-breaker.json" caption="Circuit Breaker 的三個狀態轉換：Closed（正常）→ Open（熔斷）→ Half-Open（探測恢復）"></arch-diagram>

  <h3>Circuit Breaker 的三個狀態詳解</h3>

  <h4>Closed（閉合，正常狀態）</h4>
  <p>
    正常情況下，熔斷器處於 Closed 狀態，所有請求都正常通過。
    熔斷器在後台維護一個滑動時間窗口（如最近 10 秒或最近 100 次請求），
    計算其中的失敗次數和失敗率。
    當失敗率超過設定閾值（如 50% 的請求失敗，或連續 5 次失敗），觸發熔斷，切換到 Open 狀態。
  </p>

  <h4>Open（開路，熔斷狀態）</h4>
  <p>
    所有請求<strong>立即返回預設的 Fallback 回應</strong>（如錯誤提示、快取結果、降級資料），
    完全不發出網路請求到下游服務。
    這讓下游服務有時間恢復（不被更多請求壓垮），也保護了上游服務的資源不被長時間等待佔用。
    等待設定的「冷卻時間（Recovery Timeout）」後（如 30 秒），切換到 Half-Open 狀態。
  </p>

  <h4>Half-Open（半開，探測狀態）</h4>
  <p>
    讓少量「探測請求」通過（如每 10 秒放過 1 個請求），測試下游服務是否已恢復。
    若探測請求成功（且連續成功次數達到閾值），切換回 Closed 狀態，恢復正常服務。
    若探測請求仍失敗，立即回到 Open 狀態，重設冷卻計時器。
  </p>

  <pre data-lang="text"><code class="language-text">Circuit Breaker 狀態機：

               失敗率 > 閾值
  ┌─────────────────────────────────────────┐
  │                                         ▼
[CLOSED]                               [OPEN]
  ▲  正常處理所有請求              立即返回 Fallback
  │  計算滑動窗口錯誤率            等待 Recovery Timeout
  │                                         │
  │          連續成功 N 次                   │ 超過 Recovery Timeout
  └──────────────────────────[HALF-OPEN] ◄──┘
                              放少量探測請求
                              有一次失敗 → 回到 OPEN</code></pre>

  <h3>閾值設計的關鍵決策</h3>
  <p>Circuit Breaker 的效果很大程度上取決於閾值的設計：</p>
  <ul>
    <li><strong>錯誤率閾值（Failure Rate Threshold）：</strong>
    通常設為 50%。設太低（如 10%）會導致誤熔斷（正常的偶發錯誤觸發熔斷）；
    設太高（如 90%）則熔斷器失去作用，服務已幾乎完全失敗才熔斷。</li>
    <li><strong>最小請求數（Minimum Calls）：</strong>
    在統計窗口內至少需要多少個請求才開始計算錯誤率（如 10 次）。
    避免在請求量極低時（如 1 次失敗 / 2 次請求 = 50%）錯誤觸發熔斷。</li>
    <li><strong>滑動窗口大小：</strong>
    基於時間（如最近 10 秒）或基於請求數（如最近 100 次）。
    時間窗口對突發流量更敏感；請求數窗口對持續低流量更穩定。</li>
    <li><strong>恢復超時（Recovery Timeout）：</strong>
    Open 狀態持續多久再進入 Half-Open。
    太短（如 5 秒）可能下游服務還未恢復；太長（如 5 分鐘）導致服務恢復後用戶等太久。
    通常設 30 秒到 2 分鐘。</li>
  </ul>

  <h3>Circuit Breaker 完整實作範例（Python）</h3>
  <pre data-lang="python"><code class="language-python">from enum import Enum
import time
from typing import Callable, Any, Optional
from collections import deque
from dataclasses import dataclass, field

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

@dataclass
class CircuitBreakerConfig:
    failure_rate_threshold: float = 0.5    # 50% 失敗率觸發熔斷
    minimum_calls: int = 10                # 最少 10 次請求才統計
    sliding_window_size: int = 100         # 最近 100 次請求的滑動窗口
    recovery_timeout: float = 30.0         # Open 狀態持續 30 秒
    half_open_max_calls: int = 3           # Half-Open 時最多 3 個探測請求
    success_threshold_in_half_open: int = 2 # Half-Open 連續 2 次成功才 Close

class CircuitBreaker:
    def __init__(self, name: str, config: CircuitBreakerConfig = CircuitBreakerConfig()):
        self.name = name
        self.config = config
        self.state = CircuitState.CLOSED
        self.call_results = deque(maxlen=config.sliding_window_size)
        self.last_state_change_time: float = 0
        self.half_open_call_count = 0
        self.half_open_success_count = 0

    def call(self, func: Callable, fallback: Optional[Callable] = None, *args, **kwargs) -> Any:
        if self.state == CircuitState.OPEN:
            elapsed = time.time() - self.last_state_change_time
            if elapsed >= self.config.recovery_timeout:
                self._transition_to(CircuitState.HALF_OPEN)
            else:
                remaining = self.config.recovery_timeout - elapsed
                print(f"[{self.name}] Circuit OPEN，{remaining:.1f} 秒後嘗試恢復")
                if fallback:
                    return fallback(*args, **kwargs)
                raise CircuitOpenError(f"Circuit breaker '{self.name}' is OPEN")

        if self.state == CircuitState.HALF_OPEN:
            if self.half_open_call_count >= self.config.half_open_max_calls:
                if fallback:
                    return fallback(*args, **kwargs)
                raise CircuitOpenError("Half-open call limit reached")
            self.half_open_call_count += 1

        try:
            result = func(*args, **kwargs)
            self._record_success()
            return result
        except Exception as e:
            self._record_failure()
            if fallback:
                return fallback(*args, **kwargs)
            raise

    def _record_success(self):
        self.call_results.append(True)
        if self.state == CircuitState.HALF_OPEN:
            self.half_open_success_count += 1
            if self.half_open_success_count >= self.config.success_threshold_in_half_open:
                self._transition_to(CircuitState.CLOSED)
                print(f"[{self.name}] Circuit CLOSED，服務已恢復 ✓")

    def _record_failure(self):
        self.call_results.append(False)
        if self.state == CircuitState.HALF_OPEN:
            self._transition_to(CircuitState.OPEN)
            print(f"[{self.name}] Half-Open 探測失敗，回到 OPEN")
            return
        if len(self.call_results) >= self.config.minimum_calls:
            failure_rate = self.call_results.count(False) / len(self.call_results)
            if failure_rate >= self.config.failure_rate_threshold:
                self._transition_to(CircuitState.OPEN)
                print(f"[{self.name}] Circuit OPEN！失敗率: {failure_rate:.1%}")

    def _transition_to(self, new_state: CircuitState):
        self.state = new_state
        self.last_state_change_time = time.time()
        if new_state == CircuitState.HALF_OPEN:
            self.half_open_call_count = 0
            self.half_open_success_count = 0
        elif new_state == CircuitState.CLOSED:
            self.call_results.clear()

class CircuitOpenError(Exception):
    pass

# 使用範例
payment_breaker = CircuitBreaker(
    name="payment-service",
    config=CircuitBreakerConfig(
        failure_rate_threshold=0.5,
        minimum_calls=5,
        recovery_timeout=30.0
    )
)

def fallback_payment():
    return {"status": "pending", "message": "支付系統暫時不可用，請稍後查看訂單狀態"}

def charge_payment(amount: float):
    return payment_breaker.call(
        payment_api.charge,
        fallback=fallback_payment,
        amount=amount
    )</code></pre>

  <callout-box type="info" title="業界實作：Resilience4j（Java 生態）">
    Java 生態中，Resilience4j 是目前最主流的韌性函式庫（Netflix Hystrix 已停止維護）。
    Resilience4j 使用函數式程式設計風格，支援 Circuit Breaker、Rate Limiter、
    Retry、Bulkhead、Time Limiter 等模式的靈活組合：
    <br/><br/>
    CircuitBreakerConfig config = CircuitBreakerConfig.custom()
      .failureRateThreshold(50)
      .waitDurationInOpenState(Duration.ofSeconds(30))
      .slidingWindowSize(100)
      .build();
    <br/><br/>
    在 Kubernetes 環境中，Istio Service Mesh 也可以在基礎設施層提供熔斷能力，
    讓應用程式碼無需引入熔斷器函式庫。
  </callout-box>
</section>

<section id="bulkhead">
  <h2>Bulkhead Pattern</h2>
  <p>
    Bulkhead（防水艙壁）Pattern 的名字來自船舶設計：
    現代船隻被分隔成多個密閉艙室，即使一個艙室進水，其他艙室仍然完好，
    船隻不會沉沒。鐵達尼號沉沒的一個原因就是防水艙壁高度不足，
    讓海水從一個艙室蔓延到下一個。
  </p>
  <p>
    在軟體中，Bulkhead 的核心思想是<strong>資源隔離</strong>：
    不讓一個功能、租戶或下游服務的問題耗盡所有共享資源，影響其他功能。
  </p>

  <h3>執行緒池隔離（Thread Pool Isolation）</h3>
  <p>
    為不同的外部服務呼叫分配獨立的執行緒池（Thread Pool），而不是共用一個大的執行緒池。
    即使某個外部服務（如通知服務）的執行緒池因等待回應而被耗盡，
    其他服務（如訂單服務、支付服務）的執行緒池完全不受影響：
  </p>
  <pre data-lang="python"><code class="language-python">from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)

class BulkheadManager:
    """為不同下游服務維護獨立的執行緒池"""

    def __init__(self):
        # 每個服務有獨立的執行緒池，大小根據其重要性和預期並發量設計
        self._pools = {
            "payment":      ThreadPoolExecutor(max_workers=10, thread_name_prefix="payment"),
            "notification": ThreadPoolExecutor(max_workers=5,  thread_name_prefix="notification"),
            "search":       ThreadPoolExecutor(max_workers=20, thread_name_prefix="search"),
            "recommendation": ThreadPoolExecutor(max_workers=8, thread_name_prefix="reco"),
        }

    def submit(self, service_name: str, func, *args, timeout: float = 5.0, **kwargs):
        """在指定服務的執行緒池中提交任務"""
        if service_name not in self._pools:
            raise ValueError(f"未知服務: {service_name}")

        pool = self._pools[service_name]
        future = pool.submit(func, *args, **kwargs)
        try:
            return future.result(timeout=timeout)
        except TimeoutError:
            logger.error(f"[Bulkhead] {service_name} 呼叫超時 ({timeout}s)")
            raise
        except Exception as e:
            logger.error(f"[Bulkhead] {service_name} 呼叫失敗: {e}")
            raise

bulkhead = BulkheadManager()

def process_order(order_id: str):
    """即使 notification_pool 完全耗盡，payment_pool 仍然正常工作"""

    # 支付呼叫在 payment 池中執行（核心業務，10 個執行緒）
    payment_result = bulkhead.submit("payment", charge_payment, order_id, timeout=5.0)

    # 通知呼叫在 notification 池中執行（非核心，5 個執行緒，較長超時可接受）
    try:
        bulkhead.submit("notification", send_email, order_id, timeout=2.0)
    except Exception:
        logger.warning(f"訂單 {order_id} 通知發送失敗，但不影響支付結果")

    return payment_result</code></pre>

  <h3>如何設計 Bulkhead 大小</h3>
  <p>執行緒池大小的設計需要根據服務特性和負載預估來決定：</p>
  <pre data-lang="text"><code class="language-text">執行緒池大小計算公式（Little's Law）：
  執行緒數 = 每秒請求數 × 平均回應時間（秒）

範例計算：
  支付服務：平均 200ms 回應時間，預期 30 RPS 並發
  → 執行緒數 = 30 × 0.2 = 6 個執行緒
  → 加上 20% 緩衝：推薦 8-10 個執行緒

  通知服務：平均 500ms 回應時間，預期 10 RPS 並發
  → 執行緒數 = 10 × 0.5 = 5 個執行緒

  搜索服務：平均 100ms 回應時間，預期 100 RPS 並發
  → 執行緒數 = 100 × 0.1 = 10 個執行緒
  → 加上緩衝：推薦 15-20 個執行緒

核心業務 vs 非核心業務的分配策略：
  核心業務（支付、訂單確認）：  分配更多執行緒 + 更短超時
  非核心業務（通知、推薦）：    分配較少執行緒 + 較長超時 + Fallback</code></pre>

  <h3>信號量隔離（Semaphore Isolation）</h3>
  <p>
    對於快速的本地操作或非同步框架（如 asyncio）中的 IO 操作，
    可以使用信號量（Semaphore）限制並發數，比執行緒池更輕量：
  </p>
  <pre data-lang="python"><code class="language-python">import asyncio

# 為不同服務定義獨立的信號量（Semaphore）
_semaphores = {
    "search":         asyncio.Semaphore(20),  # 最多 20 個並發搜索請求
    "recommendation": asyncio.Semaphore(10),  # 最多 10 個並發推薦請求
    "user_profile":   asyncio.Semaphore(30),  # 最多 30 個並發用戶資料請求
}

async def fetch_with_bulkhead(service: str, coro):
    """帶 Bulkhead 保護的非同步請求"""
    sem = _semaphores.get(service)
    if sem is None:
        return await coro

    try:
        async with sem:
            return await asyncio.wait_for(coro, timeout=2.0)
    except asyncio.TimeoutError:
        raise TimeoutError(f"{service} 請求超時")

# 使用範例
async def search_products(query: str):
    return await fetch_with_bulkhead(
        "search",
        search_client.search(query)
    )</code></pre>

  <h3>租戶隔離（Tenant Isolation）</h3>
  <p>
    在 SaaS 產品中，一個大客戶（Whale Customer）可能產生過多流量，
    影響其他租戶的服務品質（稱為「嘈雜鄰居問題，Noisy Neighbor Problem」）。
    Bulkhead 透過每個租戶獨立的資源配額和限流來隔離這種影響：
  </p>
  <ul>
    <li>每個租戶有獨立的 API Rate Limit（如 Free 用戶每分鐘 100 次，Enterprise 用戶每分鐘 10000 次）</li>
    <li>大客戶使用獨立的 Worker Pool 或甚至獨立的服務實例（Silo 模型）</li>
    <li>資料庫分片可以按租戶隔離（每個重要租戶一個 Shard，避免大租戶的查詢影響小租戶）</li>
    <li>計算密集型任務（如報表生成）放入獨立的任務佇列，不影響 API 回應</li>
  </ul>

  <callout-box type="tip" title="Netflix 的 Bulkhead 實踐：Hystrix">
    Netflix 的 Hystrix（雖已停止維護，但設計思想仍有參考價值）為每個依賴服務提供獨立的執行緒池，
    同時支援 Circuit Breaker 功能。在 Netflix 的峰值流量期間，
    即使某幾個非核心服務（如推薦、繼續觀看清單）的執行緒池耗盡，
    核心的影片串流服務仍然正常運作，用戶感知到的最多是「推薦列表空白」，
    而非完全無法播放影片。這是 Bulkhead 最典型的成功案例。
  </callout-box>
</section>

<section id="graceful-degradation">
  <h2>Graceful Degradation 與流量整形</h2>
  <p>
    高可用設計中，面對故障有兩種截然不同的哲學：
    <strong>優雅降級（Graceful Degradation）</strong>和<strong>快速失敗（Fail Fast）</strong>。
    兩者都是正確的，適用於不同的場景。
    理解何時應該降級、何時應該快速失敗，是設計韌性系統的核心技能。
  </p>

  <h3>降級策略的層次結構</h3>
  <p>
    優雅降級不是單一策略，而是一組從強到弱的降級層次，
    按照「盡量維持服務品質」的原則依序嘗試：
  </p>
  <pre data-lang="text"><code class="language-text">降級策略層次（從最佳到最差，依序嘗試）：

Level 1：功能完整（正常狀態）
  → 所有功能正常，個人化推薦、即時庫存、精確搜索

Level 2：功能降級（Feature Degradation）
  → 關閉非核心功能，保留核心功能
  → 例：搜索結果不排序個人化，但搜索仍可用

Level 3：靜態降級（Static Fallback）
  → 返回預先計算好的靜態結果（如熱門商品列表）
  → 例：首頁推薦改為展示「全站熱銷 Top 10」（無個人化）

Level 4：本地快取降級（Local Cache Fallback）
  → 返回服務本地記憶體中快取的舊資料
  → 例：返回 5 分鐘前的庫存數量（可能已過時但仍有參考價值）

Level 5：錯誤提示（Graceful Error）
  → 告知用戶功能暫時不可用，但不影響其他功能
  → 例：「推薦清單暫時無法顯示」，但購買流程仍正常</code></pre>

  <h3>Graceful Degradation 實作範例</h3>
  <pre data-lang="python"><code class="language-python">from functools import wraps
import logging

logger = logging.getLogger(__name__)

def with_fallback(fallback_value=None, timeout=1.0):
    """裝飾器：自動降級到 fallback_value"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await asyncio.wait_for(func(*args, **kwargs), timeout=timeout)
            except Exception as e:
                logger.warning(f"{func.__name__} 失敗，使用降級值: {e}")
                return fallback_value() if callable(fallback_value) else fallback_value
        return wrapper
    return decorator

class ProductPageBuilder:
    async def build(self, product_id: str) -> dict:
        # 核心資料：失敗則直接拋出例外（Fail Fast）
        product = await product_service.get(product_id)

        # 非核心：個人化推薦（Level 4 降級：空列表）
        recommendations = await self._get_recommendations(product_id)

        # 非核心：用戶評論（Level 5 降級：顯示載入失敗提示）
        reviews = await self._get_reviews(product_id)

        # 非核心：即時庫存（Level 4 降級：顯示「庫存充足」通用文字）
        inventory_status = await self._get_inventory(product_id)

        return {
            "product": product,                    # 必要，失敗 = 頁面無法顯示
            "recommendations": recommendations,    # 可選，降級 = 空列表
            "reviews": reviews,                    # 可選，降級 = None（前端顯示提示）
            "inventory_status": inventory_status,  # 可選，降級 = 通用庫存文字
        }

    @with_fallback(fallback_value=[], timeout=0.5)
    async def _get_recommendations(self, product_id: str):
        return await recommendation_service.get(product_id)

    @with_fallback(fallback_value=None, timeout=1.0)
    async def _get_reviews(self, product_id: str):
        return await review_service.get(product_id)

    @with_fallback(fallback_value={"status": "available"}, timeout=0.3)
    async def _get_inventory(self, product_id: str):
        return await inventory_service.get(product_id)</code></pre>

  <h3>Fail Fast（快速失敗）</h3>
  <p>
    當系統偵測到問題時，<strong>立即返回錯誤</strong>而非等待逾時，
    讓呼叫方快速知道問題所在，避免資源被長時間佔用。
    Fail Fast 是一種「寧可早死，不可慢死」的設計哲學。
  </p>
  <pre data-lang="python"><code class="language-python">def validate_and_process(data: dict):
    # Fail Fast：前置條件檢查，立即失敗
    if not data.get('user_id'):
        raise ValueError("user_id 不能為空")  # 立即失敗，不往下走

    if not is_valid_amount(data.get('amount')):
        raise ValueError("金額格式錯誤")     # 立即失敗

    # 前置驗證通過後，才執行昂貴的資料庫操作
    if not db.user_exists(data['user_id']):
        raise ValueError("用戶不存在")

    return process_payment(data)</code></pre>

  <h3>Rate Limiting（速率限制）與流量整形</h3>
  <p>
    Rate Limiting 是優雅降級的主動版本：在系統過載前，主動限制流量進入，
    保護下游服務不被壓垮。
  </p>
  <table>
    <thead>
      <tr>
        <th>限流策略</th>
        <th>說明</th>
        <th>適用場景</th>
        <th>特點</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Token Bucket</td>
        <td>令牌桶以固定速率補充，請求消耗令牌</td>
        <td>允許短時突發流量的 API</td>
        <td>可突發（Burst），令牌積累後可快速消耗</td>
      </tr>
      <tr>
        <td>Leaky Bucket</td>
        <td>請求入隊，以固定速率流出處理</td>
        <td>需要平滑輸出的場景（如支付 API）</td>
        <td>輸出速率固定，無突發</td>
      </tr>
      <tr>
        <td>Fixed Window Counter</td>
        <td>固定時間視窗內計數</td>
        <td>簡單的 API 配額</td>
        <td>實現簡單，但有窗口邊界突發問題</td>
      </tr>
      <tr>
        <td>Sliding Window Counter</td>
        <td>滑動時間窗口，更精確的計數</td>
        <td>需要精確限流的場景</td>
        <td>解決固定窗口邊界問題，稍複雜</td>
      </tr>
    </tbody>
  </table>

  <h3>優先級佇列（Priority Queue）</h3>
  <p>
    當系統負載接近上限時，不是所有請求都同等重要。
    優先級佇列讓重要請求優先被處理：
  </p>
  <pre data-lang="python"><code class="language-python">import heapq
import asyncio
from dataclasses import dataclass, field
from typing import Any

@dataclass(order=True)
class PrioritizedTask:
    priority: int           # 優先級（數字越小越優先）
    task: Any = field(compare=False)
    created_at: float = field(compare=False, default_factory=lambda: time.time())

class PriorityTaskQueue:
    """帶優先級的任務佇列"""

    PRIORITY_CRITICAL = 1   # 支付確認、訂單建立
    PRIORITY_HIGH = 2       # 用戶登入、核心 API
    PRIORITY_NORMAL = 3     # 一般查詢
    PRIORITY_LOW = 4        # 非同步通知、報表生成

    def __init__(self):
        self._queue = []

    def push(self, task, priority: int):
        heapq.heappush(self._queue, PrioritizedTask(priority=priority, task=task))

    def pop(self):
        if self._queue:
            return heapq.heappop(self._queue).task
        return None

# 高負載時：丟棄低優先級任務，保護高優先級任務
def shed_load(queue: PriorityTaskQueue, current_cpu_percent: float):
    if current_cpu_percent > 90:
        # CPU 超過 90%：只處理 CRITICAL 和 HIGH 優先級請求
        # 直接返回 503 給 NORMAL 和 LOW 優先級請求
        return queue.pop()  # 只從佇列頂端取，低優先級任務留在佇列中等待</code></pre>

  <h3>兩種策略的完整對比</h3>
  <table>
    <thead>
      <tr>
        <th>場景</th>
        <th>建議策略</th>
        <th>理由</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>推薦系統掛掉</td>
        <td>優雅降級（空列表）</td>
        <td>主要功能（購買）仍可用，推薦不影響核心業務</td>
      </tr>
      <tr>
        <td>支付服務掛掉</td>
        <td>Fail Fast（返回明確錯誤）</td>
        <td>支付是核心功能，不能假裝成功或靜默失敗</td>
      </tr>
      <tr>
        <td>請求參數驗證失敗</td>
        <td>Fail Fast（立即 400 錯誤）</td>
        <td>盡早失敗，避免無效請求消耗後續服務資源</td>
      </tr>
      <tr>
        <td>個人化功能故障</td>
        <td>靜態降級（返回通用內容）</td>
        <td>用戶體驗略差但仍可繼續使用</td>
      </tr>
      <tr>
        <td>資料庫連線池耗盡</td>
        <td>Fail Fast（立即 503）</td>
        <td>繼續等待只會讓問題更嚴重，快速讓 LB 切流量</td>
      </tr>
      <tr>
        <td>搜索服務 P99 延遲過高</td>
        <td>超時後降級（返回快取結果）</td>
        <td>稍過時的搜索結果好過等待 5 秒超時</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="tip" title="韌性工程（Resilience Engineering）的核心心態">
    設計高可用系統的心態轉變：從「如何防止故障」到「假設故障一定會發生，如何讓系統優雅地應對」。
    <br/><br/>
    Netflix 的 Chaos Monkey 是這種思維的極致體現：在生產環境中隨機殺死服務實例，
    強迫工程師設計出真正能在混亂中存活的系統。
    Chaos Engineering 的目標不是製造問題，而是在你不知情的情況下提前找到問題。
    <br/><br/>
    高可用的完整工具箱：Circuit Breaker（防連鎖故障）、Bulkhead（資源隔離）、
    Retry with Backoff（瞬態故障恢復）、Timeout（防無限等待）、
    Graceful Degradation（部分故障仍提供服務）、Rate Limiting（主動保護）、
    Health Check（自動移除不健康節點）、Multi-AZ Redundancy（物理冗餘）。
    這些技術相互補充，共同構建系統的韌性層次。
  </callout-box>
</section>
`,
} satisfies ChapterContent;
