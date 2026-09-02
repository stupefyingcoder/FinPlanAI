"""
Configuration and setup for the AI Agent System
"""

import os
from typing import Dict, Any
from dataclasses import dataclass

@dataclass
class AgentConfig:
    """Configuration settings for the AI agent system"""
    
    # API Configuration
    api_key: str
    model_name: str = "gemini-2.5-flash"
    embed_model: str = "models/text-embedding-004"
    
    # Vector Store Configuration
    index_dir: str = "rag_index_faiss"
    chunk_size: int = 900
    chunk_overlap: int = 150
    
    # Agent Behavior Configuration
    max_conversation_history: int = 20
    default_confidence_threshold: float = 0.7
    enable_multi_agent: bool = True
    
    # Tool Configuration
    enable_risk_assessment: bool = True
    enable_goal_planning: bool = True
    enable_portfolio_analysis: bool = True
    enable_tax_optimization: bool = True
    
    # Response Configuration
    max_response_length: int = 2000
    include_confidence_scores: bool = True
    include_source_citations: bool = True
    
    @classmethod
    def from_env(cls) -> 'AgentConfig':
        """Create configuration from environment variables"""
        return cls(
            api_key=os.getenv("GEMINI_API_KEY", ""),
            model_name=os.getenv("MODEL", "gemini-2.5-flash"),
            embed_model=os.getenv("EMBED_MODEL", "models/text-embedding-004"),
            index_dir=os.getenv("INDEX_DIR", "rag_index_faiss"),
            chunk_size=int(os.getenv("CHUNK_SIZE", "900")),
            chunk_overlap=int(os.getenv("CHUNK_OVERLAP", "150")),
            max_conversation_history=int(os.getenv("MAX_CONVERSATION_HISTORY", "20")),
            default_confidence_threshold=float(os.getenv("CONFIDENCE_THRESHOLD", "0.7")),
            enable_multi_agent=os.getenv("ENABLE_MULTI_AGENT", "true").lower() == "true",
            enable_risk_assessment=os.getenv("ENABLE_RISK_ASSESSMENT", "true").lower() == "true",
            enable_goal_planning=os.getenv("ENABLE_GOAL_PLANNING", "true").lower() == "true",
            enable_portfolio_analysis=os.getenv("ENABLE_PORTFOLIO_ANALYSIS", "true").lower() == "true",
            enable_tax_optimization=os.getenv("ENABLE_TAX_OPTIMIZATION", "true").lower() == "true",
            max_response_length=int(os.getenv("MAX_RESPONSE_LENGTH", "2000")),
            include_confidence_scores=os.getenv("INCLUDE_CONFIDENCE_SCORES", "true").lower() == "true",
            include_source_citations=os.getenv("INCLUDE_SOURCE_CITATIONS", "true").lower() == "true"
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary"""
        return {
            "api_key": "***hidden***",  # Don't expose API key
            "model_name": self.model_name,
            "embed_model": self.embed_model,
            "index_dir": self.index_dir,
            "chunk_size": self.chunk_size,
            "chunk_overlap": self.chunk_overlap,
            "max_conversation_history": self.max_conversation_history,
            "default_confidence_threshold": self.default_confidence_threshold,
            "enable_multi_agent": self.enable_multi_agent,
            "enable_risk_assessment": self.enable_risk_assessment,
            "enable_goal_planning": self.enable_goal_planning,
            "enable_portfolio_analysis": self.enable_portfolio_analysis,
            "enable_tax_optimization": self.enable_tax_optimization,
            "max_response_length": self.max_response_length,
            "include_confidence_scores": self.include_confidence_scores,
            "include_source_citations": self.include_source_citations
        }


# Default knowledge base for financial planning
DEFAULT_KNOWLEDGE_BASE = [
    """
    Financial Planning Fundamentals:
    - Goal-based investing is more effective than product-based investing
    - Asset allocation should be based on goals, timeline, and risk capacity
    - Emergency fund should be 6-12 months of expenses in liquid instruments
    - Insurance is risk transfer, not investment
    - Start investing early to benefit from compounding
    """,
    
    """
    Risk Assessment Guidelines:
    - Risk capacity = ability to take risk (based on income, age, dependents)
    - Risk tolerance = willingness to take risk (psychological comfort)
    - Risk required = risk needed to achieve goals
    - All three should align for optimal portfolio construction
    - Young investors can take more risk due to longer time horizon
    """,
    
    """
    Asset Allocation Principles:
    - Equity for long-term wealth creation (>7 years)
    - Debt for stability and capital preservation
    - Gold as inflation hedge (5-10% allocation)
    - Real estate through REITs for diversification
    - International exposure for global diversification
    """,
    
    """
    Tax Optimization Strategies (India):
    - Section 80C: ELSS, PPF, NSC, ULIP, Life insurance (₹1.5L limit)
    - Section 80D: Health insurance premiums (₹25K-₹50K limit)
    - Section 80CCD(1B): Additional NPS contribution (₹50K limit)
    - Long-term capital gains: >1 year for equity, >3 years for debt
    - Tax-loss harvesting to optimize capital gains
    """,
    
    """
    Goal-Based Planning Framework:
    1. Emergency Fund: 6-12 months expenses in liquid funds
    2. Short-term goals (<3 years): Debt funds, FDs
    3. Medium-term goals (3-7 years): Balanced/hybrid funds
    4. Long-term goals (>7 years): Equity funds, diversified portfolio
    5. Retirement: NPS, PPF, ELSS, equity funds
    6. Regular review and rebalancing
    """,
    
    """
    Investment Instruments Overview:
    - Mutual Funds: Professional management, diversification, liquidity
    - ELSS: Tax saving + equity growth potential
    - PPF: 15-year lock-in, tax-free returns, current rate ~7.1%
    - NPS: Retirement focused, tax benefits, market-linked returns
    - Direct Equity: Higher returns potential, requires expertise
    - FDs/Bonds: Capital preservation, predictable returns
    """
]


# Agent prompts and templates
AGENT_PROMPTS = {
    "risk_assessment": """
    You are a risk assessment specialist. Analyze the customer's risk profile comprehensively.
    
    Consider these factors:
    1. Age and life stage
    2. Income stability and growth prospects
    3. Dependents and responsibilities
    4. Existing investments and experience
    5. Goals and timelines
    6. Psychological comfort with volatility
    
    Provide specific recommendations for:
    - Appropriate risk level (Conservative/Moderate/Aggressive)
    - Suitable asset allocation
    - Risk mitigation strategies
    - Investment instruments to consider/avoid
    """,
    
    "goal_planning": """
    You are a goal-based financial planning specialist. Create detailed plans for each goal.
    
    For each goal, provide:
    1. Target corpus calculation (with inflation adjustment)
    2. Required monthly SIP amount
    3. Recommended asset allocation
    4. Suitable investment instruments
    5. Review milestones
    6. Contingency planning
    
    Prioritize goals based on importance and timeline.
    Consider tax implications and optimize accordingly.
    """,
    
    "portfolio_optimization": """
    You are a portfolio optimization expert. Analyze and improve the investment portfolio.
    
    Provide analysis on:
    1. Current vs. optimal asset allocation
    2. Diversification adequacy
    3. Cost optimization (expense ratios, exit loads)
    4. Tax efficiency
    5. Rebalancing needs
    6. Performance benchmarking
    
    Recommend specific actions:
    - Funds to increase/decrease/exit
    - New allocations to consider
    - Rebalancing frequency
    - Performance monitoring metrics
    """,
    
    "tax_optimization": """
    You are a tax optimization specialist for Indian investors. Maximize tax efficiency.
    
    Analyze and recommend:
    1. Section 80C optimization (₹1.5L limit)
    2. Health insurance under 80D
    3. NPS additional contribution (80CCD(1B))
    4. Capital gains optimization
    5. Tax-loss harvesting opportunities
    6. Withdrawal strategies
    
    Provide specific recommendations with amounts and timelines.
    Consider current and future tax implications.
    """
}


def get_agent_config() -> AgentConfig:
    """Get the agent configuration"""
    return AgentConfig.from_env()


def validate_config(config: AgentConfig) -> bool:
    """Validate the agent configuration"""
    if not config.api_key:
        return False
    
    if config.chunk_size <= 0 or config.chunk_overlap < 0:
        return False
    
    if config.chunk_overlap >= config.chunk_size:
        return False
    
    if config.max_conversation_history <= 0:
        return False
    
    if not (0 <= config.default_confidence_threshold <= 1):
        return False
    
    return True
