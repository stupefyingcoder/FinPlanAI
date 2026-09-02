"""
Comprehensive AI Agent System for Financial Planning
Integrates Pydantic models, LangGraph, and advanced agent capabilities
"""

from __future__ import annotations
import json
import asyncio
from typing import List, Dict, Optional, Union, Any, Callable
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass

from pydantic import BaseModel, Field, validator
import google.generativeai as genai
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Import existing schemas
from schemas_v2 import NewCustomerProfile, DBCustomerProfile, SWOT, PlanText, CustomerPlanTexts


# ====================== Agent State Management ====================== #

class AgentState(str, Enum):
    IDLE = "idle"
    THINKING = "thinking"
    RETRIEVING = "retrieving"
    ANALYZING = "analyzing"
    PLANNING = "planning"
    RESPONDING = "responding"
    ERROR = "error"


class ConversationTurn(BaseModel):
    """Represents a single turn in conversation"""
    timestamp: datetime = Field(default_factory=datetime.now)
    user_message: str
    agent_response: str
    agent_state: AgentState
    retrieved_docs: List[str] = []
    confidence_score: float = Field(ge=0.0, le=1.0, default=0.8)
    processing_time: float = 0.0



from typing import Union
from schemas_v2 import NewCustomerProfile, DBCustomerProfile

class AgentMemory(BaseModel):
    """Agent's working memory and conversation history"""
    customer_profile: Optional[Union[NewCustomerProfile, DBCustomerProfile]] = None
    conversation_history: List[ConversationTurn] = []
    active_goals: List[str] = []
    context_cache: Dict[str, Any] = {}
    last_plan_generated: Optional[datetime] = None
    
    def add_turn(self, turn: ConversationTurn):
        self.conversation_history.append(turn)
        # Keep only last 20 turns to manage memory
        if len(self.conversation_history) > 20:
            self.conversation_history = self.conversation_history[-20:]


# ====================== Agent Tools & Capabilities ====================== #

class FinancialTool(BaseModel):
    """Base class for financial analysis tools"""
    name: str
    description: str
    required_params: List[str] = []
    
    def execute(self, **kwargs) -> Dict[str, Any]:
        raise NotImplementedError


class RiskAssessmentTool(FinancialTool):
    """Tool for comprehensive risk assessment"""
    name: str = "risk_assessment"
    description: str = "Analyzes customer risk profile and investment suitability"
    
    def execute(self, customer_profile: Union[NewCustomerProfile, DBCustomerProfile], **kwargs) -> Dict[str, Any]:
        risk_score = self._calculate_risk_score(customer_profile)
        recommendations = self._generate_risk_recommendations(customer_profile, risk_score)
        
        return {
            "risk_score": risk_score,
            "risk_category": self._categorize_risk(risk_score),
            "recommendations": recommendations,
            "confidence": 0.85
        }
    
    def _calculate_risk_score(self, profile: Union[NewCustomerProfile, DBCustomerProfile]) -> float:
        """Calculate risk score based on multiple factors"""
        score = 0.5  # Base score
        
        # Age factor (younger = higher risk tolerance)
        if profile.Age:
            if profile.Age < 30:
                score += 0.2
            elif profile.Age < 45:
                score += 0.1
            elif profile.Age > 60:
                score -= 0.2
        
        # Income stability
        if profile.Annual_Income and profile.Monthly_Expenses:
            surplus_ratio = (profile.Annual_Income / 12 - profile.Monthly_Expenses) / (profile.Annual_Income / 12)
            score += min(surplus_ratio * 0.3, 0.3)
        
        # Risk taking ability
        risk_mapping = {"low": -0.2, "moderate": 0.0, "high": 0.3}
        if profile.Risk_Taking_Ability:
            score += risk_mapping.get(profile.Risk_Taking_Ability.lower(), 0)
        
        return max(0.0, min(1.0, score))
    
    def _categorize_risk(self, score: float) -> str:
        if score < 0.3:
            return "Conservative"
        elif score < 0.7:
            return "Moderate"
        else:
            return "Aggressive"
    
    def _generate_risk_recommendations(self, profile: Union[NewCustomerProfile, DBCustomerProfile], risk_score: float) -> List[str]:
        recommendations = []
        
        if risk_score < 0.3:
            recommendations.extend([
                "Focus on capital preservation and guaranteed returns",
                "Consider FDs, PPF, and high-grade corporate bonds",
                "Maintain higher emergency fund (6-12 months expenses)"
            ])
        elif risk_score < 0.7:
            recommendations.extend([
                "Balanced portfolio with 50-70% equity exposure",
                "Mix of large-cap equity funds and debt instruments",
                "Regular portfolio rebalancing recommended"
            ])
        else:
            recommendations.extend([
                "Can consider higher equity allocation (70-85%)",
                "Include mid-cap and small-cap exposure",
                "Consider international equity for diversification"
            ])
        
        return recommendations


class GoalPlanningTool(FinancialTool):
    """Tool for goal-based financial planning"""
    name: str = "goal_planning"
    description: str = "Creates detailed goal-based financial plans with timelines"
    
    def execute(self, customer_profile: Union[NewCustomerProfile, DBCustomerProfile], goals: List[str] = None, **kwargs) -> Dict[str, Any]:
        if not goals and customer_profile.Primary_Financial_Goal:
            goals = [customer_profile.Primary_Financial_Goal]
        
        goal_plans = []
        for goal in goals or []:
            plan = self._create_goal_plan(customer_profile, goal)
            goal_plans.append(plan)
        
        return {
            "goal_plans": goal_plans,
            "total_monthly_required": sum(plan["monthly_sip"] for plan in goal_plans),
            "confidence": 0.8
        }
    
    def _create_goal_plan(self, profile: Union[NewCustomerProfile, DBCustomerProfile], goal: str) -> Dict[str, Any]:
        """Create a specific goal plan"""
        # Simplified goal planning logic
        timeline = profile.Goal_Timeline_Years or 10
        target_amount = self._estimate_goal_amount(goal, profile)
        monthly_sip = self._calculate_sip(target_amount, timeline)
        
        return {
            "goal": goal,
            "target_amount": target_amount,
            "timeline_years": timeline,
            "monthly_sip": monthly_sip,
            "recommended_instruments": self._recommend_instruments(goal, timeline)
        }
    
    def _estimate_goal_amount(self, goal: str, profile: Union[NewCustomerProfile, DBCustomerProfile]) -> float:
        """Estimate target amount for different goals"""
        goal_lower = goal.lower()
        
        if "retirement" in goal_lower:
            return (profile.Annual_Income or 600000) * 15  # 15x annual income
        elif "education" in goal_lower or "child" in goal_lower:
            return 2000000  # 20 lakhs for education
        elif "house" in goal_lower or "home" in goal_lower:
            return (profile.Annual_Income or 600000) * 8  # 8x annual income
        elif "emergency" in goal_lower:
            return (profile.Monthly_Expenses or 30000) * 12  # 12 months expenses
        else:
            return 1000000  # Default 10 lakhs
    
    def _calculate_sip(self, target: float, years: int, rate: float = 0.12) -> float:
        """Calculate required SIP amount"""
        months = years * 12
        monthly_rate = rate / 12
        
        # SIP formula: FV = PMT * [((1 + r)^n - 1) / r]
        if monthly_rate == 0:
            return target / months
        
        return target * monthly_rate / ((1 + monthly_rate) ** months - 1)
    
    def _recommend_instruments(self, goal: str, timeline: int) -> List[str]:
        """Recommend investment instruments based on goal and timeline"""
        goal_lower = goal.lower()
        
        if timeline < 3:  # Short term
            return ["Liquid Funds", "Short Term Debt Funds", "FDs"]
        elif timeline < 7:  # Medium term
            return ["Balanced Advantage Funds", "Conservative Hybrid Funds", "Large Cap Equity"]
        else:  # Long term
            if "retirement" in goal_lower:
                return ["ELSS", "Large Cap Funds", "Mid Cap Funds", "PPF", "NPS"]
            else:
                return ["Diversified Equity Funds", "Index Funds", "ELSS"]


class PortfolioAnalysisTool(FinancialTool):
    """Tool for portfolio analysis and optimization"""
    name: str = "portfolio_analysis"
    description: str = "Analyzes current portfolio and suggests optimizations"
    
    def execute(self, customer_profile: Union[NewCustomerProfile, DBCustomerProfile], current_portfolio: Dict = None, **kwargs) -> Dict[str, Any]:
        if not current_portfolio:
            # Generate ideal portfolio based on profile
            return self._generate_ideal_portfolio(customer_profile)
        
        analysis = self._analyze_portfolio(current_portfolio, customer_profile)
        return analysis
    
    def _generate_ideal_portfolio(self, profile: Union[NewCustomerProfile, DBCustomerProfile]) -> Dict[str, Any]:
        """Generate ideal asset allocation"""
        risk_tool = RiskAssessmentTool()
        risk_result = risk_tool.execute(customer_profile=profile)
        risk_score = risk_result["risk_score"]
        
        # Asset allocation based on risk score
        if risk_score < 0.3:  # Conservative
            allocation = {
                "equity": 30,
                "debt": 60,
                "gold": 5,
                "cash": 5
            }
        elif risk_score < 0.7:  # Moderate
            allocation = {
                "equity": 60,
                "debt": 30,
                "gold": 5,
                "cash": 5
            }
        else:  # Aggressive
            allocation = {
                "equity": 80,
                "debt": 15,
                "gold": 3,
                "cash": 2
            }
        
        return {
            "recommended_allocation": allocation,
            "rationale": f"Based on {risk_result['risk_category']} risk profile",
            "rebalancing_frequency": "Quarterly",
            "confidence": 0.85
        }
    
    def _analyze_portfolio(self, portfolio: Dict, profile: Union[NewCustomerProfile, DBCustomerProfile]) -> Dict[str, Any]:
        """Analyze existing portfolio"""
        # Simplified portfolio analysis
        total_value = sum(portfolio.values())
        asset_percentages = {k: (v/total_value)*100 for k, v in portfolio.items()}
        
        ideal = self._generate_ideal_portfolio(profile)
        deviations = {}
        
        for asset, ideal_pct in ideal["recommended_allocation"].items():
            current_pct = asset_percentages.get(asset, 0)
            deviations[asset] = current_pct - ideal_pct
        
        return {
            "current_allocation": asset_percentages,
            "ideal_allocation": ideal["recommended_allocation"],
            "deviations": deviations,
            "rebalancing_needed": any(abs(dev) > 10 for dev in deviations.values()),
            "confidence": 0.8
        }


# ====================== Main AI Agent Class ====================== #

class FinancialPlanningAgent:
    """Main AI Agent for comprehensive financial planning"""
    
    def __init__(self, 
                 api_key: str,
                 model_name: str = "gemini-2.5-flash",
                 embed_model: str = "models/text-embedding-004"):
        self.api_key = api_key
        self.model_name = model_name
        self.embed_model = embed_model
        
        # Initialize LLM
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_name)
        
        # Initialize tools
        self.tools = {
            "risk_assessment": RiskAssessmentTool(),
            "goal_planning": GoalPlanningTool(),
            "portfolio_analysis": PortfolioAnalysisTool()
        }
        
        # Agent state
        self.current_state = AgentState.IDLE
        self.memory = AgentMemory()
        self.vector_store = None
        
    def initialize_vector_store(self, texts: List[str] = None, index_path: str = "rag_index_faiss"):
        """Initialize or load vector store"""
        try:
            embeddings = GoogleGenerativeAIEmbeddings(
                model=self.embed_model, 
                google_api_key=self.api_key
            )
            
            # Try to load existing index
            try:
                self.vector_store = FAISS.load_local(
                    index_path, 
                    embeddings, 
                    allow_dangerous_deserialization=True
                )
                return True
            except:
                pass
            
            # Create new index if texts provided
            if texts:
                splitter = RecursiveCharacterTextSplitter(
                    chunk_size=900, 
                    chunk_overlap=150
                )
                docs = []
                for i, text in enumerate(texts):
                    docs.extend(splitter.create_documents([text], metadatas=[{"source": f"doc_{i}"}]))
                
                if docs:
                    self.vector_store = FAISS.from_documents(docs, embeddings)
                    self.vector_store.save_local(index_path)
                    return True
                    
        except Exception as e:
            print(f"Error initializing vector store: {e}")
            return False
        
        return False
    
    def set_customer_profile(self, profile: Union[NewCustomerProfile, DBCustomerProfile]):
        """Set the current customer profile"""
        self.memory.customer_profile = profile
        self.memory.context_cache.clear()  # Clear previous context
        
    async def process_query(self, query: str) -> ConversationTurn:
        """Main method to process user queries"""
        start_time = datetime.now()
        self.current_state = AgentState.THINKING
        
        try:
            # Analyze query intent
            intent = await self._analyze_intent(query)
            
            # Retrieve relevant context
            self.current_state = AgentState.RETRIEVING
            retrieved_docs = await self._retrieve_context(query, intent)
            
            # Generate response based on intent
            self.current_state = AgentState.RESPONDING
            response = await self._generate_response(query, intent, retrieved_docs)
            
            # Calculate confidence
            confidence = self._calculate_confidence(intent, retrieved_docs, response)
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # Create conversation turn
            turn = ConversationTurn(
                user_message=query,
                agent_response=response,
                agent_state=self.current_state,
                retrieved_docs=[doc.get("source", "") for doc in retrieved_docs],
                confidence_score=confidence,
                processing_time=processing_time
            )
            
            # Add to memory
            self.memory.add_turn(turn)
            self.current_state = AgentState.IDLE
            
            return turn
            
        except Exception as e:
            self.current_state = AgentState.ERROR
            error_turn = ConversationTurn(
                user_message=query,
                agent_response=f"I encountered an error processing your request: {str(e)}",
                agent_state=AgentState.ERROR,
                confidence_score=0.0,
                processing_time=(datetime.now() - start_time).total_seconds()
            )
            self.memory.add_turn(error_turn)
            return error_turn
    
    async def _analyze_intent(self, query: str) -> Dict[str, Any]:
        """Analyze user query to determine intent"""
        intent_prompt = f"""
        Analyze this financial query and determine the intent and required actions:
        
        Query: "{query}"
        
        Classify the intent as one of:
        - risk_assessment: Questions about risk tolerance, investment suitability
        - goal_planning: Questions about financial goals, planning, SIP calculations
        - portfolio_analysis: Questions about asset allocation, portfolio review
        - general_advice: General financial advice questions
        - plan_generation: Request to create comprehensive financial plans
        
        Return only a JSON object with:
        {{
            "intent": "intent_category",
            "confidence": 0.0-1.0,
            "key_entities": ["entity1", "entity2"],
            "requires_tools": ["tool1", "tool2"],
            "complexity": "low|medium|high"
        }}
        """
        
        try:
            response = self.model.generate_content(intent_prompt)
            intent_data = json.loads(response.text.strip())
            return intent_data
        except:
            # Fallback intent analysis
            return {
                "intent": "general_advice",
                "confidence": 0.5,
                "key_entities": [],
                "requires_tools": [],
                "complexity": "medium"
            }
    
    async def _retrieve_context(self, query: str, intent: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Retrieve relevant context from vector store and customer profile"""
        retrieved_docs = []
        
        # Add customer profile context
        if self.memory.customer_profile:
            profile_context = {
                "content": json.dumps(self.memory.customer_profile.model_dump(), indent=2),
                "source": "customer_profile",
                "relevance_score": 1.0
            }
            retrieved_docs.append(profile_context)
        
        # Retrieve from vector store if available
        if self.vector_store:
            try:
                # Enhance query with customer context
                enhanced_query = query
                if self.memory.customer_profile:
                    enhanced_query += f" Customer context: Age {self.memory.customer_profile.Age}, "
                    enhanced_query += f"Risk tolerance {self.memory.customer_profile.Risk_Taking_Ability}"
                
                docs = self.vector_store.similarity_search(enhanced_query, k=5)
                for doc in docs:
                    retrieved_docs.append({
                        "content": doc.page_content,
                        "source": doc.metadata.get("source", "unknown"),
                        "relevance_score": 0.8  # Simplified relevance
                    })
            except Exception as e:
                print(f"Error retrieving from vector store: {e}")
        
        return retrieved_docs
    
    async def _generate_response(self, query: str, intent: Dict[str, Any], retrieved_docs: List[Dict[str, Any]]) -> str:
        """Generate response using LLM with context and tools"""
        
        # Use tools if required
        tool_results = {}
        if intent.get("requires_tools") and self.memory.customer_profile:
            for tool_name in intent["requires_tools"]:
                if tool_name in self.tools:
                    try:
                        result = self.tools[tool_name].execute(
                            customer_profile=self.memory.customer_profile
                        )
                        tool_results[tool_name] = result
                    except Exception as e:
                        print(f"Error using tool {tool_name}: {e}")
        
        # Prepare context
        context_text = "\n\n".join([
            f"[{doc['source']}] {doc['content']}" for doc in retrieved_docs
        ])
        
        tool_context = ""
        if tool_results:
            tool_context = "\n\nTool Analysis Results:\n"
            for tool_name, result in tool_results.items():
                tool_context += f"{tool_name}: {json.dumps(result, indent=2)}\n"
        
        # Generate response
        response_prompt = f"""
        You are an expert financial planning AI agent. Answer the user's question comprehensively
        and provide actionable advice based on the context provided.
        
        User Question: {query}
        
        Context:
        {context_text}
        
        {tool_context}
        
        Guidelines:
        - Provide personalized, actionable advice
        - Be specific with recommendations where possible
        - Explain your reasoning
        - Include relevant disclaimers
        - Keep the tone professional but approachable
        - If information is insufficient, clearly state what additional information is needed
        
        Response:
        """
        
        try:
            response = self.model.generate_content(response_prompt)
            return response.text.strip()
        except Exception as e:
            return f"I apologize, but I encountered an error generating a response: {str(e)}"
    
    def _calculate_confidence(self, intent: Dict[str, Any], retrieved_docs: List[Dict[str, Any]], response: str) -> float:
        """Calculate confidence score for the response"""
        confidence = 0.5  # Base confidence
        
        # Intent confidence
        confidence += intent.get("confidence", 0.5) * 0.3
        
        # Context availability
        if retrieved_docs:
            confidence += min(len(retrieved_docs) * 0.1, 0.3)
        
        # Customer profile availability
        if self.memory.customer_profile:
            confidence += 0.2
        
        # Response length (longer responses might be more comprehensive)
        if len(response) > 200:
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    def get_conversation_summary(self) -> Dict[str, Any]:
        """Get summary of conversation and agent state"""
        return {
            "current_state": self.current_state.value,
            "total_turns": len(self.memory.conversation_history),
            "average_confidence": sum(turn.confidence_score for turn in self.memory.conversation_history) / max(len(self.memory.conversation_history), 1),
            "customer_profile_set": self.memory.customer_profile is not None,
            "active_goals": self.memory.active_goals,
            "last_interaction": self.memory.conversation_history[-1].timestamp if self.memory.conversation_history else None
        }
    
    def reset_conversation(self):
        """Reset conversation history while keeping customer profile"""
        profile = self.memory.customer_profile
        self.memory = AgentMemory()
        self.memory.customer_profile = profile
        self.current_state = AgentState.IDLE


# ====================== Integration Helper ====================== #

def create_enhanced_agent(api_key: str, model_name: str = "gemini-2.5-flash") -> FinancialPlanningAgent:
    """Factory function to create a fully configured agent"""
    agent = FinancialPlanningAgent(api_key=api_key, model_name=model_name)
    
    # Initialize with default knowledge base texts if needed
    default_texts = [
        "Financial planning involves setting goals, assessing risk tolerance, and creating investment strategies.",
        "Asset allocation should be based on age, risk tolerance, and investment timeline.",
        "Emergency funds should cover 6-12 months of expenses in liquid instruments.",
        "Tax-efficient investing includes ELSS, PPF, NPS, and other Section 80C instruments.",
        "Regular portfolio rebalancing helps maintain target asset allocation."
    ]
    
    agent.initialize_vector_store(texts=default_texts)
    return agent
