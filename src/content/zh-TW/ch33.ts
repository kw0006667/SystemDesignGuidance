import type { ChapterContent } from '../../types.js';

export default {
  title: '成本最佳化設計',
  content: `
<section id="cost-model">
  <h2>計算、儲存、網路的成本模型</h2>
  <p>雲端成本的失控是許多成長期公司面臨的共同問題。當系統從 MVP 成長到百萬用戶規模，工程師往往驚訝地發現雲端帳單已經超過了整個工程團隊的薪資。在架構設計階段就考慮成本模型，比事後優化要有效得多——因為許多架構層面的決策一旦確定，事後改動的代價極高。</p>

  <arch-diagram src="./diagrams/ch33-cost-optimization.json" caption="雲端成本最佳化架構：計算分層、儲存分層與 LLM 成本管控"></arch-diagram>

  <h3>雲端三大成本類別與典型比例</h3>
  <p>根據對中型 SaaS 公司（月費 $50,000–$500,000）的分析，雲端成本通常呈以下分布：</p>
  <table>
    <thead>
      <tr><th>類別</th><th>主要成本項目</th><th>典型佔比</th><th>計費模式</th><th>優化方向</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>計算（Compute）</strong></td>
        <td>EC2/ECS 實例、Lambda 函式、容器運行</td>
        <td>40–50%</td>
        <td>按時間 + 規格</td>
        <td>右型定規（Right-sizing）、Spot Instance、Graviton</td>
      </tr>
      <tr>
        <td><strong>儲存（Storage）</strong></td>
        <td>S3、EBS、RDS 儲存、DynamoDB 容量單位</td>
        <td>20–30%</td>
        <td>按 GB/月 + 請求次數</td>
        <td>冷熱分層、壓縮、生命週期策略</td>
      </tr>
      <tr>
        <td><strong>網路（Network）</strong></td>
        <td>資料傳輸費用（Egress）、NAT Gateway、Load Balancer、跨 AZ 流量</td>
        <td>10–20%</td>
        <td>按 GB 傳輸量</td>
        <td>CDN 卸載、減少跨 AZ 流量、壓縮</td>
      </tr>
      <tr>
        <td><strong>LLM API</strong></td>
        <td>OpenAI、Anthropic、AWS Bedrock、Google Vertex AI</td>
        <td>0–40%（AI 產品可能更高）</td>
        <td>按 Token 數</td>
        <td>Prompt 快取、模型路由、批次處理</td>
      </tr>
      <tr>
        <td><strong>資料庫託管</strong></td>
        <td>RDS、Aurora、DynamoDB、Elasticache</td>
        <td>15–25%</td>
        <td>按實例規格 + 儲存</td>
        <td>Reserved Instance、Read Replica 分流</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="info" title="成本優化的 80/20 法則">
    在大多數雲端架構中，80% 的成本來自 20% 的資源。建議先用 AWS Cost Explorer 或 GCP Billing 找出最大的成本驅動因素，優先優化那些項目，而非平均分配優化精力。通常「一個決策」（如採用 Spot Instance、啟用 S3 Intelligent-Tiering）帶來的節省，遠超過數十個小優化的總和。
  </callout-box>

  <h3>FinOps 文化：工程師的成本意識</h3>
  <p>FinOps（Financial Operations）是將財務問責引入工程文化的實踐。核心理念是：每位工程師都應該知道自己的程式碼花了多少錢。</p>

  <h4>建立成本可見性的四個步驟</h4>
  <ol>
    <li><strong>Tag 策略標準化</strong>：強制所有雲端資源附上 <code>team</code>、<code>service</code>、<code>env</code>、<code>cost-center</code> 標籤。沒有 Tag 的資源無法歸因，就無法優化。</li>
    <li><strong>成本儀表板</strong>：用 AWS Cost Explorer 或 Grafana 建立每個服務的成本儀表板，讓工程師在 PR 合併後就能看到成本變化。</li>
    <li><strong>Cost Objective 設定</strong>：和 SLO 一樣，設定「每次 API 呼叫的 LLM 成本 &lt; $0.01」這樣可量測的成本目標。每次 Sprint 回顧時檢視。</li>
    <li><strong>成本 Champion</strong>：每個團隊指定一位成本負責人，每月審查成本趨勢並提出改進計畫。</li>
  </ol>

  <h3>常見成本陷阱</h3>
  <p>以下是最容易被忽略、卻可能造成月費大幅超支的成本陷阱：</p>

  <table>
    <thead>
      <tr><th>陷阱</th><th>典型場景</th><th>估計每月浪費</th><th>解決方案</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Data Egress 費用</strong></td>
        <td>服務間大量資料傳輸不經 CDN；直接從 S3 向用戶端提供大型檔案</td>
        <td>$0.09/GB，100TB = $9,000</td>
        <td>強制靜態資源走 CloudFront；服務間通訊使用 VPC 內部網路</td>
      </tr>
      <tr>
        <td><strong>NAT Gateway 費用</strong></td>
        <td>Private Subnet 的服務透過 NAT Gateway 存取 S3 或 DynamoDB</td>
        <td>$0.045/GB；高流量服務可達數千美元</td>
        <td>為 S3、DynamoDB 建立 VPC Endpoint（免流量費）</td>
      </tr>
      <tr>
        <td><strong>閒置資源（Idle Resources）</strong></td>
        <td>開發環境 24/7 運行；測試用的 RDS 實例從不關閉</td>
        <td>佔總帳單 15–30%</td>
        <td>非工時自動關閉 Dev 環境；建立 AWS Instance Scheduler</td>
      </tr>
      <tr>
        <td><strong>過度預備容量（Over-provisioning）</strong></td>
        <td>CPU 使用率長期低於 10%；記憶體實際用量不到規格的 20%</td>
        <td>佔計算費用 30–50%</td>
        <td>每季度執行 Right-sizing 分析；使用 AWS Compute Optimizer</td>
      </tr>
      <tr>
        <td><strong>跨 AZ 流量</strong></td>
        <td>應用伺服器在 AZ-a，資料庫在 AZ-b，大量跨 AZ 通訊</td>
        <td>$0.01/GB；大系統每月可達數千美元</td>
        <td>盡量讓應用和資料庫在同一 AZ；使用 Local Zones</td>
      </tr>
      <tr>
        <td><strong>DynamoDB 容量規劃失誤</strong></td>
        <td>Provisioned Mode 設定過高；或 On-demand Mode 在高流量下費用急增</td>
        <td>規劃不當可能多花 2–5 倍</td>
        <td>分析訪問模式後選擇合適模式；使用 Auto Scaling</td>
      </tr>
    </tbody>
  </table>

  <h3>成本歸因設計：Tag 策略實踐</h3>
  <pre data-lang="python"><code class="language-python">
# Terraform 中強制執行 Tag 策略
# 所有資源必須包含以下標籤，否則 CI/CD 拒絕部署

REQUIRED_TAGS = {
    "team": "platform",           # 哪個團隊負責
    "service": "user-api",        # 哪個服務
    "env": "production",          # 環境 (production/staging/dev)
    "cost-center": "CC-1234",     # 成本中心（對應財務部門）
    "owner": "alice@company.com", # 負責人 Email
}

# Terraform 的 Tag 驗證範例
resource "aws_instance" "api_server" {
  ami           = "ami-12345678"
  instance_type = "m5.large"

  tags = merge(local.required_tags, {
    Name = "api-server-prod"
  })

  lifecycle {
    # 強制確保 tag 存在
    precondition {
      condition     = contains(keys(self.tags), "cost-center")
      error_message = "所有資源必須有 cost-center tag。"
    }
  }
}

# 成本歸因分析：按服務查詢月費
import boto3

def get_service_costs(start_date: str, end_date: str) -> dict:
    """按 'service' tag 分組查詢各服務的月費"""
    ce = boto3.client("ce", region_name="us-east-1")

    response = ce.get_cost_and_usage(
        TimePeriod={"Start": start_date, "End": end_date},
        Granularity="MONTHLY",
        Filter={
            "Tags": {
                "Key": "env",
                "Values": ["production"]
            }
        },
        GroupBy=[
            {"Type": "TAG", "Key": "service"},
            {"Type": "DIMENSION", "Key": "SERVICE"}
        ],
        Metrics=["UnblendedCost"]
    )

    costs = {}
    for result_by_time in response["ResultsByTime"]:
        for group in result_by_time["Groups"]:
            service = group["Keys"][0].replace("service$", "")
            aws_service = group["Keys"][1]
            cost = float(group["Metrics"]["UnblendedCost"]["Amount"])
            costs.setdefault(service, {})
            costs[service][aws_service] = costs[service].get(aws_service, 0) + cost

    return costs
  </code></pre>

  <h3>一個中型系統的月費分解（實際案例）</h3>
  <p>以下是一個月活 100 萬用戶的 B2C SaaS 平台的月費分解（真實數據做匿名化處理）：</p>

  <table>
    <thead>
      <tr><th>服務</th><th>規格</th><th>月費（USD）</th><th>佔比</th><th>優化空間</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>EC2（API 伺服器）</td>
        <td>10 × m5.xlarge，On-demand</td>
        <td>$1,728</td>
        <td>18%</td>
        <td>改用 Reserved Instance 可省 40%（$691/月）</td>
      </tr>
      <tr>
        <td>RDS Aurora PostgreSQL</td>
        <td>db.r5.2xlarge，Multi-AZ</td>
        <td>$1,400</td>
        <td>15%</td>
        <td>加 Read Replica 分流；Reserved 可省 35%</td>
      </tr>
      <tr>
        <td>S3（使用者上傳）</td>
        <td>50 TB Standard，10 TB Standard-IA</td>
        <td>$1,275</td>
        <td>13%</td>
        <td>Lifecycle Policy 自動下移舊資料可省 30%</td>
      </tr>
      <tr>
        <td>CloudFront</td>
        <td>500 TB Egress/月</td>
        <td>$850</td>
        <td>9%</td>
        <td>已是最佳方案（比直接 S3 Egress 省 80%）</td>
      </tr>
      <tr>
        <td>ElastiCache Redis</td>
        <td>cache.r6g.large × 3（Cluster）</td>
        <td>$600</td>
        <td>6%</td>
        <td>Reserved 可省 40%</td>
      </tr>
      <tr>
        <td>LLM API（OpenAI）</td>
        <td>GPT-4o，1億 input tokens，2千萬 output tokens</td>
        <td>$2,450</td>
        <td>26%</td>
        <td>模型路由 + Prompt Cache 可省 60%（本章重點）</td>
      </tr>
      <tr>
        <td>NAT Gateway</td>
        <td>高流量服務未使用 VPC Endpoint</td>
        <td>$680</td>
        <td>7%</td>
        <td>建立 S3/DynamoDB VPC Endpoint 可降至 $50</td>
      </tr>
      <tr>
        <td>其他（監控、WAF、Route53 等）</td>
        <td>—</td>
        <td>$580</td>
        <td>6%</td>
        <td>—</td>
      </tr>
      <tr>
        <td><strong>合計</strong></td>
        <td>—</td>
        <td><strong>$9,563/月</strong></td>
        <td>100%</td>
        <td>可優化空間約 $4,200/月（44%）</td>
      </tr>
    </tbody>
  </table>

  <h3>成本監控工具選型</h3>

  <table>
    <thead>
      <tr><th>工具</th><th>適用場景</th><th>核心功能</th><th>費用</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>AWS Cost Explorer</strong></td>
        <td>AWS 環境的成本分析與預測</td>
        <td>按服務/Region/Tag 分組；Savings Plan 建議；異常偵測</td>
        <td>免費（部分查詢收費）</td>
      </tr>
      <tr>
        <td><strong>AWS Budgets</strong></td>
        <td>設定成本預算並在超標時發出警報</td>
        <td>月度預算、預測警報、SNS 通知</td>
        <td>前兩個 Budget 免費</td>
      </tr>
      <tr>
        <td><strong>Infracost</strong></td>
        <td>在 CI/CD 中預估 Terraform 變更的成本影響</td>
        <td>PR 中自動顯示「這次變更增加/減少 $X/月」</td>
        <td>開源免費（Team 版收費）</td>
      </tr>
      <tr>
        <td><strong>CloudHealth / Apptio</strong></td>
        <td>多雲環境的企業級 FinOps 平台</td>
        <td>跨雲成本歸因、RI 管理、成本分攤報表</td>
        <td>商業授權（$15,000+/年）</td>
      </tr>
      <tr>
        <td><strong>Datadog Cost Management</strong></td>
        <td>已使用 Datadog 的團隊整合成本監控</td>
        <td>與 APM 指標關聯（成本 vs 效能）</td>
        <td>含在 Datadog 訂閱中</td>
      </tr>
    </tbody>
  </table>

  <h3>建立成本模型的方法</h3>
  <pre data-lang="python"><code class="language-python">
from dataclasses import dataclass, field

@dataclass
class CostModel:
    """服務的月度成本模型（用於架構評審時的成本估算）"""

    # 計算成本
    compute_instances: int = 10
    instance_type: str = "t3.medium"  # $0.0416/hour
    compute_hours_per_month: float = 720  # 30 天 × 24 小時

    # 儲存成本
    hot_storage_gb: float = 500       # S3 Standard: $0.023/GB/month
    warm_storage_gb: float = 2000     # S3-IA: $0.0125/GB/month
    cold_storage_gb: float = 10000    # S3 Glacier: $0.004/GB/month

    # 網路成本
    monthly_egress_gb: float = 10000  # AWS Egress: $0.09/GB (first 10TB)
    nat_gateway_gb: float = 500       # NAT Gateway: $0.045/GB

    # LLM API 成本
    monthly_input_tokens: int = 50_000_000   # GPT-4o: $2.5/M tokens
    monthly_output_tokens: int = 10_000_000  # GPT-4o: $10/M tokens
    model_name: str = "gpt-4o"

    # 採購方式
    reserved_ratio: float = 0.6       # 60% 資源用 Reserved Instance
    spot_ratio: float = 0.3           # 30% 用 Spot Instance（節省 70%）
    ondemand_ratio: float = 0.1       # 10% 用 On-demand（備用）

    def calculate_monthly_cost(self) -> dict:
        """計算月度成本，找出最大的成本驅動因素"""
        INSTANCE_PRICES = {
            "t3.medium":   0.0416,
            "m5.large":    0.096,
            "m5.xlarge":   0.192,
            "c5.2xlarge":  0.34,
            "r5.2xlarge":  0.504,
        }
        MODEL_PRICES = {
            "gpt-4o":              {"input": 2.5,  "output": 10.0},
            "gpt-4o-mini":         {"input": 0.15, "output": 0.60},
            "claude-3-5-sonnet":   {"input": 3.0,  "output": 15.0},
            "claude-3-haiku":      {"input": 0.25, "output": 1.25},
        }

        base_hourly = INSTANCE_PRICES.get(self.instance_type, 0.1)
        compute_cost = self.compute_instances * self.compute_hours_per_month * (
            self.reserved_ratio * base_hourly * 0.60   # Reserved 省 40%
            + self.spot_ratio * base_hourly * 0.30     # Spot 省 70%
            + self.ondemand_ratio * base_hourly        # On-demand 基準價
        )

        storage_cost = (
            self.hot_storage_gb  * 0.023
            + self.warm_storage_gb * 0.0125
            + self.cold_storage_gb * 0.004
        )

        network_cost = (
            self.monthly_egress_gb * 0.09
            + self.nat_gateway_gb  * 0.045
        )

        prices = MODEL_PRICES.get(self.model_name, {"input": 5.0, "output": 15.0})
        llm_cost = (
            self.monthly_input_tokens  / 1_000_000 * prices["input"]
            + self.monthly_output_tokens / 1_000_000 * prices["output"]
        )

        total = compute_cost + storage_cost + network_cost + llm_cost
        breakdown = {
            "compute": round(compute_cost, 2),
            "storage": round(storage_cost, 2),
            "network": round(network_cost, 2),
            "llm":     round(llm_cost, 2),
            "total":   round(total, 2),
        }
        breakdown["dominant"] = max(
            ["compute", "storage", "network", "llm"],
            key=lambda k: breakdown[k]
        )
        return breakdown


# 使用範例
model = CostModel(
    compute_instances=10,
    instance_type="m5.xlarge",
    hot_storage_gb=500,
    warm_storage_gb=2000,
    cold_storage_gb=10000,
    monthly_egress_gb=5000,
    monthly_input_tokens=100_000_000,
    monthly_output_tokens=20_000_000,
    model_name="gpt-4o",
)
result = model.calculate_monthly_cost()
print(f"月費合計：\${result['total']:,}")
print(f"最大成本驅動：{result['dominant']}（\${result[result['dominant']]:,}）")
  </code></pre>

  <callout-box type="warning" title="成本優化的常見誤區">
    1. <strong>只關注計算成本，忽略網路費用</strong>：在某些高流量系統中，Data Egress 費用可能超過計算費用。<br/>
    2. <strong>過早優化</strong>：在流量達到一定規模之前，過度優化浪費工程資源。通常月費超過 $10,000 才值得投入專門優化。<br/>
    3. <strong>Reserved Instance 購買過多</strong>：業務方向改變後，過多的 RI 無法退款，反而造成浪費。建議首年先保守購買 50% 的基礎負載。<br/>
    4. <strong>忽略 LLM 成本的爆炸性增長</strong>：AI 功能上線初期成本看起來很低，但隨著用戶量增長可能在幾個月內變成最大成本項目。
  </callout-box>
</section>

<section id="storage-tiering">
  <h2>冷熱資料分層儲存策略</h2>
  <p>資料隨著時間老化，存取頻率通常呈現冪律分布——最近的 5% 的資料佔了 90% 的存取量。冷熱分層儲存就是利用這個特性，將資料自動遷移到成本更低的儲存層級。在 S3 的各個儲存類別之間，最大可有 23 倍的成本差異（Standard $0.023/GB vs Deep Archive $0.00099/GB）。</p>

  <h3>S3 七大儲存類別完整對比</h3>
  <table>
    <thead>
      <tr><th>Storage Class</th><th>費用（$/GB/月）</th><th>取回費用（$/GB）</th><th>首字節延遲</th><th>最低儲存期</th><th>適用資料類型</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>S3 Standard</strong></td>
        <td>$0.023</td>
        <td>免費</td>
        <td>毫秒級</td>
        <td>無</td>
        <td>頻繁存取的熱資料；靜態網站資源；用戶上傳的最新內容</td>
      </tr>
      <tr>
        <td><strong>S3 Intelligent-Tiering</strong></td>
        <td>$0.023（頻繁）/ $0.0125（不頻繁）/ $0.004（歸檔）</td>
        <td>免費（不頻繁層有監控費 $0.0025/1000物件）</td>
        <td>毫秒級</td>
        <td>無</td>
        <td>存取模式不可預測的資料；混合冷熱的資料湖</td>
      </tr>
      <tr>
        <td><strong>S3 Standard-IA</strong></td>
        <td>$0.0125</td>
        <td>$0.01/GB</td>
        <td>毫秒級</td>
        <td>30 天（未滿收全額）</td>
        <td>每月存取一次的資料；備份副本；災難恢復資料</td>
      </tr>
      <tr>
        <td><strong>S3 One Zone-IA</strong></td>
        <td>$0.01</td>
        <td>$0.01/GB</td>
        <td>毫秒級</td>
        <td>30 天</td>
        <td>可重新創建的資料（縮略圖、轉碼影片）；次要備份</td>
      </tr>
      <tr>
        <td><strong>S3 Glacier Instant Retrieval</strong></td>
        <td>$0.004</td>
        <td>$0.03/GB</td>
        <td>毫秒級</td>
        <td>90 天</td>
        <td>每季度存取的資料；醫療影像歸檔；法律文件</td>
      </tr>
      <tr>
        <td><strong>S3 Glacier Flexible Retrieval</strong></td>
        <td>$0.0036</td>
        <td>$0.01/GB（標準取回，3–5小時）</td>
        <td>分鐘至小時</td>
        <td>90 天</td>
        <td>每年偶爾存取；長期備份；歷史日誌</td>
      </tr>
      <tr>
        <td><strong>S3 Glacier Deep Archive</strong></td>
        <td>$0.00099</td>
        <td>$0.02/GB（12 小時）</td>
        <td>12 小時</td>
        <td>180 天</td>
        <td>7 年合規存檔；幾乎不需要取回的資料；監管要求保留</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="tip" title="選擇 Standard-IA 的注意事項">
    S3 Standard-IA 有最低 30 天儲存費用和最低 128 KB 物件大小費用的限制。若你的物件很小（&lt;128 KB）或存取頻率較高（每月超過一次），Standard-IA 可能反而比 Standard 貴。建議先用 S3 Storage Class Analysis 分析 30 天的存取模式，再決定是否遷移。
  </callout-box>

  <h3>S3 Intelligent-Tiering 的工作原理</h3>
  <p>Intelligent-Tiering 是最適合「存取模式不確定」場景的選擇。它在內部維護三個層級，並根據存取行為自動在層級之間移動物件：</p>
  <ol>
    <li><strong>頻繁存取層</strong>（Frequent Access Tier）：物件預設進入此層，費率同 Standard（$0.023/GB）。</li>
    <li><strong>不頻繁存取層</strong>（Infrequent Access Tier）：30 天未存取的物件自動移至此層，費率 $0.0125/GB。</li>
    <li><strong>歸檔即時存取層</strong>（Archive Instant Access Tier）：90 天未存取的物件移至此層，費率 $0.004/GB，但取回延遲仍是毫秒級。</li>
  </ol>
  <p>監控費用為 $0.0025/1000 個物件/月，因此對大量小檔案（如每個檔案 &lt;1 KB）反而不划算。</p>

  <h3>Lifecycle Policy 設計策略</h3>
  <p>對於存取模式可預測的資料（如日誌、交易記錄），直接用 Lifecycle Policy 比 Intelligent-Tiering 更省錢（節省監控費用）。</p>

  <pre data-lang="python"><code class="language-python">
import boto3

def create_s3_lifecycle_policy(bucket_name: str):
    """為 S3 Bucket 設置自動分層生命週期策略"""
    s3 = boto3.client("s3")

    lifecycle_config = {
        "Rules": [
            # 規則一：應用日誌的 5 年生命週期
            {
                "ID": "app-logs-tiering",
                "Status": "Enabled",
                "Filter": {"Prefix": "logs/"},
                "Transitions": [
                    {"Days": 30,  "StorageClass": "STANDARD_IA"},   # 30天→IA
                    {"Days": 90,  "StorageClass": "GLACIER_IR"},     # 90天→Glacier Instant
                    {"Days": 365, "StorageClass": "GLACIER"},        # 1年→Glacier Flexible
                    {"Days": 730, "StorageClass": "DEEP_ARCHIVE"},   # 2年→Deep Archive
                ],
                "Expiration": {"Days": 1825}  # 5年後刪除（合規要求）
            },
            # 規則二：用戶上傳的媒體檔案（有原始和縮圖兩種版本）
            {
                "ID": "user-media-tiering",
                "Status": "Enabled",
                "Filter": {"Prefix": "media/original/"},
                "Transitions": [
                    {"Days": 90,  "StorageClass": "STANDARD_IA"},   # 90天→IA（原始圖少人看）
                    {"Days": 365, "StorageClass": "GLACIER_IR"},     # 1年→Glacier
                ],
                # 不設定刪除（用戶資料不自動刪除）
            },
            # 規則三：縮圖可以用 One Zone-IA（可重新生成，不需跨 AZ 冗余）
            {
                "ID": "thumbnails-tiering",
                "Status": "Enabled",
                "Filter": {"Prefix": "media/thumbnails/"},
                "Transitions": [
                    {"Days": 30, "StorageClass": "ONEZONE_IA"},  # 節省 13% vs Standard-IA
                ],
                "Expiration": {"Days": 365}  # 縮圖1年後刪除（原始圖還在）
            },
            # 規則四：暫存檔案（上傳中斷的 Multipart Upload）
            {
                "ID": "cleanup-incomplete-uploads",
                "Status": "Enabled",
                "Filter": {},
                "AbortIncompleteMultipartUpload": {"DaysAfterInitiation": 7}
                # 清理超過7天的未完成分段上傳，避免產生費用
            },
            # 規則五：暫存目錄快速清理
            {
                "ID": "delete-temp-files",
                "Status": "Enabled",
                "Filter": {"Prefix": "tmp/"},
                "Expiration": {"Days": 1}  # temp 檔案隔天刪除
            }
        ]
    }

    s3.put_bucket_lifecycle_configuration(
        Bucket=bucket_name,
        LifecycleConfiguration=lifecycle_config
    )
    print(f"Lifecycle Policy 已設定至 {bucket_name}")
  </code></pre>

  <h3>資料壓縮策略</h3>
  <p>壓縮是降低儲存成本最直接的方式，正確選擇壓縮算法能在壓縮率和速度之間取得最佳平衡：</p>

  <table>
    <thead>
      <tr><th>壓縮格式</th><th>壓縮率</th><th>壓縮速度</th><th>解壓速度</th><th>適用場景</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>gzip</strong></td>
        <td>高（60–70%）</td>
        <td>中等</td>
        <td>中等</td>
        <td>HTTP 傳輸壓縮；冷資料歸檔；文字日誌</td>
      </tr>
      <tr>
        <td><strong>Snappy</strong></td>
        <td>中（40–50%）</td>
        <td>極快</td>
        <td>極快</td>
        <td>Kafka 訊息；即時流處理；對延遲敏感的場景</td>
      </tr>
      <tr>
        <td><strong>Zstd（Zstandard）</strong></td>
        <td>高（65–75%）</td>
        <td>快</td>
        <td>快</td>
        <td>最推薦的通用壓縮；Parquet 檔案；資料庫備份</td>
      </tr>
      <tr>
        <td><strong>LZ4</strong></td>
        <td>低（30–40%）</td>
        <td>最快</td>
        <td>最快</td>
        <td>記憶體中的臨時壓縮；即時資料流</td>
      </tr>
      <tr>
        <td><strong>Parquet（列式儲存）</strong></td>
        <td>極高（80–95%，視資料而定）</td>
        <td>慢（寫入）</td>
        <td>快（列讀取）</td>
        <td>資料倉儲；分析查詢；S3 + Athena 的資料湖</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="info" title="Parquet + Zstd：資料湖的黃金組合">
    在 S3 資料湖中，將 JSON 日誌轉換為 Parquet 格式並用 Zstd 壓縮，通常可以將儲存空間縮小到原始大小的 5–10%。例如，1 TB 的 JSON 日誌轉換後可能只需 80–100 GB 的 Parquet 檔案，節省約 90% 的儲存成本。同時，Athena 查詢 Parquet 的速度也比查詢 JSON 快 10–30 倍，因為它只讀取需要的欄位。
  </callout-box>

  <h3>重複資料刪除（Deduplication）原理</h3>
  <p>對於備份、日誌等高度重複的資料，去重可以在壓縮之上再節省 30–80% 的空間：</p>

  <pre data-lang="python"><code class="language-python">
import hashlib
from typing import Optional

class ContentAddressedStorage:
    """
    基於內容定址的去重儲存
    原理：相同內容的檔案計算出相同的 SHA-256 Hash，只儲存一份
    應用場景：備份系統、程式碼版本控制（Git 的核心原理）、圖片去重
    """

    def __init__(self, s3_client, bucket: str):
        self.s3 = s3_client
        self.bucket = bucket

    def _content_hash(self, data: bytes) -> str:
        """計算內容的 SHA-256 Hash（作為唯一識別碼）"""
        return hashlib.sha256(data).hexdigest()

    def store(self, data: bytes, original_filename: str) -> str:
        """
        儲存資料，自動去重。
        回傳：content hash（可用來之後取回）
        """
        content_hash = self._content_hash(data)
        s3_key = f"blobs/{content_hash[:2]}/{content_hash}"  # 分散存放

        # 先檢查是否已存在（這是去重的核心）
        try:
            self.s3.head_object(Bucket=self.bucket, Key=s3_key)
            # 物件已存在，不需重複儲存！
            print(f"去重命中：{original_filename} -> {content_hash[:8]}...")
        except self.s3.exceptions.ClientError:
            # 物件不存在，需要儲存
            self.s3.put_object(
                Bucket=self.bucket,
                Key=s3_key,
                Body=data,
                Metadata={"original-filename": original_filename}
            )
            print(f"新物件儲存：{original_filename} ({len(data)/1024:.1f} KB)")

        # 記錄 filename → hash 的映射（可存在 DynamoDB）
        return content_hash

    def retrieve(self, content_hash: str) -> bytes:
        """根據 content hash 取回資料"""
        s3_key = f"blobs/{content_hash[:2]}/{content_hash}"
        response = self.s3.get_object(Bucket=self.bucket, Key=s3_key)
        return response["Body"].read()


# 實際案例：日誌資料的 5 年生命週期設計
# 假設：每天產生 100 GB 的應用日誌
# 目標：保留 5 年（合規要求），最小化成本

LOG_LIFECYCLE_COST_ANALYSIS = {
    "年限": {
        "第1年 (0-365天)":        {"storage_class": "S3 Standard",           "cost_per_gb": 0.023,    "gb": 36500,  "monthly_cost": 838.0},
        "第2年 (366-730天)":       {"storage_class": "S3 Standard-IA",        "cost_per_gb": 0.0125,   "gb": 36500,  "monthly_cost": 456.0},
        "第3年 (731-1095天)":      {"storage_class": "S3 Glacier Instant",    "cost_per_gb": 0.004,    "gb": 36500,  "monthly_cost": 146.0},
        "第4-5年 (1096-1825天)":   {"storage_class": "S3 Deep Archive",       "cost_per_gb": 0.00099,  "gb": 73000,  "monthly_cost": 72.3},
    },
    "不分層（全部 Standard）總成本": "$50,370（5年合計）",
    "分層後總成本估算": "$18,900（5年合計）",
    "節省": "約 62%，省下 $31,470",
}
  </code></pre>

  <h3>資料庫層面的冷熱分層（PostgreSQL 分區表）</h3>
  <pre data-lang="python"><code class="language-python">
def create_partitioned_events_table() -> str:
    """
    使用 PostgreSQL 分區表實現冷熱資料分離
    熱資料（最近3個月）在 SSD tablespace，查詢速度快
    冷資料（3個月以上）在 HDD tablespace，儲存成本低
    """
    return """
    -- 建立按月分區的事件表
    CREATE TABLE events (
        id          BIGSERIAL,
        user_id     BIGINT      NOT NULL,
        event_type  VARCHAR(50) NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL,
        data        JSONB,
        PRIMARY KEY (id, created_at)  -- 分區鍵必須包含在主鍵中
    ) PARTITION BY RANGE (created_at);

    -- 建立 SSD tablespace（映射到高效能磁碟）
    CREATE TABLESPACE ssd_tablespace
        LOCATION '/mnt/nvme/pgdata';

    -- 建立 HDD tablespace（映射到成本較低的磁碟）
    CREATE TABLESPACE hdd_tablespace
        LOCATION '/mnt/hdd/pgdata';

    -- 熱資料分區（最近 3 個月，在 SSD 上）
    CREATE TABLE events_2026_01 PARTITION OF events
        FOR VALUES FROM ('2026-01-01') TO ('2026-02-01')
        TABLESPACE ssd_tablespace;

    CREATE TABLE events_2026_02 PARTITION OF events
        FOR VALUES FROM ('2026-02-01') TO ('2026-03-01')
        TABLESPACE ssd_tablespace;

    CREATE TABLE events_2026_03 PARTITION OF events
        FOR VALUES FROM ('2026-03-01') TO ('2026-04-01')
        TABLESPACE ssd_tablespace;

    -- 冷資料分區（3個月以上，移至 HDD tablespace）
    CREATE TABLE events_2025_12 PARTITION OF events
        FOR VALUES FROM ('2025-12-01') TO ('2026-01-01')
        TABLESPACE hdd_tablespace;

    -- 為熱資料分區建立索引（冷資料可以不建，節省空間）
    CREATE INDEX ON events_2026_03 (user_id, created_at DESC);

    -- 自動化分區管理（pg_partman 擴充套件）
    SELECT partman.create_parent(
        p_parent_table => 'public.events',
        p_control => 'created_at',
        p_type => 'range',
        p_interval => '1 month',
        p_premake => 3  -- 提前建立 3 個月的分區
    );
    """
  </code></pre>
</section>

<section id="llm-cost-control">
  <h2>LLM 成本控制策略</h2>
  <p>LLM API 費用往往是 AI 系統中增長最快的成本項目。隨著業務規模擴大，如果不加以控制，LLM 費用可能很快超過基礎設施的總費用。一個月活 100 萬用戶的 AI 應用，未優化前的 LLM 費用可能高達 $50,000–$200,000/月，優化後可降至 $10,000–$40,000。</p>

  <h3>LLM API 成本結構：主流模型對比</h3>
  <table>
    <thead>
      <tr><th>模型</th><th>Input Tokens（$/1M）</th><th>Output Tokens（$/1M）</th><th>Context Window</th><th>適用場景</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>GPT-4o</strong></td>
        <td>$2.50</td>
        <td>$10.00</td>
        <td>128K tokens</td>
        <td>複雜推理、程式碼生成、多模態</td>
      </tr>
      <tr>
        <td><strong>GPT-4o mini</strong></td>
        <td>$0.15</td>
        <td>$0.60</td>
        <td>128K tokens</td>
        <td>簡單分類、摘要、翻譯（比 GPT-4o 省 94%）</td>
      </tr>
      <tr>
        <td><strong>Claude 3.5 Sonnet</strong></td>
        <td>$3.00</td>
        <td>$15.00</td>
        <td>200K tokens</td>
        <td>長文件分析、程式碼審查、寫作</td>
      </tr>
      <tr>
        <td><strong>Claude 3 Haiku</strong></td>
        <td>$0.25</td>
        <td>$1.25</td>
        <td>200K tokens</td>
        <td>即時應用、高吞吐量任務（比 Sonnet 省 92%）</td>
      </tr>
      <tr>
        <td><strong>Gemini 1.5 Flash</strong></td>
        <td>$0.075</td>
        <td>$0.30</td>
        <td>1M tokens</td>
        <td>超長文件、影片分析、最低成本通用任務</td>
      </tr>
      <tr>
        <td><strong>Llama 3.1 70B（自建）</strong></td>
        <td>~$0.10（算力成本）</td>
        <td>~$0.10</td>
        <td>128K tokens</td>
        <td>高流量、資料不能出境、成本敏感場景</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="warning" title="Output Token 的費用遠高於 Input Token">
    注意：Output Token 的費用通常是 Input Token 的 3–5 倍。這意味著讓模型「少說話」（精簡回應、限制 max_tokens、使用結構化輸出而非長段落說明）往往比減少輸入 prompt 更有效。一個常見的優化是在 prompt 中明確說「請用 JSON 格式回應，不要加任何解釋文字」。
  </callout-box>

  <h3>三層成本控制策略</h3>

  <h4>第一層：Prompt 壓縮（最低成本、最高 ROI）</h4>
  <p>Prompt 壓縮的核心思想是：在不影響輸出品質的前提下，減少傳送給 LLM 的 token 數量。</p>

  <pre data-lang="python"><code class="language-python">
import re

class PromptCompressor:
    """
    Prompt 壓縮工具：在保持語義的前提下減少 token 數量
    典型壓縮率：20–40%（視原始 prompt 的冗餘程度）
    """

    def compress(self, prompt: str) -> str:
        """多層次 prompt 壓縮"""
        # 1. 移除 XML 標籤（LLM 理解語義，不需要 HTML 格式）
        prompt = self._remove_xml_tags(prompt)

        # 2. 移除多餘空白和空行
        prompt = self._normalize_whitespace(prompt)

        # 3. 精簡重複的禮貌用語和冗餘指令
        prompt = self._remove_redundant_instructions(prompt)

        # 4. 壓縮 Few-shot 示例（只保留最有代表性的）
        prompt = self._compress_examples(prompt)

        return prompt

    def _remove_xml_tags(self, text: str) -> str:
        """移除 XML/HTML 格式標籤，保留內容"""
        # 移除像 <instructions>...</instructions> 這類格式標籤
        # 但保留有語義的內容
        text = re.sub(r'</?(?:instructions|context|examples?|output)[^>]*>', '', text)
        return text

    def _normalize_whitespace(self, text: str) -> str:
        """合併多個空行，移除行尾空格"""
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = re.sub(r'[ \t]+$', '', text, flags=re.MULTILINE)
        return text.strip()

    def _remove_redundant_instructions(self, text: str) -> str:
        """移除冗餘的禮貌性和重複性指令"""
        redundant_patterns = [
            r'請注意[，,]?\s*',
            r'請確保[，,]?\s*',
            r'非常重要：\s*',
            r'請務必\s*',
            r'你是一個非常有幫助的助手[。.]?\s*',
        ]
        for pattern in redundant_patterns:
            text = re.sub(pattern, '', text)
        return text

    def _compress_examples(self, text: str) -> str:
        """
        Few-shot 示例壓縮：從 5 個示例縮減到 2–3 個
        保留最有代表性的正面和負面示例
        """
        # 實際實作會用語義相似度選擇最具代表性的示例
        # 這裡省略具體實作
        return text


class PromptCacheManager:
    """
    Anthropic Claude 的 Prompt Cache 使用範例
    快取的 token 費用降低 90%（快取命中費率：$0.30/M tokens vs 正常 $3.00/M）
    但有最低快取長度要求：1024 tokens（約 750 個英文單詞）
    """

    def build_cached_prompt(
        self,
        system_prompt: str,    # 大型系統 prompt，每次都相同 → 標記為可快取
        knowledge_base: str,   # 知識庫內容，較少變化 → 標記為可快取
        user_query: str        # 使用者問題，每次不同 → 不快取
    ) -> list[dict]:
        return [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"{system_prompt}\n\n知識庫：\n{knowledge_base}",
                        "cache_control": {"type": "ephemeral"}  # 標記為可快取（5分鐘 TTL）
                    },
                    {
                        "type": "text",
                        "text": f"\n\n使用者問題：{user_query}"
                        # 使用者問題不快取（每次不同）
                    }
                ]
            }
        ]
  </code></pre>

  <h4>第二層：模型路由（Semantic Router）</h4>
  <p>不同複雜度的任務需要不同能力的模型。智慧路由可以在不降低輸出品質的情況下，將大多數任務路由到便宜模型，將複雜任務路由到昂貴模型。</p>

  <pre data-lang="python"><code class="language-python">
from enum import Enum
from dataclasses import dataclass

class TaskComplexity(Enum):
    SIMPLE = "simple"       # 路由到 GPT-4o-mini / Claude Haiku（省 90%+）
    MEDIUM = "medium"       # 路由到 GPT-4o / Claude Sonnet
    COMPLEX = "complex"     # 路由到 o1 / Claude 3 Opus（最貴）

@dataclass
class TaskDescriptor:
    task_type: str              # "classification" / "summarization" / "reasoning" 等
    complexity: TaskComplexity
    requires_reasoning: bool    # 需要多步推理
    expected_output_tokens: int # 預期輸出 token 數
    requires_json_output: bool  # 是否需要結構化 JSON 輸出
    quality_requirement: float  # 0.0–1.0，品質要求（影響路由決策）

class ModelRouter:
    """
    智慧模型路由：根據任務特徵選擇最適合的模型
    目標：在品質約束下最小化成本
    """

    MODELS = {
        "gpt-4o-mini":    {"input": 0.15,  "output": 0.60,  "tier": "economy"},
        "gpt-4o":         {"input": 2.5,   "output": 10.0,  "tier": "standard"},
        "o1-mini":        {"input": 3.0,   "output": 12.0,  "tier": "reasoning"},
        "claude-haiku":   {"input": 0.25,  "output": 1.25,  "tier": "economy"},
        "claude-sonnet":  {"input": 3.0,   "output": 15.0,  "tier": "standard"},
    }

    def select_model(self, task: TaskDescriptor) -> str:
        """根據任務特徵選擇最便宜的合適模型"""

        # 規則 1：需要多步推理（數學、邏輯、程式碼）
        if task.requires_reasoning and task.complexity == TaskComplexity.COMPLEX:
            return "o1-mini"

        # 規則 2：長文件生成（輸出 > 1000 tokens）或高品質要求
        if task.expected_output_tokens > 1000 or task.quality_requirement > 0.9:
            return "gpt-4o"

        # 規則 3：簡單結構化任務（品質要求 > 0.8 但不需要推理）
        if task.task_type in ["classification", "extraction"] and task.quality_requirement > 0.8:
            return "claude-haiku"  # 便宜且結構化輸出穩定

        # 規則 4：簡單文字任務（摘要、翻譯、改寫）
        if task.task_type in ["summarization", "translation", "rewriting"]:
            return "gpt-4o-mini"

        # 預設：便宜模型，必要時再升級
        return "gpt-4o-mini"

    async def adaptive_routing(
        self,
        prompt: str,
        task: TaskDescriptor,
        quality_threshold: float = 0.85
    ) -> dict:
        """
        自適應路由：先用便宜模型，品質不夠再升級到昂貴模型
        代價：兩次 API 呼叫（但便宜模型的費用極低，總體仍划算）
        """
        cheap_model = "gpt-4o-mini"
        expensive_model = "gpt-4o"

        response = await self.llm.complete(prompt, model=cheap_model)

        # 快速品質評估（用更小的模型評分，成本可忽略）
        quality_score = await self.quality_evaluator.score(
            prompt=prompt,
            response=response["content"],
            criteria=task.quality_requirement
        )

        if quality_score >= quality_threshold:
            return {**response, "model_used": cheap_model, "upgraded": False}

        # 升級到昂貴模型
        expensive_response = await self.llm.complete(prompt, model=expensive_model)
        return {**expensive_response, "model_used": expensive_model, "upgraded": True}
  </code></pre>

  <h4>第三層：回應快取（Response Cache）</h4>
  <p>對於重複性查詢，快取 LLM 回應是最直接的成本節省方式。根據系統特性，可以選擇精確匹配快取或語意快取：</p>

  <pre data-lang="python"><code class="language-python">
import hashlib
import numpy as np

class LLMResponseCache:
    """
    雙層 LLM 回應快取
    Layer 1: Exact Match Cache（精確匹配，命中率 20–30%）
    Layer 2: Semantic Cache（語意相似，命中率額外 10–20%）
    """

    def __init__(self, redis, embedding_model, similarity_threshold: float = 0.95):
        self.redis = redis
        self.embedding_model = embedding_model
        self.threshold = similarity_threshold

    # ========== Layer 1: Exact Match ==========
    def _exact_cache_key(self, prompt: str, model: str) -> str:
        content = f"{model}:{prompt.strip().lower()}"
        return f"llm:exact:{hashlib.sha256(content.encode()).hexdigest()}"

    async def get_exact(self, prompt: str, model: str) -> str | None:
        key = self._exact_cache_key(prompt, model)
        return await self.redis.get(key)

    async def set_exact(self, prompt: str, model: str, response: str, ttl: int = 3600):
        key = self._exact_cache_key(prompt, model)
        await self.redis.setex(key, ttl, response)

    # ========== Layer 2: Semantic Cache ==========
    async def get_semantic(self, prompt: str, model: str) -> str | None:
        """
        語意快取：用 embedding 相似度找語意相近的歷史查詢
        若找到相似度 > threshold 的快取，直接回傳（避免重複呼叫 LLM）
        """
        query_embedding = await self.embedding_model.embed(prompt)

        # 在向量資料庫中搜尋（Redis Stack / pgvector / Qdrant）
        similar_entries = await self.vector_db.search(
            vector=query_embedding,
            top_k=5,
            filter={"model": model}
        )

        for entry in similar_entries:
            if entry.score >= self.threshold:
                # 語意相似度足夠高，直接回傳快取回應
                return entry.response

        return None  # 快取未命中

    async def get_or_call_llm(
        self, prompt: str, model: str, llm_fn
    ) -> tuple[str, str]:
        """
        完整的快取查詢流程，回傳 (response, cache_status)
        cache_status: "exact_hit" | "semantic_hit" | "miss"
        """
        # 1. 精確匹配
        if exact := await self.get_exact(prompt, model):
            return exact, "exact_hit"

        # 2. 語意匹配
        if semantic := await self.get_semantic(prompt, model):
            return semantic, "semantic_hit"

        # 3. 呼叫 LLM
        response = await llm_fn(prompt, model)

        # 非同步寫入快取（不阻塞回應）
        await asyncio.gather(
            self.set_exact(prompt, model, response),
            self.set_semantic(prompt, model, response),
        )

        return response, "miss"
  </code></pre>

  <h3>Batch API 折扣策略</h3>
  <p>對於非即時性的 LLM 任務，使用 Batch API 可以享受 50% 的折扣（OpenAI）或 50% 的折扣（Anthropic），但延遲最長 24 小時。</p>

  <table>
    <thead>
      <tr><th>適合批次處理的任務</th><th>不適合批次處理的任務</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>夜間報告生成</td>
        <td>使用者即時對話</td>
      </tr>
      <tr>
        <td>大量文件分類/標注</td>
        <td>需要 &lt;2 秒回應的 API</td>
      </tr>
      <tr>
        <td>訓練資料的評估和過濾</td>
        <td>即時翻譯</td>
      </tr>
      <tr>
        <td>批次 embedding 生成（建立知識庫）</td>
        <td>實時情感分析</td>
      </tr>
      <tr>
        <td>離線的 RAG 索引建立</td>
        <td>用戶等待中的任何操作</td>
      </tr>
    </tbody>
  </table>

  <h3>實際案例：RAG 系統的成本最佳化</h3>
  <p>一個企業知識庫 RAG 系統，優化前後的成本對比：</p>

  <table>
    <thead>
      <tr><th>優化項目</th><th>優化前</th><th>優化後</th><th>節省</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>模型選擇</td>
        <td>所有查詢用 GPT-4o</td>
        <td>80% 用 GPT-4o-mini，20% 用 GPT-4o</td>
        <td>74%</td>
      </tr>
      <tr>
        <td>Prompt 壓縮</td>
        <td>System prompt 2500 tokens</td>
        <td>壓縮至 1600 tokens</td>
        <td>36%（Input Token）</td>
      </tr>
      <tr>
        <td>Exact Cache</td>
        <td>無快取</td>
        <td>命中率 25%</td>
        <td>25%</td>
      </tr>
      <tr>
        <td>Semantic Cache</td>
        <td>無</td>
        <td>命中率額外 15%</td>
        <td>15%</td>
      </tr>
      <tr>
        <td>Prompt Cache（Anthropic）</td>
        <td>無</td>
        <td>System prompt + 知識庫快取</td>
        <td>Input Token 省 60%</td>
      </tr>
      <tr>
        <td><strong>月費合計</strong></td>
        <td><strong>$12,000/月</strong></td>
        <td><strong>$2,800/月</strong></td>
        <td><strong>77%</strong></td>
      </tr>
    </tbody>
  </table>

  <callout-box type="tip" title="Token Streaming 的成本分析">
    啟用 Token Streaming（流式輸出）不會減少 token 的消耗量，費用完全相同。Streaming 的主要價值在於改善用戶體驗（看到文字逐漸出現），以及降低首字節延遲（TTFB）。在成本最佳化上，Streaming 沒有直接貢獻，但可以配合「用戶提前中止」的機制——如果用戶在看到部分回應後已滿足需求而關閉，後端可以提前停止生成，節省未完成部分的 Output Token 費用。
  </callout-box>
</section>

<section id="instance-strategy">
  <h2>Spot vs Reserved Instance 選擇</h2>
  <p>AWS EC2 提供三種計費模式：On-demand（隨需）、Reserved（預留）、Spot（競價）。選擇正確的計費模式，可以在相同工作負載下節省 60–90% 的計算成本。對一個月費 $50,000 的計算帳單而言，合理的購買策略可以節省 $30,000–$45,000/月。</p>

  <h3>三種購買方式詳細對比</h3>
  <table>
    <thead>
      <tr><th>類型</th><th>折扣（vs On-demand）</th><th>靈活性</th><th>中斷風險</th><th>承諾期</th><th>適用場景</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>On-demand</strong></td>
        <td>無折扣（基準）</td>
        <td>最高（隨時啟動/停止）</td>
        <td>無</td>
        <td>無</td>
        <td>不可預測的短期工作負載；Dev/Test 環境；流量突增時的應急容量</td>
      </tr>
      <tr>
        <td><strong>Reserved Instance（1年）</strong></td>
        <td>節省 40%（全額預付可達 42%）</td>
        <td>低（鎖定實例類型和 Region）</td>
        <td>無</td>
        <td>1 年</td>
        <td>穩定的基礎工作負載：API 伺服器、資料庫、快取</td>
      </tr>
      <tr>
        <td><strong>Reserved Instance（3年）</strong></td>
        <td>節省 60%（全額預付）</td>
        <td>最低</td>
        <td>無</td>
        <td>3 年</td>
        <td>長期穩定的核心服務；確定不會更換實例類型的基礎設施</td>
      </tr>
      <tr>
        <td><strong>Savings Plans（Compute）</strong></td>
        <td>節省 40–66%</td>
        <td>中（可跨 Instance 類型、Region、作業系統）</td>
        <td>無</td>
        <td>1 或 3 年</td>
        <td>使用容器（ECS/EKS）或 Lambda 的多樣化工作負載</td>
      </tr>
      <tr>
        <td><strong>Spot Instance</strong></td>
        <td>節省 70–90%（市場競價）</td>
        <td>高（隨時可用，但可能被回收）</td>
        <td>高（AWS 有 2 分鐘預警後中止）</td>
        <td>無</td>
        <td>批次任務、無狀態工作者、CI/CD、ML 訓練、影像處理</td>
      </tr>
    </tbody>
  </table>

  <h3>Reserved Instance vs Savings Plans 的選擇策略</h3>
  <table>
    <thead>
      <tr><th>選擇 Reserved Instance 的信號</th><th>選擇 Savings Plans 的信號</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>工作負載使用固定的 EC2 實例類型（如永遠是 m5.xlarge）</td>
        <td>工作負載在 EC2、Fargate、Lambda 之間混合使用</td>
      </tr>
      <tr>
        <td>在特定 Region 有固定的基礎設施</td>
        <td>可能在不同 Region 擴展（Compute Savings Plans 不限 Region）</td>
      </tr>
      <tr>
        <td>需要最大折扣（RI 在相同條件下略優於 SP）</td>
        <td>希望保留未來更換實例類型的靈活性（如 x86 → Graviton）</td>
      </tr>
      <tr>
        <td>只使用 EC2</td>
        <td>廣泛使用 Serverless 架構</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="info" title="Reserved Instance Marketplace">
    如果購買了 RI 後業務發生變化（如縮減規模），可以在 AWS Reserved Instance Marketplace 上轉售未使用的 RI。轉售價格通常低於原始購買價，但比繼續持有不用的 RI 划算。建議首次購買 RI 時保守一些（覆蓋基礎負載的 50–70%），待使用模式穩定後再增購。
  </callout-box>

  <h3>Spot Instance 中斷處理架構</h3>
  <p>Spot Instance 的核心挑戰是中斷（Interruption）。AWS 在回收 Spot Instance 前會發出 2 分鐘（120 秒）的預警通知，應用必須在這段時間內完成優雅關閉和狀態保存。</p>

  <pre data-lang="python"><code class="language-python">
import asyncio
import boto3
import signal
import httpx

class SpotInterruptionHandler:
    """
    Spot Instance 中斷優雅處理器

    工作流程：
    1. 每 5 秒輪詢 EC2 Instance Metadata 服務，檢查是否有中斷通知
    2. 收到中斷通知後立即開始優雅關閉（120 秒內完成）
    3. 停止接受新請求 → 等待現有請求完成 → 保存 Checkpoint → 關閉
    """

    METADATA_URL = "http://169.254.169.254/latest/meta-data/spot/interruption-action"
    POLL_INTERVAL = 5  # 秒

    def __init__(self):
        self.shutting_down = False
        self.in_flight_requests = 0
        self.sqs = boto3.client("sqs")
        self.alb = boto3.client("elbv2")

    async def poll_for_interruption(self):
        """輪詢 IMDS 服務偵測中斷通知"""
        async with httpx.AsyncClient() as client:
            while not self.shutting_down:
                try:
                    # 嘗試取得中斷通知（需要 IMDSv2 Token）
                    token_resp = await client.put(
                        "http://169.254.169.254/latest/api/token",
                        headers={"X-aws-ec2-metadata-token-ttl-seconds": "21600"},
                        timeout=1.0
                    )
                    token = token_resp.text

                    resp = await client.get(
                        self.METADATA_URL,
                        headers={"X-aws-ec2-metadata-token": token},
                        timeout=1.0
                    )
                    # 收到 HTTP 200 表示有中斷通知
                    if resp.status_code == 200:
                        print(f"收到 Spot 中斷通知！動作：{resp.text}")
                        await self.handle_interruption()
                        break
                except httpx.TimeoutException:
                    pass  # 無中斷通知時 IMDS 回傳 404，這裡用 timeout 處理

                await asyncio.sleep(self.POLL_INTERVAL)

    async def handle_interruption(self):
        """收到中斷通知後的 120 秒應對策略"""
        self.shutting_down = True
        print("開始優雅關閉程序，剩餘時間 ~120 秒")

        # 步驟 1：從 ALB 目標群組移除，停止接受新請求（約 30 秒生效）
        await self._deregister_from_load_balancer()
        print("已從 Load Balancer 移除，不再接受新流量")

        # 步驟 2：等待現有請求完成（最多等 60 秒）
        try:
            await asyncio.wait_for(
                self._wait_for_in_flight_requests(),
                timeout=60
            )
            print("所有現有請求已完成")
        except asyncio.TimeoutError:
            print("警告：部分請求超時，強制繼續關閉")

        # 步驟 3：將未完成的任務重新入隊（讓其他實例繼續處理）
        await self._checkpoint_and_requeue_pending_jobs()
        print("未完成任務已重新排隊")

        # 步驟 4：優雅關閉應用（釋放資料庫連線、清理資源）
        await self._graceful_shutdown()
        print("優雅關閉完成")

    async def _deregister_from_load_balancer(self):
        """從 ALB 目標群組移除此實例"""
        instance_id = await self._get_instance_id()
        self.alb.deregister_targets(
            TargetGroupArn=self.TARGET_GROUP_ARN,
            Targets=[{"Id": instance_id}]
        )
        # 等待 connection draining 完成
        await asyncio.sleep(30)

    async def _checkpoint_and_requeue_pending_jobs(self):
        """將記憶體中的待處理任務重新發送到 SQS"""
        # 每個 Worker 應維護一個「當前處理中」的任務清單
        for job in self.current_jobs:
            if not job.completed:
                # 重新入隊，讓其他 Spot 實例繼續處理
                self.sqs.send_message(
                    QueueUrl=self.JOB_QUEUE_URL,
                    MessageBody=job.to_json(),
                    MessageGroupId=job.group_id  # FIFO 佇列確保順序
                )

    async def _get_instance_id(self) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "http://169.254.169.254/latest/meta-data/instance-id",
                timeout=2.0
            )
            return resp.text


# ECS Mixed Instance Policy：結合 On-demand 基礎 + Spot 彈性
MIXED_INSTANCE_POLICY = {
    "LaunchTemplate": {"LaunchTemplateId": "lt-0123456789abcdef"},
    "InstancesDistribution": {
        "OnDemandBaseCapacity": 2,           # 至少 2 個 On-demand（保底可靠性）
        "OnDemandPercentageAboveBaseCapacity": 20,  # 超過基礎後，20% On-demand + 80% Spot
        "SpotAllocationStrategy": "capacity-optimized",  # 從庫存最充足的池子選 Spot
        "SpotMaxPrice": "",                  # 留空 = 接受目前市場最高價（推薦）
    },
    "Overrides": [
        # 指定多種實例類型，提高 Spot 可用性（不同類型互為備選）
        {"InstanceType": "m5.xlarge"},
        {"InstanceType": "m5a.xlarge"},
        {"InstanceType": "m4.xlarge"},
        {"InstanceType": "m5d.xlarge"},
    ]
}
  </code></pre>

  <h3>Graviton（ARM）vs x86 的成本效益分析</h3>
  <table>
    <thead>
      <tr><th>指標</th><th>x86（Intel/AMD）</th><th>AWS Graviton（ARM）</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>同規格費用差距</td>
        <td>基準（如 m5.xlarge = $0.192/小時）</td>
        <td>比 x86 便宜約 20%（m6g.xlarge = $0.154/小時）</td>
      </tr>
      <tr>
        <td>效能表現</td>
        <td>成熟生態，效能穩定</td>
        <td>對記憶體密集型工作負載效能提升 20–40%</td>
      </tr>
      <tr>
        <td>相容性</td>
        <td>所有軟體皆相容</td>
        <td>需要 ARM 相容的 Docker 映像；部分原生模組需要重新編譯</td>
      </tr>
      <tr>
        <td>適用服務</td>
        <td>遺留系統、依賴 x86 原生函式庫的應用</td>
        <td>容器化應用、Java/Go/Python/Node.js、新建系統</td>
      </tr>
      <tr>
        <td>遷移難度</td>
        <td>—</td>
        <td>低（大多數現代語言和框架支援 ARM64）</td>
      </tr>
      <tr>
        <td>綜合成本效益</td>
        <td>基準</td>
        <td>同等工作負載下可節省 20–40%（費用便宜 + 效能更高）</td>
      </tr>
    </tbody>
  </table>

  <h3>Auto Scaling 最佳實踐</h3>
  <p>Auto Scaling 是控制計算成本的關鍵工具——不需要時縮減，需要時擴展。結合多種 Scaling 策略效果最佳：</p>

  <pre data-lang="python"><code class="language-python">
# Terraform 配置：結合 Predictive + Target Tracking 的 Auto Scaling 策略

resource "aws_autoscaling_policy" "target_tracking" {
  name                   = "target-cpu-50-percent"
  autoscaling_group_name = aws_autoscaling_group.api.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 50.0  # 保持 CPU 在 50%（留餘裕應對突增）

    # 縮減時比擴展時更保守（避免縮得太快後馬上要擴）
    disable_scale_in = false
  }
}

resource "aws_autoscaling_policy" "predictive" {
  name                   = "predictive-scaling"
  autoscaling_group_name = aws_autoscaling_group.api.name
  policy_type            = "PredictiveScaling"

  predictive_scaling_configuration {
    metric_specification {
      target_value = 50  # 預測性擴展的 CPU 目標

      predefined_load_metric_specification {
        predefined_metric_type = "ASGTotalCPUReservation"
      }
      predefined_scaling_metric_specification {
        predefined_metric_type = "ASGAverageCPUUtilization"
      }
    }
    mode                          = "ForecastAndScale"  # 預測 + 自動擴展
    scheduling_buffer_time        = 300  # 提前 5 分鐘擴展
    max_capacity_breach_behavior  = "IncreaseMaxCapacity"
  }
}

# Scheduled Scaling：已知的流量模式（如工作日白天流量高）
resource "aws_autoscaling_schedule" "scale_up_weekday_morning" {
  scheduled_action_name  = "scale-up-weekday-9am"
  autoscaling_group_name = aws_autoscaling_group.api.name
  min_size               = 10
  max_size               = 50
  desired_capacity       = 20
  recurrence             = "0 1 * * MON-FRI"  # UTC 01:00 = 台灣時間 09:00
}

resource "aws_autoscaling_schedule" "scale_down_night" {
  scheduled_action_name  = "scale-down-night"
  autoscaling_group_name = aws_autoscaling_group.api.name
  min_size               = 2
  max_size               = 10
  desired_capacity       = 3
  recurrence             = "0 15 * * *"  # UTC 15:00 = 台灣時間 23:00
}
  </code></pre>

  <h3>容量規劃的階段性策略</h3>
  <p>成本最佳化的購買策略應隨業務成熟度演進，而非一開始就追求最低成本：</p>

  <table>
    <thead>
      <tr><th>階段</th><th>業務狀態</th><th>建議策略</th><th>預期月費節省</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>第 1 階段（0–6 個月）</strong></td>
        <td>MVP 驗證期，流量不可預測</td>
        <td>全部 On-demand + 積極 Auto Scaling</td>
        <td>基準（靈活性最高）</td>
      </tr>
      <tr>
        <td><strong>第 2 階段（6–18 個月）</strong></td>
        <td>Product-Market Fit，流量開始穩定</td>
        <td>基礎負載（60%）轉 1 年 Reserved；彈性部分保持 On-demand；批次任務用 Spot</td>
        <td>節省 25–35%</td>
      </tr>
      <tr>
        <td><strong>第 3 階段（18 個月以上）</strong></td>
        <td>成長期，流量模式清晰</td>
        <td>基礎（50%）轉 3 年 Reserved；彈性（30%）用 Spot；峰值（20%）用 On-demand</td>
        <td>節省 50–65%</td>
      </tr>
      <tr>
        <td><strong>第 4 階段（大規模）</strong></td>
        <td>穩定大規模，有 FinOps 團隊</td>
        <td>Compute Savings Plans + Spot Fleet + Graviton 遷移</td>
        <td>節省 60–75%</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="tip" title="成本最佳化的文化建設">
    技術最佳化固然重要，但真正可持續的成本控制需要文化和流程支撐：<br/>
    1. <strong>成本可見性</strong>：為每個服務、每個功能加上成本 Tag，讓團隊知道自己的服務每月花費多少。<br/>
    2. <strong>成本目標設定</strong>：和 SLO 一樣，設定「每次 API 呼叫的 LLM 成本 &lt; $0.01」這樣的 Cost Objective。<br/>
    3. <strong>Infracost 整合 CI/CD</strong>：每個 Terraform PR 自動顯示成本影響，讓工程師在合併前看到「這個變更增加 $X/月」。<br/>
    4. <strong>FinOps Review</strong>：每月工程會議加入 10 分鐘成本回顧，讓成本成為工程決策的一等公民。<br/>
    5. <strong>成本遊戲化</strong>：設立季度「成本冠軍獎」，表彰節省最多的工程師或團隊，激勵全員參與優化。
  </callout-box>
</section>
`,
} satisfies ChapterContent;
