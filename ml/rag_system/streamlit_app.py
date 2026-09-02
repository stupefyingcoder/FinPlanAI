from cluster_utils import get_customer_cluster, cluster_labels

import streamlit as st
from agent_graph import FinancialAgentGraph
from models import CustomerProfile
from main_rag import doc_loader
from gemini_llm_tool import GeminiPlanTool as gemini_tool
import os

st.title("Personalized Financial Planning Chatbot")

data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../data'))


# Load all customers from CSV
import pandas as pd
csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../data/model data/finance_planning_customers_5000_v2_augmented_with_insurance_cat.csv'))
df = pd.read_csv(csv_path)
if "customer_options" not in st.session_state:
    st.session_state.customer_options = {}
    for _, row in df.iterrows():
        cust_id = str(row.get('Customer_ID', row.name))
        st.session_state.customer_options[cust_id] = CustomerProfile(
            customer_id=cust_id,
            name=row.get('Name', f"Customer {cust_id}"),
            age=row.get('Age', None),
            income=row.get('Current_Net_Worth', None),
            Loan_EMI_Obligations=row.get('Loan_EMI_Obligations', None),
            Credit_Score=row.get('Credit_Score', None),
            Risk_Taking_Ability=row.get('Risk_Taking_Ability', None)
        )

# Pre-parse loan and insurance PDFs for RAG context
loan_pdf_path = os.path.join(data_dir, 'loan.pdf')
ins_pdf_path = os.path.join(data_dir, 'ins.pdf')
def get_parsed_doc_text(pdf_path):
    if os.path.exists(pdf_path):
        docs = doc_loader.load_documents()
        for doc in docs:
            if pdf_path in doc.metadata.get("source", ""):
                return doc.page_content
    return None
loan_doc_text = get_parsed_doc_text(loan_pdf_path)
ins_doc_text = get_parsed_doc_text(ins_pdf_path)


# Dropdown for customer selection
selected_customer_id = st.selectbox("Select Customer", list(st.session_state.customer_options.keys()))
user_query = st.text_area("Your Query", value="Suggest a financial plan for retirement considering my current loans and insurance.")


# Option to upload profile PDF for personalized plan (even for new customers)
st.markdown("*Upload a profile PDF for personalized plan (optional):*")
profile_file = st.file_uploader("Attach profile PDF", type=["pdf"], key="profile_upload")
profile_doc_text = None
if profile_file is not None:
    file_path = os.path.join(data_dir, f"profile_{selected_customer_id}.pdf")
    with open(file_path, "wb") as f:
        f.write(profile_file.getbuffer())
    st.success(f"Profile document attached for customer {selected_customer_id}")
    # Parse uploaded profile PDF
    docs = doc_loader.load_documents()
    for doc in docs:
        if file_path in doc.metadata.get("source", ""):
            profile_doc_text = doc.page_content

# Retrieve the correct document for the selected customer

# Compose RAG context for selected customer
def get_rag_context(customer_id):
    context_docs = []
    # Add loan and insurance docs
    if loan_doc_text:
        context_docs.append(f"Loan Document: {loan_doc_text}")
    if ins_doc_text:
        context_docs.append(f"Insurance Document: {ins_doc_text}")
    # Add profile doc if uploaded
    if profile_doc_text:
        context_docs.append(f"Profile Document: {profile_doc_text}")
    return "\n\n".join(context_docs) if context_docs else None

if st.button("Generate Plan"):
    customer = st.session_state.customer_options[selected_customer_id]
    rag_context = get_rag_context(selected_customer_id)
    # Extract net worth and financial goal
    net_worth = getattr(customer, 'income', None)
    financial_goal = None
    # Try to extract financial goal from profile_doc_text (if available)
    if profile_doc_text and isinstance(profile_doc_text, str):
        import re
        match = re.search(r'Primary Financial Goal[:\-]?\s*([\w\s]+)', profile_doc_text, re.IGNORECASE)
        if match:
            financial_goal = match.group(1).strip()
    if not financial_goal and 'goal' in user_query.lower():
        financial_goal = user_query
    # Always fit into one of 5 clusters
    cluster_num, cluster_label = get_customer_cluster(selected_customer_id, net_worth, financial_goal)
    if not cluster_label:
        # Fallback: pick closest cluster by net worth
        from cluster_utils import cluster_labels
        cluster_label = list(cluster_labels.values())[0]  # Default to first cluster
        cluster_num = list(cluster_labels.keys())[0]
    st.subheader("Customer Profile")
    st.json(customer.model_dump())
    # Show risk classification
    risk = getattr(customer, 'Risk_Taking_Ability', None)
    st.write(f"Risk Classification: {risk}" if risk else "Risk Classification: Not available")
    # Show RAG context
    if rag_context:
        st.markdown("*Relevant Documents (RAG Context):*")
        st.write(rag_context)
    # Compose context for LLM using actual customer profile and parsed document
    # Load investment classes
    import json
    with open(r"c:\Users\Sanika\OneDrive\Desktop\projects\cognizant hackathon\real 1\data\model data\classes.json", "r") as f:
        classes = json.load(f)["classes"]
    classes_str = ", ".join(classes)
    st.session_state.classes_str = classes_str
    # Update LLM prompt to request three distinct plans
    context = (
        f"Customer Profile: {customer.model_dump()}\n"
        f"Documents: {rag_context if rag_context else 'No additional documents.'}\n"
        f"Net Worth: {net_worth}\nFinancial Goal: {financial_goal}\n"
        f"Fit this customer into one of the following clusters: {list(cluster_labels.values())}. Assign the most appropriate cluster and generate three distinct financial plans for this customer based on their cluster characteristics.\n"
        f"Classify the customer's risk profile as: Low, Medium, or High.\n"
        f"For the plans, recommend how much to invest in each of the following options: {classes_str}. Output allocation as percentages for each class. Generate three different strategies: Conservative, Balanced, and Aggressive. For each, output in this format: 'Strategy: <strategy_name>\nCluster: <cluster_label>\nRisk: <risk_classification>\nPlan: <allocation breakdown and advice>'"
    )
    plans_output = gemini_tool._run(context)
    # Parse LLM output to extract three plans
    import re
    plan_pattern = re.compile(r"Strategy[:\-]?\s*(\w+)\s*Cluster[:\-]?\s*([\w\s•/]+)\s*Risk[:\-]?\s*([\w]+)\s*Plan[:\-]?\s*(.*?)(?=Strategy[:\-]?|$)", re.DOTALL)
    plans = []
    for match in plan_pattern.finditer(plans_output):
        strategy = match.group(1).strip()
        cluster = match.group(2).strip()
        risk = match.group(3).strip()
        plan_text = match.group(4).strip()
        plans.append({"strategy": strategy, "cluster": cluster, "risk": risk, "plan_text": plan_text})
    if not plans:
        # fallback: treat as single plan
        plans = [{"strategy": "Default", "cluster": None, "risk": None, "plan_text": plans_output}]
    # UI to select plan
    strategy_names = [p["strategy"] for p in plans]
    selected_strategy = st.selectbox("Select Strategy", strategy_names)
    selected_plan = next((p for p in plans if p["strategy"] == selected_strategy), plans[0])
    st.subheader(f"Cluster Assignment ({selected_plan['strategy']})")
    st.write(selected_plan["cluster"] if selected_plan["cluster"] else "Cluster not found in LLM output.")
    st.write(f"Risk Classification: {selected_plan['risk']}")
    st.subheader(f"Generated Financial Plan ({selected_plan['strategy']})")
    st.write(selected_plan["plan_text"])
    # Store for chatbot section
    st.session_state.assigned_cluster = selected_plan["cluster"]
    st.session_state.plan_text = selected_plan["plan_text"]
    st.session_state.customer = customer
    st.session_state.selected_strategy = selected_plan["strategy"]
    # --- Smart Financial Visualizations ---
    import matplotlib.pyplot as plt
    import pandas as pd
    # Always re-parse allocation from latest plan_text
    alloc = {}
    for line in selected_plan["plan_text"].splitlines():
        if ':' in line:
            k, v = line.split(':', 1)
            k = k.strip()
            v = v.strip().replace('%','')
            try:
                alloc[k] = float(v)
            except:
                continue
    st.write("[DEBUG] Detected allocation values:", alloc)
    if alloc:
        fig1, ax1 = plt.subplots()
        ax1.pie(list(alloc.values()), labels=list(alloc.keys()), autopct='%1.1f%%', startangle=90)
        ax1.axis('equal')
        st.subheader("Investment Allocation Pie Chart")
        st.pyplot(fig1)
    # Debt/EMI graphs if customer has high debt/EMI
    debt = getattr(customer, 'Loan_EMI_Obligations', None)
    net_worth = getattr(customer, 'income', None)
    st.write(f"[DEBUG] Debt: {debt}, Net Worth: {net_worth}")
    if debt and net_worth and debt/net_worth > 0.3:
        fig2, ax2 = plt.subplots()
        ax2.bar(['Net Worth', 'Debt/EMI'], [net_worth, debt], color=['green','red'])
        ax2.set_ylabel('Amount (₹)')
        st.subheader("Debt vs Net Worth Comparison")
        st.pyplot(fig2)
    if debt:
        emi_data = {'Type': ['Loan EMI'], 'Amount': [debt]}
        df_emi = pd.DataFrame(emi_data)
        st.subheader("EMI Breakdown Table")
        st.table(df_emi)

# --- Chatbot Section (separate, only enabled after plan is generated) ---
st.subheader("Financial Plan Chatbot")
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

if "plan_text" not in st.session_state or "assigned_cluster" not in st.session_state or "customer" not in st.session_state or "classes_str" not in st.session_state:
    st.info("Generate a financial plan first to enable the chatbot.")
else:
    chat_input = st.text_input("Ask a question about your financial plan or investments:")
    if chat_input:
        # Orchestrate LLM response using plan, cluster, customer profile
        chat_context = (
            f"Customer Profile: {st.session_state.customer.model_dump()}\nCluster: {st.session_state.assigned_cluster}\nFinancial Plan: {st.session_state.plan_text}\n"
            f"Investment Options: {st.session_state.classes_str}\n"
            f"User Question: {chat_input}\n"
            f"Answer the user's question based on their financial plan, cluster, and investment options. Be specific and helpful."
        )
        chat_response = gemini_tool._run(chat_context)
        st.session_state.chat_history.append((chat_input, chat_response))
    if st.session_state.chat_history:
        for q, a in st.session_state.chat_history:
            st.markdown(f"*User:* {q}")
            st.markdown(f"*Bot:* {a}")