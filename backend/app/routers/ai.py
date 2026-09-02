"""AI planning endpoints.

The design rule here: **a dead API key must never blank the dashboard.** Every
Gemini call runs under a timeout, and any failure falls back to a deterministic
plan written from the model outputs the user already has. The allocation, the
segment and the forecast are all local computations, so the page stays useful
even with no LLM at all — the narrative is the only part that degrades.
"""

from __future__ import annotations

import concurrent.futures

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db import get_db
from app.deps import get_current_user
from app.models import UserAccount
from app.routers.ml import user_features
from app.schemas import PlanResponse, SegmentResponse

router = APIRouter(prefix="/api/ai", tags=["ai"])

_executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)


def _registry():
    from finplan_ml.registry import get_registry

    return get_registry()


def _percent(allocation: dict[str, float]) -> str:
    ordered = sorted(allocation.items(), key=lambda kv: kv[1], reverse=True)
    return ", ".join(f"{name} {weight:.0%}" for name, weight in ordered)


def _fallback_narrative(segment: dict, allocation: dict[str, float], features: dict) -> str:
    """A useful plan with no LLM involved, written from the model outputs."""
    top_asset, top_weight = max(allocation.items(), key=lambda kv: kv[1])
    horizon = features.get("Goal_Timeline(Years)", 10)
    goal = str(features.get("Primary_Financial_Goal", "your goal")).replace("_", " ").lower()
    risk = features.get("Risk_Taking_Ability", "Medium").lower()

    return (
        f"You fall into the {segment['label']} segment. Based on your {risk} risk appetite and a "
        f"{horizon}-year horizon for {goal}, the model suggests: {_percent(allocation)}.\n\n"
        f"The largest single holding is {top_asset} at {top_weight:.0%}. Review the split against "
        f"your own comfort with volatility before acting, and revisit it whenever your income, "
        f"dependents or timeline change.\n\n"
        f"This is a model-generated illustration, not regulated financial advice."
    )


def _gemini_narrative(segment: dict, allocation: dict[str, float], features: dict) -> str:
    """Ask Gemini for the narrative. Raises on any failure; the caller falls back."""
    import google.generativeai as genai

    from finplan_ml import config as ml_config

    genai.configure(api_key=ml_config.require_api_key())
    prompt = (
        "You are a careful Indian financial planning assistant. Write a short, concrete plan "
        "(under 220 words) for this customer. Use rupees, be specific, and do not invent products.\n\n"
        f"Segment: {segment['label']}\n"
        f"Recommended allocation: {_percent(allocation)}\n"
        f"Age: {features.get('Age')}, annual income: {features.get('Annual_Income')}, "
        f"savings rate: {features.get('Savings_Rate(%)'):.1f}%, "
        f"risk appetite: {features.get('Risk_Taking_Ability')}, "
        f"goal: {features.get('Primary_Financial_Goal')} over {features.get('Goal_Timeline(Years)')} years.\n\n"
        "End with one sentence noting this is an illustration, not regulated advice."
    )
    model = genai.GenerativeModel(ml_config.GEMINI_MODEL)
    return model.generate_content(prompt).text


@router.post("/plan", response_model=PlanResponse)
def generate_plan(user: UserAccount = Depends(get_current_user), db: Session = Depends(get_db)):
    features = user_features(user, db)
    registry = _registry()

    try:
        segment = registry.segmentation.predict(features)
        features["cluster"] = segment["cluster_id"]
        allocation = registry.portfolio.allocate(features)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    narrative, generated_by, note = None, "fallback", None
    try:
        future = _executor.submit(_gemini_narrative, segment, allocation, features)
        narrative = future.result(timeout=settings.LLM_TIMEOUT_SECONDS)
        generated_by = "gemini"
    except concurrent.futures.TimeoutError:
        note = f"Gemini did not respond within {settings.LLM_TIMEOUT_SECONDS:.0f}s; showing a model-generated summary."
    except Exception as exc:  # noqa: BLE001 - any LLM failure degrades, never fails
        note = f"Narrative generated locally ({type(exc).__name__}); the allocation below is unaffected."

    if narrative is None:
        narrative = _fallback_narrative(segment, allocation, features)

    return PlanResponse(
        segment=SegmentResponse(**segment),
        allocation=allocation,
        narrative=narrative,
        generated_by=generated_by,
        note=note,
    )
