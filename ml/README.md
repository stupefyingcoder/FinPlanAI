# 🤖 Advanced AI Financial Planning Agent System

A comprehensive AI-powered financial planning assistant built with **Pydantic**, **Google Gemini AI**, **LangChain**, and **Streamlit**. The system features multi-agent orchestration, specialized financial tools, and advanced RAG capabilities.

## 🚀 Key Features

### 🧠 Multi-Agent Architecture
- **Agent Orchestrator**: Routes queries to specialized agents based on intent analysis
- **Risk Analysis Agent**: Comprehensive risk profiling and investment suitability
- **Goal Planning Agent**: Detailed goal-based financial planning with SIP calculations
- **Portfolio Optimization Agent**: Asset allocation optimization and rebalancing
- **Tax Optimization Agent**: Indian tax law optimization strategies

### 🛠️ Advanced Capabilities
- **Pydantic Data Models**: Type-safe, validated data structures
- **Conversation Memory**: Context-aware conversations with history
- **Confidence Scoring**: AI confidence assessment for all responses
- **RAG Integration**: Knowledge retrieval from uploaded documents
- **Multi-tool Integration**: Specialized financial calculation tools

### 💬 Natural Language Interface
- Chat with AI agents using natural language
- Intent recognition and query routing
- Context-aware responses
- Multi-turn conversations

## 📁 File Structure

```
├── enhanced_app_with_agent.py      # Main Streamlit application with AI agent
├── ai_agent_system.py              # Core AI agent system with Pydantic models
├── multi_agent_orchestrator.py     # Multi-agent orchestration system
├── agent_config.py                 # Configuration and setup
├── demo_ai_agent.py                # Demo script showcasing all features
├── schemas_v2.py                   # Pydantic data models
├── three_plan.py                   # Plan generation logic
├── prompt.py                       # LLM prompts and templates
├── requirements.txt                # Python dependencies
└── README.md                       # This file
```

## 🔧 Installation & Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Set Up Environment Variables
Create a `.env` file with:
```env
GEMINI_API_KEY=your_google_gemini_api_key_here
MODEL=gemini-2.5-flash
EMBED_MODEL=models/text-embedding-004
ENABLE_MULTI_AGENT=true
```

### 3. Run the Demo
```bash
python demo_ai_agent.py
```

### 4. Launch the Web Application
```bash
streamlit run enhanced_app_with_agent.py
```

## 🎯 Usage Examples

### Basic Agent Interaction
```python
from ai_agent_system import create_enhanced_agent
from schemas_v2 import CustomerProfile

# Create agent
agent = create_enhanced_agent(api_key="your_key")

# Set customer profile
profile = CustomerProfile(
    Customer_ID="CUST001",
    Age=30,
    Annual_Income=800000,
    Risk_Taking_Ability="moderate"
)
agent.set_customer_profile(profile)

# Ask questions
response = await agent.process_query("What should be my investment strategy?")
print(response.agent_response)
```

### Multi-Agent Orchestration
```python
from multi_agent_orchestrator import create_advanced_agent

# Create advanced agent with orchestration
agent = create_advanced_agent(api_key="your_key")
agent.set_customer_profile(profile)

# Complex query requiring multiple agents
response = await agent.process_query(
    "Create a comprehensive plan including risk assessment, "
    "goal planning, and tax optimization."
)
```

### Specialized Tools
```python
from ai_agent_system import RiskAssessmentTool, GoalPlanningTool

# Risk assessment
risk_tool = RiskAssessmentTool()
risk_analysis = risk_tool.execute(customer_profile=profile)

# Goal planning
goal_tool = GoalPlanningTool()
goal_plan = goal_tool.execute(customer_profile=profile, goals=["Retirement"])
```

## 🧠 AI Agent Capabilities

### Risk Analysis Agent
- **Risk Profiling**: Comprehensive assessment based on age, income, dependents
- **Investment Suitability**: Recommendations for conservative/moderate/aggressive profiles
- **Risk Mitigation**: Strategies for managing portfolio volatility
- **Stress Testing**: Scenario analysis for different market conditions

### Goal Planning Agent
- **Goal Prioritization**: Sequence goals by importance and timeline
- **SIP Calculations**: Detailed monthly investment requirements
- **Asset Allocation**: Goal-specific investment strategies
- **Tax Optimization**: Section 80C, 80D, NPS optimization

### Portfolio Optimization Agent
- **Asset Allocation**: Optimal equity/debt/gold allocation
- **Rebalancing**: Frequency and thresholds for portfolio adjustment
- **Cost Optimization**: Expense ratio and tax efficiency analysis
- **Fund Selection**: Specific product recommendations

### Tax Optimization Agent
- **Section 80C**: ELSS, PPF, NSC optimization (₹1.5L limit)
- **Health Insurance**: Section 80D benefits (₹25K-₹50K)
- **NPS**: Additional contribution under 80CCD(1B) (₹50K)
- **Capital Gains**: Long-term vs short-term optimization
- **Tax-Loss Harvesting**: Booking losses to offset gains

## 📊 Data Models (Pydantic)

### CustomerProfile
```python
class CustomerProfile(BaseModel):
    Customer_ID: str
    Name: Optional[str]
    Age: Optional[int]
    Annual_Income: Optional[float]
    Risk_Taking_Ability: Optional[str]  # low | moderate | high
    Primary_Financial_Goal: Optional[str]
    # ... additional fields
```

### ConversationTurn
```python
class ConversationTurn(BaseModel):
    timestamp: datetime
    user_message: str
    agent_response: str
    confidence_score: float
    processing_time: float
    retrieved_docs: List[str]
```

### AgentMemory
```python
class AgentMemory(BaseModel):
    customer_profile: Optional[CustomerProfile]
    conversation_history: List[ConversationTurn]
    active_goals: List[str]
    context_cache: Dict[str, Any]
```

## 🔮 Advanced Features

### Multi-Agent Orchestration
The system automatically routes queries to appropriate specialized agents:

1. **Intent Analysis**: LLM analyzes user query to determine required capabilities
2. **Agent Selection**: Routes to 1-3 most relevant specialized agents
3. **Parallel Processing**: Agents work simultaneously on different aspects
4. **Result Synthesis**: Combines outputs into coherent response

### RAG Integration
- **Document Ingestion**: Upload PDFs, policies, product sheets
- **Vector Search**: Semantic similarity search for relevant context
- **Knowledge Base**: Automatically updated with generated plans
- **Citation Tracking**: Source attribution for all recommendations

### Conversation Management
- **Context Preservation**: Maintains conversation history and context
- **Memory Management**: Intelligent context caching and cleanup
- **Confidence Tracking**: Monitors and reports AI confidence levels
- **Error Handling**: Graceful degradation with fallback responses

## 🛡️ Best Practices

### Data Security
- API keys stored in environment variables
- Customer data handled with Pydantic validation
- No sensitive data in logs or error messages

### Performance Optimization
- Async processing for better responsiveness
- Context caching to reduce redundant operations
- Conversation history limits to manage memory

### Reliability
- Comprehensive error handling
- Fallback mechanisms for tool failures
- Confidence scoring for response quality assessment

## 🔄 Configuration Options

The system supports extensive configuration through environment variables:

```env
# AI Configuration
MODEL=gemini-2.5-flash
EMBED_MODEL=models/text-embedding-004

# Agent Behavior
ENABLE_MULTI_AGENT=true
MAX_CONVERSATION_HISTORY=20
CONFIDENCE_THRESHOLD=0.7

# Tool Configuration
ENABLE_RISK_ASSESSMENT=true
ENABLE_GOAL_PLANNING=true
ENABLE_PORTFOLIO_ANALYSIS=true
ENABLE_TAX_OPTIMIZATION=true

# RAG Configuration
CHUNK_SIZE=900
CHUNK_OVERLAP=150
INDEX_DIR=rag_index_faiss
```

## 🚀 Deployment

### Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export GEMINI_API_KEY="your_key"

# Run the application
streamlit run enhanced_app_with_agent.py
```

### Production Deployment
- Configure environment variables in your hosting platform
- Ensure persistent storage for vector indices
- Set up monitoring for API usage and performance
- Consider rate limiting for API calls

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License. See LICENSE file for details.

## 🆘 Support

For issues, questions, or feature requests:
1. Check the demo script: `python demo_ai_agent.py`
2. Review the configuration: `agent_config.py`
3. Examine the logs for error details
4. Ensure all dependencies are installed correctly

## 🔮 Future Enhancements

- **Real-time Market Data**: Integration with live financial data
- **Portfolio Tracking**: Investment performance monitoring
- **Goal Progress**: Automated goal achievement tracking
- **Regulatory Updates**: Dynamic compliance with changing regulations
- **Mobile App**: React Native or Flutter mobile interface
- **Voice Interface**: Speech-to-text and text-to-speech capabilities

---

**Built with ❤️ using Google Gemini AI, LangChain, Pydantic, and Streamlit**
