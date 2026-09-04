"""Normalize whatever the profile form posts into UserProfile column values.

The React multi-step form sends a **flat snake_case** object
(`monthly_income`, `risk_level`, `goal_target`, …) with several array fields
serialized as JSON strings. The typed nested schema
(`personal` / `financials` / `preferences` / …) is the shape the API documents.

Both are accepted. Rejecting the flat payload would mean rewriting a 1,700-line
form to satisfy the backend, which is the wrong way round — and the flat shape is
what actually reaches production today.

The bug this fixes: `goals` arrives as a JSON *string*, so a `list` field
rejected it with a 422 and the profile could not be saved at all. Everything else
in the flat payload was silently ignored, because the nested model has defaults
for every section — so a "successful" save would have stored an empty profile and
produced a meaningless allocation.
"""

from __future__ import annotations

import json
from typing import Any, Mapping

# Flat payload key -> UserProfile column.
FLAT_COLUMN_MAP = {
    "age": "age",
    "gender": "gender",
    "marital_status": "marital_status",
    "occupation": "occupation",
    "dependents_count": "dependents_count",
    "monthly_income": "monthly_income",
    "monthly_expenses": "monthly_expenses",
    "annual_income": "annual_income",
    "monthly_savings_pct": "savings_rate_pct",
    "investable_assets": "net_worth",
    "outstanding_debt": "outstanding_debt",
    "approx_emi": "approx_emi",
    "emergency_fund": "emergency_fund",
    "credit_score": "credit_score",
    "primary_goal": "primary_goal",
    "goal_target": "goal_amount",
    "goal_timeline_years": "goal_timeline_years",
    "risk_level": "risk_level",
    "experience_level": "experience_level",
    "invest_horizon": "invest_horizon",
}

# Flat keys that arrive JSON-encoded rather than as real arrays.
JSON_STRING_KEYS = (
    "goals",
    "preferred_assets",
    "pref_instruments",
    "insurance_policies",
    "loan_types",
    "dependents_ages",
)

# Kept in `extra` verbatim rather than given their own columns.
EXTRA_KEYS = (
    "dob",
    "full_name",
    "phone",
    "address_line",
    "city",
    "state",
    "tax_bracket",
    "filing_status",
    "employment_type",
    "employer",
    "has_loans",
    "monthly_savings_amt",
    "annual_income_band",
    "investable_assets_band",
    "outstanding_debt_band",
    "health_insurance",
    "life_insurance",
    "risk_score",
    "desired_emergency_months",
    "collected_at",
    "notes",
)


def looks_flat(payload: Mapping[str, Any]) -> bool:
    """True when this is the form's flat payload rather than the nested schema."""
    if any(key in payload for key in ("personal", "financials", "preferences", "loans")):
        return False
    return any(key in payload for key in FLAT_COLUMN_MAP) or "goals" in payload


def _maybe_json(value: Any) -> Any:
    """Parse a JSON-encoded array, or pass a real list straight through."""
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return []
        try:
            return json.loads(text)
        except (ValueError, TypeError):
            return []
    return value


def _num(value: Any) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _int(value: Any) -> int | None:
    number = _num(value)
    return int(number) if number is not None else None


def normalize_goals(raw: Any) -> list[dict[str, Any]]:
    """Accept either the form's goal shape or the documented one.

    Form:       {id, name, amount, date, type: primary|secondary}
    Documented: {name, targetAmount, targetDate, role}
    """
    goals = _maybe_json(raw)
    if not isinstance(goals, list):
        return []

    normalized: list[dict[str, Any]] = []
    for goal in goals:
        if not isinstance(goal, dict):
            continue
        name = goal.get("name") or goal.get("goal_name")
        if not name:
            continue
        normalized.append(
            {
                "name": str(name),
                "targetAmount": _num(goal.get("targetAmount", goal.get("amount"))) or 0.0,
                "targetDate": goal.get("targetDate") or goal.get("date") or None,
                "role": (goal.get("role") or goal.get("type") or "").lower() or None,
            }
        )
    return normalized


def flat_to_columns(payload: Mapping[str, Any]) -> dict[str, Any]:
    """Turn the form's flat payload into UserProfile column values."""
    columns: dict[str, Any] = {}

    for source, column in FLAT_COLUMN_MAP.items():
        if source not in payload:
            continue
        value = payload[source]
        if column in {"age", "dependents_count", "goal_timeline_years", "credit_score"}:
            columns[column] = _int(value)
        elif column in {
            "monthly_income",
            "monthly_expenses",
            "annual_income",
            "savings_rate_pct",
            "net_worth",
            "outstanding_debt",
            "approx_emi",
            "emergency_fund",
            "goal_amount",
        }:
            columns[column] = _num(value)
        else:
            columns[column] = value or None

    columns.setdefault("dependents_count", 0)
    if columns.get("dependents_count") is None:
        columns["dependents_count"] = 0

    # The form sends a monthly figure; the models want it annualized.
    if not columns.get("annual_income") and columns.get("monthly_income"):
        columns["annual_income"] = columns["monthly_income"] * 12

    goals = normalize_goals(payload.get("goals"))

    # Fall back to the first goal when the dedicated fields were not filled in.
    if goals:
        primary = next((g for g in goals if g["role"] == "primary"), goals[0])
        columns.setdefault("primary_goal", primary["name"])
        if not columns.get("primary_goal"):
            columns["primary_goal"] = primary["name"]
        if not columns.get("goal_amount"):
            columns["goal_amount"] = primary["targetAmount"]

    extra: dict[str, Any] = {key: payload[key] for key in EXTRA_KEYS if key in payload}
    for key in JSON_STRING_KEYS:
        if key in payload:
            extra[key] = normalize_goals(payload[key]) if key == "goals" else _maybe_json(payload[key])
    extra["goals"] = goals

    columns["extra"] = extra
    return columns
