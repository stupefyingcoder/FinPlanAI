import os, json
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
from prompt import bank_batch_prompt, user_plan_prompt

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")
MODEL = os.getenv("MODEL", "gemini-2.5-flash")
PORT = int(os.getenv("PORT", "8000"))

if not API_KEY:
    raise RuntimeError("GEMINI_API_KEY missing in .env")

genai.configure(api_key=API_KEY)

with open("cluster_meta.json","r",encoding="utf-8") as f:
    CLUSTER_META = json.load(f)

def heuristic_cluster_map(customer: dict) -> int:
    goal = (customer.get("Primary_Financial_Goal","") or "").lower()
    nw = float(customer.get("Current_Net_Worth", 0) or 0)
    age = int(customer.get("Age", 0) or 0)
    rta = (customer.get("Risk_Taking_Ability","") or "").lower()
    horizon = (customer.get("Preferred_Investment_Horizon","") or "").lower()

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

class Customer(BaseModel):
    customer: dict

app = FastAPI()

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/plans/generic")
def plans_generic():
    try:
        model = genai.GenerativeModel(MODEL)
        resp = model.generate_content(bank_batch_prompt)
        return {"ok": True, "text": resp.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/plans/user")
def plans_user(payload: Customer):
    try:
        customer = payload.customer  # Use .customer for Pydantic v2+
        cid = heuristic_cluster_map(customer)
        label = cluster_label(cid)
        prompt = user_plan_prompt(cid, label, customer)
        model = genai.GenerativeModel(MODEL)
        resp = model.generate_content(prompt)
        return {"ok": True, "clusterId": cid, "clusterLabel": label, "text": resp.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
