"""
Advanced Agent Orchestrator with Multi-Agent Capabilities
This module provides a more sophisticated agent system with specialized sub-agents
"""

from __future__ import annotations
import json
import asyncio
from typing import List, Dict, Optional, Any, Type, Union
from datetime import datetime
from abc import ABC, abstractmethod

from pydantic import BaseModel, Field
import google.generativeai as genai

from schemas_v2 import NewCustomerProfile, DBCustomerProfile
from ai_agent_system import (
    FinancialPlanningAgent, AgentState, ConversationTurn, AgentMemory,
    RiskAssessmentTool, GoalPlanningTool, PortfolioAnalysisTool
)


# ====================== Specialized Sub-Agents ====================== #

class BaseSubAgent(ABC):
    """Base class for specialized sub-agents"""
    
    def __init__(self, name: str, api_key: str, model_name: str = "gemini-2.5-flash"):
        self.name = name
        self.api_key = api_key
        self.model_name = model_name
        self.model = genai.GenerativeModel(model_name)
        
    @abstractmethod
    async def process(self, customer_profile: Union[NewCustomerProfile, DBCustomerProfile], query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Process a query specific to this agent's domain"""
        pass
    
    @abstractmethod
    def get_capabilities(self) -> List[str]:
        """Return list of capabilities this agent provides"""
        pass


class RiskAssessmentAgent(BaseSubAgent):
    """Specialized agent for comprehensive risk assessment"""
    def __init__(self, api_key: str, model_name: str = "gemini-2.5-flash"):
        super().__init__("Risk Assessment Agent", api_key, model_name)
        self.risk_tool = RiskAssessmentTool()
    async def process(self, customer_profile: Union[NewCustomerProfile, DBCustomerProfile], query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        risk_analysis = self.risk_tool.execute(customer_profile=customer_profile)
        risk_prompt = f"""
        You are a risk assessment specialist. Based on the customer profile and risk analysis,
        provide a comprehensive risk assessment and recommendations.
        Customer Profile: {json.dumps(customer_profile.model_dump(), indent=2)}
        Risk Analysis Results: {json.dumps(risk_analysis, indent=2)}
        User Query: {query}
        Additional Context: {json.dumps(context, indent=2)}
        Provide a detailed response covering:
        1. Current risk profile assessment
        2. Risk capacity vs. risk tolerance analysis
        3. Specific investment suitability recommendations
        4. Risk mitigation strategies
        5. Portfolio volatility expectations
        6. Stress testing scenarios
        Be specific, actionable, and include numerical examples where appropriate.
        """
        try:
            response = self.model.generate_content(risk_prompt)
            narrative = response.text.strip()
        except Exception as e:
            narrative = f"Error generating risk assessment: {str(e)}"
        return {
            "agent": self.name,
            "analysis_type": "risk_assessment",
            "structured_data": risk_analysis,
            "narrative": narrative,
            "recommendations": risk_analysis.get("recommendations", []),
            "confidence": risk_analysis.get("confidence", 0.8)
        }
    def get_capabilities(self) -> List[str]:
        return [
            "risk_profiling",
            "risk_tolerance_assessment",
            "investment_suitability",
            "portfolio_volatility_analysis",
            "stress_testing",
            "risk_mitigation_strategies"
        ]


class GoalPlanningAgent(BaseSubAgent):
    """Specialized agent for goal-based financial planning"""
    
    def __init__(self, api_key: str, model_name: str = "gemini-2.5-flash"):
        super().__init__("Goal Planning Agent", api_key, model_name)
        self.goal_tool = GoalPlanningTool()
    
    async def process(self, customer_profile: Union[NewCustomerProfile, DBCustomerProfile], query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Process goal planning queries"""
        
        # Extract goals from query and profile
        goals = self._extract_goals(query, customer_profile)
        
        # Use the goal planning tool
        goal_analysis = self.goal_tool.execute(customer_profile=customer_profile, goals=goals)
        
        # Generate detailed goal planning narrative
        goal_prompt = f"""
        You are a goal-based financial planning specialist. Create a comprehensive 
        goal-oriented financial plan based on the analysis.
        
        Customer Profile: {json.dumps(customer_profile.model_dump(), indent=2)}
        
        Goal Analysis Results: {json.dumps(goal_analysis, indent=2)}
        
        User Query: {query}
        
        Additional Context: {json.dumps(context, indent=2)}
        
        Provide a detailed response covering:
        1. Goal prioritization and sequencing
        2. Detailed SIP calculations for each goal
        3. Asset allocation strategy per goal timeline
        4. Tax optimization strategies
        5. Regular review and rebalancing schedule
        6. Alternative scenarios and contingency planning
        
        Include specific numerical recommendations and actionable steps.
        """
        
        try:
            response = self.model.generate_content(goal_prompt)
            narrative = response.text.strip()
        except Exception as e:
            narrative = f"Error generating goal analysis: {str(e)}"
        
        return {
            "agent": self.name,
            "analysis_type": "goal_planning",
            "structured_data": goal_analysis,
            "narrative": narrative,
            "goals_identified": goals,
            "total_monthly_investment": goal_analysis.get("total_monthly_required", 0),
            "confidence": goal_analysis.get("confidence", 0.8)
        }
    
    def _extract_goals(self, query: str, profile: Union[NewCustomerProfile, DBCustomerProfile]) -> List[str]:
        """Extract financial goals from query and profile"""
        goals = []
        
        # From profile
        if profile.Primary_Financial_Goal:
            goals.append(profile.Primary_Financial_Goal)
        
        # Common goals based on query keywords
        query_lower = query.lower()
        goal_keywords = {
            "retirement": "Retirement Planning",
            "education": "Child Education",
            "house": "Home Purchase", 
            "marriage": "Marriage Planning",
            "emergency": "Emergency Fund",
            "wealth": "Wealth Creation",
            "tax": "Tax Saving"
        }
        
        for keyword, goal in goal_keywords.items():
            if keyword in query_lower and goal not in goals:
                goals.append(goal)
        
        return goals if goals else ["General Wealth Creation"]
    
    def get_capabilities(self) -> List[str]:
        return [
            "goal_prioritization",
            "sip_calculations",
            "timeline_planning",
            "asset_allocation_per_goal",
            "tax_optimization",
            "contingency_planning"
        ]


class SynthesisAgent(BaseSubAgent):
    """Specialized agent for portfolio analysis and optimization"""
    
    def __init__(self, api_key: str, model_name: str = "gemini-2.5-flash"):
        super().__init__("Synthesis Agent", api_key, model_name)
        self.portfolio_tool = PortfolioAnalysisTool()
    
    async def process(self, customer_profile: Union[NewCustomerProfile, DBCustomerProfile], query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Process portfolio optimization queries"""
        
        # Extract current portfolio from context if available
        current_portfolio = context.get("current_portfolio", None)
        
        # Use the portfolio analysis tool
        portfolio_analysis = self.portfolio_tool.execute(
            customer_profile=customer_profile,
            current_portfolio=current_portfolio
        )
        
        # Generate detailed portfolio optimization narrative
        portfolio_prompt = f"""
        You are a portfolio optimization specialist. Provide comprehensive portfolio 
        analysis and optimization recommendations.
        
        Customer Profile: {json.dumps(customer_profile.model_dump(), indent=2)}
        
        Portfolio Analysis Results: {json.dumps(portfolio_analysis, indent=2)}
        
        User Query: {query}
        
        Additional Context: {json.dumps(context, indent=2)}
        
        Provide a detailed response covering:
        1. Current portfolio analysis (if provided)
        2. Optimal asset allocation recommendations
        3. Specific fund/instrument recommendations
        4. Rebalancing strategy and frequency
        5. Cost optimization (expense ratios, taxes)
        6. Diversification analysis
        7. Performance monitoring metrics
        
        Include specific product recommendations and implementation steps.
        """
        
        try:
            response = self.model.generate_content(portfolio_prompt)
            narrative = response.text.strip()
        except Exception as e:
            narrative = f"Error generating portfolio analysis: {str(e)}"
        
        return {
            "agent": self.name,
            "analysis_type": "portfolio_optimization",
            "structured_data": portfolio_analysis,
            "narrative": narrative,
            "rebalancing_needed": portfolio_analysis.get("rebalancing_needed", False),
            "recommended_allocation": portfolio_analysis.get("recommended_allocation", {}),
            "confidence": portfolio_analysis.get("confidence", 0.8)
        }
    
    def get_capabilities(self) -> List[str]:
        return [
            "asset_allocation",
            "portfolio_rebalancing",
            "diversification_analysis",
            "cost_optimization",
            "performance_monitoring",
            "fund_selection"
        ]


class HistoryAgent(BaseSubAgent):
    """Specialized agent for tax optimization strategies"""
    
    def __init__(self, api_key: str, model_name: str = "gemini-2.5-flash"):
        super().__init__("History Agent", api_key, model_name)
    
    async def process(self, customer_profile: Union[NewCustomerProfile, DBCustomerProfile], query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Process tax optimization queries"""
        
        tax_analysis = self._analyze_tax_situation(customer_profile)
        
        tax_prompt = f"""
        You are a tax optimization specialist focusing on Indian tax laws and investment strategies.
        Provide comprehensive tax optimization recommendations.
        
        Customer Profile: {json.dumps(customer_profile.model_dump(), indent=2)}
        
        Tax Analysis: {json.dumps(tax_analysis, indent=2)}
        
        User Query: {query}
        
        Additional Context: {json.dumps(context, indent=2)}
        
        Provide detailed recommendations covering:
        1. Section 80C optimization (ELSS, PPF, NSC, etc.)
        2. Section 80D (Health insurance)
        3. NPS benefits under 80CCD(1B)
        4. Tax-efficient withdrawal strategies
        5. Long-term vs short-term capital gains planning
        6. Tax-loss harvesting opportunities
        7. Retirement planning with tax benefits
        
        Include specific numerical examples and implementation timelines.
        """
        
        try:
            response = self.model.generate_content(tax_prompt)
            narrative = response.text.strip()
        except Exception as e:
            narrative = f"Error generating tax analysis: {str(e)}"
        
        return {
            "agent": self.name,
            "analysis_type": "tax_optimization",
            "structured_data": tax_analysis,
            "narrative": narrative,
            "potential_savings": tax_analysis.get("potential_annual_savings", 0),
            "confidence": 0.85
        }
    
    def _analyze_tax_situation(self, profile: Union[NewCustomerProfile, DBCustomerProfile]) -> Dict[str, Any]:
        """Analyze customer's tax situation"""
        annual_income = profile.Annual_Income or 600000
        
        # Estimate tax bracket
        if annual_income <= 300000:
            tax_bracket = "No Tax"
            marginal_rate = 0
        elif annual_income <= 600000:
            tax_bracket = "5%"
            marginal_rate = 0.05
        elif annual_income <= 900000:
            tax_bracket = "10%"
            marginal_rate = 0.10
        elif annual_income <= 1200000:
            tax_bracket = "15%"
            marginal_rate = 0.15
        elif annual_income <= 1500000:
            tax_bracket = "20%"
            marginal_rate = 0.20
        else:
            tax_bracket = "30%"
            marginal_rate = 0.30
        
        # Calculate potential savings
        max_80c_benefit = min(150000 * marginal_rate, annual_income * marginal_rate)
        max_80d_benefit = min(25000 * marginal_rate, annual_income * marginal_rate)
        max_nps_benefit = min(50000 * marginal_rate, annual_income * marginal_rate)
        
        total_potential_savings = max_80c_benefit + max_80d_benefit + max_nps_benefit
        
        return {
            "annual_income": annual_income,
            "tax_bracket": tax_bracket,
            "marginal_rate": marginal_rate,
            "max_80c_savings": max_80c_benefit,
            "max_80d_savings": max_80d_benefit,
            "max_nps_savings": max_nps_benefit,
            "potential_annual_savings": total_potential_savings
        }
    
    def get_capabilities(self) -> List[str]:
        return [
            "section_80c_optimization",
            "health_insurance_planning",
            "nps_tax_benefits",
            "capital_gains_planning",
            "tax_loss_harvesting",
            "retirement_tax_planning"
        ]


# ====================== Multi-Agent Orchestrator ====================== #

class AgentOrchestrator:
    """Orchestrates multiple specialized agents based on query intent"""
    
    def __init__(self, api_key: str, model_name: str = "gemini-2.5-flash"):
        self.api_key = api_key
        self.model_name = model_name
        self.model = genai.GenerativeModel(model_name)
        
        # Initialize specialized agents
        self.agents = {
            "risk_assessment": RiskAssessmentAgent(api_key, model_name),
            "goal_planning": GoalPlanningAgent(api_key, model_name),
            "synthesis": SynthesisAgent(api_key, model_name),
            "history": HistoryAgent(api_key, model_name)
        }
        
        # Capability mapping
        self.capability_map = {}
        for agent_name, agent in self.agents.items():
            for capability in agent.get_capabilities():
                self.capability_map[capability] = agent_name
    
    async def route_query(self, customer_profile: Union[NewCustomerProfile, DBCustomerProfile], query: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Route query to appropriate specialized agent(s)"""
        
        if context is None:
            context = {}
        
        # Analyze query to determine which agents to invoke
        agent_routing = await self._analyze_routing(query)
        
        # Invoke appropriate agents
        agent_results = {}
        for agent_name in agent_routing["selected_agents"]:
            if agent_name in self.agents:
                try:
                    result = await self.agents[agent_name].process(customer_profile, query, context)
                    agent_results[agent_name] = result
                except Exception as e:
                    agent_results[agent_name] = {
                        "agent": agent_name,
                        "error": str(e),
                        "confidence": 0.0
                    }
        
        # Synthesize results if multiple agents were involved
        if len(agent_results) > 1:
            synthesis = await self._synthesize_results(query, agent_results)
        else:
            synthesis = list(agent_results.values())[0] if agent_results else {
                "agent": "fallback",
                "narrative": "I couldn't determine the best approach for your query. Please rephrase or be more specific.",
                "confidence": 0.3
            }
        
        return {
            "routing_analysis": agent_routing,
            "agent_results": agent_results,
            "final_response": synthesis
        }
    
    async def _analyze_routing(self, query: str) -> Dict[str, Any]:
        """Analyze query to determine which agents should handle it"""
        
        routing_prompt = f"""
        Analyze this financial query and determine which specialized agents should handle it.
        
        Query: "{query}"
        
        Available agents and their capabilities:
        - risk_analysis: {self.agents["risk_analysis"].get_capabilities()}
        - goal_planning: {self.agents["goal_planning"].get_capabilities()}
        - portfolio_optimization: {self.agents["portfolio_optimization"].get_capabilities()}
        - tax_optimization: {self.agents["tax_optimization"].get_capabilities()}
        
        Return JSON with:
        {{
            "primary_intent": "main intent category",
            "selected_agents": ["agent1", "agent2"],
            "reasoning": "why these agents were selected",
            "complexity": "low|medium|high",
            "confidence": 0.0-1.0
        }}
        
        Rules:
        - Select 1-3 most relevant agents
        - Consider overlapping domains (e.g., goal planning + tax optimization)
        - Higher complexity queries may need multiple agents
        """
        
        try:
            response = self.model.generate_content(routing_prompt)
            routing_data = json.loads(response.text.strip())
        except Exception as e:
            # Fallback routing based on keywords
            routing_data = self._fallback_routing(query)
        
        return routing_data
    
    def _fallback_routing(self, query: str) -> Dict[str, Any]:
        """Fallback routing based on keyword matching"""
        query_lower = query.lower()
        selected_agents = []
        
        # Keyword-based routing
        if any(word in query_lower for word in ["risk", "tolerance", "conservative", "aggressive", "volatility"]):
            selected_agents.append("risk_analysis")
        
        if any(word in query_lower for word in ["goal", "retirement", "education", "sip", "target", "plan"]):
            selected_agents.append("goal_planning")
        
        if any(word in query_lower for word in ["portfolio", "allocation", "rebalance", "diversif", "fund"]):
            selected_agents.append("portfolio_optimization")
        
        if any(word in query_lower for word in ["tax", "80c", "elss", "ppf", "nps", "deduction"]):
            selected_agents.append("tax_optimization")
        
        # Default to goal planning if no specific match
        if not selected_agents:
            selected_agents = ["goal_planning"]
        
        return {
            "primary_intent": "general_financial_advice",
            "selected_agents": selected_agents,
            "reasoning": "Fallback keyword-based routing",
            "complexity": "medium",
            "confidence": 0.6
        }
    
    async def _synthesize_results(self, query: str, agent_results: Dict[str, Any]) -> Dict[str, Any]:
        """Synthesize results from multiple agents into coherent response"""
        
        synthesis_prompt = f"""
        Synthesize the results from multiple specialized financial agents into a coherent, 
        comprehensive response to the user's query.
        
        User Query: "{query}"
        
        Agent Results:
        {json.dumps(agent_results, indent=2)}
        
        Create a unified response that:
        1. Addresses the user's specific question
        2. Integrates insights from all agents
        3. Provides actionable recommendations
        4. Maintains consistency across different agent outputs
        5. Prioritizes recommendations by importance
        
        Structure the response with clear sections and maintain a professional, advisory tone.
        """
        
        try:
            response = self.model.generate_content(synthesis_prompt)
            synthesized_narrative = response.text.strip()
        except Exception as e:
            # Fallback synthesis
            synthesized_narrative = self._fallback_synthesis(agent_results)
        
        # Calculate overall confidence
        confidences = [result.get("confidence", 0.5) for result in agent_results.values()]
        overall_confidence = sum(confidences) / len(confidences) if confidences else 0.5
        
        return {
            "agent": "orchestrator",
            "analysis_type": "multi_agent_synthesis",
            "narrative": synthesized_narrative,
            "agents_involved": list(agent_results.keys()),
            "confidence": overall_confidence
        }
    
    def _fallback_synthesis(self, agent_results: Dict[str, Any]) -> str:
        """Fallback synthesis when LLM synthesis fails"""
        narratives = []
        for agent_name, result in agent_results.items():
            if "narrative" in result:
                narratives.append(f"**{agent_name.replace('_', ' ').title()}:**\n{result['narrative']}")
        
        return "\n\n".join(narratives) if narratives else "Multiple analysis completed. Please review individual agent outputs."


# ====================== Enhanced Agent with Orchestrator ====================== #

class EnhancedFinancialAgent(FinancialPlanningAgent):
    """Enhanced financial agent with multi-agent orchestration capabilities"""
    
    def __init__(self, api_key: str, model_name: str = "gemini-2.5-flash", embed_model: str = "models/text-embedding-004"):
        super().__init__(api_key, model_name, embed_model)
        
        # Add orchestrator
        self.orchestrator = AgentOrchestrator(api_key, model_name)
        
        # Enhanced capabilities flag
        self.use_multi_agent = True
    
    async def process_query(self, query: str, use_multi_agent: bool = None) -> ConversationTurn:
        """Enhanced query processing with optional multi-agent orchestration"""
        
        if use_multi_agent is None:
            use_multi_agent = self.use_multi_agent
        
        start_time = datetime.now()
        self.current_state = AgentState.THINKING
        
        try:
            if use_multi_agent and self.memory.customer_profile:
                # Use multi-agent orchestration
                self.current_state = AgentState.ANALYZING
                
                # Retrieve context for orchestrator
                retrieved_docs = await self._retrieve_context(query, {"intent": "multi_agent"})
                context = {
                    "retrieved_docs": retrieved_docs,
                    "conversation_history": [turn.model_dump() for turn in self.memory.conversation_history[-3:]]
                }
                
                # Route to specialized agents
                orchestrator_result = await self.orchestrator.route_query(
                    self.memory.customer_profile, 
                    query, 
                    context
                )
                
                final_response = orchestrator_result["final_response"]
                response_text = final_response["narrative"]
                confidence = final_response["confidence"]
                
                # Create enhanced conversation turn
                turn = ConversationTurn(
                    user_message=query,
                    agent_response=response_text,
                    agent_state=AgentState.RESPONDING,
                    retrieved_docs=[doc.get("source", "") for doc in retrieved_docs],
                    confidence_score=confidence,
                    processing_time=(datetime.now() - start_time).total_seconds()
                )
                
                # Store orchestrator results in memory context
                self.memory.context_cache["last_orchestrator_result"] = orchestrator_result
                
            else:
                # Fall back to original single-agent processing
                turn = await super().process_query(query)
            
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
    
    def toggle_multi_agent(self, enabled: bool = True):
        """Toggle multi-agent orchestration on/off"""
        self.use_multi_agent = enabled
    
    def get_orchestrator_capabilities(self) -> Dict[str, List[str]]:
        """Get capabilities of all specialized agents"""
        return {
            agent_name: agent.get_capabilities() 
            for agent_name, agent in self.orchestrator.agents.items()
        }


# ====================== Factory Function ====================== #

def create_advanced_agent(api_key: str, model_name: str = "gemini-2.5-flash") -> EnhancedFinancialAgent:
    """Factory function to create an advanced multi-agent system"""
    agent = EnhancedFinancialAgent(api_key=api_key, model_name=model_name)
    
    # Initialize with enhanced knowledge base
    enhanced_texts = [
        "Comprehensive risk assessment involves analyzing risk capacity, risk tolerance, and risk required for goals.",
        "Goal-based planning requires prioritization, timeline analysis, and asset allocation per goal.",
        "Portfolio optimization includes asset allocation, diversification, rebalancing, and cost management.",
        "Tax optimization in India includes Section 80C (₹1.5L), 80D (health insurance), and 80CCD(1B) for NPS.",
        "Emergency funds should be 6-12 months of expenses in liquid funds or savings accounts.",
        "Equity allocation rule of thumb: 100 minus age percentage in equity, adjusted for risk tolerance.",
        "SIP calculations use compound annual growth rates (CAGR) typically 10-12% for equity, 6-8% for debt.",
        "Asset allocation models: Conservative (30% equity), Moderate (60% equity), Aggressive (80% equity).",
        "Tax-loss harvesting involves booking losses to offset capital gains and reduce tax liability.",
        "Rebalancing frequency: Annual for long-term goals, quarterly for active portfolios."
    ]
    
    agent.initialize_vector_store(texts=enhanced_texts)
    return agent
