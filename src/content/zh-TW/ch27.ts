import type { ChapterContent } from '../../types.js';

export default {
  title: 'Multi-Agent 任務規劃與執行引擎',
  content: `
<section id="task-decomposition">
  <h2>Task Decomposition 策略</h2>
  <p>任務分解（Task Decomposition）是 Multi-Agent 系統的起點。當一個高層任務（如「分析競爭對手並產出市場報告」）被提交給系統時，需要先將其分解為具體、可執行的子任務，才能分配給各個 Agent。分解品質直接決定整個 Pipeline 的效率：分解得太粗，單一 Agent 無法處理；分解得太細，協調開銷反而超過執行本身。</p>

  <arch-diagram src="./diagrams/ch27-task-planning.json" caption="Multi-Agent 任務規劃引擎：從任務分解到 DAG 執行"></arch-diagram>

  <h3>Top-down 層次式分解（Hierarchical Decomposition）</h3>
  <p>層次式分解是最常用的策略，將任務遞歸分解為越來越小的子任務，直到每個子任務都可以被單一 Agent 在有限步驟內完成。這個策略的核心思想來自「目標樹（Goal Tree）」：根節點是最終目標，葉節點是可直接執行的原子任務。</p>

  <p>分解過程的關鍵參數：</p>
  <ul>
    <li><strong>最大深度（MAX_DEPTH）</strong>：通常 3 層已足夠，更深的分解往往帶來指數級的協調成本。</li>
    <li><strong>每層最大子任務數（MAX_SUBTASKS）</strong>：建議 2–7 個（Miller's Law），超過 7 個子任務會讓 Orchestrator 的上下文視窗負擔過重。</li>
    <li><strong>葉節點 Token 預算（LEAF_TOKEN_BUDGET）</strong>：一個原子任務預期消耗的 Token 上限，超過此閾值代表任務仍需繼續分解。</li>
  </ul>

  <pre data-lang="python"><code class="language-python">
from dataclasses import dataclass, field
from typing import Optional
import json

@dataclass
class TaskNode:
    id: str
    description: str
    level: int                              # 0 = 根任務，越大越細
    parent_id: Optional[str] = None
    children: list["TaskNode"] = field(default_factory=list)
    depends_on: list[str] = field(default_factory=list)  # 依賴的兄弟任務 ID
    can_parallelize: bool = True
    assigned_agent: Optional[str] = None
    status: str = "pending"                 # pending/ready/running/done/failed
    estimated_tokens: int = 0
    result: Optional[dict] = None

class HierarchicalDecomposer:
    """
    Top-down 層次式任務分解器：使用 LLM 將複雜任務遞歸分解
    分解策略：先廣度理解任務範疇，再逐層細化到可執行粒度
    """
    MAX_DEPTH = 3            # 最多分解 3 層
    MAX_SUBTASKS = 7         # 每層最多 7 個子任務（Miller's Law）
    LEAF_TOKEN_BUDGET = 2000 # 葉節點任務的預期 Token 消耗上限

    def __init__(self, llm, agent_capabilities: dict[str, str]):
        self.llm = llm
        self.agent_capabilities = agent_capabilities

    async def decompose(self, root_task: str) -> TaskNode:
        root = TaskNode(id="root", description=root_task, level=0)
        await self._recursive_decompose(root)
        return root

    async def _recursive_decompose(self, node: TaskNode) -> None:
        # 停止條件 1：已到最大深度
        if node.level >= self.MAX_DEPTH:
            await self._assign_agent(node)
            return
        # 停止條件 2：任務夠小，可以直接執行
        if await self._is_atomic(node.description):
            await self._assign_agent(node)
            return

        # 使用 LLM 分解任務，並要求明確標注依賴關係
        prompt = f"""
        請將以下任務分解為 2-{self.MAX_SUBTASKS} 個子任務。

        父任務：{node.description}
        可用 Agent 能力：{json.dumps(self.agent_capabilities, ensure_ascii=False)}
        當前分解層次：第 {node.level + 1} 層（最多 {self.MAX_DEPTH} 層）

        分解要求：
        1. 每個子任務必須有明確的輸入來源和輸出形式
        2. 清楚標注子任務間的依賴關係（depends_on 填入被依賴的子任務 id）
        3. 可以並行的任務設 can_parallelize: true
        4. 每個子任務應可由一個 Agent 在 10 步以內完成

        以 JSON 格式回傳：
        {{
            "subtasks": [
                {{
                    "id": "st_1",
                    "description": "...",
                    "depends_on": [],
                    "can_parallelize": true,
                    "estimated_agent_type": "search_agent"
                }}
            ],
            "decomposition_rationale": "為何這樣分解..."
        }}
        """
        response = await self.llm.complete(prompt)
        data = parse_json(response.content)

        for st in data["subtasks"][:self.MAX_SUBTASKS]:
            child = TaskNode(
                id=f"{node.id}_{st['id']}",
                description=st["description"],
                level=node.level + 1,
                parent_id=node.id,
                depends_on=[f"{node.id}_{dep}" for dep in st.get("depends_on", [])],
                can_parallelize=st.get("can_parallelize", True)
            )
            node.children.append(child)
            await self._recursive_decompose(child)

    async def _is_atomic(self, task_description: str) -> bool:
        """判斷任務是否足夠小，不需進一步分解"""
        prompt = f"""
        下面的任務是否可以由單一 AI Agent 在 10 個步驟以內完成？
        只回答 "yes" 或 "no"，不要解釋。

        任務：{task_description}
        """
        response = await self.llm.complete(prompt)
        return "yes" in response.content.lower()
  </code></pre>

  <h3>Bottom-up 任務發現（Bottom-up Task Discovery）</h3>
  <p>Top-down 分解假設我們事先知道任務的全貌，但在探索性任務（如「研究一個我不熟悉的新領域」）中，任務的子任務往往只有在執行過程中才能發現。Bottom-up 任務發現讓 Agent 在執行時動態識別並登記新的子任務：</p>

  <ul>
    <li><strong>Trigger</strong>：Agent 在執行過程中發現「需要先解決 X 才能繼續」，就向 Task Registry 登記新任務。</li>
    <li><strong>去重</strong>：Task Registry 使用語意相似度（Embedding 比對）避免重複登記功能相同的子任務。</li>
    <li><strong>優先序</strong>：新發現的子任務根據緊急度和依賴關係插入執行佇列。</li>
  </ul>

  <callout-box type="warning" title="子任務粒度的陷阱">
    任務粒度選擇是最常見的設計失誤：<br/>
    <strong>過細（Over-decomposition）</strong>：將「撰寫一段介紹文字」拆成「決定字數」「選擇語氣」「撰寫初稿」「修改初稿」四個任務。Orchestrator 需要四次 LLM 呼叫協調這些任務，遠比直接讓一個 Agent 完成更昂貴。<br/>
    <strong>過粗（Under-decomposition）</strong>：「完成整份市場報告」作為單一任務。Agent 需要超長的 Context Window 和無數步驟，容易在中途失敗且難以重試局部任務。<br/>
    <strong>黃金法則</strong>：一個葉節點任務應在 5–15 個 Agent 步驟內完成，消耗約 1,000–5,000 tokens。
  </callout-box>

  <h3>LLM 做任務規劃的 Prompt 工程</h3>
  <p>Prompt 的品質直接影響分解結果的品質。以下是一個針對「市場研究」任務優化的 System Prompt 設計示例：</p>

  <pre data-lang="python"><code class="language-python">
TASK_PLANNER_SYSTEM_PROMPT = """
你是一位專業的任務規劃師，擅長將複雜業務目標分解為清晰、可執行的子任務。

## 你的分解原則

**MECE 原則**（Mutually Exclusive, Collectively Exhaustive）：
- 子任務之間不重疊（沒有重複工作）
- 子任務合在一起能完整達成父任務（沒有遺漏）

**可執行性原則**：
- 每個子任務都有明確的「輸入」和「輸出」定義
- 輸出必須是可驗證的（文件、數據、決策，而非模糊的「理解」）

**依賴透明原則**：
- 明確標注哪些任務必須按順序執行，哪些可以並行
- 避免隱含的依賴關係（例如「任務 B 需要任務 A 的結果」但沒有標注）

## 你應該避免的分解方式

❌ 過度分解：不要將一個句子級別的操作拆成多個子任務
❌ 循環依賴：任務 A 依賴任務 B，任務 B 又依賴任務 A
❌ 不明確的輸出：「理解競爭對手」不是有效輸出，「列出競爭對手的 5 個核心功能和定價」才是
"""
  </code></pre>

  <h3>分解品質的評估</h3>
  <p>好的任務分解應滿足以下可量化標準：</p>
  <ul>
    <li><strong>完整性（Completeness）</strong>：所有子任務合在一起能完成父任務，沒有遺漏關鍵步驟。</li>
    <li><strong>無重疊（No Overlap）</strong>：子任務之間不重複執行相同工作，避免浪費。</li>
    <li><strong>可執行性（Executability）</strong>：每個葉節點任務都有明確的輸入格式和預期輸出形式。</li>
    <li><strong>適度粒度（Appropriate Granularity）</strong>：不過度分解（增加協調成本），也不欠缺分解（單一 Agent 無法處理）。</li>
    <li><strong>依賴清晰（Clear Dependencies）</strong>：所有依賴關係在分解時已明確標注，不存在隱含依賴。</li>
  </ul>
</section>

<section id="dag-execution-engine">
  <h2>DAG 任務編排引擎</h2>
  <p>DAG（Directed Acyclic Graph，有向無環圖）任務編排引擎負責管理任務的執行順序和並行化。它是 Multi-Agent 系統的「作業系統調度器」，需要在最大化並行效率的同時，正確處理依賴關係、失敗傳播和狀態持久化。</p>

  <h3>節點狀態機設計</h3>
  <p>DAG 中每個節點（任務）的生命週期由以下五個狀態組成：</p>

  <ul>
    <li><strong>PENDING</strong>：任務已建立，但依賴尚未滿足，等待中。</li>
    <li><strong>READY</strong>：所有依賴任務已完成，可以被調度執行。</li>
    <li><strong>RUNNING</strong>：任務正在被 Agent 執行中。</li>
    <li><strong>DONE</strong>：任務成功完成，結果已存入狀態儲存。</li>
    <li><strong>FAILED</strong>：任務執行失敗，下游依賴任務將被標記為 SKIPPED。</li>
  </ul>

  <pre data-lang="python"><code class="language-python">
from enum import Enum

class TaskStatus(Enum):
    PENDING  = "pending"   # 等待依賴完成
    READY    = "ready"     # 依賴已滿足，等待調度
    RUNNING  = "running"   # 執行中
    DONE     = "done"      # 成功完成
    FAILED   = "failed"    # 執行失敗
    SKIPPED  = "skipped"   # 因上游失敗而跳過

def get_valid_transitions() -> dict[TaskStatus, set[TaskStatus]]:
    """狀態機的合法轉換表"""
    return {
        TaskStatus.PENDING:  {TaskStatus.READY},
        TaskStatus.READY:    {TaskStatus.RUNNING},
        TaskStatus.RUNNING:  {TaskStatus.DONE, TaskStatus.FAILED},
        TaskStatus.DONE:     set(),          # 終態
        TaskStatus.FAILED:   set(),          # 終態
        TaskStatus.SKIPPED:  set(),          # 終態
    }
  </code></pre>

  <h3>拓撲排序實現（Kahn's Algorithm）</h3>
  <p>在啟動 DAG 執行前，需要先用拓撲排序驗證圖中無循環依賴，並計算每個節點的「入度（in-degree）」——即該節點依賴幾個其他節點。入度為 0 的節點即為初始的 READY 任務：</p>

  <pre data-lang="python"><code class="language-python">
from collections import deque, defaultdict

def topological_sort_kahn(tasks: list[TaskNode]) -> list[str]:
    """
    Kahn's Algorithm 拓撲排序
    - 返回合法執行順序（列表）
    - 如果有循環依賴，拋出 CycleError
    """
    # 建立鄰接表和入度表
    in_degree: dict[str, int] = {t.id: 0 for t in tasks}
    dependents: dict[str, list[str]] = defaultdict(list)  # 誰依賴我

    for task in tasks:
        for dep in task.depends_on:
            in_degree[task.id] += 1
            dependents[dep].append(task.id)

    # 將所有入度為 0 的任務加入初始佇列
    queue = deque([t.id for t in tasks if in_degree[t.id] == 0])
    execution_order = []

    while queue:
        task_id = queue.popleft()
        execution_order.append(task_id)

        # 更新依賴此任務的後繼節點的入度
        for dependent_id in dependents[task_id]:
            in_degree[dependent_id] -= 1
            if in_degree[dependent_id] == 0:
                queue.append(dependent_id)

    # 如果排序結果的任務數少於總任務數，代表有循環依賴
    if len(execution_order) < len(tasks):
        unresolved = [t.id for t in tasks if t.id not in execution_order]
        raise CycleError(f"偵測到循環依賴，涉及任務：{unresolved}")

    return execution_order
  </code></pre>

  <h3>並行執行的 Worker Pool 設計</h3>
  <p>並行執行引擎使用 asyncio 的 Semaphore 控制最大並發數，防止同時發起過多 LLM API 請求觸發 Rate Limit：</p>

  <pre data-lang="python"><code class="language-python">
import asyncio
from collections import defaultdict

class DAGExecutionEngine:
    """
    DAG 任務執行引擎：支援並行執行、依賴追蹤和失敗處理
    """

    def __init__(
        self,
        agent_pool,
        state_store,
        max_concurrent_tasks: int = 10
    ):
        self.agent_pool = agent_pool
        self.state_store = state_store
        # Semaphore 限制同時執行的任務數，避免打爆 LLM API Rate Limit
        self.semaphore = asyncio.Semaphore(max_concurrent_tasks)

    async def execute(self, dag: TaskNode) -> dict:
        """執行整個 DAG，回傳所有任務的結果"""
        all_tasks = self._flatten_dag(dag)

        # 先做拓撲排序，驗證無循環依賴
        try:
            topological_sort_kahn(all_tasks)
        except CycleError as e:
            raise DAGValidationError(str(e))

        # 建立依賴圖
        dependency_map: dict[str, list[str]] = {
            t.id: list(t.depends_on) for t in all_tasks
        }
        # 反向依賴圖：完成任務後，通知哪些任務可以 READY
        reverse_deps: dict[str, set[str]] = defaultdict(set)
        for task_id, deps in dependency_map.items():
            for dep in deps:
                reverse_deps[dep].add(task_id)

        results: dict[str, object] = {}
        pending = {t.id for t in all_tasks}
        running: set[str] = set()
        task_futures: dict[str, asyncio.Task] = {}

        while pending or running:
            # 找出所有依賴已滿足的 PENDING 任務
            ready = {
                t_id for t_id in pending
                if all(
                    dep in results and results[dep].success
                    for dep in dependency_map[t_id]
                )
            }

            # 啟動所有 READY 任務（受 Semaphore 限制）
            for task_id in ready - running:
                task = next(t for t in all_tasks if t.id == task_id)
                pending.discard(task_id)
                running.add(task_id)

                # 更新持久化狀態
                await self.state_store.update_status(task_id, TaskStatus.RUNNING)

                task_futures[task_id] = asyncio.create_task(
                    self._execute_with_semaphore(task, results)
                )

            if not task_futures:
                if pending:
                    raise DAGDeadlockError("DAG 陷入死鎖：有任務等待但無任務可啟動")
                break

            # 等待至少一個任務完成，不阻塞其他任務繼續啟動
            done, _ = await asyncio.wait(
                task_futures.values(),
                return_when=asyncio.FIRST_COMPLETED
            )

            for future in done:
                task_id = next(k for k, v in task_futures.items() if v == future)
                result = await future
                results[task_id] = result
                running.discard(task_id)
                del task_futures[task_id]

                # 持久化中間結果（支援從失敗點重啟）
                await self.state_store.save_result(task_id, result)

                if not result.success:
                    # 失敗傳播：標記所有下游任務為 SKIPPED
                    downstream = self._get_all_downstream(task_id, reverse_deps)
                    for ds_id in downstream:
                        pending.discard(ds_id)
                        results[ds_id] = TaskResult.skipped(
                            reason=f"上游任務 {task_id} 失敗"
                        )

        return results

    async def _execute_with_semaphore(self, task, completed_results: dict):
        async with self.semaphore:
            input_data = self._merge_dependency_outputs(task, completed_results)
            agent = await self.agent_pool.acquire(task.assigned_agent)
            try:
                return await agent.execute(input_data)
            finally:
                await self.agent_pool.release(agent)
  </code></pre>

  <h3>任務狀態持久化</h3>
  <p>為什麼需要持久化？Agent 任務可能執行數分鐘甚至數小時，中途伺服器重啟或網路中斷會導致所有進度丟失。持久化讓系統可以從失敗點繼續，而非從頭開始：</p>

  <table>
    <thead>
      <tr><th>持久化時機</th><th>儲存內容</th><th>用途</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>任務狀態變更時</td>
        <td>task_id → status（PENDING/RUNNING/DONE/FAILED）</td>
        <td>重啟後知道哪些任務已完成</td>
      </tr>
      <tr>
        <td>任務成功完成後</td>
        <td>task_id → result（JSON 序列化）</td>
        <td>下游任務可直接讀取，不重跑</td>
      </tr>
      <tr>
        <td>Checkpoint 時</td>
        <td>完整 Agent 狀態（memory, tool_history）</td>
        <td>支援精確的中斷點恢復</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="info" title="DAG 引擎的性能優化技巧">
    <strong>關鍵路徑分析（Critical Path Analysis）</strong>：計算 DAG 的最長路徑，優先調度關鍵路徑上的任務，可以最小化整體完成時間。<br/>
    <strong>結果快取</strong>：相同輸入的子任務結果快取到 Redis（TTL 1 小時），重試時不重複執行成功的任務。<br/>
    <strong>動態並發調整</strong>：監控 LLM API 的錯誤率，偵測到 429 Rate Limit 時自動降低 Semaphore 值。<br/>
    <strong>Agent 預熱</strong>：根據 DAG 結構預測即將執行的任務類型，提前載入對應的 Agent 系統提示。
  </callout-box>
</section>

<section id="dynamic-planning">
  <h2>Dynamic vs Static Planning</h2>
  <p>在設計 Multi-Agent 任務規劃系統時，一個關鍵決策是：應該「先規劃好整個計畫再執行（Plan-then-Execute）」，還是「邊執行邊調整計畫（ReAct / Dynamic Planning）」？這個選擇影響系統的靈活性、成本可預測性和使用者體驗。</p>

  <h3>靜態規劃（Plan-then-Execute）的本質</h3>
  <p>靜態規劃是一種「封閉世界假設（Closed World Assumption）」：在規劃階段，我們假設所有需要的資訊都已知，並據此生成完整的執行計畫。Orchestrator 先讓 LLM 生成完整的執行計畫（包含所有子任務和依賴關係），產生 DAG，然後交給執行引擎按序執行。</p>

  <p><strong>適用場景與優點：</strong></p>
  <ul>
    <li>可以事先進行成本估算（預計需要多少 tokens？多少費用？），讓使用者在開始前確認。</li>
    <li>使用者可以預覽執行計畫，在開始執行前修改或取消。</li>
    <li>執行引擎可以充分優化並行化，因為依賴關係在啟動前就已知。</li>
    <li>任務結構固定的情境（如每日報表生成、固定格式的資料處理流水線）尤為適用。</li>
  </ul>

  <p><strong>主要缺點：</strong></p>
  <ul>
    <li>計畫可能基於不完整的資訊。例如「分析競爭對手」的第一步可能發現競爭對手已被收購，整個計畫需要重做。</li>
    <li>環境變化（工具失敗、API 不可用、新資訊出現）時，整個靜態計畫可能失效。</li>
    <li>對開放式、探索性任務效果差——我們無法在未執行任何步驟前知道需要哪些步驟。</li>
  </ul>

  <h3>動態規劃（Dynamic / Adaptive Planning）的本質</h3>
  <p>動態規劃基於「開放世界假設（Open World Assumption）」：計畫是假設，執行結果是事實。每個步驟完成後，Agent 用新的事實更新計畫。這正是 ReAct（Reasoning + Acting）框架的核心：</p>

  <pre data-lang="python"><code class="language-python">
class DynamicPlanningOrchestrator:
    """
    動態規劃 Orchestrator：每個子任務完成後重新評估計畫
    實現 ReAct 範式：Reason → Act → Observe → Reason → Act → ...
    """

    def __init__(self, llm, agent_pool, token_budget: int = 200_000):
        self.llm = llm
        self.agent_pool = agent_pool
        self.max_token_budget = token_budget

    async def execute(self, goal: str, max_iterations: int = 20) -> dict:
        plan = await self._initial_plan(goal)
        executed_tasks = []
        total_tokens = 0

        for iteration in range(max_iterations):
            next_task = self._get_next_ready_task(plan, executed_tasks)

            if next_task is None:
                break  # 所有任務完成

            # Act：執行任務
            result = await self._execute_task(next_task)
            executed_tasks.append({"task": next_task, "result": result})
            total_tokens += result.tokens_used

            # 成本控制：預算耗盡時提前停止
            if total_tokens > self.max_token_budget:
                return {
                    "status": "budget_exceeded",
                    "partial_results": executed_tasks,
                    "tokens_used": total_tokens
                }

            # Observe + Reason：根據執行結果決定是否調整計畫
            if self._needs_replan(result, plan):
                replan_context = self._build_replan_context(
                    goal=goal,
                    original_plan=plan,
                    executed=executed_tasks,
                    trigger=result
                )
                plan = await self._replan(replan_context)

        return {
            "status": "completed",
            "results": executed_tasks,
            "tokens_used": total_tokens
        }

    def _needs_replan(self, result, plan) -> bool:
        """
        觸發計畫修訂的三種情況：
        1. 工具調用失敗，需要尋找替代路徑
        2. 執行結果揭示了新資訊，使後續計畫不再適用
        3. 成本超過預估的 50%，需要精簡計畫
        """
        if result.tool_call_failed and result.has_alternative_approach:
            return True
        if result.revealed_new_information:
            return True
        if result.actual_tokens > result.estimated_tokens * 1.5:
            return True
        return False
  </code></pre>

  <h3>動態規劃的開銷分析</h3>
  <p>動態規劃的最大代價是每次重新規劃都需要一次 LLM 呼叫，且這次呼叫需要完整的執行歷史作為 Context：</p>

  <table>
    <thead>
      <tr><th>規劃模式</th><th>LLM 呼叫次數（規劃部分）</th><th>Context 大小</th><th>靈活性</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>靜態規劃</td>
        <td>1 次（僅初始規劃）</td>
        <td>小（只有任務描述）</td>
        <td>低</td>
      </tr>
      <tr>
        <td>動態規劃（每步重規劃）</td>
        <td>N 次（每個任務後）</td>
        <td>大（累積執行歷史）</td>
        <td>高</td>
      </tr>
      <tr>
        <td>混合策略（條件觸發重規劃）</td>
        <td>1 + K 次（K 為觸發次數）</td>
        <td>中</td>
        <td>中高</td>
      </tr>
    </tbody>
  </table>

  <h3>案例：研究任務的動態規劃示例</h3>
  <p>假設目標是「研究台灣 EV 市場的競爭格局」：</p>
  <ol>
    <li><strong>初始計畫</strong>：搜尋主要 EV 品牌 → 分析市占率 → 比較定價策略 → 產出報告。</li>
    <li><strong>執行第一步</strong>：搜尋發現 BYD 剛宣布進入台灣市場（兩天前的新聞）。</li>
    <li><strong>觸發重規劃</strong>：<code>result.revealed_new_information = True</code>，原計畫沒有包含 BYD 的分析。</li>
    <li><strong>修訂計畫</strong>：增加「研究 BYD 在其他亞洲市場的策略」子任務，並調整後續分析框架。</li>
    <li><strong>繼續執行</strong>：基於修訂後的計畫完成研究，報告包含了最新的市場動態。</li>
  </ol>

  <callout-box type="tip" title="ReAct 中的動態規劃體現">
    ReAct 框架（Yao et al., 2022）是動態規劃的最著名實現。其核心在於讓 LLM 交替進行「Thought（推理）」和「Act（行動）」：每次行動後，LLM 觀察結果（Observation），再進行新一輪推理，決定下一步行動。這個過程本質上就是微粒度的動態規劃——每個 Agent 步驟後都在評估並調整後續計畫。在 Multi-Agent 系統中，Orchestrator 層面的動態規劃（決定調用哪個 Agent）和 Agent 內部的 ReAct（決定使用哪個工具）是兩個層次的動態規劃，共同構成系統的自適應能力。
  </callout-box>
</section>

<section id="checkpoint-design">
  <h2>人工介入點（Checkpoint）設計</h2>
  <p>Checkpoint 是在 Agent 執行流程中預設的「暫停點」，讓人類在關鍵決策點審查並確認是否繼續。良好的 Checkpoint 設計是 Agent 系統可信度的核心：它讓使用者保持控制感，同時不過度打擾自動化流程。</p>

  <h3>Checkpoint 的兩大分類</h3>

  <p><strong>資料 Checkpoint（Data Checkpoint）</strong>：在資料收集完成、準備轉入行動階段前暫停，讓使用者確認 Agent 的「理解」是否正確：</p>
  <ul>
    <li>展示 Agent 收集的資料摘要</li>
    <li>顯示 Agent 的推理過程和關鍵假設</li>
    <li>允許使用者修正理解偏差，再繼續</li>
  </ul>

  <p><strong>決策 Checkpoint（Decision Checkpoint）</strong>：在即將執行不可逆操作前強制暫停，讓使用者確認後果：</p>
  <ul>
    <li>刪除文件、資料庫記錄</li>
    <li>傳送郵件、通知、訊息</li>
    <li>執行支付、訂單確認</li>
    <li>修改外部系統（CRM、ERP）的資料</li>
  </ul>

  <h3>不可逆操作的識別與保護</h3>
  <p>系統需要維護一份「不可逆操作清單」，所有在此清單中的工具調用都必須經過 Checkpoint：</p>

  <pre data-lang="python"><code class="language-python">
from enum import Enum
from dataclasses import dataclass
from typing import Optional
import asyncio

class IrreversibilityLevel(Enum):
    REVERSIBLE    = "reversible"    # 可撤銷（如新增草稿）
    LOW_RISK      = "low_risk"      # 低風險不可逆（如發送內部通知）
    HIGH_RISK     = "high_risk"     # 高風險不可逆（如發送客戶郵件）
    CRITICAL      = "critical"      # 關鍵不可逆（如支付、刪除資料）

# 工具的不可逆程度定義
TOOL_IRREVERSIBILITY: dict[str, IrreversibilityLevel] = {
    "read_file":          IrreversibilityLevel.REVERSIBLE,
    "write_draft":        IrreversibilityLevel.REVERSIBLE,
    "send_internal_slack": IrreversibilityLevel.LOW_RISK,
    "send_customer_email": IrreversibilityLevel.HIGH_RISK,
    "delete_file":        IrreversibilityLevel.CRITICAL,
    "execute_payment":    IrreversibilityLevel.CRITICAL,
    "update_crm_record":  IrreversibilityLevel.HIGH_RISK,
}

class CheckpointType(Enum):
    PRE_EXECUTION    = "pre_execution"    # 執行前審查：展示完整計畫
    DATA_CHECKPOINT  = "data_checkpoint"  # 資料 Checkpoint：確認理解
    PRE_IRREVERSIBLE = "pre_irreversible" # 不可逆操作前
    COST_MILESTONE   = "cost_milestone"   # 成本里程碑

@dataclass
class CheckpointOption:
    label: str
    action: str       # "continue" | "modify" | "abort" | "pause"
    description: str

@dataclass
class Checkpoint:
    id: str
    type: CheckpointType
    title: str
    description: str
    risk_level: IrreversibilityLevel
    context: dict
    options: list[CheckpointOption]
  </code></pre>

  <h3>人工介入 UX 設計原則</h3>
  <p>Checkpoint 的通知設計需要遵循「最小打擾、清楚描述風險」的原則：</p>

  <ol>
    <li><strong>精簡呈現</strong>：使用者在手機上收到通知，必須在 30 秒內理解操作內容和風險。避免技術術語，使用業務語言。</li>
    <li><strong>風險視覺化</strong>：用顏色和圖示區分風險等級（紅色 = 關鍵，橙色 = 高風險，藍色 = 資訊確認）。</li>
    <li><strong>默認安全</strong>：超時未回應時，默認選擇最保守的選項（通常是「暫停」而非「繼續」）。</li>
    <li><strong>One-click 確認</strong>：低風險操作提供一鍵確認，高風險操作要求使用者輸入確認文字（如輸入「確認刪除」）。</li>
  </ol>

  <h3>Approval Workflow 系統架構</h3>

  <pre data-lang="python"><code class="language-python">
class CheckpointManager:
    def __init__(self, notification_service, state_store):
        self.notification_service = notification_service
        self.state_store = state_store

    def should_checkpoint(self, tool_name: str, risk_config: dict) -> bool:
        """判斷此工具調用是否需要 Checkpoint"""
        level = TOOL_IRREVERSIBILITY.get(tool_name, IrreversibilityLevel.LOW_RISK)
        min_level_for_checkpoint = risk_config.get(
            "min_checkpoint_level",
            IrreversibilityLevel.HIGH_RISK
        )
        return level.value >= min_level_for_checkpoint.value

    def create_irreversible_checkpoint(
        self,
        tool_name: str,
        tool_args: dict,
        business_description: str
    ) -> Checkpoint:
        """為不可逆操作建立 Checkpoint"""
        level = TOOL_IRREVERSIBILITY.get(tool_name, IrreversibilityLevel.LOW_RISK)

        return Checkpoint(
            id=generate_uuid(),
            type=CheckpointType.PRE_IRREVERSIBLE,
            title=f"即將執行：{business_description}",
            description=self._format_risk_description(tool_name, tool_args, level),
            risk_level=level,
            context={
                "tool_name": tool_name,
                "tool_args": self._redact_sensitive_args(tool_args),
                "what_happens_if_confirmed": business_description,
                "is_reversible": False,
                "estimated_impact": self._estimate_impact(tool_name, tool_args)
            },
            options=[
                CheckpointOption("確認執行", "continue", "執行此操作，操作完成後無法撤銷"),
                CheckpointOption("暫停等待", "pause", "暫停任務，稍後再決定"),
                CheckpointOption("取消整個任務", "abort", "終止目前整個 Agent 任務")
            ]
        )

    async def pause_and_wait(
        self,
        checkpoint: Checkpoint,
        timeout_minutes: int = 60
    ) -> dict:
        """
        非同步等待機制：暫停 Agent 執行並等待人工回覆
        Agent 的狀態被完整序列化到持久存儲，不佔用計算資源
        """
        # 1. 序列化 Agent 當前狀態（記憶體、工具歷史、Context）
        agent_snapshot_id = await self.state_store.save_agent_snapshot(
            checkpoint_id=checkpoint.id
        )

        # 2. 將 Checkpoint 狀態寫入持久化儲存（跨進程可見）
        await self.state_store.create_checkpoint(checkpoint, agent_snapshot_id)

        # 3. 透過多種渠道發送通知（根據使用者偏好設定）
        await self.notification_service.send(
            checkpoint=checkpoint,
            channels=["email", "slack", "in_app"],
            deep_link=f"https://app.example.com/checkpoints/{checkpoint.id}"
        )

        # 4. 輪詢等待回應（使用指數退避）
        wait_interval = 5   # 秒
        elapsed = 0
        while elapsed < timeout_minutes * 60:
            response = await self.state_store.get_checkpoint_response(checkpoint.id)
            if response:
                return response
            await asyncio.sleep(wait_interval)
            elapsed += wait_interval
            wait_interval = min(wait_interval * 1.5, 60)  # 最長每 60 秒輪詢一次

        # 5. 超時：自動選擇最保守動作
        return {
            "action": "abort",
            "reason": f"超過 {timeout_minutes} 分鐘未回應，任務已自動取消",
            "auto_responded": True
        }
  </code></pre>

  <h3>非同步等待機制的架構要點</h3>
  <p>讓 Agent 「暫停等待」而不消耗計算資源，需要以下設計：</p>

  <ul>
    <li><strong>狀態外部化</strong>：Agent 的完整狀態（記憶體、工具調用歷史、當前任務進度）必須序列化到外部持久存儲（如 Redis 或資料庫），進程可以安全終止。</li>
    <li><strong>Event-driven 恢復</strong>：使用者回應時，透過 Webhook 或消息佇列通知系統，系統從持久存儲中反序列化 Agent 狀態並繼續執行。</li>
    <li><strong>冪等性</strong>：恢復執行時，確保從 Checkpoint 繼續不會重複執行已完成的步驟。</li>
  </ul>

  <callout-box type="danger" title="Checkpoint 的反模式">
    <strong>過度 Checkpoint</strong>：每個工具調用都要人工確認。這讓系統幾乎沒有自主性，使用者體驗極差。原則上，一個完整任務的 Checkpoint 不超過 3 個。<br/>
    <strong>資訊不足的 Checkpoint</strong>：只顯示「是否繼續？」而不解釋將要發生什麼。使用者無法做出知情決策，最終要麼盲目確認，要麼拒絕所有操作。<br/>
    <strong>超時默認繼續</strong>：使用者忘記回應時，自動執行操作。這對不可逆操作而言是災難性的設計。應默認暫停或取消，而非繼續。
  </callout-box>

  <h3>LLM 成本預算管理</h3>
  <p>每個 Multi-Agent 任務都應該有明確的 Token Budget，防止因 Agent 進入無限循環或過度規劃而產生超額費用：</p>

  <pre data-lang="python"><code class="language-python">
from dataclasses import dataclass, field
from collections import defaultdict

@dataclass
class TokenBudget:
    total_tokens: int          # 整個任務的 token 上限（例：200,000）
    per_agent_tokens: int      # 單個 Agent 的 token 上限（例：20,000）
    per_llm_call_tokens: int   # 單次 LLM 呼叫的輸入 token 上限（例：8,000）
    warning_threshold: float = 0.75   # 達到 75% 時警告
    hard_stop_threshold: float = 1.0  # 達到 100% 時強制停止

class BudgetTracker:
    def __init__(self, budget: TokenBudget):
        self.budget = budget
        self.used_tokens: dict[str, int] = defaultdict(int)

    def record_and_check(self, agent_id: str, tokens: int) -> str:
        """記錄用量並返回狀態：'ok' | 'warning' | 'exceeded' | 'agent_limit'"""
        self.used_tokens[agent_id] += tokens
        total_used = sum(self.used_tokens.values())

        if total_used >= self.budget.total_tokens:
            return "exceeded"
        if self.used_tokens[agent_id] >= self.budget.per_agent_tokens:
            return "agent_limit"
        if total_used >= self.budget.total_tokens * self.budget.warning_threshold:
            return "warning"
        return "ok"

    def get_remaining(self, agent_id: str) -> int:
        total_used = sum(self.used_tokens.values())
        agent_used = self.used_tokens[agent_id]
        return min(
            self.budget.total_tokens - total_used,
            self.budget.per_agent_tokens - agent_used
        )
  </code></pre>

  <callout-box type="tip" title="成本預算設計建議">
    建議設置三個層次的保護：<br/>
    1. <strong>軟限制（Soft Limit，75%）</strong>：觸發 Checkpoint，讓使用者決定是否繼續或精簡計畫。<br/>
    2. <strong>硬限制（Hard Limit，100%）</strong>：強制停止，回傳已完成的部分結果。<br/>
    3. <strong>緊急限制（Emergency Limit，150%）</strong>：防止因計費延遲或 Bug 導致的失控消耗，觸發自動告警並通知工程師。
  </callout-box>
</section>
`,
} satisfies ChapterContent;
