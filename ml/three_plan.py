# three_plan.py
from __future__ import annotations
from typing import Union
import json
from typing import List, Tuple, Optional


import google.generativeai as genai
from schemas_v2 import NewCustomerProfile, DBCustomerProfile, SWOT, PlanText, CustomerPlanTexts
from prompt import (
    personalized_plan_prompt, peer_plan_prompt, safety_plan_prompt,
    swot_json_prompt
)

# PyTorch model loading
import torch
import numpy as np

# Model and feature config
MODEL_PATH = "data/model data/full_portfolio_model.pth"
MODEL_EXPLANATION_PATH = "data/model data/model_explanation.json"

def load_allocation_model():
    try:
        model = torch.load(MODEL_PATH, map_location=torch.device('cpu'))
        model.eval()
        return model
    except Exception as e:
        print(f"Error loading allocation model: {e}")
        return None

def load_model_features():
    try:
        with open(MODEL_EXPLANATION_PATH, "r", encoding="utf-8") as f:
            config = json.load(f)
        return config["Input Features"]["Features"], config["Output Features"]["Features"]
    except Exception as e:
        print(f"Error loading model features: {e}")
        return [], []

def extract_features_from_profile(profile: Union[NewCustomerProfile, DBCustomerProfile], feature_names: list):
    # Map profile fields to model input features (simple demo, expand as needed)
    feature_map = {
        "Risk_Appetite": profile.Risk_Taking_Ability or "moderate",
        "Age": profile.Age or 35,
        "Financial_Knowledge_Level": 2, # Placeholder, add to profile if needed
        "Investment_Goal_Wealth Growth": int("wealth" in (profile.Primary_Financial_Goal or "").lower()),
        "Investment_Goal_Retirement": int("retirement" in (profile.Primary_Financial_Goal or "").lower()),
        "Investment_Goal_Short-term Gains": int("short" in (profile.Primary_Financial_Goal or "").lower()),
        "Investment_Goal_Tax Saving": int("tax" in (profile.Primary_Financial_Goal or "").lower()),
        "Investment_Goal_Children Education": int("education" in (profile.Primary_Financial_Goal or "").lower()),
        "Investment_Horizon_Years": profile.Goal_Timeline_Years or 5,
        "Avg_Investment_Size_INR": profile.Starting_Principal or 100000,
        "Cluster_ID": 0 # Placeholder, add cluster logic if needed
    }
    # Convert to ordered feature vector
    features = [feature_map.get(name, 0) for name in feature_names]
    # Convert categorical to numeric if needed (simple demo)
    for i, name in enumerate(feature_names):
        if name == "Risk_Appetite":
            val = str(features[i]).lower()
            features[i] = {"low": 0, "moderate": 1, "high": 2}.get(val, 1)
    return np.array(features, dtype=np.float32)

def predict_allocation(profile: Union[NewCustomerProfile, DBCustomerProfile]):
    model = load_allocation_model()
    input_features, output_features = load_model_features()
    if model is None or not input_features or not output_features:
        return None
    x = extract_features_from_profile(profile, input_features)
    x_tensor = torch.tensor(x).unsqueeze(0)
    with torch.no_grad():
        y_pred = model(x_tensor).numpy().flatten()
    # Normalize to sum to 100%
    y_pred = np.maximum(y_pred, 0)
    y_pred = 100 * y_pred / (np.sum(y_pred) + 1e-6)
    return dict(zip(output_features, y_pred))


# ------------------------- RAG Helpers ------------------------- #

def _retrieve(vs, query: str, k: int = 4) -> Tuple[str, List[str]]:
    """
    Retrieve top-k documents and return a concatenated context string plus
    a list of citation ids.
    """
    if vs is None:
        return "No context.", []
    docs = vs.similarity_search(query, k=k)
    context = "\n\n".join(f"[{d.metadata.get('source','doc')}] {d.page_content}" for d in docs)
    cites = []
    seen = set()
    for d in docs:
        src = d.metadata.get("source", "doc")
        if src not in seen:
            cites.append(src); seen.add(src)
    return (context or "No context."), cites


def _llm_text(model_name: str, parts: List[str]) -> str:
    model = genai.GenerativeModel(model_name)
    resp = model.generate_content(parts)
    return (resp.text or "").strip()


def _llm_json(model_name: str, parts: List[str]) -> dict:
    text = _llm_text(model_name, parts)
    try:
        return json.loads(text)
    except Exception:
        # very defensive fallback
        return {"strengths": [], "weaknesses": [], "opportunities": [], "threats": []}


# ------------------- Knowledge base ingestion ------------------ #

def kb_ingest_text(vs, text: str, source_id: str = "generated_note"):
    """
    Add generated text back into FAISS so future queries can cite it.
    """
    try:
        # LC FAISS supports add_texts
        vs.add_texts([text], metadatas=[{"source": source_id}])
        # persist to disk if supported
        if hasattr(vs, "save_local"):
            vs.save_local("rag_index_faiss")
    except Exception:
        pass


# ------------------------- Main API ---------------------------- #


def _get_gold_forecast_text():
    try:
        with open("data/model data/model_output_forecast.json", "r", encoding="utf-8") as f:
            forecast = json.load(f)
        if not forecast:
            return ""
        first = forecast[0]
        last = forecast[-1]
        start_date = first['ds'].split('T')[0]
        end_date = last['ds'].split('T')[0]
        start_price = f"{first['yhat']:.2f}".replace('.00','')
        end_price = f"{last['yhat']:.2f}".replace('.00','')
        return (
            f"\n\n**Gold Price Outlook:**\n"
            f"Between {start_date} and {end_date}, the predicted price of gold is expected to rise from ₹{start_price} to ₹{end_price} per 10g. "
            f"This steady upward trend highlights gold's role as a reliable hedge against inflation and a cornerstone for portfolio safety."
        )
    except Exception:
        return ""

def build_personalized_text(profile: Union[NewCustomerProfile, DBCustomerProfile], vs, model_name: str) -> PlanText:
    customer_summary = json.dumps(profile.model_dump(), ensure_ascii=False)
    ctx, cites1 = _retrieve(
        vs,
        f"Personalized financial plan policy and product guidance for: {customer_summary}",
        k=6,
    )

    # Predict allocation using ML model
    allocation = predict_allocation(profile)
    allocation_text = ""
    if allocation:
        allocation_text = "\n\n**Model-based Asset Allocation:**\n" + "\n".join([f"{k}: {v:.2f}%" for k, v in allocation.items()])

    gold_forecast_text = _get_gold_forecast_text()

    # Then: full narrative plan
    narrative = _llm_text(model_name, [ctx, personalized_plan_prompt(customer_summary, ctx)])
    if allocation_text:
        narrative += allocation_text
    if gold_forecast_text:
        narrative += gold_forecast_text

    # Ingest narrative back to KB so RAG can use it for follow-ups
    kb_ingest_text(vs, narrative, source_id=f"generated_personalized_{profile.Customer_ID}")

    return PlanText(
        label="Personalized",
        narrative=narrative,
        citations=cites1
    )


def build_peer_text(profile: Union[NewCustomerProfile, DBCustomerProfile], vs, model_name: str) -> PlanText:
    customer_summary = json.dumps(profile.model_dump(), ensure_ascii=False)
    ctx, cites = _retrieve(vs, f"What peers in this customer segment should do: {customer_summary}", k=4)
    narrative = _llm_text(model_name, [ctx, peer_plan_prompt(customer_summary, ctx).replace("peers like you are", "peers like you should")])
    kb_ingest_text(vs, narrative, source_id=f"generated_peer_{profile.Customer_ID}")
    return PlanText(label="Peer/Cluster", narrative=narrative, citations=cites)


def build_safety_text(profile: Union[NewCustomerProfile, DBCustomerProfile], vs, model_name: str) -> PlanText:
    customer_summary = json.dumps(profile.model_dump(), ensure_ascii=False)
    ctx, cites = _retrieve(vs, f"Safety-first, capital protection, confirmed returns for: {customer_summary}", k=4)
    gold_forecast_text = _get_gold_forecast_text()
    narrative = _llm_text(model_name, [ctx, safety_plan_prompt(customer_summary, ctx)])
    if gold_forecast_text:
        narrative += gold_forecast_text
    kb_ingest_text(vs, narrative, source_id=f"generated_safety_{profile.Customer_ID}")
    return PlanText(label="Safety-First", narrative=narrative, citations=cites)


def generate_plan_texts(
    profile: Union[NewCustomerProfile, DBCustomerProfile],
    which: List[str],              # any subset of ["personalized", "peer", "safety"]
    vs,
    model_name: str
) -> CustomerPlanTexts:
    out = []
    if "personalized" in which:
        out.append(build_personalized_text(profile, vs, model_name))
    if "peer" in which:
        out.append(build_peer_text(profile, vs, model_name))
    if "safety" in which:
        out.append(build_safety_text(profile, vs, model_name))
    return CustomerPlanTexts(customer_id=profile.Customer_ID, plans=out)
