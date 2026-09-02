# enhanced_app_with_agent.py
from __future__ import annotations
import os, io, json, asyncio
from typing import Union
from typing import List

import streamlit as st
from dotenv import load_dotenv
import google.generativeai as genai
import pandas as pd
import PyPDF2

# RAG
import asyncio
import threading
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Local modules
from finplan_ml.schemas import NewCustomerProfile, DBCustomerProfile
from finplan_ml.planning import generate_plan_texts
from finplan_ml.prompts import extract_profile_from_pdf_prompt
from finplan_ml.agents.system import FinancialPlanningAgent, create_enhanced_agent, AgentState
from finplan_ml import config


# ============================== Config ============================== #

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")
MODEL = os.getenv("MODEL", "gemini-2.5-flash")
EMBED_MODEL = os.getenv("EMBED_MODEL", "models/text-embedding-004")

if not API_KEY:
    st.error("GEMINI_API_KEY missing in .env")
    st.stop()

genai.configure(api_key=API_KEY)

INDEX_DIR = str(config.INDEX_DIR)
CHUNK_SIZE = 900
CHUNK_OVERLAP = 150

st.set_page_config(page_title="AI Financial Planning Agent", layout="wide")
st.title("🤖 Intelligent Financial Planning Assistant")

# Sidebar for agent configuration
with st.sidebar:
    st.header("🧠 AI Agent Settings")
    
    # Agent status
    if "agent" not in st.session_state:
        st.session_state.agent = create_enhanced_agent(API_KEY, MODEL)
        st.session_state.agent_initialized = True
    
    agent_summary = st.session_state.agent.get_conversation_summary()
    
    with st.expander("Agent Status", expanded=True):
        col1, col2 = st.columns(2)
        with col1:
            state_color = {
                "idle": "🟢", "thinking": "🟡", "retrieving": "🔵", 
                "analyzing": "🟠", "planning": "🟣", "responding": "⚪", "error": "🔴"
            }
            st.write(f"Status: {state_color.get(agent_summary['current_state'], '⚪')} {agent_summary['current_state'].title()}")
            st.write(f"Conversations: {agent_summary['total_turns']}")
        with col2:
            st.write(f"Confidence: {agent_summary['average_confidence']:.1%}")
            st.write(f"Profile Set: {'✅' if agent_summary['customer_profile_set'] else '❌'}")
    
    if st.button("🔄 Reset Agent Memory"):
        st.session_state.agent.reset_conversation()
        st.rerun()


# ============================== Data =============================== #

@st.cache_data
def load_customer_db() -> pd.DataFrame | None:
    """
    Load your customer CSV, if present.
    """
    csv_paths = [config.CUSTOMERS_CSV]
    for path in csv_paths:
        try:
            return pd.read_csv(path)
        except Exception:
            continue
    st.info("No customer CSV found. You can still upload a KYC PDF.")
    return None

customer_df = load_customer_db()


# ============================== RAG ================================ #

@st.cache_resource(show_spinner=False)
def get_embeddings():
    # Fix for event loop issue in Streamlit
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return GoogleGenerativeAIEmbeddings(model=EMBED_MODEL, google_api_key=API_KEY)

def _pdf_to_text(file_like) -> str:
    try:
        reader = PyPDF2.PdfReader(file_like)
        text = []
        for p in reader.pages:
            text.append(p.extract_text() or "")
        return "\n".join(text)
    except Exception:
        return ""

@st.cache_resource(show_spinner=True)
def build_or_load_index(static_texts: List[str]):
    """Build a FAISS index from provided texts, or load from disk if already present."""
    # Ensure event loop is set for async code
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    emb = get_embeddings()

    # Try to load an existing index
    if os.path.isdir(INDEX_DIR) and os.listdir(INDEX_DIR):
        try:
            return FAISS.load_local(INDEX_DIR, emb, allow_dangerous_deserialization=True)
        except Exception:
            pass

    # Build fresh
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    docs = []
    for i, t in enumerate(static_texts):
        docs.extend(splitter.create_documents([t], metadatas=[{"source": f"doc_{i}"}]))

    if not docs:
        docs = splitter.create_documents(["Empty corpus"], metadatas=[{"source": "doc_0"}])

    vs = FAISS.from_documents(docs, emb)
    vs.save_local(INDEX_DIR)
    return vs


# Sidebar: upload policy/product PDFs → RAG corpus
st.sidebar.subheader("📚 Knowledge Base (RAG)")
kb_texts: List[str] = []

# Optionally seed with local JSONs if present
for base in [config.CLUSTER_META, config.CUSTOMER_DB]:
    if os.path.exists(base):
        try:
            with open(base, "r", encoding="utf-8") as f:
                kb_texts.append(f"{base.name.upper()} JSON\n{f.read()}")
        except Exception:
            pass

uploaded_pdfs = st.sidebar.file_uploader(
    "Upload PDFs (policy, product sheets, guidelines)",
    type=["pdf"], accept_multiple_files=True
)
if uploaded_pdfs:
    for up in uploaded_pdfs:
        kb_texts.append(f"UPLOAD {up.name}\n" + _pdf_to_text(io.BytesIO(up.read())))

vs = build_or_load_index(kb_texts)
st.sidebar.caption("RAG index ready.")

# Update agent's vector store
if vs and hasattr(st.session_state, 'agent'):
    st.session_state.agent.vector_store = vs


# ========================= Main Interface ========================== #

# Create tabs for different functionalities
tab1, tab2, tab3 = st.tabs(["🎯 Customer Setup", "🤖 AI Agent Chat", "📊 Plan Generation"])

with tab1:
    st.header("Customer Profile Setup")
    
    # Customer picker / New KYC
    c1, c2 = st.columns([1, 1])

    with c1:
        st.subheader("Select customer")
        customer_options = customer_df["Customer_ID"].astype(str).tolist() if customer_df is not None else []
        pick = st.selectbox(
            "Choose from DB (or use 'New Customer')",
            ["➕ New Customer"] + customer_options,
            index=0,
            key="customer_selectbox_agent"
        )

        # If a DB customer is picked, set their profile in agent memory
        if pick != "➕ New Customer" and customer_df is not None:
            cust_row = customer_df[customer_df["Customer_ID"].astype(str) == pick]
            if not cust_row.empty:
                # Convert row to dict and set as DBCustomerProfile
                cust_data = cust_row.iloc[0].to_dict()
                try:
                    profile_obj = DBCustomerProfile(**cust_data)
                    st.session_state.agent.memory.customer_profile = profile_obj
                except Exception as e:
                    st.warning(f"Error loading customer profile: {e}")

    with c2:
        st.subheader("New customer KYC/PDF")
        uploaded_kyc = st.file_uploader("Upload KYC / Profile PDF", type=["pdf"])

    def _extract_profile_from_pdf(pdf_text: str) -> Union[NewCustomerProfile, DBCustomerProfile]:
        """Convert raw PDF text into a structured CustomerProfile via LLM."""
        prompt = extract_profile_from_pdf_prompt(pdf_text)
        model = genai.GenerativeModel(MODEL)
        try:
            raw = model.generate_content(prompt).text or "{}"
            data = json.loads(raw) if raw else {}
        except Exception:
            data = {}

        # Convenience default for surplus
        if "Monthly_Surplus" not in data and data.get("Annual_Income") and data.get("Monthly_Expenses"):
            try:
                data["Monthly_Surplus"] = float(data["Annual_Income"]) / 12.0 - float(data["Monthly_Expenses"])
            except Exception:
                pass

            return NewCustomerProfile(**data)

    # Build the working profile (from DB or uploaded KYC)
    profile: Union[NewCustomerProfile, DBCustomerProfile] | None = None
    if pick == "➕ New Customer":

        with tab3:
            st.header("📊 Comprehensive Plan Generation")
            if not hasattr(st.session_state, 'agent') or not st.session_state.agent.memory.customer_profile:
                st.warning("⚠️ Please set up a customer profile first.")
            else:
                profile = st.session_state.agent.memory.customer_profile
                st.markdown("### Select a plan to view:")
                choice = st.radio(
                    " ",
                    ["🎯 Personalized Plan", "👥 Peer/Cluster Plan", "🛡️ Safety-First Plan", "📦 Generate All Three"],
                    index=3,
                    label_visibility="collapsed",
                )

                # ========================== Plan generation ========================= #
                mapping = {
                    "🎯 Personalized Plan": ["personalized"],
                    "👥 Peer/Cluster Plan": ["peer"],
                    "🛡️ Safety-First Plan": ["safety"],
                    "📦 Generate All Three": ["personalized", "peer", "safety"],
                }

                ingest_back = st.checkbox("Add generated plan text to knowledge base for future RAG", value=True)
                if st.button("📋 Generate Plan Text(s)", type="primary"):
                    types = mapping[choice]
                    with st.spinner("Retrieving context & drafting plans..."):
                        bundle = generate_plan_texts(profile=profile, which=types, vs=vs, model_name=MODEL)
                    # Render plans
                    def show_plan(plan):
                        st.subheader(f"{plan.label} Plan")

with tab2:
    st.header("🤖 AI Agent Chat")
    # Chat input
    user_query = st.text_area(
        "Ask me anything about your financial situation:",
        placeholder="e.g., 'What's my risk profile?', 'How should I plan for retirement?', 'Analyze my investment strategy'",
        height=100,
        key="agent_query"
    )
    col1, col2, col3 = st.columns([1, 1, 2])
    with col1:
        if st.button("🚀 Ask Agent", type="primary", disabled=not user_query.strip()):
            if user_query.strip():
                with st.spinner("🧠 Agent is thinking..."):
                    try:
                        loop = asyncio.get_event_loop()
                    except RuntimeError:
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                    try:
                        turn = loop.run_until_complete(
                            st.session_state.agent.process_query(user_query.strip())
                        )
                        # Ensure conversation history is updated
                        mem = st.session_state.agent.memory
                        user_msg = user_query.strip()
                        agent_msg = getattr(turn, 'agent_response', '')
                        # Use 'conversation' if available, else 'history'
                        if hasattr(mem, 'conversation_history') and isinstance(mem.conversation_history, list):
                            from ai_agent_system import ConversationTurn, AgentState
                            mem.conversation_history.append(ConversationTurn(
                                user_message=user_msg,
                                agent_response=agent_msg,
                                agent_state=AgentState.RESPONDING,
                                retrieved_docs=[],
                                confidence_score=getattr(turn, 'confidence_score', 0.8),
                                processing_time=getattr(turn, 'processing_time', 0.0)
                            ))
                        # 'history' field does not exist in AgentMemory
                    finally:
                        loop.close()
                    # Clear the input
                    st.rerun()

    # Show conversation history
    st.markdown("### 🗣️ Conversation History")
    mem = st.session_state.agent.memory
    # Ensure conversation/history is always a list
    if not hasattr(mem, 'conversation_history') or not isinstance(mem.conversation_history, list):
        mem.conversation_history = []
    # 'history' field does not exist in AgentMemory, so do not initialize
    # Prefer 'conversation', fallback to 'history'
    conv = mem.conversation_history
    if conv:
        shown = False
        if conv:
            latest_user_msg = getattr(conv[-1], 'user_message', '').strip()
            latest_agent_msg = getattr(conv[-1], 'agent_response', '').strip()
            if latest_user_msg:
                st.markdown(f"**User:** {latest_user_msg}")
            if latest_agent_msg:
                st.markdown(f"**Agent:** {latest_agent_msg}")
        else:
            st.info("No conversation history yet.")
    else:
        st.info("No conversation history yet.")
    with col2:
        # Quick action buttons
        st.markdown("**Quick Actions:**")
        if st.button("🎯 Analyze Risk Profile"):
            # Use a different session state key for quick actions
            st.session_state.quick_query = "What is my risk profile and what investments are suitable for me?"
            st.rerun()
        if st.button("💰 Plan My Goals"):
            st.session_state.quick_query = "Help me create a detailed plan for my financial goals with specific recommendations."
            st.rerun()
        if st.button("📊 Review Portfolio"):
            st.session_state.quick_query = "What should be my ideal asset allocation and how should I structure my portfolio?"
            st.rerun()
        # Display quick query if set
        if "quick_query" in st.session_state and st.session_state.quick_query:
            st.info(f"Quick Query: {st.session_state.quick_query}")
            if st.button("🚀 Execute Quick Query"):
                query_to_process = st.session_state.quick_query
                st.session_state.quick_query = ""  # Clear after use
                with st.spinner("🧠 Agent is thinking..."):
                    try:
                        loop = asyncio.get_event_loop()
                    except RuntimeError:
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                    try:
                        turn = loop.run_until_complete(
                            st.session_state.agent.process_query(query_to_process)
                        )
                        # Ensure conversation history is updated
                        mem = st.session_state.agent.memory
                        user_msg = query_to_process
                        agent_msg = getattr(turn, 'agent_response', '')
                        if hasattr(mem, 'conversation_history') and isinstance(mem.conversation_history, list):
                            from ai_agent_system import ConversationTurn, AgentState
                            mem.conversation_history.append(ConversationTurn(
                                user_message=user_msg,
                                agent_response=agent_msg,
                                agent_state=AgentState.RESPONDING,
                                retrieved_docs=[],
                                confidence_score=getattr(turn, 'confidence_score', 0.8),
                                processing_time=getattr(turn, 'processing_time', 0.0)
                            ))
                        elif hasattr(mem, 'history') and isinstance(mem.history, list):
                            mem.history.append({'user': user_msg, 'agent': agent_msg})
                        # Display the response
                        st.markdown("### 🤖 Agent Response")
                        st.markdown(turn.agent_response)
                        # Display metadata
                        col_meta1, col_meta2, col_meta3 = st.columns(3)
                        with col_meta1:
                            st.metric("Confidence", f"{turn.confidence_score:.1%}")
                        with col_meta2:
                            st.metric("Processing Time", f"{turn.processing_time:.2f}s")
                        with col_meta3:
                            st.metric("Sources Used", len(turn.retrieved_docs))
                        if turn.retrieved_docs:
                            with st.expander("📚 Sources Referenced"):
                                for doc in turn.retrieved_docs:
                                    st.write(f"• {doc}")
                    finally:
                        loop.close()
                    st.rerun()

with tab3:
    st.header("📊 Comprehensive Plan Generation")
    
    if not hasattr(st.session_state, 'agent') or not st.session_state.agent.memory.customer_profile:
        st.warning("⚠️ Please set up a customer profile first.")
    else:
        profile = st.session_state.agent.memory.customer_profile
        
        st.markdown("### Select a plan to view:")
        choice = st.radio(
            " ",
            ["🎯 Personalized Plan", "👥 Peer/Cluster Plan", "🛡️ Safety-First Plan", "📦 Generate All Three"],
            index=3,
            label_visibility="collapsed",
        )

        # ========================== Plan generation ========================= #

    mapping = {
        "🎯 Personalized Plan": ["personalized"],
        "👥 Peer/Cluster Plan": ["peer"],
        "🛡️ Safety-First Plan": ["safety"],
        "📦 Generate All Three": ["personalized", "peer", "safety"],
    }

    def _rag_answer(model_name: str, vs, question: str, profile: Union[NewCustomerProfile, DBCustomerProfile]) -> str:
        """Grounded Q&A: retrieve top-k chunks, add compact profile summary, and answer strictly from the retrieved context."""
        prof_snip = json.dumps(profile.model_dump(), ensure_ascii=False)
        retrieval_query = f"Customer profile: {prof_snip}\nQuestion: {question}"

        try:
            docs = vs.similarity_search(retrieval_query, k=5)
        except Exception:
            docs = []

        context_block = "\n\n".join(
            f"[{d.metadata.get('source','doc')}] {d.page_content}" for d in docs
        ) or "No relevant context."

        prompt = f"""
    You are a financial assistant. Answer the user's question using ONLY the context.

    Question:
    {question}

    Context:
    {context_block}

    Instructions:
    - If information is missing in the context, say exactly what else is needed (briefly).
    - Be concise and bank-compliant. Plain text only.
    """
        model = genai.GenerativeModel(model_name)
        resp = model.generate_content([prompt])
        return (resp.text or "").strip()

    ingest_back = st.checkbox("Add generated plan text to knowledge base for future RAG", value=True)
    if st.button("📋 Generate Plan Text(s)", type="primary"):
        types = mapping[choice]
        with st.spinner("Retrieving context & drafting plans..."):
            bundle = generate_plan_texts(profile=profile, which=types, vs=vs, model_name=MODEL)

        # Render plans
        def show_plan(plan):
            st.subheader(f"{plan.label} Plan")
            if plan.swot:
                sw = plan.swot
                st.markdown("**SWOT (structured)**")
                colS, colW, colO, colT = st.columns(4)
                with colS: 
                    st.markdown("**Strengths**")
                    st.write("\n".join(f"• {x}" for x in sw.strengths) or "-")
                with colW: 
                    st.markdown("**Weaknesses**")
                    st.write("\n".join(f"• {x}" for x in sw.weaknesses) or "-")
                with colO: 
                    st.markdown("**Opportunities**")
                    st.write("\n".join(f"• {x}" for x in sw.opportunities) or "-")
                with colT: 
                    st.markdown("**Threats**")
                    st.write("\n".join(f"• {x}" for x in sw.threats) or "-")
            st.markdown("---")
            st.markdown(plan.narrative)
            if plan.citations:
                st.caption("Sources: " + ", ".join(f"`{c}`" for c in plan.citations))

        # Show generated plans
        if bundle and hasattr(bundle, 'plans'):
            if len(bundle.plans) > 1:
                tabs = st.tabs([p.label for p in bundle.plans])
                for t, plan in zip(tabs, bundle.plans):
                    with t:
                        show_plan(plan)
            elif len(bundle.plans) == 1:
                show_plan(bundle.plans[0])
            else:
                st.warning("No plan generated.")

        # -------------------- Personalized Q&A (RAG) -------------------- #
        st.markdown("---")
        st.subheader("🧠 Ask a personalized question")

        q = st.text_area(
            "Type your question about your financial situation or the plan(s).",
            placeholder="e.g., Is my emergency fund enough? Should I adjust equity before the education goal?",
            height=100,
        )

        col_q1, col_q2 = st.columns([1, 4])
        with col_q1:
            ask_btn = st.button("Get Answer", type="primary", use_container_width=True)

        if ask_btn and q.strip():
            with st.spinner("Retrieving context & drafting an answer..."):
                answer_text = _rag_answer(MODEL, vs, q.strip(), profile)
            st.markdown("**Answer**")
            st.write(answer_text)
            st.caption("Tip: Upload more policy/product docs or generate plans first—the system will use them as context.")


# ========================= Footer ========================== #

st.markdown("---")
st.markdown("""
### 🚀 Enhanced AI Financial Planning Agent Features:

**🧠 Intelligent Agent Capabilities:**
- Advanced intent recognition and context understanding  
- Multi-tool integration (Risk Assessment, Goal Planning, Portfolio Analysis)
- Conversation memory and context management
- Confidence scoring and error handling

**🎯 Specialized Tools:**
- **Risk Assessment Tool**: Comprehensive risk profiling with personalized recommendations
- **Goal Planning Tool**: Detailed goal-based planning with SIP calculations  
- **Portfolio Analysis Tool**: Asset allocation optimization and rebalancing advice

**💬 Natural Language Interface:**
- Chat with the AI agent using natural language
- Get personalized financial advice based on your profile
- Contextual responses using RAG (Retrieval Augmented Generation)

**📊 Comprehensive Planning:**
- Traditional plan generation (Personalized, Peer/Cluster, Safety-First)
- SWOT analysis integration
- Real-time Q&A with knowledge base

*Powered by Google Gemini AI, LangChain, and advanced Pydantic data models*
""")

