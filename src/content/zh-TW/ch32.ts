import type { ChapterContent } from '../../types.js';

export default {
  title: '部署策略與 CI/CD',
  content: `
<section id="blue-green">
  <h2>Blue-Green Deployment</h2>
  <p>Blue-Green Deployment（藍綠部署）透過同時維護兩個完全相同的生產環境，實現零停機部署和快速回滾。任何時候，只有一個環境在對外提供服務（稱為「active」），另一個環境是待命狀態（稱為「idle」）。</p>

  <arch-diagram src="./diagrams/ch32-deployment.json" caption="現代部署策略對比：Blue-Green、Canary、Feature Flag"></arch-diagram>

  <h3>Blue-Green 的完整流程</h3>
  <ol>
    <li><strong>初始狀態</strong>：Blue 環境運行 v1.0，接收 100% 流量。Green 環境是 v1.0 的閒置副本。</li>
    <li><strong>部署新版本</strong>：將 v2.0 部署到 Green 環境（不影響生產流量）。</li>
    <li><strong>Smoke Test</strong>：對 Green 環境的內部端點執行自動化測試，確認功能正常。</li>
    <li><strong>預熱（Warm-up）</strong>：JVM/Node.js 應用需要預熱 JIT 編譯，避免切換後短暫的效能下降。</li>
    <li><strong>流量切換</strong>：更新 Load Balancer Target Group，將 100% 流量從 Blue 切換到 Green。這是原子操作，通常在毫秒內完成。</li>
    <li><strong>監控視窗</strong>：觀察 10–15 分鐘，確認 Green 環境錯誤率、延遲正常。</li>
    <li><strong>舊環境保留</strong>：Blue 環境不立即銷毀，保留 1-2 小時作為快速回滾的保障。</li>
  </ol>

  <h3>DNS 切換 vs Load Balancer 切換</h3>
  <table>
    <thead>
      <tr><th>切換方式</th><th>切換速度</th><th>回滾速度</th><th>適用場景</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Load Balancer 切換</strong><br/>（修改 Target Group）</td>
        <td>秒級（幾乎即時）</td>
        <td>秒級</td>
        <td>推薦：大多數場景</td>
      </tr>
      <tr>
        <td><strong>DNS 切換</strong><br/>（修改 A Record）</td>
        <td>分鐘到小時級（TTL 依賴）</td>
        <td>同樣慢（受 DNS TTL 限制）</td>
        <td>不同資料中心的跨地域切換</td>
      </tr>
      <tr>
        <td><strong>Feature Flag 切換</strong><br/>（在應用層切換）</td>
        <td>毫秒級</td>
        <td>毫秒級</td>
        <td>功能層面的漸進式切換</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="warning" title="DNS 切換的陷阱">
    如果選擇 DNS 切換，切換前必須將 DNS TTL 降低到 60 秒（提前幾天操作）。<br/>
    否則，即使你改了 DNS，許多客戶端和中間層 DNS 仍然快取舊 IP，導致部分使用者在幾個小時內看到舊版本。<br/>
    <strong>這是一個常見的面試考點</strong>：問到 Blue-Green 如何實現零停機時，要提到 DNS TTL 問題。
  </callout-box>

  <h3>資料庫在 Blue-Green 中的挑戰</h3>
  <p>Blue-Green 最難的部分不是切換流量，而是處理資料庫相容性：</p>

  <pre data-lang="python"><code class="language-python">
"""
Blue-Green 資料庫相容性設計原則：

問題：切換流量後，Blue 和 Green 環境可能在短暫時間內同時讀寫資料庫
（因為 Load Balancer 的 Connection Draining 需要時間完成）

解決方案：確保資料庫 Schema 的向後相容性

範例：在 Blue-Green 切換過程中，同時運行兩個版本的服務
"""

# v1.0 的代碼（Blue 環境）
class UserV1:
    def create_user(self, name: str, email: str):
        # v1.0 只有 full_name 欄位
        return db.execute(
            "INSERT INTO users (full_name, email) VALUES (%s, %s)",
            (name, email)
        )

# v2.0 的代碼（Green 環境）
# 需要 display_name 欄位（通過 Expand-Contract 模式新增）
class UserV2:
    def create_user(self, first_name: str, last_name: str, email: str):
        # v2.0 同時寫入 full_name（向後相容）和 display_name（新欄位）
        display_name = f"{first_name} {last_name}"
        return db.execute(
            "INSERT INTO users (full_name, display_name, email) VALUES (%s, %s, %s)",
            (display_name, display_name, email)
        )
        # 注意：full_name 仍然被填入，確保切換回 v1.0 時不會出錯

"""
Blue-Green 資料庫 Migration 的正確順序：

Phase 1：部署 Migration（新增欄位，不刪除舊欄位）
  → 兩個版本都相容的 Schema

Phase 2：切換流量（Blue → Green）
  → v2.0 開始使用新欄位

Phase 3：確認 Green 穩定後，移除 v1.0 的 Blue 環境

Phase 4（下次部署）：清理 Migration（刪除不再需要的舊欄位）
"""
  </code></pre>

  <h3>成本考量</h3>
  <p>Blue-Green 需要維護兩套完全相同的環境，成本是最大的缺點：</p>

  <table>
    <thead>
      <tr><th>資源類型</th><th>Blue-Green 成本</th><th>成本控制策略</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>EC2/ECS 計算</td>
        <td>部署期間 2x（通常 30 分鐘）</td>
        <td>Idle 環境縮減到最小規格（僅保留少量實例用於測試）</td>
      </tr>
      <tr>
        <td>Load Balancer</td>
        <td>2x Target Groups（成本較低）</td>
        <td>可接受</td>
      </tr>
      <tr>
        <td>RDS / 資料庫</td>
        <td>通常共享一個資料庫（不翻倍）</td>
        <td>共享資料庫，只有計算層才翻倍</td>
      </tr>
    </tbody>
  </table>

  <pre data-lang="python"><code class="language-python">
import boto3

class BlueGreenDeployer:
    """AWS ECS + ALB 的藍綠部署實作"""

    async def deploy(
        self,
        service_name: str,
        new_image: str,
        target_group_blue: str,
        target_group_green: str,
        listener_arn: str
    ) -> DeploymentResult:
        # 1. 判斷哪個環境是 active
        active_tg, idle_tg = await self._get_active_idle(
            listener_arn, target_group_blue, target_group_green
        )

        # 2. Scale up idle 環境（部署前擴容到完整規格）
        await self._scale_to_production(service_name + "-" + idle_tg.split("-")[-1])

        # 3. 部署新版本到 idle 環境
        await self._update_ecs_service(service_name + "-" + idle_tg.split("-")[-1], new_image)
        await self._wait_for_service_stable(service_name)

        # 4. 預熱（讓 JVM/Node.js 完成初始化）
        await asyncio.sleep(60)  # 等待 60 秒預熱

        # 5. Smoke Test
        test_url = await self._get_target_group_url(idle_tg)
        if not await self._run_smoke_tests(test_url):
            # 失敗：縮減 idle 環境，不切換流量
            await self._scale_down(service_name + "-" + idle_tg.split("-")[-1])
            return DeploymentResult.failed("Smoke Test 失敗，停止部署")

        # 6. 流量切換（原子操作）
        await self.alb.modify_listener(
            ListenerArn=listener_arn,
            DefaultActions=[{"Type": "forward", "TargetGroupArn": idle_tg}]
        )

        # 7. 監控新版本（15 分鐘視窗）
        monitoring_result = await self._monitor_deployment(
            idle_tg,
            duration_minutes=15,
            rollback_fn=lambda: self._rollback(listener_arn, active_tg)
        )

        if not monitoring_result.healthy:
            # 8. 回滾後，縮減新環境
            await self._scale_down(service_name + "-" + idle_tg.split("-")[-1])
            return DeploymentResult.rolled_back(monitoring_result.reason)

        # 9. 成功後，縮減舊 active 環境（保留 1 小時後再縮減）
        asyncio.create_task(
            self._delayed_scale_down(
                service_name + "-" + active_tg.split("-")[-1],
                delay_hours=1
            )
        )

        return DeploymentResult.success(new_active=idle_tg, old_idle=active_tg)
  </code></pre>

  <h3>Blue-Green vs In-place 更新的選擇</h3>
  <table>
    <thead>
      <tr><th>維度</th><th>Blue-Green</th><th>Rolling Update</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>停機時間</td>
        <td>零停機（流量切換是原子操作）</td>
        <td>可能有短暫服務降級（舊新版本同時服務）</td>
      </tr>
      <tr>
        <td>回滾速度</td>
        <td>秒級（切換 Target Group）</td>
        <td>分鐘級（需要重新部署舊版本）</td>
      </tr>
      <tr>
        <td>基礎設施成本</td>
        <td>部署期間 2x</td>
        <td>不增加</td>
      </tr>
      <tr>
        <td>資料庫相容性</td>
        <td>需要雙版本相容的 Schema</td>
        <td>同樣需要，但並行時間更短</td>
      </tr>
      <tr>
        <td>適用場景</td>
        <td>關鍵金融系統、零容忍停機</td>
        <td>一般服務、成本敏感</td>
      </tr>
    </tbody>
  </table>
</section>

<section id="canary-release">
  <h2>Canary Release（金絲雀發布）</h2>
  <p>Canary Release 透過逐步增加新版本的流量比例，在真實生產流量中驗證新版本的健康狀況，而不是像 Blue-Green 那樣一次性切換全部流量。名稱來自礦工帶金絲雀進礦坑探測毒氣的歷史——少量使用者是「哨兵」，代替所有使用者承擔新版本的風險。</p>

  <h3>Canary 的流量分割策略</h3>
  <p>推薦的流量遞增節奏：<strong>1% → 5% → 25% → 100%</strong></p>

  <table>
    <thead>
      <tr><th>階段</th><th>流量比例</th><th>持續時間</th><th>評估重點</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>Stage 1（探針）</td>
        <td>1%</td>
        <td>10 分鐘</td>
        <td>基本錯誤率、明顯的崩潰問題</td>
      </tr>
      <tr>
        <td>Stage 2（驗證）</td>
        <td>5%</td>
        <td>20 分鐘</td>
        <td>效能指標、資料庫查詢效能</td>
      </tr>
      <tr>
        <td>Stage 3（穩定確認）</td>
        <td>25%</td>
        <td>30 分鐘</td>
        <td>業務指標（轉換率、ARPU），確保沒有隱性問題</td>
      </tr>
      <tr>
        <td>Stage 4（全量）</td>
        <td>100%</td>
        <td>持續監控</td>
        <td>長時間穩定性</td>
      </tr>
    </tbody>
  </table>

  <pre data-lang="python"><code class="language-python">
@dataclass
class CanaryStage:
    traffic_percent: int
    duration_minutes: int
    success_criteria: dict

class CanaryReleaseManager:
    """
    金絲雀發布管理器
    支援自動晉升（評估通過則自動增加流量）和手動晉升兩種模式
    """

    CANARY_STAGES = [
        CanaryStage(
            traffic_percent=1,
            duration_minutes=10,
            success_criteria={
                "error_rate": "<0.01",       # 錯誤率 < 1%
                "p99_latency_ms": "<500",    # P99 延遲 < 500ms
                "crash_rate": "<0.001"       # 崩潰率 < 0.1%
            }
        ),
        CanaryStage(
            traffic_percent=5,
            duration_minutes=20,
            success_criteria={
                "error_rate": "<0.01",
                "p99_latency_ms": "<500",
                "db_error_rate": "<0.001"   # 資料庫錯誤率
            }
        ),
        CanaryStage(
            traffic_percent=25,
            duration_minutes=30,
            success_criteria={
                "error_rate": "<0.005",
                "p99_latency_ms": "<400",
                # 業務指標（與 stable 版本比較）
                "conversion_rate_delta": ">-0.02"  # 轉換率下降不超過 2%
            }
        ),
        CanaryStage(traffic_percent=100, duration_minutes=0, success_criteria={})
    ]

    async def run_canary(
        self,
        service: str,
        new_version: str,
        auto_promote: bool = True
    ) -> CanaryResult:
        deployment_id = generate_uuid()
        rollback_triggered = False

        for i, stage in enumerate(self.CANARY_STAGES):
            print(f"[Stage {i+1}/{len(self.CANARY_STAGES)}] 設定新版本流量為 {stage.traffic_percent}%")

            await self.traffic_manager.set_split(
                service=service,
                splits={"stable": 100 - stage.traffic_percent, "canary": stage.traffic_percent}
            )

            if stage.traffic_percent == 100:
                return CanaryResult.success(deployment_id)

            # 等待並持續評估
            start_time = asyncio.get_event_loop().time()
            while asyncio.get_event_loop().time() - start_time < stage.duration_minutes * 60:
                await asyncio.sleep(30)  # 每 30 秒評估一次

                metrics = await self.monitor.get_comparison_metrics(
                    service, window_minutes=5  # 使用最近 5 分鐘的指標
                )
                passed, reason = self._evaluate_stage(metrics, stage.success_criteria)

                if not passed:
                    await self.traffic_manager.set_split(service, {"stable": 100, "canary": 0})
                    await self._notify_failure(service, stage, reason, deployment_id)
                    return CanaryResult.failed(stage=i + 1, reason=reason, deployment_id=deployment_id)

            if not auto_promote:
                confirmed = await self.wait_for_human_approval(
                    f"Stage {i+1} 通過評估（{stage.traffic_percent}%），確認晉升到 {self.CANARY_STAGES[i+1].traffic_percent}%？"
                )
                if not confirmed:
                    await self.traffic_manager.set_split(service, {"stable": 100, "canary": 0})
                    return CanaryResult.cancelled(stage=i + 1)

        return CanaryResult.success(deployment_id)

    def _evaluate_stage(self, metrics: ComparisonMetrics, criteria: dict) -> tuple[bool, str]:
        """評估 Canary 指標是否達到晉升標準"""
        for metric_name, threshold_expr in criteria.items():
            actual_value = getattr(metrics.canary, metric_name, None)
            if actual_value is None:
                continue

            if not self._check_threshold(actual_value, threshold_expr):
                return False, f"{metric_name}={actual_value:.4f} 未達到 {threshold_expr}"

        return True, ""
  </code></pre>

  <h3>監控指標與自動回滾觸發</h3>
  <pre data-lang="python"><code class="language-python">
class CanaryMetricsComparator:
    """
    比較 Canary 版本和 Stable 版本的指標
    使用統計顯著性測試，避免因為隨機波動觸發誤報
    """

    async def get_comparison_metrics(
        self,
        service: str,
        window_minutes: int
    ) -> ComparisonMetrics:
        """取得兩個版本的對比指標"""
        canary_metrics = await self.prometheus.query_range(
            f'rate(http_requests_total{{service="{service}",version="canary"}}[{window_minutes}m])',
            window_minutes
        )
        stable_metrics = await self.prometheus.query_range(
            f'rate(http_requests_total{{service="{service}",version="stable"}}[{window_minutes}m])',
            window_minutes
        )

        return ComparisonMetrics(
            canary=canary_metrics,
            stable=stable_metrics,
            # 計算業務指標的相對變化（Canary vs Stable）
            conversion_rate_delta=(
                canary_metrics.conversion_rate - stable_metrics.conversion_rate
            ) / stable_metrics.conversion_rate
        )
  </code></pre>

  <h3>使用者分組策略</h3>
  <p>Canary 流量不必是隨機的。根據業務需求，可以選擇特定使用者群體：</p>

  <table>
    <thead>
      <tr><th>分組策略</th><th>實現方式</th><th>適用場景</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>隨機（Random）</strong></td>
        <td>根據 User ID 的雜湊值決定（確保同一使用者始終看到相同版本）</td>
        <td>一般功能灰度，快速覆蓋多樣化使用者</td>
      </tr>
      <tr>
        <td><strong>地區（Region）</strong></td>
        <td>特定城市或國家的使用者優先使用新版本</td>
        <td>多地區系統，先在影響較小的地區驗證</td>
      </tr>
      <tr>
        <td><strong>使用者群體（Cohort）</strong></td>
        <td>Beta 使用者、員工帳號、特定 Plan 的使用者</td>
        <td>願意嘗試新功能的早期採用者群體</td>
      </tr>
      <tr>
        <td><strong>設備類型</strong></td>
        <td>Mobile app 使用者優先，Desktop 後跟進</td>
        <td>前端應用的分平台灰度</td>
      </tr>
    </tbody>
  </table>

  <pre data-lang="python"><code class="language-python">
class UserRoutingStrategy:
    """使用者路由策略：決定每個使用者看到哪個版本"""

    def get_version_for_user(
        self,
        user: User,
        canary_config: CanaryConfig
    ) -> str:
        # 策略 1：Beta 使用者永遠使用 Canary
        if user.is_beta_tester:
            return "canary"

        # 策略 2：員工帳號使用 Canary（內部狗食）
        if user.email.endswith("@company.com"):
            return "canary"

        # 策略 3：地區控制
        if canary_config.regions and user.region not in canary_config.regions:
            return "stable"

        # 策略 4：隨機 Canary（基於 User ID 雜湊，確保穩定性）
        if canary_config.traffic_percent > 0:
            hash_val = int(hashlib.md5(
                f"{canary_config.deployment_id}:{user.id}".encode()
            ).hexdigest(), 16)
            # 同一個 (deployment, user) 組合始終得到相同結果
            if (hash_val % 100) < canary_config.traffic_percent:
                return "canary"

        return "stable"
  </code></pre>
</section>

<section id="feature-flags">
  <h2>Feature Flags 設計</h2>
  <p>Feature Flags（功能開關）讓你能夠在不重新部署的情況下控制功能的開啟/關閉，是現代 CI/CD 的核心能力之一。Feature Flags 解耦了「程式碼部署」和「功能上線」，讓兩者可以獨立進行。</p>

  <h3>Feature Flag 的三種主要類型</h3>
  <table>
    <thead>
      <tr><th>類型</th><th>目的</th><th>生命週期</th><th>誰控制</th><th>範例</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Release Flags</strong></td>
        <td>讓未完成的功能程式碼可以先部署，但暫時對外隱藏</td>
        <td>短期（天到週），功能完成後刪除</td>
        <td>工程師</td>
        <td>新 UI 設計的灰度上線</td>
      </tr>
      <tr>
        <td><strong>Experiment Flags（A/B 測試）</strong></td>
        <td>測試不同方案的效果，收集數據後選擇優勝者</td>
        <td>中期（週到月），決策後刪除</td>
        <td>產品 + 數據團隊</td>
        <td>按鈕文字「立即購買」vs「加入購物車」的 A/B 測試</td>
      </tr>
      <tr>
        <td><strong>Ops Flags / Kill Switch</strong></td>
        <td>在緊急情況下快速關閉有問題的功能</td>
        <td>長期（永久保留）</td>
        <td>SRE / On-call 工程師</td>
        <td>關閉高負載的 ML 推薦引擎，切換到規則推薦</td>
      </tr>
    </tbody>
  </table>

  <h3>LaunchDarkly 架構解析</h3>
  <p>LaunchDarkly 是最廣泛使用的 Feature Flag 平台。它的架構設計很有啟發性：</p>

  <pre data-lang="python"><code class="language-python">
"""
LaunchDarkly 的核心設計：

1. Flag 評估在客戶端本地完成（不需要每次評估都呼叫 API）
2. SDK 在啟動時全量下載 Flag 規則，之後增量同步（Server-Sent Events）
3. 這確保了即使 LaunchDarkly 服務不可用，Flag 評估仍然正常工作

本地實作 Feature Flag 服務的設計參考：
"""

class FeatureFlagService:
    """
    Feature Flag 服務：支援靜態（配置檔）和動態（遠端配置）兩種模式
    設計目標：Flag 評估必須 < 1ms（不能阻塞業務邏輯）
    """

    def __init__(self, config_source: ConfigSource, cache: Cache):
        self.config = config_source
        self.cache = cache
        self._local_flags: dict = {}          # 本地快取的 Flag 規則
        self._last_sync: datetime = None

    async def is_enabled(
        self,
        flag_name: str,
        context: FlagContext
    ) -> bool:
        # 使用本地快取的 Flag 規則（毫秒級）
        flag_config = self._local_flags.get(flag_name)
        if flag_config is None:
            return False  # 未知的 Flag 預設關閉（Fail Safe）

        return self._evaluate_flag(flag_config, context)

    async def start_sync(self):
        """啟動後台同步：定期從遠端拉取最新 Flag 規則"""
        while True:
            try:
                new_flags = await self.config.fetch_all_flags()
                self._local_flags = new_flags
                self._last_sync = datetime.utcnow()
            except Exception as e:
                # 同步失敗不影響服務：繼續使用上次成功的規則
                logger.warning(f"Feature Flag 同步失敗，使用快取規則：{e}")
            await asyncio.sleep(30)  # 每 30 秒同步一次

    def _evaluate_flag(self, flag: FlagConfig, context: FlagContext) -> bool:
        if not flag.enabled:
            return False

        if context.user_id in flag.allowlist_users:
            return True  # 白名單使用者優先

        for rule in flag.targeting_rules:
            if self._matches_rule(rule, context):
                return rule.value

        if flag.rollout_percentage > 0:
            # 使用 Flag 名稱作為雜湊的一部分，確保不同 Flag 的使用者分組不同
            hash_value = int(hashlib.md5(
                f"{flag.name}:{context.user_id}".encode()
            ).hexdigest(), 16)
            return (hash_value % 100) < flag.rollout_percentage

        return False
  </code></pre>

  <h3>Feature Flag 的技術債管理</h3>
  <p>Feature Flag 如果不加以管理，會快速累積成技術債：舊的 Flag 留在代碼中，讓代碼邏輯越來越複雜。</p>

  <pre data-lang="python"><code class="language-python">
class FeatureFlagLifecycleManager:
    """
    Feature Flag 生命週期管理：防止 Flag 成為技術債
    """

    # Flag 的最長生命週期（超過則觸發清理提醒）
    MAX_AGE_BY_TYPE = {
        "release": timedelta(days=30),      # Release Flag 最長 30 天
        "experiment": timedelta(days=90),   # Experiment Flag 最長 90 天
        "ops": None,                        # Ops Flag 永久保留（但要定期審查）
    }

    async def generate_stale_flags_report(self) -> list[StaleFlagWarning]:
        """
        掃描所有 Flag，找出過期或應該清理的 Flag
        每週自動生成報告發送給 Flag 所有人
        """
        all_flags = await self.flag_store.get_all()
        warnings = []

        for flag in all_flags:
            max_age = self.MAX_AGE_BY_TYPE.get(flag.flag_type)
            if max_age and (datetime.utcnow() - flag.created_at) > max_age:
                warnings.append(StaleFlagWarning(
                    flag_name=flag.name,
                    flag_type=flag.flag_type,
                    age_days=(datetime.utcnow() - flag.created_at).days,
                    owner=flag.owner,
                    message=f"Flag '{flag.name}' 已存在 {(datetime.utcnow() - flag.created_at).days} 天，請評估是否可以清理。"
                ))

            # 100% 啟用且超過 7 天的 Release Flag → 建議清理
            if flag.flag_type == "release" and flag.rollout_percentage == 100:
                age = (datetime.utcnow() - flag.last_modified).days
                if age > 7:
                    warnings.append(StaleFlagWarning(
                        flag_name=flag.name,
                        flag_type="release",
                        age_days=age,
                        owner=flag.owner,
                        message=f"Flag '{flag.name}' 已 100% 啟用超過 7 天，建議從代碼中移除並刪除 Flag。"
                    ))

        return warnings

  </code></pre>

  <callout-box type="warning" title="Feature Flag 的反模式">
    避免以下常見的 Feature Flag 反模式：<br/>
    1. <strong>無限期 Release Flag</strong>：功能上線後忘記刪除 Flag，導致代碼中充滿條件分支。<br/>
    2. <strong>Flag 依賴 Flag</strong>：Flag A 依賴 Flag B，讓邏輯難以理解。<br/>
    3. <strong>缺少所有人</strong>：每個 Flag 必須有明確的所有人（Owner），負責到期清理。<br/>
    4. <strong>在測試中不使用 Flag</strong>：測試代碼必須能覆蓋 Flag 開/關兩種狀態，否則測試覆蓋不完整。
  </callout-box>
</section>

<section id="db-migration-safety">
  <h2>Database Migration 安全策略</h2>
  <p>資料庫遷移是 CI/CD 中最危險的操作之一。一次錯誤的 Schema 變更可能導致長時間的服務中斷，甚至資料損失。安全的資料庫遷移需要遵循「向後相容優先」的原則。</p>

  <h3>安全遷移的 4 步驟：Expand-Migrate-Contract</h3>
  <p>任何破壞性的 Schema 變更都應該分步驟進行：</p>

  <pre data-lang="python"><code class="language-python">
"""
範例：將 users.full_name 重命名為 users.display_name

❌ 危險做法（直接重命名，導致服務中斷）：
ALTER TABLE users RENAME COLUMN full_name TO display_name;
→ 執行後，所有仍在使用 full_name 的服務立即崩潰

✅ 安全做法（4步驟 Expand-Migrate-Contract）：
"""

# === 步驟 1：Expand（擴展）- 新增新欄位，保留舊欄位 ===
# 此時：舊欄位繼續工作，服務不中斷
MIGRATION_STEP_1 = """
ALTER TABLE users ADD COLUMN display_name VARCHAR(255);
-- 快速複製現有資料（可以在業務低峰期執行）
UPDATE users SET display_name = full_name WHERE display_name IS NULL;
-- 可以加索引（如果需要）
CREATE INDEX CONCURRENTLY idx_users_display_name ON users(display_name);
"""

# === 步驟 2：雙寫（Double Write）- 部署新版本代碼，同時寫入新舊兩個欄位 ===
# 此時：部署 v2 代碼，在寫入時同時更新 full_name 和 display_name
# 讀取時：v1 代碼讀 full_name，v2 代碼讀 display_name
class UserServiceV2:
    def update_user_name(self, user_id: str, name: str):
        db.execute(
            "UPDATE users SET full_name = %s, display_name = %s WHERE id = %s",
            (name, name, user_id)
        )
        # 同時寫入兩個欄位，確保無論 v1/v2 哪個服務讀取，都能得到正確值

# === 步驟 3：確認（Verify）- 確認所有服務都已升級到 v2，舊欄位不再被讀取 ===
VERIFICATION_QUERY = """
-- 確認 display_name 欄位沒有 NULL 值（所有資料已遷移）
SELECT COUNT(*) FROM users WHERE display_name IS NULL;
-- 結果應為 0
"""

# === 步驟 4：Contract（收縮）- 確認後，刪除舊欄位 ===
# 必須在確認所有 v1 服務都已下線後才執行！
MIGRATION_STEP_4 = """
ALTER TABLE users DROP COLUMN full_name;
DROP INDEX IF EXISTS idx_users_full_name;
"""
  </code></pre>

  <h3>Online Schema Change 工具</h3>
  <p>對大型資料表（數千萬行）執行 DDL 操作，直接執行 ALTER TABLE 可能會鎖表幾小時。Online Schema Change 工具可以在不鎖表的情況下完成 Schema 變更：</p>

  <table>
    <thead>
      <tr><th>工具</th><th>支援資料庫</th><th>原理</th><th>特點</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>pt-online-schema-change</strong>（pt-osc）</td>
        <td>MySQL</td>
        <td>建立新表 → 觸發器同步 → 重命名切換</td>
        <td>成熟穩定，Percona 出品</td>
      </tr>
      <tr>
        <td><strong>gh-ost</strong>（GitHub）</td>
        <td>MySQL</td>
        <td>解析 Binlog 同步，不使用觸發器</td>
        <td>效能更好，無觸發器開銷，可暫停</td>
      </tr>
      <tr>
        <td><strong>pglogical / pg_repack</strong></td>
        <td>PostgreSQL</td>
        <td>線上重新打包表，保持索引和約束</td>
        <td>PostgreSQL 官方推薦方案</td>
      </tr>
    </tbody>
  </table>

  <pre data-lang="bash"><code class="language-bash">
# gh-ost 執行範例：在不鎖表的情況下新增欄位
gh-ost \
  --host="db.prod.example.com" \
  --port=3306 \
  --user="migration_user" \
  --password="$DB_PASSWORD" \
  --database="myapp" \
  --table="orders" \
  --alter="ADD COLUMN shipping_carrier VARCHAR(50) DEFAULT NULL" \
  --execute \
  --verbose \
  --ok-to-drop-table \
  --initially-drop-old-table \
  --chunk-size=1000 \          # 每批複製 1000 行
  --max-lag-millis=500 \       # 複製延遲超過 500ms 則暫停（保護 Replica）
  --throttle-control-replicas="replica1.db.example.com,replica2.db.example.com"
  </code></pre>

  <h3>零停機資料庫遷移清單</h3>
  <pre data-lang="python"><code class="language-python">
class MigrationSafetyChecker:
    """在執行 migration 前，自動檢查是否有破壞性操作"""

    DANGEROUS_OPERATIONS = [
        (r"DROP\s+COLUMN", "刪除欄位：可能導致正在使用此欄位的服務崩潰"),
        (r"RENAME\s+COLUMN", "重命名欄位：應使用 Expand-Contract 模式"),
        (r"ALTER\s+COLUMN.+NOT\s+NULL(?!\s+DEFAULT)", "在非空約束沒有預設值：已有 NULL 資料的表會失敗"),
        (r"DROP\s+TABLE", "刪除表：不可逆操作，需要特別謹慎"),
        (r"DROP\s+INDEX(?!\s+CONCURRENTLY)", "刪除索引（非 CONCURRENTLY）：會鎖表"),
        (r"CREATE\s+INDEX(?!\s+CONCURRENTLY)", "建立索引（非 CONCURRENTLY）：大表上會鎖表"),
        (r"ALTER\s+TABLE.+ADD\s+CONSTRAINT", "新增約束：需要全表掃描，大表上耗時")
    ]

    def validate(self, migration_sql: str) -> list[MigrationWarning]:
        warnings = []
        for pattern, description in self.DANGEROUS_OPERATIONS:
            if re.search(pattern, migration_sql, re.IGNORECASE):
                warnings.append(MigrationWarning(
                    level="error",
                    pattern=pattern,
                    description=description,
                    suggestion="請參考 Expand-Contract 遷移模式，分步驟執行"
                ))
        return warnings
  </code></pre>

  <callout-box type="tip" title="Migration 執行的黃金法則">
    1. <strong>小批次修改</strong>：UPDATE 大量資料時，每批 1000 行，避免長事務鎖表。<br/>
    2. <strong>先備份</strong>：執行任何不可逆操作前，先做 Point-in-Time 備份。<br/>
    3. <strong>CONCURRENTLY 優先</strong>：PostgreSQL 建立/刪除索引時，始終使用 CONCURRENTLY 選項。<br/>
    4. <strong>CI 中自動驗證</strong>：使用 MigrationSafetyChecker 在 PR 合併時自動攔截危險操作。<br/>
    5. <strong>在非高峰期執行</strong>：即使使用 Online Schema Change 工具，仍然應選在低流量時段執行。
  </callout-box>
</section>

<section id="rollback-design">
  <h2>Rollback 機制設計</h2>
  <p>Rollback（回滾）是部署出錯時的「緊急逃生門」。好的 Rollback 設計應該讓工程師能夠在 5 分鐘內恢復服務到上一個已知良好狀態。</p>

  <h3>代碼回滾 vs 資料庫回滾的不同挑戰</h3>
  <table>
    <thead>
      <tr><th>維度</th><th>代碼回滾</th><th>資料庫 Migration 回滾</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>難度</td>
        <td>容易（切換 Docker Image 版本）</td>
        <td>困難（需要反向 Migration，且可能有資料損失）</td>
      </tr>
      <tr>
        <td>速度</td>
        <td>分鐘級</td>
        <td>可能需要數小時（大表的 Migration）</td>
      </tr>
      <tr>
        <td>資料風險</td>
        <td>代碼回滾不影響資料</td>
        <td>回滾 Schema 可能需要刪除新欄位中的資料</td>
      </tr>
      <tr>
        <td>最佳實踐</td>
        <td>保留前幾個版本的 Image，隨時可切回</td>
        <td>遵循 Expand-Contract 模式，確保每步都可獨立回滾</td>
      </tr>
    </tbody>
  </table>

  <h3>不可逆操作的保護機制</h3>
  <pre data-lang="python"><code class="language-python">
class IrreversibleOperationGuard:
    """
    對不可逆操作（刪除資料、刪除帳號等）的額外保護
    確保這些操作在設計上是可以撤銷的
    """

    def soft_delete_instead_of_hard_delete(self):
        """
        資料刪除的黃金法則：
        生產環境永遠使用軟刪除，從不直接 DELETE
        """
        # ❌ 危險：直接刪除，無法回滾
        # db.execute("DELETE FROM orders WHERE id = %s", (order_id,))

        # ✅ 安全：軟刪除，保留資料，只是標記為刪除
        # db.execute(
        #     "UPDATE orders SET deleted_at = NOW(), deleted_by = %s WHERE id = %s",
        #     (current_user_id, order_id)
        # )
        pass

    def use_event_sourcing_for_critical_data(self):
        """
        對於金融類關鍵資料，使用 Event Sourcing 模式：
        不修改或刪除記錄，只追加新事件
        這讓資料可以回到任意歷史點
        """
        pass
  </code></pre>

  <h3>自動回滾觸發器</h3>
  <pre data-lang="python"><code class="language-python">
class AutoRollbackTrigger:
    """
    自動回滾觸發器：監控部署後的關鍵指標，異常時自動回滾
    """

    ROLLBACK_CONDITIONS = [
        ("high_error_rate",   "error_rate",     ">0.05",  5),   # 5 分鐘 Error Rate > 5%
        ("high_p99_latency",  "p99_latency_ms", ">2000",  3),   # 3 分鐘 P99 > 2 秒
        ("low_success_rate",  "success_rate",   "<0.90",  5),   # 5 分鐘成功率 < 90%
        ("oom_events",        "oom_count",      ">3",     2),   # 2 分鐘 OOM 超過 3 次
    ]

    async def monitor_and_auto_rollback(
        self,
        deployment: Deployment,
        rollback_fn: Callable
    ) -> MonitoringResult:
        monitoring_window = timedelta(minutes=15)
        check_interval = 30
        end_time = datetime.utcnow() + monitoring_window

        while datetime.utcnow() < end_time:
            for condition_name, metric, threshold, window_minutes in self.ROLLBACK_CONDITIONS:
                value = await self.metrics.query(metric, window_minutes=window_minutes,
                                                  service=deployment.service)

                if self._threshold_exceeded(value, threshold):
                    await rollback_fn()

                    await self.alerting.send_critical(
                        title=f"自動回滾觸發：{deployment.service}",
                        message=f"""
部署 {deployment.id}（版本 {deployment.version}）已自動回滾。
觸發條件：{condition_name} = {value}（閾值：{threshold}）
已回滾到版本：{deployment.previous_version}
回滾時間：{datetime.utcnow().isoformat()}
                        """,
                        channels=["slack", "pagerduty"]
                    )

                    return MonitoringResult(
                        rolled_back=True,
                        reason=f"{condition_name}: {value} {threshold}"
                    )

            await asyncio.sleep(check_interval)

        return MonitoringResult(rolled_back=False, reason="")
  </code></pre>

  <h3>MTTR 最小化設計</h3>
  <p>MTTR（Mean Time To Recovery）是衡量系統可靠性的重要指標。以下是將 MTTR 從小時縮短到分鐘的關鍵設計：</p>

  <table>
    <thead>
      <tr><th>環節</th><th>傳統做法（慢）</th><th>優化做法（快）</th><th>時間節省</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>問題發現</td>
        <td>使用者回報 → 工程師注意</td>
        <td>自動監控告警 → On-call 工程師</td>
        <td>20 分鐘 → 2 分鐘</td>
      </tr>
      <tr>
        <td>問題定位</td>
        <td>查看日誌、手動分析</td>
        <td>自動關聯部署記錄、Tracing</td>
        <td>15 分鐘 → 3 分鐘</td>
      </tr>
      <tr>
        <td>執行回滾</td>
        <td>手動操作、等待審批</td>
        <td>自動回滾 或 一鍵回滾按鈕</td>
        <td>10 分鐘 → 1 分鐘</td>
      </tr>
      <tr>
        <td>確認恢復</td>
        <td>手動查看指標</td>
        <td>自動監控確認告警解除</td>
        <td>5 分鐘 → 2 分鐘</td>
      </tr>
    </tbody>
  </table>

  <h3>完整的 Rollback 清單</h3>
  <p>回滾不只是「切換回舊版本的程式碼」，需要一個系統性的清單：</p>
  <ol>
    <li><strong>應用程式回滾</strong>：將 ECS Task Definition / K8s Deployment 切換回上一個版本的 Image。預計時間：1-3 分鐘。</li>
    <li><strong>流量切換</strong>：如果使用 Blue-Green，切換 Load Balancer 回舊環境。預計時間：10 秒。</li>
    <li><strong>Feature Flag 關閉</strong>：立即關閉與此次部署相關的所有 Feature Flags（比代碼回滾更快）。預計時間：30 秒。</li>
    <li><strong>資料庫 Migration 評估</strong>：如果有 Schema 變更，評估是否需要回滾（通常不需要，因為遵循 Expand-Contract 模式）。</li>
    <li><strong>快取清除</strong>：清除可能包含舊版本邏輯生成的快取資料（避免舊 Cache 污染新版本）。</li>
    <li><strong>告警和通知</strong>：通知相關團隊回滾已完成，說明原因和預計修復時間。</li>
    <li><strong>事後分析（Post-mortem）</strong>：在 24-48 小時內完成 Blameless Post-mortem，找出根因，防止再次發生。</li>
  </ol>

  <callout-box type="warning" title="「零停機部署」的迷思">
    零停機部署是指服務整體不中斷，但並非意味著所有請求都成功。在流量切換的瞬間，仍可能有少量請求（通常 &lt;0.1%）返回錯誤。真正的零停機需要結合：<br/>
    1. <strong>Connection Draining</strong>：在移除舊實例前，等待現有請求完成（通常設定 30 秒）<br/>
    2. <strong>Health Check 細調</strong>：確保新實例在完全就緒後才開始接收流量<br/>
    3. <strong>客戶端重試</strong>：客戶端在遇到 5xx 錯誤時自動重試（配合 Idempotency Key 確保冪等性）
  </callout-box>
</section>
`,
} satisfies ChapterContent;
