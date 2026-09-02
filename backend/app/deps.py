"""Shared dependencies: database session and the authenticated user."""

from __future__ import annotations

import jwt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db import get_db
from app.models import UserAccount

CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid or expired access token",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(request: Request, db: Session = Depends(get_db)) -> UserAccount:
    header = request.headers.get("Authorization")
    if not header or not header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = header.split(" ", 1)[1].strip()
    try:
        payload = decode_access_token(token)
    except jwt.PyJWTError as exc:
        raise CREDENTIALS_ERROR from exc

    if payload.get("type") != "access":
        # A refresh token presented as an access token must not be accepted.
        raise CREDENTIALS_ERROR

    user = db.get(UserAccount, int(payload.get("userId", 0)))
    if user is None:
        raise CREDENTIALS_ERROR
    return user
