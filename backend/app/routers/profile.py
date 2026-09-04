"""Current user and financial profile."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import UserAccount, UserProfile
from app.schemas import MeResponse, ProfileRequest, ProfileResponse
from app.services.ml_mapping import request_to_columns
from app.services.profile_intake import flat_to_columns, looks_flat

router = APIRouter(tags=["profile"])


def _serialize(profile: UserProfile | None) -> dict:
    if profile is None:
        return {}
    return {
        "age": profile.age,
        "gender": profile.gender,
        "maritalStatus": profile.marital_status,
        "occupation": profile.occupation,
        "dependentsCount": profile.dependents_count,
        "monthlyIncome": float(profile.monthly_income or 0),
        "monthlyExpenses": float(profile.monthly_expenses or 0),
        "annualIncome": float(profile.annual_income or 0),
        "savingsRatePct": float(profile.savings_rate_pct or 0),
        "netWorth": float(profile.net_worth or 0),
        "outstandingDebt": float(profile.outstanding_debt or 0),
        "approxEmi": float(profile.approx_emi or 0),
        "emergencyFund": float(profile.emergency_fund or 0),
        "creditScore": profile.credit_score,
        "primaryGoal": profile.primary_goal,
        "goalAmount": float(profile.goal_amount or 0),
        "goalTimelineYears": profile.goal_timeline_years,
        "riskLevel": profile.risk_level,
        "experienceLevel": profile.experience_level,
        "investHorizon": profile.invest_horizon,
        "extra": profile.extra or {},
    }


@router.get("/api/me", response_model=MeResponse)
def me(user: UserAccount = Depends(get_current_user)):
    return MeResponse(
        account={
            "userId": user.user_id,
            "fullName": user.full_name,
            "email": user.email,
        },
        profileCompleted=user.profile_completed,
    )


@router.get("/api/profile", response_model=ProfileResponse)
def get_profile(
    user: UserAccount = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.user_id).one_or_none()
    return ProfileResponse(profileCompleted=user.profile_completed, profile=_serialize(profile))


@router.post("/api/profile", response_model=ProfileResponse)
def upsert_profile(
    payload: dict[str, Any] = Body(...),
    user: UserAccount = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create or replace the profile, then mark the account complete.

    Two payload shapes are accepted: the flat snake_case object the React form
    posts today, and the documented nested schema. Taking a raw dict here and
    dispatching on its shape is what lets both work — the form serializes several
    arrays as JSON strings, which a strict list field rejects outright.
    """
    if looks_flat(payload):
        columns = flat_to_columns(payload)
    else:
        try:
            columns = request_to_columns(ProfileRequest.model_validate(payload))
        except ValidationError as exc:
            raise HTTPException(status_code=422, detail=exc.errors()) from exc
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.user_id).one_or_none()

    if profile is None:
        profile = UserProfile(user_id=user.user_id, **columns)
        db.add(profile)
    else:
        for key, value in columns.items():
            setattr(profile, key, value)

    user.profile_completed = True
    db.add(user)
    db.commit()
    db.refresh(profile)

    return ProfileResponse(profileCompleted=True, profile=_serialize(profile))
