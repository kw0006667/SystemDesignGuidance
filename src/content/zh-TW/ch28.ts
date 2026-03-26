import type { ChapterContent } from '../../types.js';

export default {
  title: 'Multi-Agent 系統的可靠性設計',
  content: `
<section id="output-validation">
  <h2>Agent 輸出驗證（Guardrails）</h2>
  <p>Guardrails（護欄）是 Multi-Agent 系統可靠性的第一道防線。由於 LLM 輸出本質上是不確定的，任何關鍵操作前都需要對 Agent 的輸出進行嚴格驗證，確保其符合預期的格式、語意和安全約束。沒有 Guardrails 的 Agent 系統就像沒有型別檢查的程式碼——在測試環境看起來沒問題，在生產環境就會以各種意想不到的方式出錯。</p>

  <arch-diagram src="./diagrams/ch28-agent-reliability.json" caption="Multi-Agent 可靠性架構：從輸出驗證到稽核日誌"></arch-diagram>

  <h3>Guardrails 的三層設計</h3>
  <p>一個完整的 Guardrails 系統由三個層次組成，從快速的結構驗證到深度的語意分析，形成遞進式的防護：</p>

  <ol>
    <li><strong>層次一：Schema Validation（結構驗證）</strong>：使用 Pydantic 或 JSON Schema 確保輸出的資料結構正確。這是最基礎也最快速的驗證，幾乎無額外 latency。</li>
    <li><strong>層次二：Semantic Validation（語意驗證）</strong>：使用規則引擎或小型 LLM 驗證輸出的內容是否符合業務邏輯約束（例如「不得做出未經授權的財務承諾」）。需要額外 100–500ms。</li>
    <li><strong>層次三：Safety Filter（安全過濾）</strong>：使用 Constitutional AI 或專門的安全分類器，過濾有害、偏見或違規內容。對高風險應用（醫療、金融、兒童）尤為重要。</li>
  </ol>

  <pre data-lang="python"><code class="language-python">
from pydantic import BaseModel, field_validator, Field
from typing import Literal
import re

# ============================================================
# 層次一：結構驗證（Pydantic Model）
# ============================================================

class EmailDraftOutput(BaseModel):
    """客服郵件草稿的強型別輸出格式"""
    subject: str = Field(..., min_length=5, max_length=200)
    body: str = Field(..., min_length=20, max_length=5000)
    tone: Literal["formal", "friendly", "apologetic"] = "formal"
    requires_human_review: bool = False
    reason_for_review: str | None = None

    @field_validator("body")
    @classmethod
    def body_must_not_contain_sensitive_info(cls, v: str) -> str:
        """確保郵件內容不包含敏感資訊"""
        patterns = [
            r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b",  # 信用卡號
            r"\b\d{3}-\d{2}-\d{4}\b",                          # SSN
        ]
        for pattern in patterns:
            if re.search(pattern, v):
                raise ValueError("郵件內容包含敏感資訊，請移除後重試")
        return v

    @field_validator("body")
    @classmethod
    def body_must_not_make_financial_promises(cls, v: str) -> str:
        """確保郵件不做出未授權的財務承諾"""
        promise_keywords = ["保證退款", "一定賠償", "承諾支付", "無條件退費"]
        for keyword in promise_keywords:
            if keyword in v:
                raise ValueError(f"郵件包含未授權的財務承諾：'{keyword}'")
        return v

# ============================================================
# 層次二：語意驗證（LLM-as-Judge）
# ============================================================

class SemanticValidator:
    def __init__(self, judge_llm):
        self.judge = judge_llm

    async def validate(
        self,
        output: str,
        criteria: list[str]
    ) -> dict:
        criteria_text = "\n".join(f"- {c}" for c in criteria)
        prompt = f"""
        請評估以下輸出是否符合所有驗證標準。
        對每個標準回答「通過」或「失敗」，並說明原因。

        待驗證輸出：
        {output}

        驗證標準：
        {criteria_text}

        以 JSON 格式回傳：
        {{
            "overall_pass": true,
            "criteria_results": [
                {{"criterion": "...", "pass": true, "reason": "..."}}
            ]
        }}
        """
        response = await self.judge.complete(prompt, temperature=0.0)
        return parse_json(response.content)

# ============================================================
# 層次三：安全過濾（Constitutional AI 原則）
# ============================================================

class SafetyFilter:
    """
    Constitutional AI 的三個核心原則：
    - Helpful（有幫助）：回應確實解決了使用者的問題
    - Harmless（無害）：不包含有害、歧視或危險內容
    - Honest（誠實）：不包含虛假宣稱，對不確定的內容標注不確定性
    """

    SAFETY_SYSTEM_PROMPT = """
    你是一個安全審查員。請評估以下 AI 回應是否符合 Helpful、Harmless、Honest 原則。
    特別注意：
    - 是否包含對特定族群的歧視性內容？
    - 是否包含可能導致實際傷害的建議（如醫療、法律誤導）？
    - 是否包含未加說明的確定性宣稱（當模型可能不確定時）？

    以 JSON 格式回傳評估結果：
    {{"safe": true, "violations": [], "severity": "none|low|medium|high"}}
    """

    async def check(self, content: str) -> dict:
        response = await self.safety_llm.complete(
            content,
            system_prompt=self.SAFETY_SYSTEM_PROMPT,
            temperature=0.0
        )
        return parse_json(response.content)

# ============================================================
# 組合：三層 Guardrails Pipeline
# ============================================================

class AgentOutputGuardrail:
    def __init__(
        self,
        schema_type: type[BaseModel],
        semantic_validator: SemanticValidator | None = None,
        safety_filter: SafetyFilter | None = None,
        semantic_criteria: list[str] | None = None
    ):
        self.schema_type = schema_type
        self.semantic_validator = semantic_validator
        self.safety_filter = safety_filter
        self.semantic_criteria = semantic_criteria or []

    async def validate(self, raw_output: str) -> dict:
        # 層次一：結構驗證
        try:
            parsed = self.schema_type.model_validate_json(raw_output)
        except Exception as e:
            return {
                "passed": False, "layer": "schema",
                "error": str(e),
                "action": "retry",
                "retry_hint": f"請確保輸出符合格式：{self.schema_type.model_json_schema()}"
            }

        # 層次二：語意驗證
        if self.semantic_validator and self.semantic_criteria:
            result = await self.semantic_validator.validate(
                raw_output, self.semantic_criteria
            )
            if not result["overall_pass"]:
                failed = [r for r in result["criteria_results"] if not r["pass"]]
                return {
                    "passed": False, "layer": "semantic",
                    "error": f"語意驗證失敗：{failed}",
                    "action": "retry"
                }

        # 層次三：安全過濾
        if self.safety_filter:
            safety = await self.safety_filter.check(raw_output)
            if not safety["safe"] and safety["severity"] in ("medium", "high"):
                return {
                    "passed": False, "layer": "safety",
                    "error": f"安全過濾攔截：{safety['violations']}",
                    "action": "reject"   # 安全問題直接拒絕，不重試
                }

        return {"passed": True, "parsed_output": parsed}
  </code></pre>

  <h3>NeMo Guardrails 架構簡介</h3>
  <p>NVIDIA 的 NeMo Guardrails 是一個開源框架，使用「Colang」宣告式語言定義對話護欄，能在不修改核心 LLM 邏輯的情況下為 Agent 添加護欄。其核心架構包含：</p>
  <ul>
    <li><strong>Input Rail</strong>：驗證和過濾使用者輸入，在進入 LLM 前攔截惡意或不當請求。</li>
    <li><strong>Output Rail</strong>：驗證 LLM 輸出，確保符合業務規則和安全標準。</li>
    <li><strong>Dialogue Rail</strong>：管理對話流程，防止 LLM 偏離預設的對話範疇（例如阻止客服 Bot 討論政治話題）。</li>
  </ul>

  <h3>驗證失敗時的處理策略</h3>
  <table>
    <thead>
      <tr><th>失敗類型</th><th>建議動作</th><th>最大重試次數</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>Schema 格式錯誤</td>
        <td>攜帶 retry_hint 重試（告知 LLM 正確格式）</td>
        <td>3 次</td>
      </tr>
      <tr>
        <td>語意驗證失敗</td>
        <td>攜帶失敗原因重試，或降級到人工處理</td>
        <td>2 次</td>
      </tr>
      <tr>
        <td>安全過濾攔截（低風險）</td>
        <td>重試（調整系統提示，強調安全約束）</td>
        <td>1 次</td>
      </tr>
      <tr>
        <td>安全過濾攔截（高風險）</td>
        <td>直接拒絕，記錄事件，通知安全團隊</td>
        <td>0 次</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="tip" title="Structured Output 優先策略">
    現代 LLM API 大多支援「Structured Output」模式（如 OpenAI 的 <code>response_format: {"type": "json_schema", "json_schema": ...}</code>），可在語言模型採樣層面強制輸出符合 JSON Schema 的格式，從根本上消除 Schema 驗證失敗。建議將 Structured Output 作為第一道防線，Pydantic 驗證作為雙重保險，語意驗證和安全過濾作為進階護欄。
  </callout-box>
</section>

<section id="hallucination-detection">
  <h2>Hallucination 偵測策略</h2>
  <p>Hallucination（幻覺）是指 LLM 生成了看起來合理但實際上不正確的資訊。在 Agent 系統中，幻覺的危害尤其嚴重：Agent 可能基於錯誤的「事實」執行後續的不可逆操作，造成業務損失或信任危機。</p>

  <h3>Hallucination 的三種分類</h3>

  <p><strong>1. Factual Hallucination（事實幻覺）</strong>：LLM 生成了與現實不符的具體事實，例如錯誤的數字、日期、人名或事件描述。這是最常見也最危險的類型。</p>
  <p><strong>2. Faithfulness Hallucination（忠實性幻覺）</strong>：在 RAG 場景中，LLM 的輸出與提供的 Context 文件不一致——LLM「發明」了 Context 中並不存在的資訊。</p>
  <p><strong>3. Completeness Hallucination（完整性幻覺）</strong>：LLM 省略了 Context 中存在的重要資訊，只呈現對其論點有利的部分，造成誤導性的片面回答。</p>

  <h3>偵測方法一：自我一致性（Self-Consistency Checking）</h3>
  <p>對同一個問題問 LLM 多次（提高溫度增加多樣性），如果不同次的回答不一致，代表 LLM 在「猜測」而非基於確定的知識：</p>

  <pre data-lang="python"><code class="language-python">
import asyncio
from collections import Counter

class SelfConsistencyChecker:
    """
    透過多次採樣偵測幻覺：高一致性 = 低幻覺風險
    適用於有明確答案的問題（是非題、數字、選擇題）
    不適用於開放式生成任務
    """

    async def check(
        self,
        prompt: str,
        llm,
        num_samples: int = 5,
        temperature: float = 0.8,
        consistency_threshold: float = 0.6
    ) -> dict:
        # 並行生成多個回答（節省時間）
        responses = await asyncio.gather(*[
            llm.complete(prompt, temperature=temperature)
            for _ in range(num_samples)
        ])

        answers = [self._extract_core_answer(r.content) for r in responses]
        most_common, count = Counter(answers).most_common(1)[0]
        consistency_ratio = count / num_samples

        return {
            "consensus_answer": most_common,
            "confidence": consistency_ratio,
            "is_reliable": consistency_ratio >= consistency_threshold,
            "all_answers": answers,
            "recommendation": (
                "高信心，可直接使用" if consistency_ratio >= 0.8 else
                "中等信心，建議附加來源引用" if consistency_ratio >= 0.6 else
                "低信心，建議人工確認或使用 RAG 補充"
            )
        }

    def _extract_core_answer(self, text: str) -> str:
        """提取回答的核心部分，忽略解釋和格式差異"""
        # 實作：使用正則或另一個 LLM 呼叫標準化答案格式
        return text.strip().lower()[:200]
  </code></pre>

  <h3>偵測方法二：NLI 引用驗證（Citation Verification）</h3>
  <p>在 RAG 場景中，使用 NLI（Natural Language Inference）模型驗證 LLM 的每個宣稱是否有 Context 文件支撐：</p>

  <pre data-lang="python"><code class="language-python">
class CitationVerifier:
    """
    使用 NLI 模型驗證 LLM 宣稱的來源
    NLI 模型判斷：premise（上下文）是否 entails（蘊含）hypothesis（宣稱）
    推薦模型：microsoft/deberta-v3-large-mnli（速度與精度的平衡）
    """

    def __init__(self, nli_model):
        self.nli = nli_model

    async def verify_claims(
        self,
        claims: list[str],
        context_chunks: list[str],
        entailment_threshold: float = 0.80
    ) -> list[dict]:
        results = []
        for claim in claims:
            supported_by = []
            for chunk in context_chunks:
                # NLI 三分類：entailment / neutral / contradiction
                nli_result = await self.nli.predict(
                    premise=chunk,
                    hypothesis=claim
                )
                if (nli_result["label"] == "entailment"
                        and nli_result["score"] >= entailment_threshold):
                    supported_by.append({
                        "chunk": chunk[:200] + "...",
                        "score": nli_result["score"]
                    })

            results.append({
                "claim": claim,
                "is_supported": len(supported_by) > 0,
                "supporting_evidence": supported_by,
                "verdict": "verified" if supported_by else "unverified",
                "risk_level": "low" if supported_by else "high"
            })

        return results
  </code></pre>

  <h3>偵測方法三：SelfRAG 架構（ISREL / ISSUP / ISUSE 評分）</h3>
  <p>SelfRAG（Asai et al., 2023）是一種讓 LLM 在生成過程中自我評估的架構，透過三個特殊評分 Token 控制生成品質：</p>

  <ul>
    <li><strong>ISREL（Is Relevant）</strong>：檢索到的文件是否與問題相關？不相關則捨棄。</li>
    <li><strong>ISSUP（Is Supported）</strong>：生成的宣稱是否有文件支撐？標記為「完全支撐 / 部分支撐 / 無支撐」。</li>
    <li><strong>ISUSE（Is Useful）</strong>：最終回答對使用者是否有用？用於在多個候選回答中選擇最佳的。</li>
  </ul>

  <callout-box type="info" title="SelfRAG 的實務考量">
    SelfRAG 需要使用特別訓練的模型（在訓練資料中包含這些特殊評分 Token），無法直接套用在標準 GPT-4 或 Claude 上。實務上常用的替代方案是「Reflection Prompting」：在 System Prompt 中要求 LLM 在生成後自我審查，標記哪些宣稱是確定的、哪些是推測的。雖然效果不如 SelfRAG 精確，但實現成本更低。
  </callout-box>

  <h3>實用的 Hallucination 減少策略</h3>
  <table>
    <thead>
      <tr><th>策略</th><th>原理</th><th>適用場景</th><th>成本</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>降低 Temperature</td>
        <td>減少採樣隨機性，讓模型趨向高機率輸出</td>
        <td>事實性問答，需要確定性回答</td>
        <td>零額外成本</td>
      </tr>
      <tr>
        <td>RAG Grounding</td>
        <td>為 LLM 提供最新、可信的外部知識，減少依賴參數記憶</td>
        <td>需要最新資訊或領域專業知識</td>
        <td>檢索成本 + 額外 Context Token</td>
      </tr>
      <tr>
        <td>Chain-of-Verification（CoVe）</td>
        <td>讓 LLM 先生成答案，再生成驗證問題，再逐一回答驗證問題</td>
        <td>複雜事實性問題，準確性要求高</td>
        <td>3–5 倍 Token 成本</td>
      </tr>
      <tr>
        <td>Self-Consistency</td>
        <td>多次採樣取多數答案</td>
        <td>有明確答案的問題</td>
        <td>N 倍 Token 成本（N = 採樣次數）</td>
      </tr>
    </tbody>
  </table>

  <p>偵測準確率與效能的取捨：在生產環境中，無法對每個 LLM 輸出都進行完整的 Hallucination 偵測（成本和延遲過高）。實務策略是根據輸出的「風險等級」選擇偵測強度：</p>
  <ul>
    <li><strong>低風險輸出</strong>（聊天回覆、草稿）：僅做 Schema 驗證，接受一定的幻覺風險。</li>
    <li><strong>中風險輸出</strong>（對外報告、客服回覆）：引用驗證 + 自我一致性（2–3 次採樣）。</li>
    <li><strong>高風險輸出</strong>（醫療建議、法律文件、金融分析）：全套偵測 + 人工審查。</li>
  </ul>
</section>

<section id="cost-control">
  <h2>Token Budget 管理與成本控制</h2>
  <p>在 Multi-Agent 系統中，多個 Agent 並行執行 LLM 呼叫，成本可能急速增長。一個沒有成本控制機制的系統，可能因為 Agent 進入無限循環、Context Window 持續膨脹或不必要的重試，在幾分鐘內消耗掉數十美元。</p>

  <h3>Token Budget 的三層設計</h3>

  <pre data-lang="python"><code class="language-python">
from dataclasses import dataclass, field
from collections import defaultdict

@dataclass
class TokenBudgetConfig:
    # ── 請求（Request）層次 ──────────────────────────────
    max_input_tokens_per_call: int  = 8_000    # 單次 LLM 呼叫的輸入 Token 上限
    max_output_tokens_per_call: int = 2_000    # 單次輸出 Token 上限

    # ── 會話（Session）層次 ──────────────────────────────
    per_session_token_limit: int    = 50_000   # 單個用戶會話的 Token 上限
    session_window_hours: int       = 24       # 會話窗口（滾動計算）

    # ── 用戶（User）層次 ─────────────────────────────────
    daily_user_token_limit: int     = 200_000  # 每個用戶每日上限
    monthly_user_token_limit: int   = 2_000_000

    # ── 預警閾值 ─────────────────────────────────────────
    warning_threshold: float = 0.75            # 達到 75% 時警告
    soft_cap_threshold: float = 0.90           # 達到 90% 時觸發 Checkpoint
    hard_cap_threshold: float = 1.0            # 達到 100% 時強制停止

@dataclass
class TokenUsage:
    total: int = 0
    by_agent: dict[str, int] = field(default_factory=dict)
    by_model: dict[str, int] = field(default_factory=dict)
    cost_usd: float = 0.0

class CostController:
    # 模型定價表（Input / Output，每 1M tokens，USD）
    MODEL_PRICING = {
        "gpt-4o-mini":           {"input": 0.15,  "output": 0.60},
        "gpt-4o":                {"input": 2.50,  "output": 10.0},
        "claude-3-5-haiku":      {"input": 0.80,  "output": 4.0},
        "claude-3-5-sonnet":     {"input": 3.00,  "output": 15.0},
        "claude-opus-4":         {"input": 15.0,  "output": 75.0},
    }

    def __init__(self, config: TokenBudgetConfig):
        self.config = config
        self._usage: dict[str, TokenUsage] = defaultdict(TokenUsage)

    def calculate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        pricing = self.MODEL_PRICING.get(model, {"input": 1.0, "output": 1.0})
        return (input_tokens * pricing["input"] + output_tokens * pricing["output"]) / 1_000_000

    def check_and_record(
        self,
        session_id: str,
        agent_id: str,
        model: str,
        input_tokens: int,
        output_tokens: int
    ) -> dict:
        """在 LLM 呼叫後記錄用量，並返回當前預算狀態"""
        cost = self.calculate_cost(model, input_tokens, output_tokens)
        usage = self._usage[session_id]
        usage.total += input_tokens + output_tokens
        usage.by_agent[agent_id] = usage.by_agent.get(agent_id, 0) + input_tokens + output_tokens
        usage.by_model[model] = usage.by_model.get(model, 0) + input_tokens + output_tokens
        usage.cost_usd += cost

        ratio = usage.total / self.config.per_session_token_limit

        return {
            "session_id": session_id,
            "total_tokens": usage.total,
            "cost_usd": round(usage.cost_usd, 4),
            "usage_ratio": ratio,
            "status": (
                "hard_cap"   if ratio >= self.config.hard_cap_threshold else
                "soft_cap"   if ratio >= self.config.soft_cap_threshold else
                "warning"    if ratio >= self.config.warning_threshold else
                "ok"
            )
        }
  </code></pre>

  <h3>模型路由策略（Semantic Router）</h3>
  <p>不同子任務對 LLM 能力的需求差異巨大。透過 Semantic Router，根據任務描述自動路由到最合適（通常是最便宜且足夠的）模型：</p>

  <pre data-lang="python"><code class="language-python">
class ModelRouter:
    """
    Semantic Router：根據任務複雜度和類型選擇模型
    目標：在不降低品質的前提下最大化成本效率
    """

    ROUTING_RULES = [
        {
            "name": "simple_classification",
            "description": "意圖識別、情感分類、簡單 Yes/No 判斷",
            "model": "gpt-4o-mini",
            "max_input_tokens": 2_000,
            "examples": ["判斷這則評論是正面還是負面", "這個請求屬於哪個類別"]
        },
        {
            "name": "standard_reasoning",
            "description": "RAG 問答、內容摘要、程式碼解釋、標準寫作",
            "model": "claude-3-5-sonnet",
            "max_input_tokens": 8_000,
            "examples": ["根據文件回答問題", "撰寫一封客戶郵件"]
        },
        {
            "name": "complex_planning",
            "description": "多步驟規劃、複雜推理、高風險決策、程式碼生成",
            "model": "claude-opus-4",
            "max_input_tokens": 20_000,
            "examples": ["設計系統架構", "制定市場進入策略"]
        }
    ]

    async def route(self, task_description: str, context_size: int) -> str:
        """根據任務描述選擇最適合的模型"""
        # 使用輕量模型做路由決策（不用強模型做路由）
        classification_prompt = f"""
        以下任務屬於哪個類別？
        - simple_classification：簡單分類或判斷
        - standard_reasoning：標準推理和生成
        - complex_planning：複雜規劃或高風險決策

        任務：{task_description}

        只回答類別名稱。
        """
        category = await self.routing_llm.complete(
            classification_prompt,
            model="gpt-4o-mini",  # 路由本身用最便宜的模型
            max_tokens=20
        )

        rule = next(
            (r for r in self.ROUTING_RULES if r["name"] == category.content.strip()),
            self.ROUTING_RULES[1]  # 預設 standard_reasoning
        )

        # Context 大小超過模型限制時，升級到更大的模型
        if context_size > rule["max_input_tokens"]:
            rule = self.ROUTING_RULES[2]  # complex_planning 有最大 context

        return rule["model"]
  </code></pre>

  <h3>Context Compression 技術</h3>
  <p>隨著 Agent 執行步數增加，Context Window 中累積的工具調用歷史和中間結果可能超過模型限制。三種主要的 Context Compression 技術：</p>

  <ul>
    <li><strong>重要性評分壓縮（Importance-based Pruning）</strong>：使用小型模型對每個 Context 片段評分，移除重要性低的歷史記錄。保留：最新 N 步、所有工具調用結果、關鍵決策點。</li>
    <li><strong>摘要壓縮（Summary Compression）</strong>：當 Context 超過閾值時，將早期的對話歷史摘要為 1–2 段文字，用摘要替換原始歷史。</li>
    <li><strong>KV Cache 共享</strong>：對於共享相同系統提示的多個 Agent，在 LLM 推理層面共享 Key-Value Cache，避免重複計算靜態部分的 attention。</li>
  </ul>

  <h3>Prompt 最佳化</h3>
  <p>System Prompt 的冗餘往往被忽視，但在大量 API 呼叫中積少成多：</p>
  <ul>
    <li>移除重複的說明（「請注意...」「重要提醒...」出現多次）。</li>
    <li>Few-shot 示例選擇：使用語意搜尋動態選取最相關的 2–3 個示例，而非固定放入 5–10 個示例。</li>
    <li>格式指令精簡：「以 JSON 格式回傳」比「請將你的回答以符合 RFC 7159 標準的 JSON 格式輸出，確保所有字串使用雙引號...」有效得多。</li>
  </ul>

  <h3>成本監控儀表板設計</h3>
  <p>一個實用的成本監控儀表板應包含以下維度：</p>
  <table>
    <thead>
      <tr><th>監控維度</th><th>關鍵指標</th><th>告警條件</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>按模型分組</td>
        <td>每個模型的 Token 用量和費用占比</td>
        <td>單一模型費用超過總費用 80%</td>
      </tr>
      <tr>
        <td>按功能分組</td>
        <td>每個 Agent 功能的平均成本</td>
        <td>單次任務成本超過基準值 3 倍</td>
      </tr>
      <tr>
        <td>按用戶分組</td>
        <td>高消費用戶排名，異常使用偵測</td>
        <td>單用戶單日消費超過 $50</td>
      </tr>
      <tr>
        <td>時間趨勢</td>
        <td>每小時/每日費用趨勢</td>
        <td>費用環比增長超過 50%</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="info" title="OpenAI API 成本計算示例">
    以一個典型的研究任務為例（使用 GPT-4o）：<br/>
    - Orchestrator 規劃：1 次呼叫 × 2,000 input + 500 output tokens = <strong>$0.0051</strong><br/>
    - 5 個 Worker 各執行 3 次工具調用：15 次 × 平均 3,000 input + 800 output tokens = <strong>$0.2325</strong><br/>
    - 結果整合和報告生成：1 次 × 6,000 input + 2,000 output tokens = <strong>$0.035</strong><br/>
    - <strong>總計：約 $0.27 / 任務</strong>（使用 GPT-4o-mini 可降至約 $0.016，節省 94%）<br/>
    關鍵洞察：Worker 的多次工具調用占總成本的 86%，是成本優化的首要目標。
  </callout-box>
</section>

<section id="audit-trail">
  <h2>Agent 行為稽核日誌</h2>
  <p>稽核日誌（Audit Trail）是 Multi-Agent 系統的「黑盒子」，記錄 Agent 的每一個動作和決策。在生產環境中，稽核日誌不只是除錯工具，更是合規要求、安全分析和模型行為研究的基礎設施。</p>

  <h3>Agent 稽核日誌的四層設計</h3>

  <ul>
    <li><strong>Input Log（輸入日誌）</strong>：記錄每次任務的原始輸入——使用者的請求內容、來源管道（API / UI / 自動觸發）、輸入時間戳和使用者 ID。這是追溯任何問題的起點。</li>
    <li><strong>Decision Log（決策日誌）</strong>：記錄 Orchestrator 和 Agent 的每個推理步驟——選擇了哪個工具、為什麼這麼選、當時的 Context 摘要。這是理解 Agent 行為的核心。</li>
    <li><strong>Tool Call Log（工具調用日誌）</strong>：記錄每次工具調用的完整細節——工具名稱、參數、回傳結果、調用耗時、是否成功。這是效能分析和錯誤定位的關鍵。</li>
    <li><strong>Output Log（輸出日誌）</strong>：記錄最終輸出、中間結果、Guardrails 驗證結果、以及任何被攔截的輸出（用於安全審查）。</li>
  </ul>

  <h3>不可篡改日誌的技術實現</h3>
  <p>稽核日誌必須是<strong>不可變的（Immutable）</strong>，一旦寫入就無法修改或刪除。Hash Chain 技術讓任何篡改都可以被偵測：</p>

  <pre data-lang="python"><code class="language-python">
import hashlib
import json
from datetime import datetime, timezone
from dataclasses import dataclass

@dataclass
class AuditEvent:
    """不可變稽核事件，使用 Hash Chain 確保完整性"""
    event_id: str
    timestamp: str           # ISO 8601 with timezone
    session_id: str
    agent_id: str
    task_id: str
    event_type: str          # "input" | "decision" | "tool_call" | "output" | "error"
    payload: dict
    previous_hash: str       # 前一個事件的雜湊（形成鏈條）
    hash: str = ""           # 本事件的雜湊（初始為空，計算後填入）

    def compute_hash(self) -> str:
        """計算 SHA-256 雜湊，包含前一個事件的雜湊，防止插入和篡改"""
        canonical = json.dumps({
            "event_id":      self.event_id,
            "timestamp":     self.timestamp,
            "session_id":    self.session_id,
            "agent_id":      self.agent_id,
            "event_type":    self.event_type,
            "payload":       self.payload,
            "previous_hash": self.previous_hash
        }, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

class ImmutableAuditLogger:
    """
    不可變稽核日誌器
    儲存後端選擇（按合規要求）：
    - 開發環境：本地 JSON Lines 檔案（append-only）
    - 生產環境：AWS CloudWatch Logs / Azure Monitor（managed append-only）
    - 高合規要求：AWS QLDB（量子帳本，政府級不可篡改）
    """

    def __init__(self, storage, pii_redactor):
        self.storage = storage         # AppendOnlyStorage 實例
        self.pii_redactor = pii_redactor
        self._last_hash: dict[str, str] = {}  # session_id → 最後一個事件的 hash

    async def log(
        self,
        session_id: str,
        agent_id: str,
        task_id: str,
        event_type: str,
        payload: dict
    ) -> AuditEvent:
        # PII 脫敏：在寫入前移除個人資訊
        sanitized_payload = self.pii_redactor.redact(payload)

        previous_hash = self._last_hash.get(session_id, "genesis_block")

        event = AuditEvent(
            event_id=generate_uuid(),
            timestamp=datetime.now(timezone.utc).isoformat(),
            session_id=session_id,
            agent_id=agent_id,
            task_id=task_id,
            event_type=event_type,
            payload=sanitized_payload,
            previous_hash=previous_hash
        )
        event.hash = event.compute_hash()

        # Append-only 寫入（底層儲存不允許 UPDATE 或 DELETE）
        await self.storage.append(event)
        self._last_hash[session_id] = event.hash

        return event

    async def verify_chain_integrity(self, session_id: str) -> dict:
        """驗證指定 session 的 Hash Chain 完整性"""
        events = await self.storage.get_session_events(session_id)
        previous_hash = "genesis_block"
        for event in events:
            expected_hash = event.compute_hash()
            if event.hash != expected_hash:
                return {
                    "valid": False,
                    "tampered_event_id": event.event_id,
                    "reason": "Hash 不符，事件可能被篡改"
                }
            previous_hash = event.hash
        return {"valid": True, "total_events": len(events)}
  </code></pre>

  <h3>PII 脫敏與選擇性記錄</h3>
  <p>稽核日誌與隱私保護是一對矛盾：日誌需要完整記錄，但不應該永久保存使用者的個人敏感資訊。實務策略：</p>

  <pre data-lang="python"><code class="language-python">
import re

class PIIRedactor:
    """
    個人識別資訊（PII）脫敏器
    在寫入稽核日誌前自動移除敏感資訊
    """

    PII_PATTERNS = [
        (r"\b[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}\b",      "[EMAIL]"),
        (r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b", "[CARD_NUM]"),
        (r"\b09\d{8}\b",                              "[PHONE_TW]"),
        (r"\b[A-Z]\d{9}\b",                           "[ID_TW]"),
        (r"(?i)(password|api_key|secret|token)\s*[:=]\s*\S+",  "[REDACTED_CRED]"),
    ]

    SENSITIVE_KEYS = {"password", "api_key", "secret_key", "token", "credit_card", "ssn"}

    def redact(self, payload: dict) -> dict:
        """遞歸脫敏整個 payload 字典"""
        result = {}
        for key, value in payload.items():
            if key.lower() in self.SENSITIVE_KEYS:
                result[key] = "[REDACTED]"
            elif isinstance(value, str):
                result[key] = self._redact_text(value)
            elif isinstance(value, dict):
                result[key] = self.redact(value)
            elif isinstance(value, list):
                result[key] = [
                    self.redact(item) if isinstance(item, dict)
                    else self._redact_text(item) if isinstance(item, str)
                    else item
                    for item in value
                ]
            else:
                result[key] = value
        return result

    def _redact_text(self, text: str) -> str:
        for pattern, replacement in self.PII_PATTERNS:
            text = re.sub(pattern, replacement, text)
        return text
  </code></pre>

  <h3>日誌的保留策略（合規要求）</h3>
  <table>
    <thead>
      <tr><th>法規 / 行業</th><th>最低保留期限</th><th>特殊要求</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>GDPR（歐盟）</td>
        <td>資料處理目的完成後刪除（通常 30–90 天）</td>
        <td>必須支援「被遺忘權」：應使用者請求刪除個人資料</td>
      </tr>
      <tr>
        <td>SOC 2 Type II</td>
        <td>1 年</td>
        <td>必須有存取控制和完整性驗證</td>
      </tr>
      <tr>
        <td>金融監管（台灣 FSC）</td>
        <td>5–7 年</td>
        <td>不可竄改，需要可查詢的索引</td>
      </tr>
      <tr>
        <td>醫療（HIPAA）</td>
        <td>6 年</td>
        <td>PHI（Protected Health Information）需要加密儲存</td>
      </tr>
    </tbody>
  </table>

  <h3>日誌分析應用</h3>
  <p>稽核日誌除了合規目的外，還有三個重要的工程應用：</p>
  <ul>
    <li><strong>異常偵測</strong>：監控工具調用失敗率、平均 Token 消耗、任務完成率的時序趨勢。異常的尖峰可能代表提示注入攻擊或模型退化。</li>
    <li><strong>效能分析</strong>：識別最耗時的工具調用和最昂貴的 Agent 類型，指導優化投資方向。</li>
    <li><strong>模型行為研究</strong>：從大量日誌中提取 Agent 的決策模式，識別系統性偏差（如特定類型任務的失敗率偏高），用於指導 Prompt 改進和模型微調。</li>
  </ul>

  <callout-box type="warning" title="稽核日誌的合規要求">
    在金融、醫療、法律等受監管行業，Agent 的稽核日誌可能是法規強制要求的項目。設計時需要考慮：<br/>
    <strong>保留期限</strong>：金融行業通常要求至少 7 年；GDPR 要求在目的完成後刪除，兩者可能衝突，需要法務確認。<br/>
    <strong>不可竄改性</strong>：考慮使用 AWS QLDB（量子帳本資料庫）或 Write-once S3 Object Lock，比自實現 Hash Chain 更可靠。<br/>
    <strong>存取控制</strong>：稽核日誌本身也需要 RBAC——工程師可以查詢，但不能修改；審計員可以讀取所有記錄；一般員工只能查詢自己的記錄。<br/>
    <strong>個資保護</strong>：日誌中的個人資訊需要符合 GDPR 的「被遺忘權」，這意味著需要設計「邏輯刪除」機制（以 token 替換 PII，而非刪除整個日誌記錄），以同時滿足日誌完整性和隱私要求。
  </callout-box>
</section>
`,
} satisfies ChapterContent;
