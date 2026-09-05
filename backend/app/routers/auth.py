"""Authentication: signup, login, refresh, logout.

Route paths and response shapes match the Express service being replaced, so the
existing React frontend keeps working against it unchanged.

Refresh tokens rotate on every use: the presented token is revoked and a new one
issued. Only bcrypt hashes are stored, so the database never holds a usable
token.
"""

from __future__ import annotations

from datetime import datetime, timezone

import jwt
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    hash_token,
    verify_password,
    verify_token_hash,
)
from app.db import get_db
from app.models import RefreshToken, UserAccount
from app.schemas import (
    AccessTokenResponse,
    LoginRequest,
    LoginResponse,
    MessageResponse,
    SignupRequest,
    SignupResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_DAYS * 24 * 3600,
        path="/",
    )


def _issue_refresh(db: Session, user_id: int, response: Response) -> None:
    token, expires_at = create_refresh_token(user_id)
    db.add(
        RefreshToken(
            user_id=user_id,
            token_hash=hash_token(token),
            expires_at=expires_at.replace(tzinfo=None),
        )
    )
    db.commit()
    _set_refresh_cookie(response, token)


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    if db.scalar(select(UserAccount).where(UserAccount.email == email)):
        raise HTTPException(status_code=400, detail="An account with that email already exists")

    user = UserAccount(
        full_name=payload.resolved_name,
        email=email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return SignupResponse(
        message="Signup successful",
        user={"userId": user.user_id, "fullName": user.full_name, "email": user.email},
    )


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(UserAccount).where(UserAccount.email == payload.email.lower().strip()))
    # Same message either way, so the endpoint does not reveal which emails exist.
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    _issue_refresh(db, user.user_id, response)
    return LoginResponse(
        accessToken=create_access_token(user.user_id, user.email),
        profileCompleted=user.profile_completed,
        fullName=user.full_name,
        userId=user.user_id,
    )


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=settings.REFRESH_COOKIE_NAME),
    db: Session = Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Missing refresh token")

    try:
        payload = decode_refresh_token(refresh_token)
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token") from exc

    user_id = int(payload.get("userId", 0))
    user = db.get(UserAccount, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    rows = db.scalars(
        select(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked.is_(False))
        .order_by(RefreshToken.created_at.desc())
    ).all()

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    match = next(
        (r for r in rows if r.expires_at > now and verify_token_hash(refresh_token, r.token_hash)),
        None,
    )
    if match is None:
        raise HTTPException(status_code=401, detail="Refresh token is not recognised")

    # Rotate: the presented token cannot be reused.
    match.revoked = True
    db.add(match)
    _issue_refresh(db, user_id, response)

    return AccessTokenResponse(accessToken=create_access_token(user.user_id, user.email))


@router.post("/logout", response_model=MessageResponse)
def logout(
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=settings.REFRESH_COOKIE_NAME),
    db: Session = Depends(get_db),
):
    if refresh_token:
        try:
            user_id = int(decode_refresh_token(refresh_token).get("userId", 0))
        except jwt.PyJWTError:
            user_id = 0
        if user_id:
            for row in db.scalars(
                select(RefreshToken).where(
                    RefreshToken.user_id == user_id, RefreshToken.revoked.is_(False)
                )
            ).all():
                if verify_token_hash(refresh_token, row.token_hash):
                    row.revoked = True
                    db.add(row)
            db.commit()

    response.delete_cookie(settings.REFRESH_COOKIE_NAME, path="/")
    return MessageResponse(message="Logged out")
