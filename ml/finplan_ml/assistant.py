"""Conversational planning assistant: RAG retrieval plus the four agents.

This is the seam that moves the GenAI half of the project out of a side app and
into the product. Previously the retriever and the Risk / Goal / Synthesis /
History agents only ran inside the Streamlit page, so the API's plan endpoint was
a single Gemini prompt with no retrieval and no agents at all.

Everything here degrades rather than fails. No API key, no FAISS index, or a
Gemini outage each produce a reduced but useful answer, because a dashboard that
goes blank when a third-party service is slow is worse than one that says so.
"""

from __future__ import annotations

import asyncio
import logging
import threading
from dataclasses import dataclass, field
from typing import Any, Mapping

from finplan_ml import config

logger = logging.getLogger(__name__)

# Loading the index and constructing the agents costs seconds, so do it once.
_lock = threading.Lock()
_assistant: "Assistant | None" = None


@dataclass
class AssistantAnswer:
    """What the API returns for a question."""

    answer: str
    sources: list[str] = field(default_factory=list)
    agents_used: list[str] = field(default_factory=list)
    confidence: float = 0.0
    generated_by: str = "fallback"  # "agents" | "gemini" | "fallback"
    note: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "answer": self.answer,
            "sources": self.sources,
            "agents_used": self.agents_used,
            "confidence": round(self.confidence, 3),
            "generated_by": self.generated_by,
            "note": self.note,
        }


def features_to_profile(features: Mapping[str, Any], name: str | None = None):
    """Adapt the model-facing feature dict to the agents' profile schema.

    DBCustomerProfile, not NewCustomerProfile: the agent tools read
    `Annual_Income` and `Risk_Taking_Ability`, and only this schema has both.
    Building the wrong one made every agent fail with AttributeError, which the
    orchestrator swallowed into an empty answer.
    """
    from finplan_ml.schemas import DBCustomerProfile

    annual = float(features.get("Annual_Income") or 0)
    monthly_income = annual / 12 if annual else None
    monthly_expenses = features.get("Monthly_Expenses")
    savings_rate = float(features.get("Savings_Rate(%)") or 0)

    return DBCustomerProfile(
        Customer_ID=str(features.get("Customer_ID", "dashboard-user")),
        Name=name,
        Age=features.get("Age"),
        Gender=features.get("Gender"),
        Occupation=features.get("Occupation"),
        Marital_Status=features.get("Marital_Status"),
        Annual_Income=annual or None,
        Monthly_Expenses=monthly_expenses,
        Monthly_Surplus=(monthly_income - float(monthly_expenses or 0))
        if monthly_income
        else None,
        Current_Net_Worth=features.get("Current_Net_Worth"),
        Primary_Financial_Goal=str(features.get("Primary_Financial_Goal") or "").replace("_", " ")
        or None,
        Goal_Timeline_Years=features.get("Goal_Timeline(Years)"),
        Preferred_Investment_Horizon=features.get("Preferred_Investment_Horizon"),
        Risk_Taking_Ability=features.get("Risk_Taking_Ability"),
    )


# Sub-agents catch their own exceptions and put the message into the narrative, so
# a rate-limit or outage arrives looking like advice. Detect that rather than
# showing a raw 429 to someone asking about their retirement.
_ERROR_MARKERS = (
    "error generating",
    "exceeded your current quota",
    "429 you exceeded",
    "i encountered an error",
    "could not complete that analysis",
    "api key not valid",
    "permission denied",
)


def _looks_like_an_error(text: str) -> bool:
    lowered = (text or "").lower()
    return any(marker in lowered for marker in _ERROR_MARKERS)


def _is_rate_limit(text: str) -> bool:
    lowered = (text or "").lower()
    return "quota" in lowered or "429" in lowered or "rate limit" in lowered


class Assistant:
    """Owns the agent and the retrieval index for the lifetime of the process."""

    def __init__(self) -> None:
        self.agent = None
        self.index_documents = 0
        self.error: str | None = None
        self._build()

    def _build(self) -> None:
        if not config.GEMINI_API_KEY:
            self.error = "GEMINI_API_KEY is not set"
            logger.warning("assistant: %s — answers will use the local fallback", self.error)
            return

        try:
            from finplan_ml.agents.orchestrator import create_advanced_agent

            self.agent = create_advanced_agent(config.GEMINI_API_KEY, config.GEMINI_MODEL)
            self._load_index()
            logger.info("assistant ready (%s documents indexed)", self.index_documents)
        except Exception as exc:  # noqa: BLE001 - never block the API on the LLM stack
            self.error = f"{type(exc).__name__}: {exc}"
            self.agent = None
            logger.warning("assistant unavailable: %s", self.error)

    def _load_index(self) -> None:
        """Attach the committed FAISS index so answers are grounded."""
        try:
            self.agent.initialize_vector_store(index_path=str(config.INDEX_DIR))
            store = getattr(self.agent, "vector_store", None)
            docstore = getattr(store, "docstore", None)
            self.index_documents = len(getattr(docstore, "_dict", {}) or {})
        except Exception as exc:  # noqa: BLE001
            logger.warning("retrieval index unavailable, answering without it: %s", exc)
            self.index_documents = 0

    @property
    def available(self) -> bool:
        return self.agent is not None

    def status(self) -> dict[str, Any]:
        return {
            "available": self.available,
            "documents_indexed": self.index_documents,
            "model": config.GEMINI_MODEL if self.available else None,
            "detail": self.error or "ready",
        }

    def ask(
        self,
        question: str,
        features: Mapping[str, Any],
        name: str | None = None,
        use_multi_agent: bool = True,
    ) -> AssistantAnswer:
        """Answer a question about this user's finances.

        Synchronous by design: the agent is async internally, but FastAPI calls
        this from a worker thread, so a private event loop keeps the two models
        from fighting over the running loop.
        """
        if not self.available:
            return AssistantAnswer(
                answer=_local_answer(question, features),
                generated_by="fallback",
                note=f"Answered locally — {self.error}.",
            )

        try:
            self.agent.set_customer_profile(features_to_profile(features, name))
            turn = _run_async(self.agent.process_query(question, use_multi_agent=use_multi_agent))

            capabilities = self.agent.get_orchestrator_capabilities()
            agents_used = sorted(capabilities.keys()) if isinstance(capabilities, dict) else []

            answer = turn.agent_response or ""
            if _looks_like_an_error(answer):
                note = (
                    "The planner hit Gemini's free-tier rate limit (a multi-agent answer "
                    "costs several calls). Showing a summary from your profile instead — "
                    "wait a minute and ask again."
                    if _is_rate_limit(answer)
                    else "The planning agents could not complete that request; "
                    "this answer was generated locally."
                )
                return AssistantAnswer(
                    answer=_local_answer(question, features),
                    generated_by="fallback",
                    note=note,
                )

            return AssistantAnswer(
                answer=answer,
                sources=list(turn.retrieved_docs or []),
                agents_used=agents_used,
                confidence=float(turn.confidence_score or 0.0),
                generated_by="agents",
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("assistant query failed, falling back: %s", exc)
            return AssistantAnswer(
                answer=_local_answer(question, features),
                generated_by="fallback",
                note=f"The planning agents were unavailable ({type(exc).__name__}); "
                "this answer was generated locally.",
            )


def _run_async(coro):
    """Run a coroutine from sync code, whether or not a loop is already running."""
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)

    # Already inside a loop: run it on its own thread with its own loop.
    result: dict[str, Any] = {}

    def runner() -> None:
        loop = asyncio.new_event_loop()
        try:
            result["value"] = loop.run_until_complete(coro)
        except BaseException as exc:  # noqa: BLE001
            result["error"] = exc
        finally:
            loop.close()

    thread = threading.Thread(target=runner, daemon=True)
    thread.start()
    thread.join()
    if "error" in result:
        raise result["error"]
    return result["value"]


def _local_answer(question: str, features: Mapping[str, Any]) -> str:
    """A useful reply with no LLM involved, written from the profile itself."""
    age = features.get("Age")
    goal = str(features.get("Primary_Financial_Goal") or "your goal").replace("_", " ").lower()
    horizon = features.get("Goal_Timeline(Years)")
    risk = str(features.get("Risk_Taking_Ability") or "medium").lower()
    income = float(features.get("Annual_Income") or 0)
    savings_rate = float(features.get("Savings_Rate(%)") or 0)

    lines = [
        f'You asked: "{question.strip()}"',
        "",
        "The conversational planner is unavailable right now — the note above says "
        "why. Here is what your profile alone supports:",
        "",
        f"• You are {age or 'unspecified'}, saving about {savings_rate:.0f}% of "
        f"₹{income:,.0f} a year, working towards {goal}"
        + (f" over roughly {horizon} years." if horizon else "."),
        f"• Your stated risk appetite is {risk}, which is what drives the equity "
        "share of the allocation shown on this page.",
        "• The allocation, your investor segment and the gold forecast are all "
        "produced by the trained models and are unaffected by this.",
        "",
        "This is a model-generated illustration, not regulated financial advice.",
    ]
    return "\n".join(lines)


def get_assistant() -> Assistant:
    """Process-wide singleton, built on first use."""
    global _assistant
    if _assistant is None:
        with _lock:
            if _assistant is None:
                _assistant = Assistant()
    return _assistant


def reset_assistant() -> None:
    """Drop the cached instance, so a newly supplied key takes effect."""
    global _assistant
    with _lock:
        _assistant = None
