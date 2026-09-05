"""Translate a stored user profile into the feature names the models expect.

This is the seam the whole integration turns on. The application collects
`monthlyIncome`, `riskLevel`, `approxEmi`; the models were trained on
`Annual_Income`, `Risk_Taking_Ability`, `Loan_EMI_Obligations`. Nothing had ever
converted between the two, which is the concrete reason the ML and the app had
never been connected.

Two conversions are easy to get wrong and are handled explicitly here:

* `Loan_EMI_Obligations` is a **percentage of income** in the training data
  (0-45), not a rupee amount, despite its name. The profile stores a rupee EMI,
  so it is converted.
* `Risk_Taking_Ability` is Low / Medium / High, while the form offers
  Low / Moderate / High. "Moderate" would match nothing and silently encode as
  an unusual profile.
"""

from __future__ import annotations

from typing import Any

# Form vocabulary -> training vocabulary.
RISK_MAP = {
    "low": "Low",
    "moderate": "Medium",
    "medium": "Medium",
    "high": "High",
}

GOAL_MAP = {
    "retirement": "Retirement",
    "house": "House",
    "home": "House",
    "education": "Education",
    "child education": "Education",
    "emergency": "Emergency_Fund",
    "emergency fund": "Emergency_Fund",
    "wealth": "Wealth",
    "wealth growth": "Wealth",
    "wealth creation": "Wealth",
}

OCCUPATION_MAP = {
    "salaried": "Salaried",
    "salaried - private": "Salaried",
    "salaried - government": "Salaried",
    "self-employed": "Self-employed",
    "freelance": "Self-employed",
    "business": "Business",
    "business owner": "Business",
    "student": "Student",
    "retired": "Retired",
}

GENDER_MAP = {
    "male": "Male",
    "female": "Female",
    "non-binary": "Non-binary",
    "other": "Non-binary",
    "prefer not to say": "Prefer_not_to_say",
    "prefer_not_to_say": "Prefer_not_to_say",
}

MARITAL_MAP = {
    "single": "Single",
    "married": "Married",
    "married with children": "Married",
    "divorced": "Divorced",
    "widowed": "Widowed",
}

# Sensible stand-ins for fields the form does not ask for. Declared here rather
# than scattered through the code, so what is assumed stays visible.
DEFAULTS = {
    "Credit_Score": 720,
    "Investment_Experience(Years)": 3.0,
    "Financial_Knowledge_Score": 6.0,
    "Goal_Timeline(Years)": 10,
}

EXPERIENCE_YEARS = {"beginner": 1.0, "intermediate": 5.0, "advanced": 12.0}
EXPERIENCE_KNOWLEDGE = {"beginner": 4.0, "intermediate": 6.5, "advanced": 8.5}


def _lookup(mapping: dict[str, str], value: Any, default: str) -> str:
    if not value:
        return default
    return mapping.get(str(value).strip().lower(), default)


def _num(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def profile_to_features(profile: Any) -> dict[str, Any]:
    """Build the model-facing feature dict from a UserProfile row."""
    monthly_income = _num(profile.monthly_income)
    annual_income = _num(profile.annual_income) or monthly_income * 12
    monthly_expenses = _num(profile.monthly_expenses)

    savings_rate = profile.savings_rate_pct
    if savings_rate is None:
        # Derive it when the form did not ask directly.
        savings_rate = (
            100.0 * (monthly_income - monthly_expenses) / monthly_income if monthly_income else 0.0
        )
    savings_rate = max(0.0, min(100.0, _num(savings_rate)))

    # The training column is a percentage of income, not a rupee figure.
    emi_rupees = _num(profile.approx_emi)
    emi_pct = 100.0 * emi_rupees / monthly_income if monthly_income else 0.0
    emi_pct = max(0.0, min(45.0, emi_pct))

    debt = _num(profile.outstanding_debt)
    dti = debt / annual_income if annual_income else 0.0
    dti = max(0.0, min(1.0, dti))

    experience = str(profile.experience_level or "").strip().lower()

    return {
        "Age": int(_num(profile.age, 30)),
        "Annual_Income": annual_income,
        "Monthly_Expenses": monthly_expenses,
        "Savings_Rate(%)": savings_rate,
        "Loan_EMI_Obligations": emi_pct,
        "Current_Net_Worth": _num(profile.net_worth),
        "Debt_to_Income_Ratio": dti,
        "Credit_Score": int(_num(profile.credit_score, DEFAULTS["Credit_Score"])),
        "Investment_Experience(Years)": EXPERIENCE_YEARS.get(
            experience, DEFAULTS["Investment_Experience(Years)"]
        ),
        "Financial_Knowledge_Score": EXPERIENCE_KNOWLEDGE.get(
            experience, DEFAULTS["Financial_Knowledge_Score"]
        ),
        "Goal_Amount(₹)": _num(profile.goal_amount),
        "Goal_Timeline(Years)": int(_num(profile.goal_timeline_years, DEFAULTS["Goal_Timeline(Years)"])),
        "Risk_Taking_Ability": _lookup(RISK_MAP, profile.risk_level, "Medium"),
        "Occupation": _lookup(OCCUPATION_MAP, profile.occupation, "Salaried"),
        "Primary_Financial_Goal": _lookup(GOAL_MAP, profile.primary_goal, "Wealth"),
        "Gender": _lookup(GENDER_MAP, profile.gender, "Prefer_not_to_say"),
        "Marital_Status": _lookup(MARITAL_MAP, profile.marital_status, "Single"),
    }


def request_to_columns(payload: Any) -> dict[str, Any]:
    """Flatten the nested profile request into UserProfile column values."""
    personal = payload.personal
    fin = payload.financials
    prefs = payload.preferences
    loans = payload.loans

    monthly_income = fin.monthlyIncome or 0.0
    annual = fin.annualGrossIncome or (monthly_income * 12 if monthly_income else None)

    primary_goal, goal_amount, goal_years = None, None, None
    if payload.goals:
        chosen = next((g for g in payload.goals if (g.role or "").lower() == "primary"), payload.goals[0])
        primary_goal = chosen.name
        goal_amount = chosen.targetAmount

    return {
        "age": personal.age,
        "gender": personal.gender,
        "marital_status": personal.maritalStatus,
        "occupation": personal.occupation or (payload.employment or {}).get("occupation"),
        "dependents_count": int((payload.family or {}).get("dependentsCount") or 0),
        "monthly_income": monthly_income or None,
        "monthly_expenses": fin.monthlyExpenses,
        "annual_income": annual,
        "savings_rate_pct": fin.monthlySavingsPct,
        "net_worth": fin.investableAssets,
        "outstanding_debt": fin.outstandingDebt,
        "approx_emi": loans.approxEmi,
        "emergency_fund": fin.emergencyFund,
        "credit_score": fin.creditScore,
        "primary_goal": primary_goal,
        "goal_amount": goal_amount,
        "goal_timeline_years": goal_years,
        "risk_level": prefs.riskLevel,
        "experience_level": prefs.experience,
        "invest_horizon": prefs.investHorizon,
        "extra": {
            "residence": payload.residence,
            "family": payload.family,
            "employment": payload.employment,
            "insurance": payload.insurance,
            "tax": payload.tax,
            "notes": payload.notes,
            "preferredAssets": prefs.preferredAssets,
            "loanTypes": loans.loanTypes,
            "goals": [g.model_dump() for g in payload.goals],
        },
    }
