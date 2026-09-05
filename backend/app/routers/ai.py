"""AI planning endpoints, backed by the RAG retriever and the planning agents.

Design rule: **a missing key or a slow LLM must never blank the dashboard.**
Every call runs under a timeout, and any failure falls back to an answer written
from the model outputs the user already has. The allocation, the segment and the
forecast are local computations, so the page stays useful with no LLM at all —
only the prose degrades.

Until now this module talked to Gemini directly with a single prompt: no
retrieval, no agents. The résumé's GenAI claim lived exclusively in the Streamlit
side app, which meant it was absent from the product itself.
"""

from __future__ import annotations

import concurrent.futures

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db import get_db
from app.deps import get_current_user
from app.models import UserAccount
from app.routers.ml import user_features
from app.schemas import PlanResponse, SegmentResponse

router = APIRouter(prefix="/api/ai", tags=["ai"])

_executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


def _registry():
    from finplan_ml.registry import get_registry

    return get_registry()


def _assistant():
    from finplan_ml.assistant import get_assistant

    return get_assistant()


def _percent(allocation: dict[str, float]) -> str:
    ordered = sorted(allocation.items(), key=lambda kv: kv[1], reverse=True)
    return ", ".join(f"{name} {weight:.0%}" for name, weight in ordered)


def _fallback_narrative(segment: dict, allocation: dict[str, float], features: dict) -> str:
    """A useful plan with no LLM involved, written from the model outputs."""
    top_asset, top_weight = max(allocation.items(), key=lambda kv: kv[1])
    horizon = features.get("Goal_Timeline(Years)", 10)
    goal = str(features.get("Primary_Financial_Goal", "your goal")).replace("_", " ").lower()
    risk = str(features.get("Risk_Taking_Ability", "Medium")).lower()

    return (
        f"You fall into the {segment['label']} segment. Based on your {risk} risk appetite and a "
        f"{horizon}-year horizon for {goal}, the model suggests: {_percent(allocation)}.\n\n"
        f"The largest single holding is {top_asset} at {top_weight:.0%}. Review the split against "
        f"your own comfort with volatility before acting, and revisit it whenever your income, "
        f"dependents or timeline change.\n\n"
        f"This is a model-generated illustration, not regulated financial advice."
    )


def _plan_prompt(segment: dict, allocation: dict[str, float], features: dict) -> str:
    return (
        "Write a short, concrete financial plan (under 220 words) for this customer. "
        "Use rupees, be specific, and do not invent products.\n\n"
        f"Segment: {segment['label']}\n"
        f"Recommended allocation: {_percent(allocation)}\n"
        f"Age: {features.get('Age')}, annual income: {features.get('Annual_Income')}, "
        f"savings rate: {float(features.get('Savings_Rate(%)') or 0):.1f}%, "
        f"risk appetite: {features.get('Risk_Taking_Ability')}, "
        f"goal: {features.get('Primary_Financial_Goal')} over "
        f"{features.get('Goal_Timeline(Years)')} years.\n\n"
        "End with one sentence noting this is an illustration, not regulated advice."
    )


@router.get("/status")
def ai_status():
    """Whether the conversational planner is configured, and what it can reach."""
    return _assistant().status()


@router.post("/plan", response_model=PlanResponse)
def generate_plan(user: UserAccount = Depends(get_current_user), db: Session = Depends(get_db)):
    """Segment and allocation from the models, narrated by the planning agents."""
    features = user_features(user, db)
    registry = _registry()

    try:
        segment = registry.segmentation.predict(features)
        # Cluster membership is itself an input to the allocation model.
        features["cluster"] = segment["cluster_id"]
        allocation = registry.portfolio.allocate(features)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    narrative, generated_by, note = None, "fallback", None
    assistant = _assistant()

    if assistant.available:
        try:
            future = _executor.submit(
                assistant.ask,
                _plan_prompt(segment, allocation, features),
                features,
                user.full_name,
                True,
            )
            result = future.result(timeout=settings.LLM_TIMEOUT_SECONDS)
            if result.generated_by == "agents":
                narrative, generated_by, note = result.answer, "gemini", None
            else:
                note = result.note
        except concurrent.futures.TimeoutError:
            note = (
                f"The planner did not respond within {settings.LLM_TIMEOUT_SECONDS:.0f}s; "
                "showing a model-generated summary."
            )
        except Exception as exc:  # noqa: BLE001 - any LLM failure degrades, never fails
            note = f"Narrative generated locally ({type(exc).__name__}); the allocation is unaffected."
    else:
        note = "Add a GEMINI_API_KEY to get an AI-written plan; the numbers below are unaffected."

    if narrative is None:
        narrative = _fallback_narrative(segment, allocation, features)

    return PlanResponse(
        segment=SegmentResponse(**segment),
        allocation=allocation,
        narrative=narrative,
        generated_by=generated_by,
        note=note,
    )


@router.post("/chat")
def chat(
    payload: ChatRequest,
    user: UserAccount = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Ask a question about your own finances, grounded in the document index.

    Routed through the orchestrator, so risk, goal, history and synthesis agents
    each contribute, and retrieved passages come back as `sources` for display.
    """
    features = user_features(user, db)

    try:
        future = _executor.submit(_assistant().ask, payload.message, features, user.full_name, True)
        result = future.result(timeout=settings.LLM_TIMEOUT_SECONDS)
    except concurrent.futures.TimeoutError:
        # Degrade rather than 504. A multi-agent answer is several sequential
        # Gemini calls and can genuinely run long; showing the profile-based
        # summary is more useful to the reader than a gateway error, and matches
        # how every other AI path here behaves.
        from finplan_ml.assistant import AssistantAnswer, _local_answer

        result = AssistantAnswer(
            answer=_local_answer(payload.message, features),
            generated_by="fallback",
            note=f"The planner took longer than {settings.LLM_TIMEOUT_SECONDS:.0f}s. "
            "Here is a summary from your profile — ask again for the full agent answer.",
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Planner error: {exc}") from exc

    return result.as_dict()
