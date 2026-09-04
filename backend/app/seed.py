"""Seed a demo account so a reviewer sees a populated dashboard immediately.

Run:  python -m app.seed

Idempotent — running it twice changes nothing. Called automatically by the
Docker entrypoint, because "sign up, then fill in a twelve-field form" is too
much to ask of someone who just wants to see whether the project works.
"""

from __future__ import annotations

import sys
from datetime import date, timedelta

from sqlalchemy import select

from app.core.security import hash_password
from app.db import Base, SessionLocal, engine
from app.models import FinancialGoal, UserAccount, UserProfile

DEMO_EMAIL = "demo@finplan.ai"
DEMO_PASSWORD = "demo1234"
DEMO_NAME = "Demo User"

# A mid-net-worth salaried profile with a long horizon — lands in a populated
# cluster and produces a balanced, recognisable allocation.
DEMO_PROFILE = {
    "age": 34,
    "gender": "Female",
    "marital_status": "Married",
    "occupation": "Salaried",
    "dependents_count": 1,
    "monthly_income": 120000.0,
    "monthly_expenses": 52000.0,
    "annual_income": 1_440_000.0,
    "savings_rate_pct": 27.5,
    "net_worth": 3_200_000.0,
    "outstanding_debt": 450_000.0,
    "approx_emi": 20_000.0,
    "emergency_fund": 300_000.0,
    "credit_score": 762,
    "primary_goal": "Retirement",
    "goal_amount": 5_500_000.0,
    "goal_timeline_years": 12,
    "risk_level": "moderate",
    "experience_level": "Intermediate",
    "invest_horizon": "Long (> 10 years)",
}

DEMO_GOALS = [
    {"goal_name": "Retirement corpus", "target_amount": 5_500_000, "current_amount": 1_150_000,
     "priority": "high", "years": 12},
    {"goal_name": "House down payment", "target_amount": 2_000_000, "current_amount": 500_000,
     "priority": "medium", "years": 4},
    {"goal_name": "Emergency fund", "target_amount": 320_000, "current_amount": 300_000,
     "priority": "high", "years": 1},
]


def seed() -> int:
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        existing = db.scalar(select(UserAccount).where(UserAccount.email == DEMO_EMAIL))
        if existing:
            print(f"demo account already present ({DEMO_EMAIL}) — nothing to do")
            return 0

        user = UserAccount(
            full_name=DEMO_NAME,
            email=DEMO_EMAIL,
            password_hash=hash_password(DEMO_PASSWORD),
            profile_completed=True,
        )
        db.add(user)
        db.flush()

        db.add(UserProfile(user_id=user.user_id, extra={"seeded": True}, **DEMO_PROFILE))

        today = date.today()
        for goal in DEMO_GOALS:
            db.add(
                FinancialGoal(
                    user_id=user.user_id,
                    goal_name=goal["goal_name"],
                    target_amount=goal["target_amount"],
                    current_amount=goal["current_amount"],
                    target_date=today + timedelta(days=365 * goal["years"]),
                    priority=goal["priority"],
                )
            )

        db.commit()

    print(f"seeded demo account: {DEMO_EMAIL} / {DEMO_PASSWORD}")
    print(f"  profile + {len(DEMO_GOALS)} goals — sign in and the dashboard is populated")
    return 0


if __name__ == "__main__":
    sys.exit(seed())
