"""Session hand-off to the embedded Streamlit planner.

The AI Insights tab is an iframe. Streamlit cannot read the dashboard's
Authorization header or its httpOnly cookie, so it needs its own way to learn who
is viewing.

The rule this endpoint exists to enforce: **never put a user id in the iframe
URL.** A raw id in a query string means anyone can read anyone else's finances by
editing the address bar. Instead the dashboard asks for a short-lived signed
token, passes only that, and Streamlit exchanges it for the profile.

The token is deliberately narrow: 5 minutes, audience-scoped so it cannot be
replayed against the main API, and it carries no financial data itself.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db import get_db
from app.deps import get_current_user
from app.models import UserAccount, UserProfile
from app.routers.ml import user_features

router = APIRouter(prefix="/api/session", tags=["session"])

AUDIENCE = "streamlit-planner"
TTL_SECONDS = 300


@router.post("/streamlit-token")
def issue_streamlit_token(user: UserAccount = Depends(get_current_user)):
    """Mint a short-lived token the dashboard can hand to the iframe."""
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {
            "userId": user.user_id,
            "aud": AUDIENCE,
            "type": "session-bridge",
            "iat": now,
            "exp": now + timedelta(seconds=TTL_SECONDS),
        },
        settings.JWT_ACCESS_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )
    return {"token": token, "expires_in": TTL_SECONDS}


@router.get("/exchange")
def exchange_streamlit_token(token: str = Query(...), db: Session = Depends(get_db)):
    """Streamlit calls this with the token to learn whose plan to show."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_ACCESS_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            audience=AUDIENCE,
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired session token") from exc

    if payload.get("type") != "session-bridge":
        raise HTTPException(status_code=401, detail="Wrong token type")

    user = db.get(UserAccount, int(payload.get("userId", 0)))
    if user is None:
        raise HTTPException(status_code=401, detail="Unknown user")

    profile = db.query(UserProfile).filter(UserProfile.user_id == user.user_id).one_or_none()
    if profile is None:
        raise HTTPException(status_code=409, detail="Profile not completed")

    return {
        "userId": user.user_id,
        "fullName": user.full_name,
        "features": user_features(user, db),
    }
