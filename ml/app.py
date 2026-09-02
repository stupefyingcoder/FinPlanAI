import os
import json
import streamlit as st
from dotenv import load_dotenv
import google.generativeai as genai
from prompt import bank_batch_prompt, user_plan_prompt

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")
MODEL = os.getenv("MODEL", "gemini-2.5-flash")

if not API_KEY:
    st.error("GEMINI_API_KEY missing in .env")
    st.stop()

genai.configure(api_key=API_KEY)

with open("cluster_meta.json", "r", encoding="utf-8") as f:
    CLUSTER_META = json.load(f)

def heuristic_cluster_map(customer: dict) -> int:
    goal = (customer.get("Primary_Financial_Goal", "") or "").lower()
    nw = float(customer.get("Current_Net_Worth", 0) or 0)
    age = int(customer.get("Age", 0) or 0)
    rta = (customer.get("Risk_Taking_Ability", "") or "").lower()
    horizon = (customer.get("Preferred_Investment_Horizon", "") or "").lower()

    if "retire" in goal or (nw > 1.5e7 and age >= 35):
        return 0
    if "emergency" in goal or nw < 3e5:
        return 2
    if age <= 30 and "high" in rta:
        return 3
    if age >= 50 or "short" in horizon:
        return 4
    return 1

def cluster_label(cid: int) -> str:
    return CLUSTER_META["cluster_labels"].get(str(cid), "Unknown")

st.title("Finance Planning GenAI Chatbot")

tab1, tab2, tab3 = st.tabs(["Generic Cluster Plans", "User Plan", "Chatbot"])

with tab1:
    st.header("Generic Cluster-Based Plans")
    if st.button("Generate Generic Plans"):
        try:
            model = genai.GenerativeModel(MODEL)
            resp = model.generate_content(bank_batch_prompt)
            st.success("Plans generated!")
            st.markdown(resp.text)
        except Exception as e:
            st.error(f"Error: {e}")

with tab2:
    st.header("Personalized User Plan")
    st.write("Paste your customer JSON below:")
    user_json = st.text_area("Customer JSON", height=200, value='{\n  "Customer_ID": "CUST100000",\n  "Age": 25,\n  "Current_Net_Worth": 637402,\n  "Risk_Taking_Ability": "High",\n  "Primary_Financial_Goal": "Retirement",\n  "Preferred_Investment_Horizon": "Long"\n}')
    if st.button("Generate User Plan"):
        try:
            customer = json.loads(user_json)
            cid = heuristic_cluster_map(customer)
            label = cluster_label(cid)
            prompt = user_plan_prompt(cid, label, customer)
            model = genai.GenerativeModel(MODEL)
            resp = model.generate_content(prompt)
            st.success(f"Cluster: {cid} - {label}")
            st.markdown(resp.text)
        except Exception as e:
            st.error(f"Error: {e}")

with tab3:
    st.header("Ask the Finance Chatbot")
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []

    user_input = st.chat_input("Type your finance question here...")

    if user_input:
        st.session_state.chat_history.append({"role": "user", "content": user_input})
        # Compose prompt with history for context
        history_text = ""
        for msg in st.session_state.chat_history:
            if msg["role"] == "user":
                history_text += f"User: {msg['content']}\n"
            else:
                history_text += f"Assistant: {msg['content']}\n"
        prompt = f"""
You are a helpful, bank-compliant financial planning assistant. Answer user questions about finance, investments, saving, retirement, risk, and related topics in clear, readable text. Do not provide investment advice. Be neutral and informative.

Conversation history:
{history_text}
Assistant:
"""
        model = genai.GenerativeModel(MODEL)
        try:
            resp = model.generate_content(prompt)
            answer = resp.text
        except Exception as e:
            answer = f"Error: {e}"
        st.session_state.chat_history.append({"role": "assistant", "content": answer})

    # Display chat history
    for msg in st.session_state.chat_history:
        if msg["role"] == "user":
            st.markdown(f"**You:** {msg['content']}")
        else:
            st.markdown(f"**Assistant:** {msg['content']}")