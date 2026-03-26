import type { ChapterContent } from '../../types.js';

export default {
  title: '實戰：設計 AI 驅動的客服系統',
  content: `
<section id="customer-service-arch">
  <h2>整體架構設計</h2>
  <p>AI 驅動的客服系統是目前最廣泛落地的 Multi-Agent 應用場景之一。本章以「設計一個能處理 10,000 QPS、支援多語言、具備自動升級人工機制的 AI 客服系統」為題，帶你完整走過架構設計的全過程。</p>

  <h3>需求分析</h3>
  <p><strong>功能需求：</strong></p>
  <ul>
    <li>接收多渠道輸入（網頁聊天、LINE、WhatsApp、電話轉錄）</li>
    <li>識別使用者意圖，路由到對應的專業 Agent</li>
    <li>維護跨 Agent 的對話狀態</li>
    <li>必要時升級到人工客服，並完整交接對話記錄</li>
    <li>支援繁體中文、英文、日文三種語言</li>
  </ul>

  <p><strong>非功能需求：</strong></p>
  <ul>
    <li>P99 回應延遲 &lt; 3 秒（含 LLM 推理時間）</li>
    <li>可用性 99.9%（每月允許約 44 分鐘宕機）</li>
    <li>每次對話 Token 成本 &lt; $0.05</li>
    <li>支援 10,000 並發對話</li>
  </ul>

  <arch-diagram src="./diagrams/ch29-customer-service.json" caption="AI 客服系統整體架構圖"></arch-diagram>

  <h3>完整系統架構：五層設計</h3>
  <p>整個系統由五個水平層次構成，每層職責清晰，可以獨立擴展：</p>

  <h4>Layer 1：前端接入層（Front-end Chat Layer）</h4>
  <p>接入層負責統一多渠道的訊息格式，隱藏渠道差異：</p>
  <ul>
    <li><strong>網頁聊天</strong>：WebSocket 長連線，實現 Server-Sent Events 的流式回應</li>
    <li><strong>LINE / WhatsApp</strong>：Webhook 接收，透過各平台 API 回覆</li>
    <li><strong>電話轉錄</strong>：Twilio 語音轉文字後進入相同管道</li>
    <li><strong>API Gateway</strong>：統一鑑權、速率限制、訊息格式標準化</li>
  </ul>

  <h4>Layer 2：意圖分類與路由層（Intent &amp; Routing Layer）</h4>
  <p>這是整個系統的「大腦」，負責理解使用者意圖並做出路由決策。採用兩階段設計：</p>
  <ul>
    <li><strong>快速分類器</strong>（GPT-4o-mini）：200ms 內完成一級意圖分類，成本極低</li>
    <li><strong>精確路由器</strong>：根據分類結果選擇一個或多個專業 Agent，考慮 Agent 負載均衡</li>
  </ul>

  <h4>Layer 3：專業 Agent 群（Specialist Agent Pool）</h4>
  <p>每個 Agent 都有獨立的 System Prompt、工具集和知識庫：</p>
  <ul>
    <li><strong>訂單查詢 Agent</strong>：接入訂單系統 API，查詢訂單狀態、物流資訊</li>
    <li><strong>退款處理 Agent</strong>：判斷退款資格，執行退款工作流</li>
    <li><strong>技術支援 Agent</strong>：存取產品知識庫，解決技術問題</li>
    <li><strong>產品推薦 Agent</strong>：呼叫推薦 API，根據使用者歷史偏好推薦產品</li>
    <li><strong>情緒安撫 Agent</strong>：專門應對情緒激動的使用者，語氣調整為更溫和</li>
  </ul>

  <h4>Layer 4：知識庫管理層（Knowledge Base Layer）</h4>
  <p>知識庫是 Agent 回答問題的基礎。採用 RAG（Retrieval-Augmented Generation）架構：</p>
  <ul>
    <li><strong>文件處理管道</strong>：產品手冊、FAQ、政策文件 → 分塊（Chunking）→ 向量化（Embedding）→ 儲存到向量資料庫</li>
    <li><strong>即時檢索</strong>：Agent 回答前先檢索相關知識片段，加入 Prompt 中</li>
    <li><strong>知識庫版本控制</strong>：每次知識庫更新時，記錄版本和生效時間，支援回滾</li>
    <li><strong>知識庫評估</strong>：定期運行自動化測試集，確保知識庫更新不降低回答品質</li>
  </ul>

  <h4>Layer 5：CRM 整合層（CRM Integration Layer）</h4>
  <p>與 CRM 系統的深度整合是企業級客服系統的關鍵：</p>
  <ul>
    <li><strong>使用者歷史查詢</strong>：每次對話開始時，載入使用者的歷史購買記錄、過去投訴記錄</li>
    <li><strong>對話記錄同步</strong>：每輪 AI 對話都同步到 CRM，確保人工接手時有完整脈絡</li>
    <li><strong>VIP 識別</strong>：VIP 使用者觸發不同的路由規則（如直接接人工）</li>
    <li><strong>工單建立</strong>：需要後續跟進的問題自動建立 CRM 工單</li>
  </ul>

  <h3>核心架構：意圖分類 → 專業 Agent → 回應合成</h3>
  <p>整個系統的資料流如下：</p>
  <ol>
    <li><strong>輸入處理層</strong>：API Gateway 接收多渠道訊息，統一轉換為標準格式。</li>
    <li><strong>意圖分類器</strong>：使用小型、快速的分類模型（GPT-4o-mini）識別使用者意圖，在 200ms 內完成。</li>
    <li><strong>Agent 路由器</strong>：根據意圖分類結果，選擇一個或多個專業 Agent 處理請求。</li>
    <li><strong>專業 Agent 群</strong>：訂單查詢 Agent、退款處理 Agent、技術支援 Agent、產品推薦 Agent 各自具備特定的工具和知識。</li>
    <li><strong>回應合成器</strong>：如果涉及多個 Agent，由 Synthesis Agent 整合回應，確保語氣一致。</li>
    <li><strong>升級評估器</strong>：在每次回應後評估是否需要升級人工客服。</li>
  </ol>

  <pre data-lang="python"><code class="language-python">
class CustomerServiceOrchestrator:
    """
    客服系統主 Orchestrator
    負責協調整個對話流程
    """

    async def handle_message(
        self,
        message: UserMessage,
        session: ConversationSession
    ) -> AgentResponse:
        # 0. 載入 CRM 使用者資料（首次對話）
        if not session.user_profile_loaded:
            user_profile = await self.crm_client.get_user_profile(session.user_id)
            session.load_user_profile(user_profile)

        # 1. 意圖分類
        intent = await self.intent_classifier.classify(
            message=message.text,
            conversation_history=session.recent_turns(n=5),
            language=message.detected_language,
            user_context=session.user_profile  # CRM 上下文影響分類結果
        )

        # 2. 升級前置檢查（某些場景直接升級，不浪費時間讓 AI 處理）
        if self._must_escalate_immediately(intent, session):
            return await self._escalate_to_human(session, reason="immediate_escalation")

        # 3. Agent 路由（考慮 Agent 當前負載）
        agents = await self.router.get_agents_for_intent(
            intent=intent,
            load_balancing=True  # 根據各 Agent Pool 的負載動態分配
        )

        # 4. RAG 知識庫檢索（為 Agent 提供相關知識）
        relevant_knowledge = await self.knowledge_base.retrieve(
            query=message.text,
            intent=intent.secondary_category,
            top_k=5
        )

        # 5. 並行執行多個 Agent（如果需要多個領域的資訊）
        if len(agents) > 1:
            agent_results = await asyncio.gather(*[
                agent.handle(message, session, relevant_knowledge)
                for agent in agents
            ])
            response = await self.synthesis_agent.merge(agent_results, message)
        else:
            response = await agents[0].handle(message, session, relevant_knowledge)

        # 6. 更新對話狀態
        session.add_turn(
            user_message=message,
            agent_response=response,
            intent=intent,
            agents_used=[a.name for a in agents]
        )

        # 7. 異步同步到 CRM（不阻塞回應）
        asyncio.create_task(
            self.crm_client.sync_conversation_turn(session.session_id, message, response)
        )

        # 8. 升級評估
        escalation_decision = await self.escalation_evaluator.evaluate(
            session=session,
            latest_response=response
        )

        if escalation_decision.should_escalate:
            return await self._handle_escalation(session, escalation_decision)

        return response

    def _must_escalate_immediately(
        self,
        intent: Intent,
        session: ConversationSession
    ) -> bool:
        """某些場景應立即升級，不讓 AI 嘗試處理"""
        # 法律糾紛、威脅、緊急安全事故
        if intent.category in ["legal_threat", "safety_emergency"]:
            return True
        # VIP 使用者優先人工服務
        if session.user_profile and session.user_profile.tier == "vip":
            return True
        # 使用者本次已經被升級過一次後又返回 AI（避免重複循環）
        if session.has_been_escalated_before:
            return True
        return False
  </code></pre>

  <callout-box type="info" title="知識庫管理的關鍵決策">
    知識庫更新策略直接影響系統的回答品質。建議採用「藍綠知識庫」模式：<br/>
    1. 維護兩份向量索引（Current 和 Staging）<br/>
    2. 新知識先更新到 Staging，通過自動化品質評估後再切換為 Current<br/>
    3. 評估方式：使用標準測試集（100+ 個問答對）計算 Recall@5 和 Answer Relevance<br/>
    4. 若新知識庫評分低於當前版本，自動拒絕更新並告警
  </callout-box>
</section>

<section id="intent-routing">
  <h2>Intent Routing 設計</h2>
  <p>Intent Routing 是 AI 客服系統的核心功能。準確的意圖識別是後續一切的基礎——錯誤的路由意味著使用者被送到了錯誤的 Agent，浪費時間且使用者體驗差。</p>

  <h3>意圖分類的兩種技術路線</h3>

  <h4>方案一：Fine-tuned Classifier（微調分類器）</h4>
  <p>使用少量標注資料（數百到數千條）微調一個小型語言模型（如 BERT、RoBERTa），專門用於意圖分類。</p>

  <table>
    <thead>
      <tr><th>指標</th><th>Fine-tuned Classifier</th><th>Prompt-based（GPT-4o-mini）</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>延遲</td>
        <td>10–50ms（本地部署）</td>
        <td>200–500ms（API 呼叫）</td>
      </tr>
      <tr>
        <td>成本</td>
        <td>固定（自建推理服務）</td>
        <td>按 Token 計費（約 $0.00005/次）</td>
      </tr>
      <tr>
        <td>準確率</td>
        <td>高（針對特定領域）</td>
        <td>高（通用能力強，但可能過度分析）</td>
      </tr>
      <tr>
        <td>更新難度</td>
        <td>需要重新訓練和部署</td>
        <td>修改 Prompt 即可</td>
      </tr>
      <tr>
        <td>適用場景</td>
        <td>固定意圖類別、高 QPS（&gt;1000/秒）</td>
        <td>意圖類別頻繁變化、中低 QPS</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="tip" title="混合方案：最佳實踐">
    實際系統中推薦混合方案：<br/>
    1. 先用 Fine-tuned Classifier 做快速的<strong>一級分類</strong>（訂單/帳單/技術/產品），準確率 &gt;95%，延遲 &lt;50ms<br/>
    2. 對於一級分類置信度低於 0.8 的情況，再呼叫 GPT-4o-mini 做<strong>精確二級分類</strong><br/>
    這樣可以在 90% 的情況下節省 LLM 呼叫，同時保持高準確率。
  </callout-box>

  <h3>多層次意圖分類架構</h3>
  <pre data-lang="python"><code class="language-python">
from pydantic import BaseModel

class IntentClassification(BaseModel):
    primary_category: str       # 一級分類：order/billing/technical/product
    secondary_category: str     # 二級分類：order_status/order_cancel/...
    confidence: float           # 0.0 - 1.0
    entities: dict              # 提取的實體（訂單號、產品名稱等）
    suggested_agents: list[str] # 推薦使用的 Agent
    needs_clarification: bool   # 是否需要向使用者澄清
    clarification_question: str # 如果需要澄清，建議的問題

class IntentClassifier:
    """
    兩階段意圖分類：先用快速分類器過濾，再用精確分類器細分
    """

    INTENT_TAXONOMY = {
        "order": ["order_status", "order_cancel", "order_modify", "order_return"],
        "billing": ["billing_inquiry", "refund_request", "payment_dispute"],
        "technical": ["product_defect", "installation_help", "connectivity_issue"],
        "product": ["product_inquiry", "product_comparison", "availability_check"],
        "general": ["complaint", "feedback", "policy_inquiry"]
    }

    # 置信度閾值：低於此值需要澄清
    CONFIDENCE_THRESHOLD = 0.7
    # 路由到人工的最低置信度
    HUMAN_FALLBACK_THRESHOLD = 0.4
    # 快速分類器的一級分類閾值
    FAST_CLASSIFIER_THRESHOLD = 0.8

    async def classify(
        self,
        message: str,
        conversation_history: list[Turn],
        language: str,
        user_context: UserProfile | None = None
    ) -> IntentClassification:
        # 第一階段：使用快速本地分類器（如果可用）
        if self.fast_classifier:
            fast_result = await self.fast_classifier.classify_primary(message)
            if fast_result.confidence >= self.FAST_CLASSIFIER_THRESHOLD:
                # 置信度足夠，在此基礎上做二級分類
                primary_category = fast_result.category
                # 只做二級分類，成本更低
                return await self._classify_secondary(
                    message, conversation_history, language,
                    primary_category, user_context
                )

        # 第二階段：完整 LLM 分類
        history_text = self._format_history(conversation_history)
        taxonomy_text = json.dumps(self.INTENT_TAXONOMY, ensure_ascii=False)

        user_context_text = ""
        if user_context:
            user_context_text = f"""
使用者資訊：
- 會員等級：{user_context.tier}
- 最近訂單：{user_context.recent_orders[:3]}
- 歷史問題類型：{user_context.past_issue_types}
"""

        prompt = f"""
        根據以下對話歷史和最新訊息，識別使用者的意圖。

        對話歷史：
        {history_text}

        最新訊息：{message}

        {user_context_text}

        意圖分類體系：
        {taxonomy_text}

        以 JSON 格式回傳分類結果，要求：
        1. primary_category 必須是上述體系中的一個一級分類
        2. secondary_category 必須是對應一級分類下的二級分類
        3. confidence 是你對此分類的置信度（0.0-1.0）
        4. entities 包含從訊息中提取的重要實體（如訂單號 "ORD-12345"）
        5. 如果意圖不清晰，將 needs_clarification 設為 true，並在 clarification_question 填入應向使用者詢問的問題
        """

        # 使用 GPT-4o-mini（快速且便宜，適合分類任務）
        response = await self.fast_llm.complete(
            prompt,
            response_format={"type": "json_object"},
            temperature=0.1  # 低溫度確保分類結果穩定
        )

        classification = IntentClassification.model_validate_json(response.content)

        # 低置信度處理
        if classification.confidence < self.HUMAN_FALLBACK_THRESHOLD:
            # 無法分類，標記為需要人工介入
            classification.suggested_agents = ["human_agent"]
            classification.needs_clarification = True
        elif classification.confidence < self.CONFIDENCE_THRESHOLD:
            # 需要向使用者澄清
            classification.needs_clarification = True

        return classification
  </code></pre>

  <h3>多意圖處理</h3>
  <p>使用者有時會在一條訊息中包含多個意圖，例如「我想查訂單狀態，如果貨還沒到我要申請退款」。這需要特殊處理：</p>

  <pre data-lang="python"><code class="language-python">
class MultiIntentHandler:
    """
    多意圖檢測與分解：將複合意圖分解為多個子意圖
    """

    async def detect_and_handle(
        self,
        message: str,
        session: ConversationSession
    ) -> MultiIntentResult:
        # 使用 LLM 判斷訊息是否包含多個意圖
        prompt = f"""
        分析以下使用者訊息，判斷是否包含多個不同的意圖。

        訊息：{message}

        如果包含多個意圖，列出每個意圖的核心問題。
        如果只有一個意圖，直接說明。

        以 JSON 格式回傳：
        {{
            "is_multi_intent": true/false,
            "intents": [
                {{"description": "意圖1的核心問題", "priority": 1}},
                {{"description": "意圖2的核心問題", "priority": 2}}
            ]
        }}
        """

        result = await self.llm.complete(prompt, temperature=0.1)
        parsed = json.loads(result.content)

        if not parsed["is_multi_intent"]:
            return MultiIntentResult(is_multi=False, primary_message=message)

        # 多意圖：按優先級排序，先處理最緊急的
        intents = sorted(parsed["intents"], key=lambda x: x["priority"])
        return MultiIntentResult(
            is_multi=True,
            sub_intents=intents,
            # 先回應第一個意圖，其餘的在後續輪次中處理
            primary_message=intents[0]["description"],
            deferred_intents=intents[1:]
        )
  </code></pre>

  <h3>信心閾值（Confidence Threshold）設計</h3>
  <p>信心閾值的設定需要在「誤路由率」和「澄清率」之間取得平衡：</p>

  <table>
    <thead>
      <tr><th>閾值設定</th><th>效果</th><th>使用者體驗</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>高閾值（0.9）</td>
        <td>頻繁向使用者澄清，誤路由率低</td>
        <td>使用者覺得 AI 很囉嗦，問太多問題</td>
      </tr>
      <tr>
        <td>低閾值（0.5）</td>
        <td>很少澄清，但誤路由率高</td>
        <td>使用者被送錯 Agent，需要重複說明</td>
      </tr>
      <tr>
        <td>動態閾值</td>
        <td>根據歷史誤路由率和使用者回饋動態調整</td>
        <td>最佳化使用者體驗</td>
      </tr>
    </tbody>
  </table>

  <pre data-lang="python"><code class="language-python">
class DynamicThresholdOptimizer:
    """
    動態調整信心閾值：根據實際業務數據自動最佳化
    """

    def calculate_optimal_threshold(
        self,
        routing_accuracy_by_threshold: dict[float, float],  # 閾值 → 路由準確率
        clarification_rate_by_threshold: dict[float, float],  # 閾值 → 澄清率
        business_weights: dict  # 業務權重：對準確率和澄清率的相對重要性
    ) -> float:
        """
        目標：在路由準確率和使用者體驗之間找到最佳平衡點

        F-score = (1 + beta^2) * precision * recall / (beta^2 * precision + recall)
        其中 beta 反映業務對精確率 vs 體驗的偏好
        """
        accuracy_weight = business_weights.get("accuracy", 0.7)
        experience_weight = business_weights.get("user_experience", 0.3)

        best_threshold = 0.7  # 預設值
        best_score = 0

        for threshold in sorted(routing_accuracy_by_threshold.keys()):
            accuracy = routing_accuracy_by_threshold[threshold]
            clarification_rate = clarification_rate_by_threshold[threshold]

            # 澄清率越低，使用者體驗越好
            experience_score = 1 - clarification_rate

            combined_score = (
                accuracy_weight * accuracy
                + experience_weight * experience_score
            )

            if combined_score > best_score:
                best_score = combined_score
                best_threshold = threshold

        return best_threshold
  </code></pre>

  <h3>Agent 路由表設計</h3>
  <pre data-lang="python"><code class="language-python">
class AgentRouter:
    """根據意圖分類結果，選擇最適合的 Agent 組合"""

    # 路由規則表：intent → agents
    ROUTING_RULES = {
        "order_status": ["order_agent"],
        "order_cancel": ["order_agent", "refund_agent"],    # 取消訂單需要兩個 Agent
        "refund_request": ["refund_agent"],
        "payment_dispute": ["billing_agent", "fraud_detection_agent"],
        "product_defect": ["technical_agent", "warranty_agent"],
        "product_inquiry": ["product_agent"],
        "complaint": ["sentiment_agent", "escalation_agent"]  # 投訴先評估情緒
    }

    async def get_agents_for_intent(
        self,
        intent: IntentClassification,
        load_balancing: bool = True
    ) -> list[BaseAgent]:
        agent_names = self.ROUTING_RULES.get(intent.secondary_category, ["general_agent"])
        agents = [self.agent_pool.get(name) for name in agent_names]

        if load_balancing:
            # 對同類型的 Agent Pool 進行負載均衡
            return [await self._select_least_loaded(agent) for agent in agents]

        return agents

    async def _select_least_loaded(self, agent: BaseAgent) -> BaseAgent:
        """選擇負載最輕的 Agent 實例（用於水平擴展的 Agent Pool）"""
        if not hasattr(agent, 'pool'):
            return agent  # 非 Pool 的 Agent，直接返回

        pool_instances = agent.pool.get_instances()
        loads = await asyncio.gather(*[inst.get_current_load() for inst in pool_instances])
        return pool_instances[loads.index(min(loads))]
  </code></pre>
</section>

<section id="context-management">
  <h2>對話狀態管理</h2>
  <p>在 AI 客服系統中，使用者可能與多個不同的 Agent 交互，Agent 之間需要共享完整的對話上下文，確保不讓使用者重複說明問題。</p>

  <h3>對話 Session 的資料結構</h3>
  <pre data-lang="python"><code class="language-python">
from dataclasses import dataclass, field
from datetime import datetime

@dataclass
class ConversationTurn:
    timestamp: datetime
    user_message: str
    agent_response: str
    intent: str
    agents_used: list[str]
    tokens_consumed: int
    sentiment_score: float    # -1.0（非常負面）到 1.0（非常正面）
    success: bool             # 使用者是否認為回應解決了問題

@dataclass
class ConversationSession:
    session_id: str
    user_id: str
    started_at: datetime
    channel: str               # "web_chat", "line", "whatsapp"
    language: str

    # 對話歷史
    turns: list[ConversationTurn] = field(default_factory=list)

    # 已解決的問題（不需要重複詢問的資訊）
    resolved_entities: dict = field(default_factory=dict)
    # 例如：{"order_id": "ORD-12345", "user_email": "user@example.com"}

    # 使用者偏好記憶（跨 Session 持久化）
    user_preferences: dict = field(default_factory=dict)
    # 例如：{"preferred_language": "zh-TW", "communication_style": "formal"}

    # 對話狀態追蹤
    failure_count: int = 0              # AI 回應被使用者負面反饋的次數
    repeated_question_count: int = 0    # 使用者重複詢問同一問題的次數
    cumulative_sentiment: float = 0.0   # 累計情緒分數

    # 未處理的多意圖
    deferred_intents: list[str] = field(default_factory=list)

    # 人工升級相關
    escalation_requested: bool = False
    escalation_reason: str = ""
    human_agent_id: str = ""
    has_been_escalated_before: bool = False

    # CRM 資料
    user_profile: UserProfile | None = None
    user_profile_loaded: bool = False

    def add_turn(self, turn: ConversationTurn):
        self.turns.append(turn)
        self.cumulative_sentiment += turn.sentiment_score
        if not turn.success:
            self.failure_count += 1

    def recent_turns(self, n: int = 5) -> list[ConversationTurn]:
        return self.turns[-n:]

    def get_context_for_agent(self, agent_name: str) -> AgentContext:
        """生成給特定 Agent 的精簡上下文（節省 Token）"""
        return AgentContext(
            # 只傳最近 5 輪對話（節省 Token）
            recent_history=self.format_recent_turns(n=5),
            # 已知的使用者資訊和解決的實體
            known_entities=self.resolved_entities,
            # 使用者偏好
            user_preferences=self.user_preferences,
            # 目前的問題焦點
            current_issue=self.turns[-1].user_message if self.turns else "",
            # CRM 使用者資料摘要
            user_summary=self.user_profile.to_summary() if self.user_profile else None
        )
  </code></pre>

  <h3>多輪對話的 Context 壓縮</h3>
  <p>隨著對話輪次增加，完整的對話歷史會超過 LLM 的 Context Window。需要設計 Context 壓縮策略：</p>

  <pre data-lang="python"><code class="language-python">
class ConversationContextCompressor:
    """
    對話上下文壓縮器
    當對話歷史超過 Token 預算時，自動壓縮舊的對話
    """

    MAX_CONTEXT_TOKENS = 2000   # 留給對話歷史的最大 Token 數
    RECENT_TURNS_KEEP = 3       # 始終保留最近 N 輪完整對話

    async def compress(
        self,
        session: ConversationSession,
        current_token_count: int
    ) -> str:
        """
        壓縮策略：
        1. 保留最近 3 輪完整對話（使用者的即時問題）
        2. 對更早的對話生成摘要（節省 Token）
        3. 始終保留已解決的實體（訂單號等關鍵資訊）
        """
        if current_token_count <= self.MAX_CONTEXT_TOKENS:
            return self._format_full_history(session)

        recent_turns = session.recent_turns(n=self.RECENT_TURNS_KEEP)
        older_turns = session.turns[:-self.RECENT_TURNS_KEEP]

        if not older_turns:
            return self._format_turns(recent_turns)

        # 使用 LLM 對舊對話生成摘要
        older_turns_text = self._format_turns(older_turns)
        summary_prompt = f"""
        請用 100 字以內總結以下客服對話的核心內容。
        重點保留：已確認的訂單號/問題類型/已嘗試的解決方案。

        對話內容：
        {older_turns_text}
        """

        summary = await self.llm.complete(summary_prompt, max_tokens=150)

        # 組合：摘要 + 最近 N 輪完整對話
        return f"""
[早期對話摘要]
{summary.content}

[最近對話]
{self._format_turns(recent_turns)}
"""

    def _format_turns(self, turns: list[ConversationTurn]) -> str:
        lines = []
        for turn in turns:
            lines.append(f"使用者：{turn.user_message}")
            lines.append(f"客服：{turn.agent_response}")
        return "\n".join(lines)
  </code></pre>

  <h3>Slot Filling：結構化資訊收集</h3>
  <p>許多客服任務需要收集多個必要資訊（例如退款申請需要：訂單號、購買日期、問題描述）。Slot Filling 是一種結構化的資訊收集機制：</p>

  <pre data-lang="python"><code class="language-python">
@dataclass
class Slot:
    name: str
    description: str           # 向使用者詢問時的描述
    required: bool
    value: Any = None
    filled: bool = False
    extraction_regex: str = "" # 嘗試從對話中自動提取

class RefundWorkflowSlots:
    """退款工作流所需的資訊槽"""
    slots = [
        Slot("order_id",      "您的訂單編號（如 ORD-12345）", required=True,
             extraction_regex=r"ORD-\d+"),
        Slot("reason",        "退款原因（商品問題/不需要了/其他）", required=True),
        Slot("preferred_method", "退款方式（原路退回/轉帳）", required=False,
             value="原路退回"),  # 預設值
    ]

class SlotFillingManager:
    """管理 Slot Filling 對話流程"""

    async def process_turn(
        self,
        message: str,
        session: ConversationSession,
        workflow: SlotWorkflow
    ) -> SlotFillingResult:
        # 1. 嘗試從訊息中提取所有槽值
        for slot in workflow.slots:
            if not slot.filled:
                extracted = self._try_extract(message, slot)
                if extracted:
                    slot.value = extracted
                    slot.filled = True
                    # 記錄到 Session 的已解決實體
                    session.resolved_entities[slot.name] = extracted

        # 2. 找到下一個未填的必要槽
        next_unfilled = next(
            (s for s in workflow.slots if s.required and not s.filled),
            None
        )

        if next_unfilled:
            # 還有未填的槽，生成追問訊息
            return SlotFillingResult(
                complete=False,
                question=f"請問您的{next_unfilled.description}是什麼？"
            )

        # 所有必要槽已填完，可以執行工作流
        return SlotFillingResult(
            complete=True,
            collected_data={s.name: s.value for s in workflow.slots if s.filled}
        )

    def _try_extract(self, message: str, slot: Slot) -> Any | None:
        """嘗試用正則表達式從訊息中提取槽值"""
        if slot.extraction_regex:
            match = re.search(slot.extraction_regex, message)
            if match:
                return match.group(0)
        return None
  </code></pre>

  <h3>使用者偏好記憶（跨 Session 持久化）</h3>
  <p>優秀的客服系統應該「記住」使用者的偏好，讓每次對話都更個人化：</p>

  <pre data-lang="python"><code class="language-python">
class UserPreferenceMemory:
    """
    跨 Session 的使用者偏好記憶
    儲存在 Redis，永久有效（不隨 Session 過期）
    """

    PREFERENCE_KEYS = [
        "communication_style",     # formal / casual
        "preferred_language",      # zh-TW / en / ja
        "prefers_detailed_answers", # True / False
        "known_technical_level",    # beginner / intermediate / expert
    ]

    async def load_preferences(self, user_id: str) -> dict:
        """從 Redis 載入使用者偏好"""
        data = await self.redis.hgetall(f"user_pref:{user_id}")
        return {k: v for k, v in data.items() if k in self.PREFERENCE_KEYS}

    async def update_preferences_from_session(
        self,
        user_id: str,
        session: ConversationSession
    ):
        """
        從本次 Session 推斷並更新偏好
        例如：使用者一直用正式語氣 → 更新 communication_style = formal
        """
        inferred = await self._infer_preferences(session)

        if inferred:
            await self.redis.hset(
                f"user_pref:{user_id}",
                mapping=inferred
            )

    async def _infer_preferences(self, session: ConversationSession) -> dict:
        """使用 LLM 從對話中推斷使用者偏好"""
        if len(session.turns) < 3:
            return {}  # 對話太短，不做推斷

        sample_messages = [t.user_message for t in session.turns[:5]]
        prompt = f"""
        根據使用者的以下訊息，推斷其偏好。

        使用者訊息：
        {json.dumps(sample_messages, ensure_ascii=False)}

        請以 JSON 格式回傳推斷結果（只包含你有信心的項目）：
        {{
            "communication_style": "formal" 或 "casual"（如果能判斷），
            "prefers_detailed_answers": true/false（如果能判斷）
        }}
        """
        response = await self.llm.complete(prompt, temperature=0)
        return json.loads(response.content)
  </code></pre>

  <h3>Session 管理與持久化</h3>
  <pre data-lang="python"><code class="language-python">
class SessionManager:
    """Session 的持久化管理，使用 Redis 儲存"""

    def __init__(self, redis: Redis, ttl_hours: int = 24):
        self.redis = redis
        self.ttl = ttl_hours * 3600

    async def get_or_create(self, session_id: str, user_id: str, channel: str) -> ConversationSession:
        data = await self.redis.get(f"session:{session_id}")
        if data:
            session = ConversationSession.model_validate_json(data)
            # 載入跨 Session 的使用者偏好
            session.user_preferences = await self.preference_memory.load_preferences(user_id)
            return session

        # 新 Session
        session = ConversationSession(
            session_id=session_id,
            user_id=user_id,
            started_at=datetime.utcnow(),
            channel=channel,
            language="zh-TW"
        )
        # 載入使用者偏好
        session.user_preferences = await self.preference_memory.load_preferences(user_id)
        await self.save(session)
        return session

    async def save(self, session: ConversationSession):
        await self.redis.setex(
            f"session:{session.session_id}",
            self.ttl,
            session.model_dump_json()
        )

    async def close_session(self, session: ConversationSession):
        """Session 結束時：更新使用者偏好、觸發 CRM 同步"""
        # 更新跨 Session 偏好
        await self.preference_memory.update_preferences_from_session(
            session.user_id, session
        )
        # 標記 Session 已結束（保留一段時間用於分析）
        await self.redis.expire(f"session:{session.session_id}", 3600 * 72)  # 保留 3 天
  </code></pre>
</section>

<section id="escalation-trigger">
  <h2>升級人工客服的觸發條件</h2>
  <p>決定「何時升級到人工客服」是 AI 客服系統中最微妙的設計決策。升級太多浪費人工資源，升級太少會讓使用者在應該得到幫助時陷入困境。</p>

  <h3>升級條件的量化標準</h3>
  <p>優秀的升級設計需要將模糊的「需要幫助」轉換為可量化、可監控的指標：</p>

  <table>
    <thead>
      <tr><th>觸發條件</th><th>量化標準</th><th>優先級</th><th>對應技能需求</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>使用者明確要求</td>
        <td>訊息包含「真人」「人工」「speak to human」等關鍵字</td>
        <td>高</td>
        <td>General</td>
      </tr>
      <tr>
        <td>重複問題</td>
        <td>相同意圖被詢問次數 &gt; 3 次（相似度 &gt; 0.85）</td>
        <td>高</td>
        <td>對應問題領域</td>
      </tr>
      <tr>
        <td>情緒持續負面</td>
        <td>連續 3 輪情緒分數 &lt; -0.6 或單輪 &lt; -0.8</td>
        <td>高</td>
        <td>Conflict Resolution</td>
      </tr>
      <tr>
        <td>AI 連續失敗</td>
        <td>AI 回應被使用者否定/評分差 &gt; 3 次</td>
        <td>中</td>
        <td>General</td>
      </tr>
      <tr>
        <td>對話輪數過多</td>
        <td>同一問題的對話輪次 &gt; 10 輪</td>
        <td>中</td>
        <td>General</td>
      </tr>
      <tr>
        <td>特殊意圖</td>
        <td>法律糾紛、安全威脅、高價值退款（&gt;$1000）</td>
        <td>緊急</td>
        <td>Specialist</td>
      </tr>
    </tbody>
  </table>

  <h3>多維度升級評估器</h3>
  <pre data-lang="python"><code class="language-python">
@dataclass
class EscalationDecision:
    should_escalate: bool
    reason: str
    priority: str           # "low", "medium", "high", "urgent"
    suggested_human_skill: str  # 需要哪種技能的人工客服
    estimated_wait_time: int    # 預計等待時間（秒），用於告知使用者

class EscalationEvaluator:
    """
    多維度升級評估：結合規則和 LLM 判斷
    """

    # 硬性規則（立即升級，不需 LLM 評估）
    HARD_RULES = {
        "sentiment_threshold": -0.6,   # 連續 3 輪平均情緒分 < -0.6
        "failure_count_threshold": 3,   # AI 連續失敗超過 3 次
        "repeated_question_threshold": 3,  # 同一問題重複詢問超過 3 次
        "max_turns_for_same_issue": 10, # 同一問題對話超過 10 輪
        "high_value_refund_threshold": 1000  # 退款金額超過 $1000（USD）
    }

    async def evaluate(
        self,
        session: ConversationSession,
        latest_response: AgentResponse
    ) -> EscalationDecision:
        # 先檢查硬性規則（最快，不消耗 LLM Token）
        hard_rule_result = self._check_hard_rules(session)
        if hard_rule_result.should_escalate:
            return hard_rule_result

        # 使用者明確要求人工（關鍵字匹配，不需 LLM）
        if self._user_requested_human(session.turns[-1].user_message):
            wait_time = await self.queue_service.get_estimated_wait_time("general")
            return EscalationDecision(
                should_escalate=True,
                reason="使用者明確要求人工客服",
                priority="medium",
                suggested_human_skill="general",
                estimated_wait_time=wait_time
            )

        # LLM 評估（複雜情況判斷，最耗 Token，放在最後）
        return await self._llm_evaluate(session, latest_response)

    def _check_hard_rules(self, session: ConversationSession) -> EscalationDecision:
        # 情緒分數過低（連續 3 輪）
        if len(session.turns) >= 3:
            recent_sentiments = [t.sentiment_score for t in session.turns[-3:]]
            avg_recent_sentiment = sum(recent_sentiments) / 3
            if avg_recent_sentiment < self.HARD_RULES["sentiment_threshold"]:
                return EscalationDecision(
                    should_escalate=True,
                    reason=f"使用者情緒持續負面（近 3 輪平均：{avg_recent_sentiment:.2f}）",
                    priority="high",
                    suggested_human_skill="conflict_resolution",
                    estimated_wait_time=60  # 優先佇列，預計 1 分鐘
                )

        # AI 連續失敗
        if session.failure_count >= self.HARD_RULES["failure_count_threshold"]:
            return EscalationDecision(
                should_escalate=True,
                reason=f"AI 已連續失敗 {session.failure_count} 次",
                priority="medium",
                suggested_human_skill="general",
                estimated_wait_time=120
            )

        # 重複問題（使用向量相似度檢測）
        if len(session.turns) >= 4:
            repeat_count = self._count_similar_questions(session.turns[-4:])
            if repeat_count >= self.HARD_RULES["repeated_question_threshold"]:
                return EscalationDecision(
                    should_escalate=True,
                    reason=f"使用者重複詢問相同問題 {repeat_count} 次",
                    priority="high",
                    suggested_human_skill="general",
                    estimated_wait_time=90
                )

        # 高價值退款
        refund_amount = session.resolved_entities.get("refund_amount", 0)
        if refund_amount > self.HARD_RULES["high_value_refund_threshold"]:
            return EscalationDecision(
                should_escalate=True,
                reason=f"高價值退款申請（\${refund_amount:.0f}），需要人工審核",
                priority="urgent",
                suggested_human_skill="billing_specialist",
                estimated_wait_time=30  # 緊急，最短等待
            )

        return EscalationDecision(should_escalate=False, reason="", priority="", suggested_human_skill="", estimated_wait_time=0)

    def _count_similar_questions(self, turns: list[ConversationTurn]) -> int:
        """計算相似問題的數量（使用向量相似度）"""
        messages = [t.user_message for t in turns]
        embeddings = [self.embedding_model.encode(m) for m in messages]

        similar_count = 0
        for i in range(1, len(embeddings)):
            similarity = cosine_similarity(embeddings[0], embeddings[i])
            if similarity > 0.85:  # 85% 相似度視為重複問題
                similar_count += 1

        return similar_count

    def _user_requested_human(self, message: str) -> bool:
        """關鍵字匹配，不需要 LLM（快速且準確）"""
        keywords = [
            # 中文
            "真人", "人工", "人工客服", "真人客服", "找人", "接真人",
            # 英文
            "agent", "speak to human", "talk to someone", "real person",
            "human agent", "live chat",
            # 日文
            "人間", "担当者"
        ]
        message_lower = message.lower()
        return any(kw in message_lower for kw in keywords)

    async def _llm_evaluate(
        self,
        session: ConversationSession,
        latest_response: AgentResponse
    ) -> EscalationDecision:
        """使用 LLM 評估複雜的升級場景（成本最高，放在最後）"""
        recent_context = session.format_recent_turns(n=3)
        prompt = f"""
        根據以下對話，判斷是否應該升級到人工客服。

        最近對話：
        {recent_context}

        AI 最新回應：{latest_response.content}
        AI 置信度：{latest_response.confidence}

        升級條件：
        1. AI 的回應無法解決使用者的具體問題
        2. 問題涉及需要權限審批的特殊處理
        3. 使用者情緒明顯惡化（沮喪、憤怒、絕望）
        4. 問題屬於 AI 知識範圍外的邊緣案例

        只回答 "escalate" 或 "continue"，然後在新行說明原因（不超過 30 字）。
        """
        response = await self.fast_llm.complete(prompt, temperature=0.1)
        should_escalate = response.content.lower().startswith("escalate")
        reason = response.content.split("\n")[1] if "\n" in response.content else ""

        return EscalationDecision(
            should_escalate=should_escalate,
            reason=reason,
            priority="medium" if should_escalate else "",
            suggested_human_skill="general",
            estimated_wait_time=await self.queue_service.get_estimated_wait_time("general") if should_escalate else 0
        )
  </code></pre>

  <h3>升級過程的 Context 傳遞</h3>
  <p>升級到人工客服時，必須提供完整的對話摘要，讓人工客服不需要讓使用者重複說明問題：</p>

  <pre data-lang="python"><code class="language-python">
class EscalationHandoffService:
    async def prepare_handoff(
        self,
        session: ConversationSession,
        escalation_decision: EscalationDecision
    ) -> HandoffPackage:
        """準備交接包，包含所有必要的上下文"""

        # 使用 LLM 生成對話摘要（結構化格式，方便人工客服快速瀏覽）
        summary = await self._generate_structured_summary(session)

        # 計算對話的情緒趨勢
        sentiment_trend = self._calculate_sentiment_trend(session)

        return HandoffPackage(
            session_id=session.session_id,
            user_id=session.user_id,
            escalation_reason=escalation_decision.reason,
            priority=escalation_decision.priority,
            required_skill=escalation_decision.suggested_human_skill,
            estimated_wait_time=escalation_decision.estimated_wait_time,

            # 人工客服需要知道的資訊
            conversation_summary=summary,
            known_entities=session.resolved_entities,
            sentiment_trend=sentiment_trend,
            user_tier=session.user_profile.tier if session.user_profile else "standard",
            attempted_solutions=[t.agent_response for t in session.turns[-3:]],

            # 完整對話歷史（供深度查看）
            full_history=session.turns,
            full_history_url=f"https://cs.example.com/sessions/{session.session_id}"
        )

    async def _generate_structured_summary(self, session: ConversationSession) -> str:
        """生成結構化的對話摘要，方便人工客服快速上手"""
        full_history = session.format_all_turns()

        prompt = f"""
        請為以下客服對話生成簡潔的交接摘要，供人工客服參考。

        對話：
        {full_history}

        請用以下格式：
        **問題核心**：（一句話描述）
        **已嘗試方案**：（列出 AI 已嘗試的解決方案）
        **已確認資訊**：（訂單號、使用者描述的問題等）
        **當前使用者狀態**：（情緒、耐心程度）
        **建議處理方向**：（基於對話分析的建議）
        """

        response = await self.llm.complete(prompt, max_tokens=300)
        return response.content

    def _calculate_sentiment_trend(self, session: ConversationSession) -> str:
        """計算情緒趨勢：improving / stable / deteriorating"""
        if len(session.turns) < 3:
            return "unknown"

        sentiments = [t.sentiment_score for t in session.turns]
        early_avg = sum(sentiments[:3]) / 3
        recent_avg = sum(sentiments[-3:]) / 3

        delta = recent_avg - early_avg
        if delta > 0.2:
            return "improving"
        elif delta < -0.2:
            return "deteriorating"
        else:
            return "stable"

  </code></pre>

  <h3>人工客服接入延遲優化</h3>
  <p>等待人工客服是使用者最不喜歡的體驗。以下是降低主觀等待感的設計策略：</p>

  <pre data-lang="python"><code class="language-python">
class HumanAgentQueueManager:
    """
    人工客服佇列管理
    實現智慧路由、優先排序和等待體驗最佳化
    """

    async def enqueue(
        self,
        handoff_package: HandoffPackage
    ) -> QueueTicket:
        """將升級請求加入佇列，支援優先排序"""
        priority_score = self._calculate_priority_score(handoff_package)

        ticket = QueueTicket(
            ticket_id=generate_uuid(),
            session_id=handoff_package.session_id,
            user_id=handoff_package.user_id,
            required_skill=handoff_package.required_skill,
            priority_score=priority_score,
            enqueued_at=datetime.utcnow()
        )

        # 使用 Redis Sorted Set 實現優先佇列（score 越高越優先）
        await self.redis.zadd(
            f"queue:{handoff_package.required_skill}",
            {ticket.ticket_id: priority_score}
        )

        # 估算等待時間
        position = await self.redis.zrevrank(
            f"queue:{handoff_package.required_skill}",
            ticket.ticket_id
        )
        avg_handle_time = await self._get_avg_handle_time(handoff_package.required_skill)
        available_agents = await self._count_available_agents(handoff_package.required_skill)

        estimated_wait = max(0, (position / max(available_agents, 1)) * avg_handle_time)
        ticket.estimated_wait_seconds = int(estimated_wait)

        return ticket

    def _calculate_priority_score(self, package: HandoffPackage) -> float:
        """
        優先級分數計算（越高越優先）：
        - 緊急優先級：+1000
        - VIP 使用者：+500
        - 情緒惡化：+200
        - 對話越長（更有耐心）反而降低些許分數，讓新使用者快速得到服務
        """
        score = 0.0

        if package.priority == "urgent":
            score += 1000
        elif package.priority == "high":
            score += 500
        elif package.priority == "medium":
            score += 200

        if package.user_tier == "vip":
            score += 500
        elif package.user_tier == "premium":
            score += 200

        if package.sentiment_trend == "deteriorating":
            score += 300

        return score

    async def start_while_waiting(
        self,
        session: ConversationSession,
        ticket: QueueTicket
    ) -> WarmHandoffData:
        """
        Warm-handoff 設計：
        在等待期間，AI 繼續協助收集資訊，讓人工接手後能立即開始
        """
        # 主動告知等待時間
        wait_message = f"您的問題需要人工客服為您服務，預計等待時間約 {ticket.estimated_wait_seconds // 60} 分鐘。在等待期間，我可以先幫您整理需要的資訊。"

        # 預先收集人工客服可能需要的資訊
        missing_info = self._identify_missing_info(session, ticket.required_skill)

        if missing_info:
            collection_questions = [f"請問您的{info}是什麼？" for info in missing_info]
            return WarmHandoffData(
                wait_message=wait_message,
                collection_questions=collection_questions,
                ticket=ticket
            )

        return WarmHandoffData(
            wait_message=wait_message + " 您的資訊已齊備，人工客服接手後將立即為您服務。",
            collection_questions=[],
            ticket=ticket
        )
  </code></pre>

  <h3>升級交接流程設計</h3>

  <callout-box type="info" title="系統設計面試加分點">
    在面試中提到以下進階設計，能展現系統思維的深度：<br/>
    1. <strong>智慧路由</strong>：根據人工客服的技能標籤、當前工作量、歷史好評率進行最優分配，而非簡單的輪詢。具體實現：Redis Sorted Set 維護每個客服的「可用容量 × 歷史評分」複合分數。<br/>
    2. <strong>Warm-handoff</strong>：在人工客服接手前，AI 先向使用者說明「即將轉接給 XX 客服，他/她專精處理退款問題」，同時向人工客服推送完整的對話摘要，降低等待焦慮。<br/>
    3. <strong>Co-pilot 模式</strong>：人工客服接手後，AI 以「助手模式」繼續運行——預先生成可能有用的回覆草稿，讓人工客服一鍵確認或編輯，提升人工效率 40–60%。<br/>
    4. <strong>監督學習回饋</strong>：人工客服的處理方式作為訓練資料，持續改進 AI 的能力，形成飛輪效應。每週自動採樣人工客服的處理案例，生成訓練資料。
  </callout-box>
</section>
`,
} satisfies ChapterContent;
