"""Model-backed endpoints.

Each route works two ways: with no body it uses the signed-in user's stored
profile, and with an explicit feature dict it scores that instead. The first form
is what the dashboard calls; the second is what makes the models explorable
without creating an account.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import UserAccount, UserProfile
from app.schemas import AllocationResponse, SegmentResponse
from app.services.ml_mapping import profile_to_features

router = APIRouter(prefix="/api/ml", tags=["ml"])


def _registry():
    from finplan_ml.registry import get_registry

    return get_registry()


def user_features(user: UserAccount, db: Session) -> dict:
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.user_id).one_or_none()
    if profile is None:
        raise HTTPException(
            status_code=409,
            detail="Complete your financial profile before requesting a recommendation",
        )
    return profile_to_features(profile)


def _guard(exc: Exception) -> HTTPException:
    return HTTPException(status_code=422 if isinstance(exc, ValueError) else 503, detail=str(exc))


@router.get("/health")
def ml_health():
    return _registry().health()


@router.get("/segment", response_model=SegmentResponse)
def segment(user: UserAccount = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        return _registry().segmentation.predict(user_features(user, db))
    except (ValueError, RuntimeError) as exc:
        raise _guard(exc) from exc


@router.get("/allocation", response_model=AllocationResponse)
def allocation(user: UserAccount = Depends(get_current_user), db: Session = Depends(get_db)):
    features = user_features(user, db)
    try:
        segment_result = _registry().segmentation.predict(features)
        # Cluster membership is itself a model input, so segment before allocating.
        features["cluster"] = segment_result["cluster_id"]
        return AllocationResponse(allocation=_registry().portfolio.allocate(features))
    except (ValueError, RuntimeError) as exc:
        raise _guard(exc) from exc


@router.get("/forecast/gold")
def forecast_gold(limit: int = 60):
    try:
        return {"points": _registry().gold.series(limit=limit)}
    except RuntimeError as exc:
        raise _guard(exc) from exc
