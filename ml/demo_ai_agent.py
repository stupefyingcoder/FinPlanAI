"""
Demo script for the Advanced AI Agent System
Run this to see all the new capabilities in action
"""

import asyncio
import os
import sys
from datetime import datetime

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from schemas_v2 import NewCustomerProfile, DBCustomerProfile
from ai_agent_system import create_enhanced_agent
from multi_agent_orchestrator import create_advanced_agent
from agent_config import get_agent_config, validate_config, DEFAULT_KNOWLEDGE_BASE


async def demo_basic_agent():
    """Demo the basic enhanced agent"""
    print("🤖 === DEMO: Basic Enhanced Agent ===")
    
    # Get configuration
    config = get_agent_config()
    if not validate_config(config):
        print("❌ Invalid configuration. Please check your .env file.")
        return
    
    # Create agent
    agent = create_enhanced_agent(config.api_key, config.model_name)
    agent.initialize_vector_store(texts=DEFAULT_KNOWLEDGE_BASE)
    
    # Create sample customer profile
    sample_customer = NewCustomerProfile(
        Customer_ID="DEMO001",
        Name="Rajesh Kumar",
        Age=32,
        Gender="Male",
        Occupation="Software Engineer",
        Marital_Status="Married",
        Number_of_Dependents=1,
        Annual_Income=1200000,
        Monthly_Expenses=45000,
        Current_Net_Worth=800000,
        Risk_Taking_Ability="moderate",
        Preferred_Investment_Horizon="long",
        Primary_Financial_Goal="Retirement Planning",
        Goal_Timeline_Years=25,
        Monthly_Surplus=55000,
        Starting_Principal=800000
    )
    
    # Set customer profile
    agent.set_customer_profile(sample_customer)
    print(f"✅ Customer profile set: {sample_customer.Name}")
    
    # Demo queries
    test_queries = [
        "What is my risk profile and what investments are suitable for me?",
        "Help me plan for retirement with specific SIP recommendations.",
        "What should be my ideal asset allocation?",
        "How can I optimize my taxes while investing?"
    ]
    
    print("\n📋 Testing basic agent capabilities...")
    for i, query in enumerate(test_queries, 1):
        print(f"\n--- Query {i}: {query} ---")
        
        try:
            turn = await agent.process_query(query)
            print(f"🎯 Confidence: {turn.confidence_score:.1%}")
            print(f"⏱️ Processing Time: {turn.processing_time:.2f}s")
            print(f"📝 Response: {turn.agent_response[:200]}...")
            if turn.retrieved_docs:
                print(f"📚 Sources: {', '.join(turn.retrieved_docs)}")
        except Exception as e:
            print(f"❌ Error: {e}")
    
    # Show conversation summary
    summary = agent.get_conversation_summary()
    print(f"\n📊 Agent Summary:")
    print(f"   - Total conversations: {summary['total_turns']}")
    print(f"   - Average confidence: {summary['average_confidence']:.1%}")
    print(f"   - Current state: {summary['current_state']}")


async def demo_multi_agent_system():
    """Demo the advanced multi-agent orchestrator"""
    print("\n\n🚀 === DEMO: Multi-Agent Orchestrator ===")
    
    # Get configuration
    config = get_agent_config()
    if not validate_config(config):
        print("❌ Invalid configuration.")
        return
    
    # Create advanced agent
    agent = create_advanced_agent(config.api_key, config.model_name)
    
    # Create sample customer profile
    sample_customer = NewCustomerProfile(
        Customer_ID="DEMO002",
        Name="Priya Sharma",
        Age=28,
        Gender="Female",
        Occupation="Marketing Manager",
        Marital_Status="Single",
        Number_of_Dependents=0,
        Annual_Income=800000,
        Monthly_Expenses=35000,
        Current_Net_Worth=400000,
        Risk_Taking_Ability="high",
        Preferred_Investment_Horizon="long",
        Primary_Financial_Goal="Wealth Creation",
        Goal_Timeline_Years=20,
        Monthly_Surplus=32000,
        Starting_Principal=400000
    )
    
    agent.set_customer_profile(sample_customer)
    print(f"✅ Customer profile set: {sample_customer.Name}")
    
    # Show orchestrator capabilities
    capabilities = agent.get_orchestrator_capabilities()
    print(f"\n🛠️ Available Specialized Agents:")
    for agent_name, caps in capabilities.items():
        print(f"   {agent_name.replace('_', ' ').title()}:")
        for cap in caps[:3]:  # Show first 3 capabilities
            print(f"     • {cap.replace('_', ' ').title()}")
    
    # Demo complex queries that require multiple agents
    complex_queries = [
        "I want a comprehensive financial plan including risk assessment, goal planning, and tax optimization.",
        "Analyze my risk profile and suggest an optimal portfolio with tax-efficient instruments.",
        "Help me plan for house purchase in 5 years while optimizing my current portfolio and taxes.",
        "What's the best strategy for wealth creation considering my age, risk tolerance, and tax implications?"
    ]
    
    print(f"\n📋 Testing multi-agent orchestration...")
    for i, query in enumerate(complex_queries, 1):
        print(f"\n--- Complex Query {i} ---")
        print(f"Query: {query}")
        
        try:
            # Process with multi-agent orchestration
            turn = await agent.process_query(query, use_multi_agent=True)
            
            print(f"🎯 Overall Confidence: {turn.confidence_score:.1%}")
            print(f"⏱️ Processing Time: {turn.processing_time:.2f}s")
            
            # Show orchestrator results if available
            if "last_orchestrator_result" in agent.memory.context_cache:
                orch_result = agent.memory.context_cache["last_orchestrator_result"]
                routing = orch_result["routing_analysis"]
                print(f"🔀 Agents Used: {', '.join(routing['selected_agents'])}")
                print(f"🧠 Routing Confidence: {routing['confidence']:.1%}")
            
            print(f"📝 Response Preview: {turn.agent_response[:300]}...")
            
        except Exception as e:
            print(f"❌ Error: {e}")
    
    # Compare single vs multi-agent responses
    print(f"\n🔄 === Comparison: Single vs Multi-Agent ===")
    comparison_query = "What should be my investment strategy for retirement planning?"
    
    print(f"Query: {comparison_query}")
    
    try:
        # Single agent
        print(f"\n--- Single Agent Response ---")
        single_turn = await agent.process_query(comparison_query, use_multi_agent=False)
        print(f"Confidence: {single_turn.confidence_score:.1%}")
        print(f"Response: {single_turn.agent_response[:200]}...")
        
        # Multi-agent
        print(f"\n--- Multi-Agent Response ---")
        multi_turn = await agent.process_query(comparison_query, use_multi_agent=True)
        print(f"Confidence: {multi_turn.confidence_score:.1%}")
        print(f"Response: {multi_turn.agent_response[:200]}...")
        
    except Exception as e:
        print(f"❌ Error in comparison: {e}")


async def demo_specialized_tools():
    """Demo individual specialized tools"""
    print(f"\n\n🔧 === DEMO: Specialized Tools ===")
    
    from ai_agent_system import RiskAssessmentTool, GoalPlanningTool, PortfolioAnalysisTool
    
    # Sample profile for tool testing
    test_profile = NewCustomerProfile(
        Customer_ID="TOOL_TEST",
        Age=35,
        Annual_Income=1000000,
        Monthly_Expenses=40000,
        Current_Net_Worth=1500000,
        Risk_Taking_Ability="moderate",
        Primary_Financial_Goal="Child Education"
    )
    
    print(f"👤 Test Profile: {test_profile.Customer_ID}")
    
    # Test Risk Assessment Tool
    print(f"\n🎯 Risk Assessment Tool:")
    risk_tool = RiskAssessmentTool()
    risk_result = risk_tool.execute(customer_profile=test_profile)
    print(f"   Risk Score: {risk_result['risk_score']:.2f}")
    print(f"   Risk Category: {risk_result['risk_category']}")
    print(f"   Recommendations: {len(risk_result['recommendations'])} items")
    
    # Test Goal Planning Tool
    print(f"\n🎯 Goal Planning Tool:")
    goal_tool = GoalPlanningTool()
    goal_result = goal_tool.execute(customer_profile=test_profile)
    print(f"   Total Monthly Required: ₹{goal_result['total_monthly_required']:,.0f}")
    print(f"   Number of Goals: {len(goal_result['goal_plans'])}")
    
    # Test Portfolio Analysis Tool
    print(f"\n🎯 Portfolio Analysis Tool:")
    portfolio_tool = PortfolioAnalysisTool()
    portfolio_result = portfolio_tool.execute(customer_profile=test_profile)
    print(f"   Recommended Allocation: {portfolio_result['recommended_allocation']}")
    print(f"   Rationale: {portfolio_result['rationale']}")


def print_system_info():
    """Print system information and setup status"""
    print("🏠 === AI FINANCIAL PLANNING AGENT SYSTEM ===")
    print(f"📅 Demo Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Check environment
    config = get_agent_config()
    print(f"\n⚙️ Configuration Status:")
    print(f"   API Key: {'✅ Set' if config.api_key else '❌ Missing'}")
    print(f"   Model: {config.model_name}")
    print(f"   Multi-Agent: {'✅ Enabled' if config.enable_multi_agent else '❌ Disabled'}")
    
    # Check dependencies
    try:
        import streamlit
        import google.generativeai
        import langchain
        import faiss
        print(f"   Dependencies: ✅ All required packages available")
    except ImportError as e:
        print(f"   Dependencies: ❌ Missing package: {e}")
    
    print(f"\n🚀 Features Available:")
    print(f"   • Advanced AI Agent with Pydantic models")
    print(f"   • Multi-Agent Orchestration System")
    print(f"   • Specialized Financial Tools (Risk, Goals, Portfolio, Tax)")
    print(f"   • RAG-based Knowledge Retrieval")
    print(f"   • Conversation Memory & Context Management")
    print(f"   • Confidence Scoring & Error Handling")


async def main():
    """Main demo function"""
    print_system_info()
    
    # Check if API key is available
    config = get_agent_config()
    if not config.api_key:
        print(f"\n❌ GEMINI_API_KEY not found in environment variables.")
        print(f"Please set your API key in a .env file or environment variable.")
        print(f"Example .env file:")
        print(f"GEMINI_API_KEY=your_api_key_here")
        return
    
    try:
        # Run all demos
        await demo_specialized_tools()
        await demo_basic_agent()
        await demo_multi_agent_system()
        
        print(f"\n✅ === DEMO COMPLETED SUCCESSFULLY ===")
        print(f"💡 Next Steps:")
        print(f"   1. Run 'streamlit run enhanced_app_with_agent.py' for the full UI")
        print(f"   2. Upload your own documents to expand the knowledge base")
        print(f"   3. Try the multi-agent orchestration with complex queries")
        print(f"   4. Experiment with different customer profiles")
        
    except Exception as e:
        print(f"\n❌ Demo failed with error: {e}")
        print(f"Please check your configuration and try again.")


if __name__ == "__main__":
    # Run the demo
    asyncio.run(main())
