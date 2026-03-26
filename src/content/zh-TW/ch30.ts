import type { ChapterContent } from '../../types.js';

export default {
  title: '實戰：設計 AI 程式碼審查系統',
  content: `
<section id="code-review-arch">
  <h2>整體架構設計</h2>
  <p>AI 程式碼審查系統是 Multi-Agent 技術在工程效率工具中的代表性應用。本章設計目標：「建立一個能夠在開發者提交 PR 時自動觸發，在 3 分鐘內完成多維度代碼審查，並以結構化評論回饋到 GitHub PR 的系統」。</p>

  <arch-diagram src="./diagrams/ch30-code-review.json" caption="AI 程式碼審查系統架構圖"></arch-diagram>

  <h3>需求分析</h3>
  <p><strong>功能需求：</strong></p>
  <ul>
    <li>監聽 GitHub Webhook，當 PR 開啟或更新時自動觸發審查</li>
    <li>從多個維度審查：安全性、效能、程式碼風格、邏輯正確性</li>
    <li>輸出結構化評論：每條評論附上嚴重程度（Critical/Major/Minor）和具體的修正建議</li>
    <li>對審查結果進行優先排序，確保最重要的問題排在最前面</li>
    <li>支援 Python、TypeScript、Go 三種語言</li>
    <li>在 3 分鐘內完成審查並回饋到 GitHub</li>
  </ul>

  <p><strong>非功能需求：</strong></p>
  <ul>
    <li>支援同時處理 50+ 個活躍 PR</li>
    <li>每次 PR 審查的 LLM 成本 &lt; $0.50</li>
    <li>誤報率（False Positive）&lt; 10%（避免「狼來了」效應）</li>
    <li>Webhook 端點的回應時間 &lt; 1 秒（GitHub 需要快速回應，避免超時重試）</li>
  </ul>

  <h3>觸發機制設計</h3>
  <p>審查系統透過 GitHub Webhook 觸發。需要謹慎設計觸發條件，避免不必要的審查浪費資源：</p>

  <table>
    <thead>
      <tr><th>GitHub 事件</th><th>Action</th><th>是否觸發審查</th><th>理由</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>pull_request</td>
        <td>opened</td>
        <td>是</td>
        <td>新 PR 開啟，需要完整審查</td>
      </tr>
      <tr>
        <td>pull_request</td>
        <td>synchronize</td>
        <td>是（增量審查）</td>
        <td>PR 更新，只審查新增的變動</td>
      </tr>
      <tr>
        <td>pull_request</td>
        <td>reopened</td>
        <td>是</td>
        <td>重新開啟的 PR 需要重新審查</td>
      </tr>
      <tr>
        <td>pull_request</td>
        <td>closed</td>
        <td>否</td>
        <td>PR 已關閉，不需要審查</td>
      </tr>
      <tr>
        <td>pull_request</td>
        <td>labeled</td>
        <td>條件觸發</td>
        <td>貼上 "ai-review" 標籤時觸發手動審查</td>
      </tr>
    </tbody>
  </table>

  <h3>審查範圍配置</h3>
  <p>並非所有檔案都需要相同程度的審查。透過配置檔靈活控制審查範圍：</p>

  <pre data-lang="yaml"><code class="language-yaml">
# .ai-review.yml（放在倉庫根目錄）
review:
  # 啟用的 Agent 類型
  agents:
    security: true      # 安全審查（推薦所有倉庫啟用）
    performance: true   # 效能審查
    style: true         # 程式碼風格
    logic: true         # 邏輯正確性

  # 嚴重程度過濾（只報告 major 及以上）
  minimum_severity: minor  # critical | major | minor | info

  # 排除路徑（不進行 AI 審查）
  exclude_paths:
    - "**/*.test.ts"      # 測試檔案（風格要求不同）
    - "**/*.spec.py"
    - "migrations/**"     # 資料庫遷移（有專門的驗證流程）
    - "vendor/**"         # 第三方依賴
    - "docs/**"           # 文件

  # 特定路徑的審查強度
  path_rules:
    - path: "src/api/**"
      agents: [security, logic]  # API 路徑強制安全審查
      minimum_severity: major
    - path: "src/payments/**"
      agents: [security, logic, performance]
      minimum_severity: critical  # 支付模組只報 Critical

  # PR 大小限制
  max_files_per_review: 30    # 超過則只審查風險最高的 30 個檔案
  max_lines_changed: 1500     # 鼓勵拆分大 PR
  </code></pre>

  <h3>端對端資料流</h3>
  <ol>
    <li><strong>PR Webhook 觸發</strong>：GitHub 發送 <code>pull_request</code> 事件到系統的 Webhook Endpoint，系統在 1 秒內回應 200，非同步處理審查任務。</li>
    <li><strong>程式碼解析</strong>：Code Parser 取得 PR 的 diff，解析為結構化的檔案列表（新增/修改/刪除的行數），並讀取 <code>.ai-review.yml</code> 配置。</li>
    <li><strong>風險評估預過濾</strong>：快速掃描所有檔案，識別高風險檔案（含安全關鍵關鍵字），決定各 Agent 的審查優先順序。</li>
    <li><strong>並行審查</strong>：Security Agent、Performance Agent、Style Agent、Logic Agent 同時開始審查，各自帶獨立超時設定。</li>
    <li><strong>合成</strong>：Synthesis Agent 接收所有 Agent 的審查結果，去重、排序、統一格式，生成最終報告。</li>
    <li><strong>回饋</strong>：透過 GitHub Review API 在 PR 上發布 Review（包含行內評論和整體摘要）。</li>
    <li><strong>Check Run 更新</strong>：透過 GitHub Check Run API 更新 PR 的 CI 狀態（Pass/Fail/Neutral）。</li>
  </ol>

  <pre data-lang="python"><code class="language-python">
class CodeReviewOrchestrator:
    """
    程式碼審查 Orchestrator：協調整個審查流程
    """

    def __init__(
        self,
        code_parser: CodeParser,
        review_agents: list[BaseReviewAgent],
        synthesis_agent: SynthesisAgent,
        github_client: GitHubClient,
        config_loader: ReviewConfigLoader
    ):
        self.parser = code_parser
        self.review_agents = review_agents
        self.synthesis = synthesis_agent
        self.github = github_client
        self.config_loader = config_loader

    async def review_pr(self, pr_data: PRData) -> ReviewResult:
        # 0. 建立 Check Run（讓 PR 顯示「AI Review 進行中」）
        check_run_id = await self.github.create_check_run(
            repo=pr_data.repo,
            head_sha=pr_data.head_sha,
            name="AI Code Review",
            status="in_progress"
        )

        try:
            result = await self._do_review(pr_data)

            # 更新 Check Run 為完成狀態
            conclusion = "failure" if result.has_critical_issues else "success"
            await self.github.complete_check_run(check_run_id, conclusion, result.summary)

            return result

        except Exception as e:
            # 確保 Check Run 不會一直顯示「進行中」
            await self.github.complete_check_run(check_run_id, "neutral", f"審查過程發生錯誤：{str(e)}")
            raise

    async def _do_review(self, pr_data: PRData) -> ReviewResult:
        # 1. 載入倉庫審查配置
        config = await self.config_loader.load(pr_data.repo, pr_data.base_branch)

        # 2. 取得並解析 PR diff
        raw_diff = await self.github.get_pr_diff(pr_data.repo, pr_data.number)
        parsed_code = await self.parser.parse(raw_diff, config)

        # 3. 大型 PR 處理
        if parsed_code.total_files > config.max_files_per_review:
            parsed_code = parsed_code.prioritize_and_limit(config.max_files_per_review)
            await self.github.add_comment(
                pr_data,
                f"⚠️ 此 PR 包含 {parsed_code.original_file_count} 個檔案的變動，"
                f"AI 審查僅覆蓋風險評分最高的 {config.max_files_per_review} 個檔案。\n"
                f"建議將大 PR 拆分為多個較小的 PR 以獲得完整審查。"
            )

        # 4. 選擇啟用的 Agent
        active_agents = [
            agent for agent in self.review_agents
            if config.is_agent_enabled(agent.name)
        ]

        # 5. 並行執行（帶總超時）
        agent_results = await self._run_agents_parallel(
            active_agents, parsed_code, pr_data.context, total_timeout=170
        )

        # 6. 合成
        final_review = await self.synthesis.merge(agent_results, pr_data.context, config)

        # 7. 發布到 GitHub
        await self._publish_to_github(pr_data, final_review)

        return final_review

    async def _run_agents_parallel(
        self,
        agents: list[BaseReviewAgent],
        parsed_code: ParsedCodeDiff,
        pr_context: PRContext,
        total_timeout: float
    ) -> list[AgentReviewResult]:
        tasks = [
            asyncio.create_task(agent.review(parsed_code, pr_context))
            for agent in agents
        ]

        try:
            results = await asyncio.wait_for(
                asyncio.gather(*tasks, return_exceptions=True),
                timeout=total_timeout
            )
        except asyncio.TimeoutError:
            for task in tasks:
                task.cancel()
            results = [
                t.result() if not t.cancelled() and t.done() and not t.exception() else None
                for t in tasks
            ]

        return [r for r in results if r and not isinstance(r, Exception)]
  </code></pre>
</section>

<section id="parallel-agents">
  <h2>並行審查 Agent 設計</h2>
  <p>每個審查 Agent 專注於一個特定的審查維度，使用針對性調教的 System Prompt 和工具集，避免通用 Agent 在每個維度都「半桶水」的問題。</p>

  <h3>四個核心審查 Agent</h3>

  <h4>1. Security Agent（安全審查）</h4>
  <pre data-lang="python"><code class="language-python">
class SecurityReviewAgent(BaseReviewAgent):
    name = "security_agent"
    timeout_seconds = 90  # 安全審查最複雜，給較長時間

    SYSTEM_PROMPT = """
    你是一位資深的應用安全工程師（AppSec Engineer），擁有 10 年以上的安全審查經驗。
    你的任務是審查程式碼變更中的安全性問題。

    重點關注（OWASP Top 10 及常見漏洞）：
    1. 注入漏洞：SQL Injection、NoSQL Injection、Command Injection、LDAP Injection
    2. 身份驗證/授權問題：缺失認證、水平越權（IDOR）、垂直越權
    3. 秘鑰和憑證洩漏：硬編碼的 API Key、密碼、連接字串、Private Key
    4. 不安全的加密：MD5/SHA1 用於密碼雜湊、弱加密算法、不安全的隨機數
    5. 路徑遍歷和任意檔案讀取
    6. 不充分的輸入驗證和輸出編碼（XSS、SSRF）
    7. 敏感資料暴露：PII 記錄到日誌、API 回應洩漏不必要資訊

    審查原則：
    - 只報告真實的、可被利用的問題，避免誤報
    - 對每個發現提供具體的攻擊場景描述
    - 提供安全的替代方案代碼示例
    - 嚴重程度標準：
      * Critical：可直接被外部攻擊者利用，無需特殊條件
      * Major：需要組合多個條件才能利用
      * Minor：最佳實踐問題，不易被直接利用
    """

    async def review(
        self,
        parsed_code: ParsedCodeDiff,
        pr_context: PRContext
    ) -> AgentReviewResult:
        # 第一步：快速預過濾——識別高風險檔案（避免對所有檔案都做 LLM 呼叫）
        risky_files = self._identify_risky_files(parsed_code)

        if not risky_files:
            return AgentReviewResult(
                agent_name=self.name,
                findings=[],
                coverage=1.0,
                message="未發現需要安全審查的高風險程式碼模式"
            )

        findings = []
        # 對高風險檔案進行深度 LLM 審查
        for file_batch in self._batch_files(risky_files, max_tokens_per_batch=3000):
            batch_findings = await self._review_batch(file_batch, pr_context)
            findings.extend(batch_findings)

        return AgentReviewResult(
            agent_name=self.name,
            findings=findings,
            coverage=len(risky_files) / max(len(parsed_code.files), 1),
            risky_files_count=len(risky_files)
        )

    def _identify_risky_files(self, parsed_code: ParsedCodeDiff) -> list[ParsedFile]:
        """快速識別需要深度安全審查的檔案（正則匹配，毫秒級）"""
        risky_patterns = [
            # 可能含有憑證
            (r"password|secret|api_key|token|private_key|credential", "credential_risk"),
            # SQL 相關
            (r"\bquery\b|\.execute\(|cursor\.|f\"SELECT|f'SELECT", "sql_injection_risk"),
            # 代碼執行
            (r"\beval\(|\bexec\(|subprocess\.|os\.system", "code_execution_risk"),
            # 檔案操作
            (r"open\(.*request\.|path\.join.*user", "path_traversal_risk"),
            # Web 輸入
            (r"request\.args\[|request\.form\[|request\.json", "input_validation_risk"),
        ]

        risky = []
        for file in parsed_code.files:
            file_risks = []
            for pattern, risk_type in risky_patterns:
                if re.search(pattern, file.added_content, re.IGNORECASE):
                    file_risks.append(risk_type)

            if file_risks:
                file.risk_types = file_risks
                risky.append(file)

        # 按風險數量排序，優先審查風險最多的檔案
        return sorted(risky, key=lambda f: len(f.risk_types), reverse=True)
  </code></pre>

  <h4>2. Performance Agent（效能審查）</h4>
  <pre data-lang="python"><code class="language-python">
class PerformanceReviewAgent(BaseReviewAgent):
    name = "performance_agent"
    timeout_seconds = 60

    SYSTEM_PROMPT = """
    你是一位效能優化專家，專注於發現生產環境中常見的效能瓶頸。
    你的任務是審查程式碼中可能在生產環境導致效能問題的模式。

    重點關注：
    1. N+1 查詢問題（在迴圈中執行資料庫查詢）
    2. 缺少分頁的大量資料查詢（SELECT * 沒有 LIMIT）
    3. 缺少快取的重複計算（相同查詢在一個請求中執行多次）
    4. O(n²) 或更高複雜度算法（當 n 可能很大時）
    5. 不必要的同步 I/O（應該使用 async/await 的地方）
    6. 記憶體洩漏風險（未關閉的連接、無限增長的列表）
    7. 不必要的資料載入（SELECT * 而非 SELECT 需要的欄位）

    評估標準：
    - 問題在什麼數據規模下會成為瓶頸（100條？10萬條？）
    - 具體的優化方案（提供優化後的代碼示例）
    - 預估的效能提升幅度（如：避免 N+1 可從 O(n) 降到 O(1) 的資料庫查詢）

    只報告真實可能在生產環境造成問題的模式，避免過度優化的建議。
    """
  </code></pre>

  <h4>3. Style Agent（程式碼風格）</h4>
  <pre data-lang="python"><code class="language-python">
class StyleReviewAgent(BaseReviewAgent):
    name = "style_agent"
    timeout_seconds = 30  # 樣式審查最簡單，30 秒應足夠

    SYSTEM_PROMPT = """
    你是一位資深工程師，負責審查程式碼風格和可維護性問題。

    重點關注：
    1. 命名規範（變數/函式/類別名稱是否清晰、符合語言慣例）
    2. 函式/方法過長（超過 50 行，建議拆分）
    3. 重複程式碼（DRY 原則違反）
    4. 缺少必要的錯誤處理
    5. Magic Number（硬編碼的數字，應改為具名常數）
    6. 過於複雜的條件表達式（應提取為具名函式）
    7. 缺少或不清楚的注釋（複雜邏輯缺少解釋）

    注意：
    - 樣式問題通常是 Minor，不要報 Critical 或 Major
    - 不要建議只是個人偏好的風格改動（如花括號位置）
    - 聚焦在影響可讀性和可維護性的問題
    """
  </code></pre>

  <h4>4. Logic Agent（邏輯正確性）</h4>
  <pre data-lang="python"><code class="language-python">
class LogicReviewAgent(BaseReviewAgent):
    name = "logic_agent"
    timeout_seconds = 90  # 邏輯審查需要較深的分析

    SYSTEM_PROMPT = """
    你是一位資深工程師，專注於發現程式碼中的邏輯錯誤和邊緣案例問題。

    重點關注：
    1. Off-by-one 錯誤（迴圈邊界、陣列索引）
    2. Null/None 未處理（可能導致 NullPointerException）
    3. 並發競態條件（Race Condition）：多個 goroutine/thread 同時修改共享狀態
    4. 整數溢出（當數字可能很大時）
    5. 不正確的錯誤處理（吞掉錯誤而非傳播）
    6. 不正確的非同步處理（忘記 await、Promise 未處理）
    7. 業務邏輯錯誤（根據函式名稱和注釋，實作是否與意圖一致）

    重要：
    - 邏輯問題通常是 Critical 或 Major
    - 需要說明問題在什麼情況下會觸發
    - 對於業務邏輯問題，如果不確定，標記為 "需要人工確認" 而非直接報告錯誤
    """

    async def review(
        self,
        parsed_code: ParsedCodeDiff,
        pr_context: PRContext
    ) -> AgentReviewResult:
        # 邏輯審查需要更多上下文：查看相關的現有程式碼（不只看 diff）
        enriched_files = await self._enrich_with_context(
            parsed_code.files,
            pr_context.repo,
            context_lines=20  # 每個變更的前後各 20 行
        )

        findings = []
        for file in enriched_files:
            if file.language in self.supported_languages:
                file_findings = await self._review_file_logic(file, pr_context)
                findings.extend(file_findings)

        return AgentReviewResult(agent_name=self.name, findings=findings)
  </code></pre>

  <h3>如何避免重複意見</h3>
  <p>多個 Agent 可能發現相同的問題，需要在 Agent 設計層面就減少重複：</p>

  <pre data-lang="python"><code class="language-python">
class AgentResponsibilityMatrix:
    """
    明確定義每個 Agent 的職責邊界，減少跨 Agent 的重複發現
    """

    # 每個問題類型的「主責 Agent」
    OWNERSHIP = {
        # 安全問題 → 只有 Security Agent 報告
        "sql_injection": "security_agent",
        "xss": "security_agent",
        "hardcoded_secret": "security_agent",
        "auth_bypass": "security_agent",

        # 效能問題 → 只有 Performance Agent 報告
        "n_plus_one": "performance_agent",
        "missing_pagination": "performance_agent",
        "unnecessary_recomputation": "performance_agent",

        # 邏輯問題 → 只有 Logic Agent 報告
        "null_pointer": "logic_agent",
        "race_condition": "logic_agent",
        "off_by_one": "logic_agent",

        # 風格問題 → 只有 Style Agent 報告
        "naming": "style_agent",
        "function_too_long": "style_agent",
        "duplicate_code": "style_agent",
    }

    def get_responsible_agents(self, finding_type: str) -> str:
        return self.OWNERSHIP.get(finding_type, "synthesis_agent")
  </code></pre>

  <h3>並行執行的超時設計</h3>
  <pre data-lang="python"><code class="language-python">
class ReviewAgentPool:
    """管理並行 Agent 執行，處理超時和部分失敗"""

    AGENT_TIMEOUTS = {
        "security_agent": 90,     # 安全審查較複雜，給更多時間
        "performance_agent": 60,
        "style_agent": 30,        # 樣式審查最快
        "logic_agent": 90
    }

    async def run_all(
        self,
        parsed_code: ParsedCodeDiff,
        pr_context: PRContext
    ) -> list[AgentReviewResult]:
        tasks = {}
        for agent in self.agents:
            timeout = self.AGENT_TIMEOUTS.get(agent.name, 60)
            tasks[agent.name] = asyncio.create_task(
                asyncio.wait_for(
                    agent.review(parsed_code, pr_context),
                    timeout=timeout
                )
            )

        results = []
        for name, task in tasks.items():
            try:
                result = await task
                results.append(result)
            except asyncio.TimeoutError:
                logger.warning(f"Agent '{name}' 審查超時，跳過")
                results.append(AgentReviewResult.timeout(agent_name=name))
            except Exception as e:
                logger.error(f"Agent '{name}' 執行失敗：{e}")
                results.append(AgentReviewResult.error(agent_name=name, error=str(e)))

        return results
  </code></pre>

  <callout-box type="warning" title="Agent Prompt 設計的關鍵原則">
    每個 Agent 的 System Prompt 必須明確界定「只報告屬於本 Agent 職責範圍的問題」。<br/>
    如果 Security Agent 的 Prompt 沒有這個限制，它可能同時報告安全問題和風格問題，導致最終報告中大量重複。<br/>
    解決方案：在每個 Agent 的 Prompt 末尾加入：<br/>
    「注意：你<strong>只</strong>負責報告 [X類型] 問題。效能問題、風格問題等其他類型的問題由其他專業 Agent 負責，請忽略不報。」
  </callout-box>
</section>

<section id="synthesis-agent">
  <h2>Synthesis Agent 合併意見</h2>
  <p>Synthesis Agent 的任務是將多個審查 Agent 的輸出整合為一個連貫、無重複、優先排序的最終審查報告。這是整個系統中最需要 LLM 能力的步驟。</p>

  <h3>合併策略：去重 → 優先排序 → 衝突解決</h3>
  <pre data-lang="python"><code class="language-python">
class SynthesisAgent:
    """
    合成 Agent：整合多個審查 Agent 的輸出
    使用更強的模型（GPT-4o）確保合成品質
    """

    async def merge(
        self,
        agent_results: list[AgentReviewResult],
        pr_context: PRContext,
        config: ReviewConfig
    ) -> FinalReview:
        # 1. 去重：找出多個 Agent 都發現的同一問題
        deduplicated = await self._deduplicate(agent_results)

        # 2. 嚴重程度過濾（根據配置）
        filtered = [
            f for f in deduplicated
            if self._meets_severity_threshold(f.severity, config.minimum_severity)
        ]

        # 3. 衝突解決：不同 Agent 對同一問題有不同嚴重度評估時，使用 LLM 仲裁
        resolved = await self._resolve_conflicts(filtered)

        # 4. 優先排序（Critical > Major > Minor，同級按 CVSS 分數排序）
        prioritized = self._prioritize(resolved, pr_context)

        # 5. 生成執行摘要（適合放在 PR Review 最上方）
        summary = await self._generate_executive_summary(prioritized, pr_context, agent_results)

        # 6. 計算整體評分
        score = self._calculate_review_score(prioritized)

        return FinalReview(
            findings=prioritized,
            summary=summary,
            score=score,
            has_critical_issues=any(f.severity == "critical" for f in prioritized),
            total_findings=len(prioritized),
            findings_by_severity={
                "critical": len([f for f in prioritized if f.severity == "critical"]),
                "major": len([f for f in prioritized if f.severity == "major"]),
                "minor": len([f for f in prioritized if f.severity == "minor"]),
            },
            agents_completed=[r.agent_name for r in agent_results if r.success],
            agents_timed_out=[r.agent_name for r in agent_results if r.timed_out]
        )

    async def _deduplicate(
        self,
        results: list[AgentReviewResult]
    ) -> list[Finding]:
        """去除重複發現（不同 Agent 發現了語意相同的問題）"""
        all_findings = []
        for result in results:
            all_findings.extend(result.findings)

        if len(all_findings) <= 1:
            return all_findings

        # 第一步：基於位置的精確去重（相同檔案+相同行號 = 重複）
        location_deduped = self._deduplicate_by_location(all_findings)

        # 第二步：使用 LLM 識別語意上重複的發現
        return await self._deduplicate_by_semantics(location_deduped)

    def _deduplicate_by_location(self, findings: list[Finding]) -> list[Finding]:
        """相同位置的發現，保留嚴重程度最高的"""
        location_map = {}
        for finding in findings:
            key = f"{finding.file_path}:{finding.line_number}"
            if key not in location_map:
                location_map[key] = finding
            else:
                # 保留嚴重程度更高的
                existing = location_map[key]
                severity_order = {"critical": 0, "major": 1, "minor": 2, "info": 3}
                if severity_order.get(finding.severity, 99) < severity_order.get(existing.severity, 99):
                    location_map[key] = finding

        return list(location_map.values())

    async def _deduplicate_by_semantics(self, findings: list[Finding]) -> list[Finding]:
        """語意去重：發現不同位置但描述相同問題的發現"""
        if len(findings) < 2:
            return findings

        findings_text = "\n".join(
            f"[{i}] Agent: {f.agent_name}, 位置: {f.file_path}:{f.line_number}, "
            f"問題: {f.title} - {f.description[:100]}"
            for i, f in enumerate(findings)
        )

        prompt = f"""
        以下是多個審查 Agent 的發現列表。請識別哪些發現在語意上描述了相同的問題。

        發現列表：
        {findings_text}

        以 JSON 格式回傳重複組。每組中 "keep" 是要保留的索引（通常選描述最詳細的），
        "duplicates" 是要刪除的索引：
        {{
            "duplicate_groups": [
                {{"keep": 0, "duplicates": [2, 5]}},
                ...
            ]
        }}

        如果沒有重複，回傳 {{"duplicate_groups": []}}。
        """
        response = await self.llm.complete(prompt, response_format={"type": "json_object"})
        duplicate_info = json.loads(response.content)

        to_remove = set()
        for group in duplicate_info.get("duplicate_groups", []):
            to_remove.update(group.get("duplicates", []))

        return [f for i, f in enumerate(findings) if i not in to_remove]

    async def _resolve_conflicts(self, findings: list[Finding]) -> list[Finding]:
        """
        衝突解決：當 Security Agent 說是 Critical，但 Logic Agent 說只是 Minor 時
        使用 LLM 進行仲裁，選擇更準確的嚴重程度
        """
        # 識別衝突：同一位置，不同嚴重程度
        # （通常在第一步去重後就已解決，這裡處理跨位置的概念性衝突）
        return findings  # 簡化：假設已通過位置去重解決大部分衝突

    def _prioritize(
        self,
        findings: list[Finding],
        pr_context: PRContext
    ) -> list[Finding]:
        """優先排序：Critical > Major > Minor，同級按影響面排序"""
        severity_order = {"critical": 0, "major": 1, "minor": 2, "info": 3}

        return sorted(
            findings,
            key=lambda f: (
                severity_order.get(f.severity, 99),
                # 同嚴重度：安全問題優先於效能問題優先於風格問題
                {"security_agent": 0, "logic_agent": 1, "performance_agent": 2, "style_agent": 3}.get(f.agent_name, 99),
                -f.cvss_score if f.cvss_score else 0,
                f.file_path
            )
        )

    async def _generate_executive_summary(
        self,
        findings: list[Finding],
        pr_context: PRContext,
        agent_results: list[AgentReviewResult]
    ) -> str:
        """生成 PR Review 的執行摘要"""
        critical_count = len([f for f in findings if f.severity == "critical"])
        major_count = len([f for f in findings if f.severity == "major"])
        minor_count = len([f for f in findings if f.severity == "minor"])

        completed_agents = [r.agent_name for r in agent_results if r.success]
        timed_out_agents = [r.agent_name for r in agent_results if r.timed_out]

        # 生成自然語言摘要
        summary_prompt = f"""
        以下是對 PR "{pr_context.title}" 的 AI 程式碼審查結果摘要。
        請生成一個簡潔的評審總結（不超過 200 字），說明主要發現和整體建議。

        審查統計：
        - Critical 問題：{critical_count} 個
        - Major 問題：{major_count} 個
        - Minor 問題：{minor_count} 個
        - 完成審查的 Agent：{', '.join(completed_agents)}
        {"- 超時未完成的 Agent：" + ", ".join(timed_out_agents) if timed_out_agents else ""}

        主要發現（最嚴重的 3 個）：
        {self._format_top_findings(findings[:3])}

        語氣：客觀、建設性、鼓勵開發者修復問題。
        """

        response = await self.llm.complete(summary_prompt, max_tokens=300)
        return response.content
  </code></pre>

  <h3>評分系統設計</h3>
  <p>提供一個量化的 Review Score，讓 PR 審查結果更直觀：</p>

  <pre data-lang="python"><code class="language-python">
class ReviewScorer:
    """
    計算 PR 的整體審查分數（0-100）
    用於 PR Dashboard 和趨勢分析
    """

    SEVERITY_DEDUCTIONS = {
        "critical": 25,   # 每個 Critical 扣 25 分
        "major": 10,      # 每個 Major 扣 10 分
        "minor": 2,       # 每個 Minor 扣 2 分
    }

    def calculate_review_score(self, findings: list[Finding]) -> ReviewScore:
        base_score = 100
        total_deduction = 0

        for finding in findings:
            deduction = self.SEVERITY_DEDUCTIONS.get(finding.severity, 0)
            total_deduction += deduction

        final_score = max(0, base_score - total_deduction)

        # 對應 GitHub Check 的結論
        if final_score >= 90:
            grade = "A"
            check_conclusion = "success"
        elif final_score >= 70:
            grade = "B"
            check_conclusion = "neutral"  # 有 Major 問題，但可以合併
        elif final_score >= 50:
            grade = "C"
            check_conclusion = "failure"  # 建議修復後再合併
        else:
            grade = "F"
            check_conclusion = "failure"  # 阻止合併

        return ReviewScore(
            score=final_score,
            grade=grade,
            check_conclusion=check_conclusion,
            summary=f"AI Review Score: {final_score}/100 ({grade})"
        )
  </code></pre>

  <h3>最終報告格式設計</h3>
  <pre data-lang="python"><code class="language-python">
def format_pr_review_summary(review: FinalReview, pr_context: PRContext) -> str:
    """
    格式化 PR Review 的整體摘要
    發布為 GitHub Review 的 body 部分
    """
    score_badge = {
        "A": "🟢",
        "B": "🟡",
        "C": "🟠",
        "F": "🔴"
    }.get(review.score.grade, "⚪")

    summary = f"""
## {score_badge} AI 程式碼審查報告

**評分：{review.score.score}/100 ({review.score.grade})**

{review.summary}

### 審查摘要

| 嚴重程度 | 數量 |
|----------|------|
| 🔴 Critical | {review.findings_by_severity['critical']} |
| 🟠 Major | {review.findings_by_severity['major']} |
| 🟡 Minor | {review.findings_by_severity['minor']} |

### 審查覆蓋範圍

完成審查的維度：{', '.join(review.agents_completed)}
"""

    if review.agents_timed_out:
        summary += f"\n⚠️ 以下審查因超時未完成：{', '.join(review.agents_timed_out)}\n"

    if review.has_critical_issues:
        summary += """
---
> ⛔ **此 PR 包含 Critical 問題，建議在合併前修復。**
> 如果你認為某個發現是誤報，請在評論中回覆 \`/false-positive [原因]\`。
"""

    summary += "\n---\n*由 AI Code Review Bot 自動生成。如有疑問，請聯繫 #ai-tools 頻道。*"

    return summary.strip()
  </code></pre>
</section>

<section id="github-integration">
  <h2>GitHub PR 整合設計</h2>
  <p>與 GitHub 的整合涉及 Webhook 接收、多個 API 的協同使用、速率限制管理、以及避免 Spam Comments 等工程細節。</p>

  <h3>GitHub Webhook 設計與驗證</h3>
  <pre data-lang="python"><code class="language-python">
from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
import hmac, hashlib

app = FastAPI()

@app.post("/webhooks/github")
async def handle_github_webhook(
    request: Request,
    background_tasks: BackgroundTasks
):
    # 1. 驗證 Webhook 簽名（防止偽造請求）
    signature = request.headers.get("X-Hub-Signature-256")
    body = await request.body()

    if not verify_signature(body, signature, GITHUB_WEBHOOK_SECRET):
        raise HTTPException(status_code=401, detail="Invalid signature")

    payload = await request.json()
    event_type = request.headers.get("X-GitHub-Event")
    delivery_id = request.headers.get("X-GitHub-Delivery")

    # 2. 防止重複處理（GitHub 可能在超時後重試）
    if await dedup_store.exists(delivery_id):
        return {"status": "already_processed", "delivery_id": delivery_id}
    await dedup_store.mark_processed(delivery_id, ttl_hours=24)

    # 3. 只處理 PR 相關事件
    if event_type != "pull_request":
        return {"status": "ignored", "reason": f"event '{event_type}' not handled"}

    action = payload.get("action")
    if action not in ["opened", "synchronize", "reopened", "labeled"]:
        return {"status": "ignored", "reason": f"action '{action}' not handled"}

    # 特殊處理：只有加上特定 label 才觸發
    if action == "labeled":
        label_name = payload.get("label", {}).get("name", "")
        if label_name != "ai-review":
            return {"status": "ignored", "reason": "label is not 'ai-review'"}

    # 4. 非同步觸發審查（立即回傳 200，GitHub 不用等待）
    pr_data = extract_pr_data(payload)
    background_tasks.add_task(
        code_review_orchestrator.review_pr,
        pr_data
    )

    return {"status": "accepted", "pr": pr_data.number, "delivery_id": delivery_id}

def verify_signature(body: bytes, signature: str, secret: str) -> bool:
    """驗證 GitHub Webhook 的 HMAC-SHA256 簽名"""
    if not signature or not signature.startswith("sha256="):
        return False
    expected = "sha256=" + hmac.new(
        secret.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
  </code></pre>

  <h3>GitHub Check Run API 整合</h3>
  <p>Check Run 讓 PR 界面顯示「AI Review 進行中/通過/失敗」的狀態，比只留評論更直觀：</p>

  <pre data-lang="python"><code class="language-python">
class GitHubCheckRunManager:
    """
    管理 GitHub Check Run 的完整生命週期：
    queued → in_progress → completed（success/failure/neutral）
    """

    async def create_in_progress(
        self,
        repo: str,
        head_sha: str
    ) -> int:
        """建立 Check Run，狀態設為 in_progress"""
        response = await self.http.post(
            f"https://api.github.com/repos/{repo}/check-runs",
            headers=self._headers(),
            json={
                "name": "AI Code Review",
                "head_sha": head_sha,
                "status": "in_progress",
                "started_at": datetime.utcnow().isoformat() + "Z",
                "output": {
                    "title": "AI 程式碼審查進行中...",
                    "summary": "正在分析程式碼變更，請稍候（預計 3 分鐘內完成）。"
                }
            }
        )
        return response.json()["id"]

    async def complete(
        self,
        repo: str,
        check_run_id: int,
        review: FinalReview
    ):
        """更新 Check Run 為完成狀態，附上審查結果"""
        conclusion = "failure" if review.has_critical_issues else (
            "neutral" if review.findings_by_severity.get("major", 0) > 0 else "success"
        )

        # 生成 Check Run 的 annotations（行內問題標記）
        annotations = []
        for finding in review.findings[:50]:  # GitHub 限制最多 50 個 annotations
            annotations.append({
                "path": finding.file_path,
                "start_line": finding.line_number,
                "end_line": finding.line_number,
                "annotation_level": {
                    "critical": "failure",
                    "major": "warning",
                    "minor": "notice"
                }.get(finding.severity, "notice"),
                "message": finding.description,
                "title": finding.title
            })

        await self.http.patch(
            f"https://api.github.com/repos/{repo}/check-runs/{check_run_id}",
            headers=self._headers(),
            json={
                "status": "completed",
                "conclusion": conclusion,
                "completed_at": datetime.utcnow().isoformat() + "Z",
                "output": {
                    "title": f"AI Review: {review.score.grade} ({review.score.score}/100)",
                    "summary": review.summary,
                    "annotations": annotations
                }
            }
        )
  </code></pre>

  <h3>PR Review API 整合（行內評論）</h3>
  <pre data-lang="python"><code class="language-python">
class GitHubPRReviewManager:
    """
    管理 GitHub PR Review 的發布，包含行內評論和整體摘要
    """

    async def submit_review(
        self,
        repo: str,
        pr_number: int,
        head_sha: str,
        final_review: FinalReview
    ):
        """
        提交完整的 PR Review：
        1. 每個 Finding 對應一個行內評論
        2. Review body 包含整體摘要和評分
        """
        # 生成行內評論
        comments = []
        for finding in final_review.findings:
            comment = self._format_inline_comment(finding)
            comments.append({
                "path": finding.file_path,
                "position": finding.diff_position,  # diff 中的行位置（不是絕對行號）
                "body": comment
            })

        # 決定 Review 類型
        if final_review.has_critical_issues:
            event = "REQUEST_CHANGES"  # 阻止合併（需要作者修復）
        elif final_review.findings_by_severity.get("major", 0) > 0:
            event = "COMMENT"         # 留評論但不阻止合併
        else:
            event = "APPROVE"         # 無 Critical/Major 問題，可以合併

        review_body = format_pr_review_summary(final_review, pr_context)

        await self.http.post(
            f"https://api.github.com/repos/{repo}/pulls/{pr_number}/reviews",
            headers=self._headers(),
            json={
                "commit_id": head_sha,
                "body": review_body,
                "event": event,
                "comments": comments[:32]  # GitHub 限制每次 Review 最多 32 個行內評論
            }
        )

        # 如果評論超過 32 個，分批發布
        if len(comments) > 32:
            await self._post_remaining_comments(repo, pr_number, head_sha, comments[32:])

    def _format_inline_comment(self, finding: Finding) -> str:
        """格式化行內評論（GitHub Markdown）"""
        severity_icons = {
            "critical": "🔴",
            "major": "🟠",
            "minor": "🟡",
            "info": "🔵"
        }
        icon = severity_icons.get(finding.severity, "⚪")

        comment = f"{icon} **[{finding.severity.upper()}] {finding.title}**\n\n"
        comment += f"{finding.description}\n\n"

        if finding.suggestion:
            comment += f"**建議修正：**\n{finding.suggestion}\n\n"

        if finding.code_example:
            lang = finding.language or "python"
            comment += f"**修正範例：**\n\`\`\`{lang}\n{finding.code_example}\n\`\`\`\n\n"

        if finding.references:
            comment += "**參考資料：**\n"
            for ref in finding.references[:3]:
                comment += f"- {ref}\n"

        comment += "\n---\n*由 AI Code Review 自動生成。如為誤報請回覆 \`/fp\`。*"
        return comment
  </code></pre>

  <h3>如何避免 Spam Comments</h3>
  <p>AI 審查系統最常見的使用者抱怨是「評論太多了，PR 界面被刷屏」。以下是避免 Spam 的設計策略：</p>

  <pre data-lang="python"><code class="language-python">
class SpamPreventionManager:
    """
    防止 AI 審查系統成為 Spam 機器人
    """

    async def should_post_review(
        self,
        repo: str,
        pr_number: int,
        new_review: FinalReview
    ) -> tuple[bool, str]:
        """
        決定是否發布新的審查，避免重複審查洗屏
        """
        # 1. 查看現有的 Bot Review
        existing_reviews = await self.github.list_pr_reviews(repo, pr_number)
        bot_reviews = [r for r in existing_reviews if r.user.login == BOT_USERNAME]

        if not bot_reviews:
            return True, "no_existing_review"

        latest_bot_review = bot_reviews[-1]

        # 2. 比較新舊審查的 findings
        old_findings = await self.get_review_findings(latest_bot_review.id)
        new_findings = new_review.findings

        # 如果發現的問題完全相同，不重複發布
        if self._findings_are_identical(old_findings, new_findings):
            return False, "identical_findings"

        # 如果新審查比舊審查少問題（開發者修復了問題），更新舊 Review 而非新增
        if len(new_findings) < len(old_findings):
            await self.github.dismiss_review(
                repo, pr_number, latest_bot_review.id,
                "開發者已修復部分問題，已更新審查結果。"
            )
            return True, "updated_after_fix"

        # 如果新增了問題（如新的 commit 引入了新問題），追加新 Review
        return True, "new_issues_found"

    async def update_or_create_review(
        self,
        repo: str,
        pr_number: int,
        head_sha: str,
        final_review: FinalReview
    ):
        """智慧決策：更新現有 Review 還是建立新 Review"""
        should_post, reason = await self.should_post_review(repo, pr_number, final_review)

        if not should_post:
            logger.info(f"PR #{pr_number}: 跳過重複審查（原因：{reason}）")
            return

        await self.pr_review_manager.submit_review(repo, pr_number, head_sha, final_review)

  </code></pre>

  <h3>GitHub API 速率限制管理</h3>
  <pre data-lang="python"><code class="language-python">
class GitHubRateLimitedClient:
    """
    GitHub API 客戶端，自動管理速率限制
    GitHub App 的速率限制：5000 requests/hour（比 OAuth Token 更高）
    建議使用 GitHub App 而非 Personal Access Token
    """

    def __init__(self, token: str):
        self.token = token
        self._remaining = 5000
        self._reset_time = None
        self._lock = asyncio.Lock()  # 防止並發請求同時觸發等待

    async def request(
        self,
        method: str,
        url: str,
        **kwargs
    ) -> dict:
        async with self._lock:
            await self._ensure_rate_limit_ok()

        response = await self.http.request(method, url, headers=self._headers(), **kwargs)

        # 從 response headers 更新速率限制資訊
        self._remaining = int(response.headers.get("X-RateLimit-Remaining", self._remaining))
        reset_timestamp = int(response.headers.get("X-RateLimit-Reset", 0))
        if reset_timestamp:
            self._reset_time = datetime.fromtimestamp(reset_timestamp)

        return response.json()

    async def _ensure_rate_limit_ok(self):
        """確保不超過速率限制"""
        BUFFER = 100  # 保留 100 個請求的緩衝

        if self._remaining < BUFFER and self._reset_time:
            wait_seconds = max(0, (self._reset_time - datetime.utcnow()).total_seconds())
            if wait_seconds > 0:
                logger.warning(
                    f"GitHub API 速率限制接近（剩餘：{self._remaining}），"
                    f"等待 {wait_seconds:.0f} 秒"
                )
                await asyncio.sleep(wait_seconds + 5)
                self._remaining = 5000  # 重置後假設恢復完整限制
  </code></pre>

  <callout-box type="tip" title="大型 PR 的處理策略">
    當 PR 包含超過 500 行變動時，需要特殊處理：<br/>
    1. <strong>Smart Sampling</strong>：優先審查高風險檔案（含安全關鍵關鍵字的檔案）和核心業務邏輯，而非隨機選取。<br/>
    2. <strong>漸進式審查</strong>：先發布「快速審查」（只包含 Critical 和 Major 問題），並在評論中說明「完整審查將在 5 分鐘內完成」，再在後台繼續，發布第二輪評論。<br/>
    3. <strong>增量審查</strong>：當 PR 更新時（synchronize 事件），只審查新增的 commit 而非整個 PR，大幅降低成本和時間。<br/>
    4. <strong>鼓勵拆分 PR</strong>：在評論中加入：「此 PR 變動 {n} 行，建議拆分為更小的 PR 以提高審查效果和可讀性。」
  </callout-box>
</section>
`,
} satisfies ChapterContent;
