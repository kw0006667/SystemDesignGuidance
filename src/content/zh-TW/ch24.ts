import type { ChapterContent } from '../../types.js';

export default {
  title: 'Multi-Agent 協作架構模式',
  content: `
<section id="why-multi-agent">
  <h2>為什麼需要 Multi-Agent？</h2>
  <p>單一 Agent 在面對複雜、長鏈任務時會遭遇根本性的瓶頸。理解這些瓶頸，是設計 Multi-Agent 系統的起點。</p>

  <h3>單一 Agent 的能力上限</h3>
  <p>單一 Agent 的根本限制來自兩個層面：</p>

  <h4>Context Window 的物理上限</h4>
  <p>GPT-4 的 context window 為 128K tokens，Claude 3.5 Sonnet 為 200K tokens，看起來很大，但複雜任務很快就會超越這個限制：</p>
  <ul>
    <li>分析 100 份財務報告（每份 10 頁 PDF），光文件本身就超過 500 萬 tokens。</li>
    <li>一個包含 30 個工具呼叫的 ReAct 循環，每步驟的 Thought/Observation 累積，可能消耗 80K tokens，占用了 60% 的 context。</li>
    <li>Context 越長，LLM 的注意力機制對早期內容的關注度越低（「Lost in the Middle」問題），導致遺忘早期步驟的關鍵資訊。</li>
  </ul>

  <h4>任務複雜度的瓶頸</h4>
  <p>除了 Context Window，任務的內在複雜度也限制了單一 Agent 的效果：</p>
  <ul>
    <li><strong>領域專業化不足</strong>：通用型 LLM 對所有任務表現「還可以」，但對特定任務（法律合規審查、資安漏洞分析、醫療診斷輔助）表現遠不如針對性調教的專門模型。</li>
    <li><strong>循序執行瓶頸</strong>：單一 Agent 只能依序執行工具呼叫。如果任務可以並行化（同時搜尋 10 個不同資料來源），單一 Agent 的延遲會線性增長。</li>
    <li><strong>錯誤傳播</strong>：在長鏈任務中，第 5 步的錯誤可能到第 20 步才被發現，此時已積累大量無效工作和費用。</li>
  </ul>

  <h3>Multi-Agent 的 4 個核心優勢</h3>

  <table>
    <thead>
      <tr><th>優勢</th><th>具體表現</th><th>架構實現</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>1. 克服 Context 限制</strong></td>
        <td>每個 Agent 只處理整體任務的一個子集，context 使用量大幅降低</td>
        <td>任務分解（Task Decomposition）+ 結果摘要傳遞</td>
      </tr>
      <tr>
        <td><strong>2. 技能專業化</strong></td>
        <td>每個 Worker Agent 針對特定領域調教，使用最適合的模型和 System Prompt</td>
        <td>Worker Agent 的角色隔離設計</td>
      </tr>
      <tr>
        <td><strong>3. 並行執行</strong></td>
        <td>無依賴關係的子任務可以同時執行，將 N 倍延遲降為接近 1 倍</td>
        <td>DAG 執行引擎 + 並行工具呼叫</td>
      </tr>
      <tr>
        <td><strong>4. 獨立驗證</strong></td>
        <td>多個 Agent 獨立處理相同問題，最後由 Synthesis Agent 對比結果，提升準確率</td>
        <td>Peer Review 模式 + Consensus 機制</td>
      </tr>
    </tbody>
  </table>

  <h3>何時不需要 Multi-Agent？</h3>
  <p>Multi-Agent 架構帶來的協調複雜度和額外 token 消耗是顯著的成本。以下情況應該選擇單一 Agent 或更簡單的方案：</p>

  <table>
    <thead>
      <tr><th>情境</th><th>建議方案</th><th>原因</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>任務在 10 步以內可以完成</td>
        <td>單一 ReAct Agent</td>
        <td>Multi-Agent 的協調開銷不值得</td>
      </tr>
      <tr>
        <td>固定的 N 步處理流程</td>
        <td>靜態 Pipeline（非 LLM 協調）</td>
        <td>靜態 Pipeline 更可預測、更便宜</td>
      </tr>
      <tr>
        <td>子任務無法被明確分解</td>
        <td>單一 Agent + 豐富工具</td>
        <td>強行分解會導致資訊碎片化</td>
      </tr>
      <tr>
        <td>低延遲要求（&lt; 5 秒）</td>
        <td>單一快速 Agent 或規則系統</td>
        <td>Multi-Agent 協調引入額外延遲</td>
      </tr>
      <tr>
        <td>團隊缺乏 Multi-Agent 運維經驗</td>
        <td>先用單一 Agent 驗證可行性</td>
        <td>過早引入複雜架構，除錯成本極高</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="warning" title="Multi-Agent 的隱藏成本">
    引入 Multi-Agent 架構後，token 消耗通常增加 2–5 倍（因為每次 Agent 間通訊都需要傳遞摘要和上下文）。在做架構決策前，先估算單一 Agent 是否真的無法完成任務，而非因為「看起來更專業」而引入不必要的複雜性。
  </callout-box>

  <arch-diagram src="./diagrams/ch24-multi-agent.json" caption="Multi-Agent 協作架構全景圖"></arch-diagram>

  <h3>Multi-Agent 系統的核心挑戰</h3>
  <table>
    <thead>
      <tr><th>挑戰</th><th>具體問題</th><th>應對策略</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>協調複雜度</td>
        <td>多個 Agent 如何分工？執行順序如何決定？</td>
        <td>Orchestrator 模式或 DAG 任務引擎</td>
      </tr>
      <tr>
        <td>通訊開銷</td>
        <td>Agent 間傳遞大量上下文，token 消耗倍增</td>
        <td>只傳遞必要摘要，不傳完整歷史</td>
      </tr>
      <tr>
        <td>失敗隔離</td>
        <td>一個 Agent 失敗如何不影響整體？</td>
        <td>每個 Agent 獨立重試，結果快取</td>
      </tr>
      <tr>
        <td>成本控制</td>
        <td>多個 Agent 並行執行，成本呈倍數增長</td>
        <td>Token Budget 分配，便宜模型優先</td>
      </tr>
      <tr>
        <td>一致性</td>
        <td>多個 Agent 的輸出如何合併？有衝突怎麼辦？</td>
        <td>Synthesis Agent 負責合併與仲裁</td>
      </tr>
    </tbody>
  </table>
</section>

<section id="orchestrator-worker">
  <h2>Orchestrator-Worker Pattern</h2>
  <p>Orchestrator-Worker（指揮者-工作者）是最常見的 Multi-Agent 架構模式，類似軟體工程中的 Master-Worker 或 Fan-out 模式。Orchestrator 負責任務分解與協調，Workers 負責執行具體子任務。</p>

  <h3>Orchestrator 的設計模式：靜態 vs 動態分工</h3>

  <p><strong>靜態分工（Static Decomposition）</strong>：Orchestrator 根據預定義的規則分配任務，不使用 LLM 做決策。適合任務結構固定的場景（如「永遠先讓 Research Agent 搜尋，再讓 Writer Agent 撰寫」）。</p>

  <p><strong>動態分工（Dynamic Decomposition）</strong>：Orchestrator 使用 LLM 分析輸入任務，動態決定如何分解和分配。更靈活，但更昂貴。</p>

  <pre data-lang="python"><code class="language-python">
class OrchestratorAgent:
    """
    指揮者 Agent：接收高層任務，分解並分派給 Worker Agents
    使用能力較強的模型（如 GPT-4o、Claude 3.5 Sonnet）
    """

    def __init__(self, worker_registry: WorkerRegistry, llm: LLM):
        self.workers = worker_registry
        self.llm = llm

    async def execute(self, task: Task) -> TaskResult:
        # 1. 動態任務分解：讓 LLM 決定如何分解任務
        decomposition_prompt = f"""
        任務：{task.description}
        可用的 Worker 及其能力：
        {self.workers.list_capabilities_as_text()}

        請將任務分解為子任務列表，要求：
        1. 每個子任務必須能被一個 Worker 在 10 步以內完成
        2. 明確標記哪些子任務可以並行執行
        3. 說明子任務之間的依賴關係

        以 JSON 格式回傳：
        {{
            "reasoning": "分解思路說明",
            "subtasks": [
                {{
                    "id": "st1",
                    "worker": "research_agent",
                    "input": "搜尋競爭對手產品定價資訊",
                    "depends_on": [],
                    "can_parallelize": true,
                    "priority": 1
                }},
                {{
                    "id": "st2",
                    "worker": "writer_agent",
                    "input": "根據 st1 的研究結果撰寫競爭分析報告",
                    "depends_on": ["st1"],
                    "can_parallelize": false,
                    "priority": 2
                }}
            ]
        }}
        """
        plan = await self.llm.complete(decomposition_prompt)
        subtasks = parse_subtasks(plan)

        # 2. 執行：按照依賴關係排程（並行執行無依賴的任務）
        results = {}
        async with asyncio.TaskGroup() as tg:
            for subtask in get_executable_subtasks(subtasks, results):
                tg.create_task(self._execute_subtask(subtask, results))

        # 3. 合併：將所有子任務結果合成最終答案
        return await self._synthesize(task, results)

    async def _execute_subtask(
        self,
        subtask: Subtask,
        results: dict
    ) -> None:
        worker = self.workers.get(subtask.worker)

        # 準備輸入：注入依賴任務的結果
        enriched_input = self._inject_dependencies(subtask, results)

        # 帶重試執行（Worker 可能因 LLM 限流而失敗）
        result = await retry_with_backoff(
            lambda: worker.execute(enriched_input),
            max_retries=3,
            exceptions=(AgentError, TimeoutError, RateLimitError)
        )
        results[subtask.id] = result

    async def _synthesize(self, task: Task, results: dict) -> TaskResult:
        """將所有子任務結果合成最終回答"""
        results_summary = "\n".join([
            f"子任務 {st_id}（{task.description}）：\n{result.summary}"
            for st_id, result in results.items()
            if result.success
        ])

        synthesis_prompt = f"""
        原始任務：{task.description}

        各子任務完成結果：
        {results_summary}

        請基於以上所有子任務的結果，合成一個完整、連貫的最終回答。
        """
        final_response = await self.llm.complete(synthesis_prompt)
        return TaskResult(
            content=final_response.content,
            subtask_results=results,
            total_tokens=sum(r.tokens_used for r in results.values())
        )
  </code></pre>

  <h3>Worker Agent 的隔離設計</h3>
  <p>Worker Agent 應遵循「單一職責原則（Single Responsibility Principle）」，每個 Worker 只做一件事，但做到極致。隔離設計的關鍵是確保 Worker 不能「越界」執行超出其角色範疇的操作：</p>

  <pre data-lang="python"><code class="language-python">
class ResearchWorkerAgent:
    """
    研究型 Worker：專門負責資訊搜尋與摘要
    隔離設計：只能使用搜尋工具，不能執行任何寫入操作
    """

    SYSTEM_PROMPT = """
    你是一位專業的研究分析師。
    你的唯一職責是搜尋和整理資訊，不執行任何其他操作。

    行為規範：
    - 只使用 search_web、search_knowledge_base、get_document 工具
    - 不能發送郵件、修改資料庫或呼叫第三方 API
    - 回傳結果必須包含信息來源
    - 如果找不到足夠的資訊，明確說明而非猜測

    回傳格式（必須嚴格遵循）：
    {
        "key_findings": ["找到的關鍵資訊 1", "關鍵資訊 2"],
        "sources": [{"title": "...", "url": "...", "relevance_score": 0.9}],
        "confidence": 0.85,
        "gaps": ["未能找到的資訊（如有）"]
    }
    """

    # Worker 工具集嚴格限制為只讀工具
    ALLOWED_TOOLS = ["search_web", "search_knowledge_base", "get_document"]

    def __init__(self, tool_registry: ToolRegistry, llm: LLM):
        # 只注入允許的工具，從架構層面防止越界
        self.tools = {
            name: tool_registry.get(name)
            for name in self.ALLOWED_TOOLS
        }
        self.llm = llm

    async def execute(self, input: WorkerInput) -> WorkerOutput:
        result = await react_loop(
            task=input.task,
            tools=self.tools,
            system_prompt=self.SYSTEM_PROMPT,
            max_steps=8,              # Worker 步驟上限比 Orchestrator 少
            token_budget=input.token_budget  # 尊重 Orchestrator 分配的預算
        )

        # 驗證輸出格式
        try:
            parsed = ResearchOutput.model_validate_json(result.content)
        except ValidationError:
            # 輸出格式不符，要求 LLM 重新格式化
            parsed = await self._reformat_output(result.content)

        return WorkerOutput(
            content=parsed.model_dump(),
            tokens_used=result.token_count,
            steps_taken=result.step_count
        )
  </code></pre>

  <h3>結果聚合策略</h3>
  <p>多個 Worker 完成後，Orchestrator 需要聚合結果。常見的聚合策略有三種：</p>

  <table>
    <thead>
      <tr><th>聚合策略</th><th>適用場景</th><th>實現方式</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>串接（Concatenation）</strong></td>
        <td>每個 Worker 貢獻不同部分（如報告的不同章節）</td>
        <td>按預定義順序合併輸出</td>
      </tr>
      <tr>
        <td><strong>投票（Voting）</strong></td>
        <td>多個 Worker 獨立回答同一問題，取多數意見</td>
        <td>多數決或加權投票</td>
      </tr>
      <tr>
        <td><strong>LLM 合成（LLM Synthesis）</strong></td>
        <td>Worker 輸出需要智慧整合和矛盾解決</td>
        <td>Synthesis Agent 負責合併和仲裁</td>
      </tr>
    </tbody>
  </table>

  <h3>失敗重試機制</h3>
  <pre data-lang="python"><code class="language-python">
async def retry_with_backoff(
    fn: Callable,
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    exceptions: tuple = (Exception,)
) -> Any:
    """指數退避重試，適用於 LLM API 呼叫和工具執行"""
    last_exception = None
    for attempt in range(max_retries):
        try:
            return await fn()
        except exceptions as e:
            last_exception = e
            if attempt == max_retries - 1:
                raise  # 最後一次仍失敗，向上拋出

            # 指數退避 + 隨機抖動（防止多個 Agent 同時重試）
            delay = min(base_delay * (2 ** attempt) + random.uniform(0, 1), max_delay)
            logger.warning(
                f"重試 {attempt + 1}/{max_retries}，等待 {delay:.1f}s，"
                f"原因：{type(e).__name__}: {e}"
            )
            await asyncio.sleep(delay)

    raise last_exception


class WorkerFailureHandler:
    """處理 Worker 失敗的降級策略"""

    async def handle_worker_failure(
        self,
        worker_name: str,
        error: Exception,
        subtask: Subtask
    ) -> FallbackResult:
        """決定失敗後的應對策略"""

        # 策略 1：切換到備用模型（如主模型限流時切換到備用模型）
        if isinstance(error, RateLimitError):
            backup_worker = self.get_backup_worker(worker_name)
            if backup_worker:
                logger.info(f"切換到備用 Worker：{backup_worker.name}")
                return await backup_worker.execute(subtask.input)

        # 策略 2：降級處理（使用更簡單但更可靠的方法）
        if isinstance(error, (TimeoutError, ContextLengthExceeded)):
            simplified_input = self.simplify_input(subtask.input)
            return await self.simple_worker.execute(simplified_input)

        # 策略 3：標記為可跳過（結果不影響最終輸出）
        if subtask.is_optional:
            return FallbackResult.skipped(
                reason=f"可選子任務跳過：{str(error)}"
            )

        # 策略 4：升級到 Orchestrator 決定
        raise WorkerPermanentFailure(
            worker=worker_name,
            subtask=subtask,
            error=error,
            message="Worker 無法恢復，需要 Orchestrator 介入"
        )
  </code></pre>

  <callout-box type="tip" title="何時不需要 Orchestrator？">
    如果你的任務是固定的 N 步驟（如：翻譯 → 校正 → 格式化），用靜態的 Pipeline 更簡單高效。Orchestrator 的價值在於「動態決策」——任務如何分解取決於輸入內容，而不是預先寫死的流程。如果你的 Orchestrator 每次都生成相同的計畫，說明你不需要動態 Orchestrator，靜態 Pipeline 足夠了。
  </callout-box>
</section>

<section id="pipeline-pattern">
  <h2>Pipeline Pattern（管道模式）</h2>
  <p>Pipeline Pattern 是最適合「輸出即輸入」場景的 Multi-Agent 架構：Agent A 的輸出直接成為 Agent B 的輸入，形成線性或分支的處理流程。這種模式最易於理解、測試和調試。</p>

  <h3>Pipeline Pattern vs Orchestrator Pattern 的差異</h3>
  <table>
    <thead>
      <tr><th>維度</th><th>Pipeline Pattern</th><th>Orchestrator Pattern</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>流程決策</td>
        <td>靜態——執行順序在設計時確定</td>
        <td>動態——Orchestrator 在運行時決定流程</td>
      </tr>
      <tr>
        <td>適用性</td>
        <td>固定流程的批次處理（如文件審查、翻譯流程）</td>
        <td>開放式任務（如研究、複雜問答）</td>
      </tr>
      <tr>
        <td>除錯難度</td>
        <td>低（流程可視化，每步驟輸出可檢查）</td>
        <td>高（動態流程難以預測）</td>
      </tr>
      <tr>
        <td>Token 消耗</td>
        <td>低（每步驟只傳遞必要資訊）</td>
        <td>高（Orchestrator 的規劃本身消耗 tokens）</td>
      </tr>
      <tr>
        <td>靈活性</td>
        <td>低（需要修改程式碼才能改變流程）</td>
        <td>高（可動態調整計畫）</td>
      </tr>
    </tbody>
  </table>

  <h3>線性 Pipeline 的錯誤傳播設計</h3>
  <p>線性 Pipeline 的最大挑戰是錯誤傳播：第 2 步的錯誤會影響第 3 步，第 3 步的錯誤又影響第 4 步，如同多米諾骨牌效應。解決方案是在每個步驟加入驗證和降級機制：</p>

  <pre data-lang="python"><code class="language-python">
from dataclasses import dataclass
from typing import TypeVar, Generic, Callable

T = TypeVar('T')

@dataclass
class PipelineStep(Generic[T]):
    name: str
    agent: BaseAgent
    input_transformer: Callable      # 轉換上一步的輸出為此步的輸入
    output_validator: Callable       # 驗證輸出格式和品質
    fallback_handler: Callable       # 失敗時的降級處理
    retry_config: RetryConfig
    is_required: bool = True         # False 表示此步驟失敗不阻斷 Pipeline

class SequentialPipeline:
    """循序管道：文件審查流程 = 解析 → 安全審查 → 效能審查 → 合併意見"""

    def __init__(self, steps: list[PipelineStep]):
        self.steps = steps

    async def run(self, initial_input: Any) -> PipelineResult:
        current_data = initial_input
        step_results = []

        for step in self.steps:
            # 1. 轉換輸入格式
            try:
                step_input = step.input_transformer(current_data)
            except Exception as e:
                return PipelineResult.failed(
                    failed_at=step.name,
                    error=f"輸入轉換失敗：{e}",
                    partial_results=step_results
                )

            # 2. 執行 Agent（帶重試）
            try:
                result = await retry_with_backoff(
                    lambda: step.agent.execute(step_input),
                    **step.retry_config.to_dict()
                )
            except Exception as e:
                if not step.is_required:
                    # 非必要步驟失敗：使用降級結果繼續
                    logger.warning(f"可選步驟 '{step.name}' 失敗，使用降級結果：{e}")
                    result = step.fallback_handler(current_data, e)
                else:
                    # 必要步驟失敗：中斷 Pipeline
                    # 記錄在哪一步失敗，支援從中間重啟
                    return PipelineResult.failed(
                        failed_at=step.name,
                        error=str(e),
                        partial_results=step_results,
                        resumable=True  # 標記為可從此步驟重啟
                    )

            # 3. 驗證輸出品質
            validation_result = step.output_validator(result)
            if not validation_result.passed:
                if step.is_required:
                    return PipelineResult.failed(
                        failed_at=step.name,
                        error=f"輸出驗證失敗：{validation_result.reason}"
                    )
                # 驗證失敗但非必要步驟：記錄警告並繼續
                logger.warning(
                    f"步驟 '{step.name}' 輸出品質較低：{validation_result.reason}"
                )

            step_results.append(StepResult(
                step=step.name,
                output=result,
                validation=validation_result,
                tokens_used=result.token_count
            ))
            current_data = result

        return PipelineResult.success(
            final_output=current_data,
            steps=step_results,
            total_tokens=sum(r.tokens_used for r in step_results)
        )
  </code></pre>

  <h3>Branching Pipeline（分支管道）</h3>
  <p>不是所有任務都需要相同的處理路徑。Branching Pipeline 根據中間結果動態選擇執行路徑：</p>

  <pre data-lang="python"><code class="language-python">
class BranchingPipeline:
    """
    分支管道：根據分類結果走不同處理路徑
    使用場景：客服工單 = 分類 → [技術支援路徑 | 退款路徑 | 一般諮詢路徑]
    """

    def __init__(
        self,
        classifier: BaseAgent,
        branches: dict[str, list[PipelineStep]],
        default_branch: str = "general"
    ):
        self.classifier = classifier
        self.branches = branches
        self.default_branch = default_branch

    async def run(self, input: Any) -> PipelineResult:
        # 第一步：分類
        classification = await self.classifier.execute(input)
        branch_key = classification.category

        # 選擇分支
        steps = self.branches.get(branch_key, self.branches[self.default_branch])
        logger.info(f"任務分類為 '{branch_key}'，執行對應分支（{len(steps)} 步）")

        # 在選定的分支中執行
        branch_pipeline = SequentialPipeline(steps)
        result = await branch_pipeline.run(input)
        result.metadata["branch"] = branch_key
        return result
  </code></pre>

  <h3>管道中的人工審核點（Human Review Gate）</h3>
  <p>在高風險的 Pipeline（如自動發布內容、財務處理）中，應在關鍵步驟前加入人工審核點：</p>

  <pre data-lang="python"><code class="language-python">
class HumanReviewGate(PipelineStep):
    """
    人工審核節點：在此步驟暫停 Pipeline，等待人類確認
    這是 Pipeline 中的 Human-in-the-loop 實現
    """

    async def execute(self, input: Any) -> Any:
        review_request = ReviewRequest(
            pipeline_name=self.pipeline_name,
            step_name=self.name,
            data_to_review=input,
            context=self._prepare_review_context(input),
            options=["approve", "reject", "request_revision"]
        )

        # 發送審核通知（Slack、Email、Web 介面）
        await self.notification_service.send_review_request(review_request)

        # 等待審核回應（設置超時）
        try:
            response = await asyncio.wait_for(
                self._poll_review_response(review_request.id),
                timeout=self.timeout_hours * 3600
            )
        except asyncio.TimeoutError:
            # 超時策略：根據配置決定是自動批准還是拒絕
            if self.timeout_action == "auto_approve":
                logger.warning(f"審核超時，自動批准（{self.name}）")
                return input
            else:
                raise ReviewTimeoutError(
                    f"人工審核超時（{self.timeout_hours} 小時），Pipeline 已暫停"
                )

        if response.action == "approve":
            return input
        elif response.action == "request_revision":
            # 允許審核者修改內容後繼續
            return response.revised_content
        else:
            raise ReviewRejectedError(
                f"人工審核拒絕：{response.rejection_reason}"
            )
  </code></pre>

  <callout-box type="info" title="Pipeline 模式的最佳實踐">
    <strong>中間結果快取</strong>：使用 Redis 快取每個步驟的輸出（以輸入的 hash 為 key），當某個步驟需要重試時，不需要從頭執行整個 Pipeline。<br/><br/>
    <strong>步驟獨立測試</strong>：每個 Pipeline 步驟應該有獨立的測試用例。先確保每個步驟單獨運作正確，再測試整合效果。<br/><br/>
    <strong>延遲分解監控</strong>：記錄每個步驟的執行時間，Pipeline 的瓶頸通常集中在一兩個步驟。識別瓶頸後，考慮為瓶頸步驟增加並行化或替換更快的模型。
  </callout-box>
</section>

<section id="agent-communication">
  <h2>Agent 間通訊協定設計</h2>
  <p>Agent 間的通訊設計直接影響系統的可維護性和擴展性。良好的通訊協定應該能夠支援同步呼叫（Orchestrator 等待 Worker 結果）和非同步事件（Agent 完成任務後發布事件），並提供完整的追蹤能力。</p>

  <h3>Agent 間訊息格式設計（JSON Schema）</h3>
  <pre data-lang="python"><code class="language-python">
from pydantic import BaseModel, Field
from enum import Enum
import uuid
from datetime import datetime

class MessageType(str, Enum):
    TASK_ASSIGNMENT = "task_assignment"     # Orchestrator → Worker
    TASK_RESULT = "task_result"             # Worker → Orchestrator
    TASK_PROGRESS = "task_progress"         # Worker → Orchestrator（進度更新）
    HUMAN_APPROVAL_REQUEST = "human_approval_request"
    HUMAN_APPROVAL_RESPONSE = "human_approval_response"
    AGENT_ERROR = "agent_error"
    HEARTBEAT = "heartbeat"                 # 健康檢查

class AgentMessage(BaseModel):
    """Agent 間通訊的標準訊息格式"""

    # 訊息元數據
    message_id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    type: MessageType
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    schema_version: str = "1.0"  # 用於向後相容性管理

    # 路由資訊
    sender_id: str      # 發送方 Agent ID
    receiver_id: str    # 接收方 Agent ID（"broadcast" 表示廣播）
    correlation_id: str  # 關聯 ID，用於追蹤整個任務鏈（所有相關訊息共用）
    reply_to: str | None = None  # 請求-回應模式中，指定回覆目標

    # 任務資訊
    task_id: str
    payload: dict  # 具體內容，根據 type 不同而不同

    # 成本追蹤（透過訊息聚合可以計算整個任務的總成本）
    tokens_consumed: int = 0
    model_used: str = ""
    execution_time_ms: int = 0

    # 錯誤資訊（僅 type=AGENT_ERROR 時填寫）
    error_code: str | None = None
    error_message: str | None = None
    is_retryable: bool = True
    suggested_retry_delay_ms: int = 1000


class TaskAssignmentPayload(BaseModel):
    """任務分派的 payload 格式"""
    task_description: str
    input_data: dict
    token_budget: int            # 分配給此 Worker 的 Token 預算
    deadline: datetime | None    # 任務截止時間（None 表示沒有截止）
    priority: int = Field(5, ge=1, le=10)  # 1（最高）到 10（最低）
    context_summary: str = ""   # Orchestrator 提供的背景摘要（避免 Worker 需要完整歷史）
    expected_output_schema: dict | None = None  # 期望的輸出格式


class TaskResultPayload(BaseModel):
    """任務結果的 payload 格式"""
    output: dict
    confidence: float = Field(..., ge=0.0, le=1.0)  # LLM 的置信度估計
    execution_time_ms: int
    steps_taken: int             # 執行了幾個 ReAct 步驟
    quality_metrics: dict = {}   # 品質指標（如搜尋召回率、摘要完整性）
  </code></pre>

  <h3>同步 vs 非同步通訊的選擇</h3>
  <table>
    <thead>
      <tr><th>模式</th><th>實作方式</th><th>適用場景</th><th>優缺點</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>直接呼叫（同步）</strong></td>
        <td>函式呼叫 / HTTP 請求 / gRPC</td>
        <td>Orchestrator 需要等待 Worker 結果；子任務在數秒內完成</td>
        <td>簡單直觀，但 Worker 阻塞時整個呼叫鏈被阻塞</td>
      </tr>
      <tr>
        <td><strong>訊息佇列（非同步）</strong></td>
        <td>Kafka / RabbitMQ / AWS SQS</td>
        <td>長時間任務（分鐘至小時）；解耦 Agent 生命週期</td>
        <td>高可靠性、可重播；但引入 Broker 複雜度</td>
      </tr>
      <tr>
        <td><strong>共享狀態（Shared Memory）</strong></td>
        <td>Redis / PostgreSQL / 分散式 KV</td>
        <td>多個 Agent 需要讀寫同一份任務狀態</td>
        <td>狀態可視化方便；但需要處理競態條件</td>
      </tr>
    </tbody>
  </table>

  <h3>Message Bus 設計</h3>
  <p>對於需要鬆耦合的 Multi-Agent 系統，Message Bus（訊息匯流排）模式讓 Agent 之間不需要直接知道彼此的存在：</p>

  <pre data-lang="python"><code class="language-python">
class AgentMessageBus:
    """
    Agent 訊息匯流排：實現 Pub/Sub 模式的 Agent 通訊
    使用 Redis Pub/Sub 作為底層傳輸（也可替換為 Kafka）
    """

    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        self._subscriptions: dict[str, list[Callable]] = {}

    async def publish(self, channel: str, message: AgentMessage) -> None:
        """發布訊息到指定頻道"""
        await self.redis.publish(
            channel,
            message.model_dump_json()
        )
        # 同時記錄到稽核日誌
        await self.audit_logger.log_message(message)

    def subscribe(self, channel: str, handler: Callable) -> None:
        """訂閱指定頻道的訊息"""
        if channel not in self._subscriptions:
            self._subscriptions[channel] = []
        self._subscriptions[channel].append(handler)

    async def start_listening(self) -> None:
        """開始監聽訂閱的頻道"""
        channels = list(self._subscriptions.keys())
        pubsub = self.redis.pubsub()
        await pubsub.subscribe(*channels)

        async for raw_message in pubsub.listen():
            if raw_message["type"] != "message":
                continue

            try:
                message = AgentMessage.model_validate_json(
                    raw_message["data"]
                )
                channel = raw_message["channel"].decode()

                # 執行所有訂閱此頻道的處理器
                for handler in self._subscriptions.get(channel, []):
                    asyncio.create_task(handler(message))
            except Exception as e:
                logger.error(f"處理訊息失敗：{e}")


# 使用範例
class WorkerAgent:
    def __init__(self, agent_id: str, bus: AgentMessageBus):
        self.agent_id = agent_id
        self.bus = bus

        # 訂閱發給自己的任務分派訊息
        bus.subscribe(f"agent:{agent_id}:tasks", self._on_task_assigned)

    async def _on_task_assigned(self, message: AgentMessage) -> None:
        """收到任務分派後執行並回報結果"""
        task = TaskAssignmentPayload(**message.payload)
        result = await self._execute_task(task)

        # 回報執行結果給 Orchestrator
        await self.bus.publish(
            f"agent:{message.sender_id}:results",
            AgentMessage(
                type=MessageType.TASK_RESULT,
                sender_id=self.agent_id,
                receiver_id=message.sender_id,
                correlation_id=message.correlation_id,
                task_id=message.task_id,
                payload=TaskResultPayload(
                    output=result.output,
                    confidence=result.confidence,
                    execution_time_ms=result.duration_ms,
                    steps_taken=result.steps
                ).model_dump()
            )
        )
  </code></pre>

  <h3>狀態共享 vs 訊息傳遞的設計原則</h3>
  <p>Agent 間的資訊交換有兩種根本模式，各有適用場景：</p>

  <ul>
    <li>
      <strong>狀態共享（Shared State）</strong>：所有 Agent 讀寫同一個中央狀態儲存（如 Redis Hash 或資料庫記錄）。優點是 Agent 可以隨時查詢最新狀態；缺點是需要處理並發寫入的競態條件，以及狀態爆炸（State Explosion）問題。
    </li>
    <li>
      <strong>訊息傳遞（Message Passing）</strong>：Agent 只通過訊息交換資訊，不共享可變狀態。更符合分散式系統的設計原則，但需要設計訊息格式和確保訊息傳遞的可靠性。
    </li>
  </ul>

  <p>對於大多數 Multi-Agent 系統，建議採用混合方式：<strong>任務分配和結果傳遞使用訊息傳遞</strong>（解耦），<strong>全局任務狀態使用共享儲存</strong>（方便監控和恢復）。</p>

  <callout-box type="warning" title="Peer-to-Peer 模式的風險">
    Peer-to-Peer（P2P）模式允許任意 Agent 互相呼叫，看似靈活，實際上在生產環境非常危險。沒有中心協調者，追蹤任務狀態、除錯問題、控制成本都會變得極困難。更嚴重的是，P2P 容易產生循環呼叫（Agent A 呼叫 Agent B，Agent B 又呼叫 Agent A），造成無限遞歸和費用失控。建議在大多數場景優先選擇 Orchestrator-Worker 或 Pipeline 模式，只在需要真正去中心化協作（如多 Agent 投票共識）時才謹慎使用 P2P，且必須加入循環偵測和最大跳數限制。
  </callout-box>
</section>
`,
} satisfies ChapterContent;
