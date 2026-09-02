"""Thin FastAPI surface over the ML package.

A stepping stone: Phase 2 folds these routes into the single FastAPI backend that
also owns auth, profiles and goals. Having them here now means the models are
reachable over HTTP and testable before that port begins.

Two changes from the original:

1. Cluster assignment used a hand-written if/else ladder (`heuristic_cluster_map`)
   while a trained K-Means model sat unused on disk. Segmentation now runs through
   the fitted pipeline.
2. A missing GEMINI_API_KEY raised at import, so the whole service refused to
   start. The key is now required only by the endpoints that actually call Gemini,
   which lets /health and the /ml/* routes work without one.
"""

from __future__ import annotations

import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from finplan_ml import config
from finplan_ml.prompts import bank_batch_prompt, user_plan_prompt
from finplan_ml.registry import get_registry

app = FastAPI(title="FinPlan ML", version="0.2.0")


class CustomerPayload(BaseModel):
    customer: dict = Field(..., description="Profile keyed by the dataset's column names")


def _http(exc: Exception) -> HTTPException:
    """422 for a bad request, 503 for a model that did not load."""
    status = 422 if isinstance(exc, ValueError) else 503
    return HTTPException(status_code=status, detail=str(exc))


@app.get("/health")
def health():
    """Report every model's status, so a broken artifact is visible immediately."""
    return get_registry().health()


@app.post("/ml/segment")
def segment(payload: CustomerPayload):
    try:
        return get_registry().segmentation.predict(payload.customer)
    except (ValueError, RuntimeError) as exc:
        raise _http(exc) from exc


@app.post("/ml/allocate")
def allocate(payload: CustomerPayload):
    try:
        return {"allocation": get_registry().portfolio.allocate(payload.customer)}
    except (ValueError, RuntimeError) as exc:
        raise _http(exc) from exc


@app.get("/ml/forecast/gold")
def forecast_gold(limit: int = 60):
    try:
        return {"points": get_registry().gold.series(limit=limit)}
    except RuntimeError as exc:
        raise _http(exc) from exc


@app.get("/plans/generic")
def plans_generic():
    genai.configure(api_key=config.require_api_key())
    try:
        model = genai.GenerativeModel(config.GEMINI_MODEL)
        return {"ok": True, "text": model.generate_content(bank_batch_prompt).text}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini call failed: {exc}") from exc


@app.post("/plans/user")
def plans_user(payload: CustomerPayload):
    customer = payload.customer
    try:
        segment_result = get_registry().segmentation.predict(customer)
    except (ValueError, RuntimeError) as exc:
        raise _http(exc) from exc

    genai.configure(api_key=config.require_api_key())
    prompt = user_plan_prompt(segment_result["cluster_id"], segment_result["label"], customer)
    try:
        model = genai.GenerativeModel(config.GEMINI_MODEL)
        text = model.generate_content(prompt).text
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini call failed: {exc}") from exc

    return {
        "ok": True,
        "clusterId": segment_result["cluster_id"],
        "clusterLabel": segment_result["label"],
        "text": text,
    }
