# enhanced_app.py
from __future__ import annotations
from typing import Union
import os, io, json
from typing import List

import streamlit as st
from dotenv import load_dotenv
import google.generativeai as genai
import pandas as pd
import PyPDF2

# RAG
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Local modules
from schemas_v2 import NewCustomerProfile, DBCustomerProfile
from three_plan import generate_plan_texts
from prompt import extract_profile_from_pdf_prompt


# ============================== Config ============================== #

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")
MODEL = os.getenv("MODEL", "gemini-2.5-flash")
EMBED_MODEL = os.getenv("EMBED_MODEL", "models/text-embedding-004")

if not API_KEY:
    st.error("GEMINI_API_KEY missing in .env")
    st.stop()

genai.configure(api_key=API_KEY)

INDEX_DIR = "rag_index_faiss"
CHUNK_SIZE = 900
CHUNK_OVERLAP = 150

st.set_page_config(page_title="AI Financial Plans (Text + RAG)", layout="wide")
st.title("Choose and View Personalized Financial Plans")


# ============================== Data =============================== #

@st.cache_data
def load_customer_db() -> pd.DataFrame | None:
    """
    Load your customer CSV, if present.
    """
    csv_paths = [
        "c:/Users/Sanika/OneDrive/Desktop/interview prep/chatbot_rag/chatbot_rag/chatbot/chatbot/real 1/data/finance_planning_customers_5000_v2_augmented_with_insurance_cat.csv",
        "chatbot/chatbot/real 1/data/finance_planning_customers_5000_v2_augmented_with_insurance_cat.csv",
        "data/finance_planning_customers_5000_v2_augmented_with_insurance_cat.csv"
    ]
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
    import asyncio
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        asyncio.set_event_loop(asyncio.new_event_loop())
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
    """
    Build a FAISS index from provided texts, or load from disk if already present.
    """
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
for base in ["cluster_meta.json", "customer_db.json"]:
    if os.path.exists(base):
        try:
            with open(base, "r", encoding="utf-8") as f:
                kb_texts.append(f"{base.upper()} JSON\n{f.read()}")
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


# ========================= Plan selectors ========================== #


st.markdown("### Select a plan to view:")
choice = st.radio(
    " ",
    ["🎯 Personalized Plan", "👥 Peer/Cluster Plan", "🛡️ Safety-First Plan", "📦 Generate All Three"],
    index=3,
    label_visibility="collapsed",
)

# Customer picker / New KYC
c1, c2 = st.columns([1, 1])

with c1:
    st.subheader("Select customer")
    customer_options = customer_df["Customer_ID"].astype(str).tolist() if customer_df is not None else []
    pick = st.selectbox(
        "Choose from DB (or use 'New Customer')",
        ["➕ New Customer"] + customer_options,
        index=0,
        key="customer_selectbox"
    )

with c2:
    st.subheader("New customer KYC/PDF")
    uploaded_kyc = st.file_uploader("Upload KYC / Profile PDF", type=["pdf"])


def _extract_profile_from_pdf(pdf_text: str) -> Union[NewCustomerProfile, DBCustomerProfile]:
    """
    Convert raw PDF text into a structured CustomerProfile via LLM.
    """
    prompt = extract_profile_from_pdf_prompt(pdf_text)
    model = genai.GenerativeModel(MODEL)
    try:
        raw = model.generate_content(prompt).text or "{}"
        data = json.loads(raw)
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
    if uploaded_kyc is None:
        st.info("Upload a KYC/Profile PDF to proceed.")
    else:
        with st.spinner("Parsing KYC PDF..."):
            pdf_text = _pdf_to_text(io.BytesIO(uploaded_kyc.read()))
            profile = _extract_profile_from_pdf(pdf_text)
elif pick in (customer_df["Customer_ID"].tolist() if customer_df is not None else []):
    if customer_df is not None:
        row = customer_df[customer_df["Customer_ID"] == pick].iloc[0]
        d = row.to_dict()
    profile = NewCustomerProfile(
            Customer_ID=str(d.get("Customer_ID", "unknown")),
            Name=str(d.get("Name", "")) if "Name" in d else None,
            Age=int(d.get("Age", 0)) if d.get("Age") is not None else None,
            Gender=d.get("Gender"),
            Occupation=d.get("Occupation"),
            Marital_Status=d.get("Marital_Status"),
            Number_of_Dependents=int(d.get("Number_of_Dependents", 0))
                if d.get("Number_of_Dependents") is not None else None,
            Annual_Income=float(d.get("Annual_Income", 0) or 0),
            Monthly_Expenses=float(d.get("Monthly_Expenses", 0) or 0),
            Current_Net_Worth=float(d.get("Current_Net_Worth", 0) or 0),
            Risk_Taking_Ability=d.get("Risk_Taking_Ability"),
            Preferred_Investment_Horizon=d.get("Preferred_Investment_Horizon"),
            Primary_Financial_Goal=d.get("Primary_Financial_Goal"),
            Goal_Timeline_Years=int(d.get("Goal_Timeline(Years)", d.get("Horizon_Years", 10)) or 10),
            Monthly_Surplus=float(
                d.get(
                    "Monthly_Surplus",
                    (float(d.get("Annual_Income", 0)) / 12.0 - float(d.get("Monthly_Expenses", 0)))
                )
            ),
            Starting_Principal=float(d.get("Starting_Principal", d.get("Current_Net_Worth", 0)) or 0),
            Inflation_Rate_At_Investment_Start=float(d.get("Inflation_Rate_At_Investment_Start", 5) or 5),
        )

# Show parsed/selected profile
def filter_clustering_features(customer_profile, feature_columns_path):
    """
    Filters the customer profile to only include features required for clustering.
    Args:
        customer_profile (dict): The full customer profile.
        feature_columns_path (str): Path to feature_columns.json.
    Returns:
        dict: Filtered profile with only clustering features.
    """
    with open(feature_columns_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        clustering_features = data["feature_columns"] if isinstance(data, dict) else data
    # If customer_profile is a Pydantic model, convert to dict
    if hasattr(customer_profile, 'model_dump'):
        customer_profile = customer_profile.model_dump()
    filtered = {}
    for k in clustering_features:
        if k in customer_profile:
            filtered[k] = customer_profile[k]
        else:
            # Synthesize missing features with believable defaults
            # Numeric features: use mean of available numeric values
            # Categorical/one-hot: set to 0 (not active)
            if any(word in k.lower() for word in ["amt", "amount", "score", "ratio", "age", "income", "net_worth", "timeline", "years", "expenses", "principal"]):
                numeric_values = [v for v in customer_profile.values() if isinstance(v, (int, float))]
                filtered[k] = sum(numeric_values) / len(numeric_values) if numeric_values else 0
            else:
                filtered[k] = 0
    return filtered

FEATURE_COLUMNS_PATH = "data/model data/feature_columns.json"

if profile:
    with st.expander("Customer Profile (parsed)", expanded=False):
        st.json(profile.model_dump(), expanded=False)
    clustering_features = filter_clustering_features(profile, FEATURE_COLUMNS_PATH)
    with st.expander("Clustering Features (filtered)", expanded=False):
        st.json(clustering_features, expanded=False)


# ========================== Plan generation ========================= #

mapping = {
    "🎯 Personalized Plan": ["personalized"],
    "👥 Peer/Cluster Plan": ["peer"],
    "🛡️ Safety-First Plan": ["safety"],
    "📦 Generate All Three": ["personalized", "peer", "safety"],
}

def _rag_answer(model_name: str, vs, question: str, profile: Union[NewCustomerProfile, DBCustomerProfile]) -> str:
    """
    Grounded Q&A: retrieve top-k chunks, add compact profile summary,
    and answer strictly from the retrieved context.
    """
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


if profile:
    ingest_back = st.checkbox("Add generated plan text to knowledge base for future RAG", value=True)

    if st.button("Generate Plan Text(s)", type="primary"):
        types = mapping[choice]

        with st.spinner("Retrieving context & drafting plans..."):
            bundle = generate_plan_texts(profile=profile, which=types, vs=vs, model_name=MODEL)

        # Render plans
        def show_plan(plan):
            st.subheader(f"{plan.label} Plan")
            if plan.label.lower().startswith("personalized") and plan.swot:
                st.markdown("**Personalized Plan Strengths**")
                st.write("\n".join(f"• {x}" for x in plan.swot.strengths) or "-")
            elif plan.swot:
                sw = plan.swot
                st.markdown("**SWOT (structured)**")
                colS, colW, colO, colT = st.columns(4)
                with colS: st.write("\n".join(f"• {x}" for x in sw.strengths) or "-")
                with colW: st.write("\n".join(f"• {x}" for x in sw.weaknesses) or "-")
                with colO: st.write("\n".join(f"• {x}" for x in sw.opportunities) or "-")
                with colT: st.write("\n".join(f"• {x}" for x in sw.threats) or "-")
            st.markdown("---")
            st.markdown(plan.narrative)
            if plan.citations:
                st.caption("Sources: " + ", ".join(f"`{c}`" for c in plan.citations))
            with st.expander("Optional: View projections (if needed)"):
                st.info("Projections are intentionally hidden by default. Add your projection code here if required.")

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

else:
    st.info("Pick a customer or upload a KYC PDF to begin.")
