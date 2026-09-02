"""Password hashing and JWT issuance.

Mirrors the Express design being replaced: a short-lived access token in the
Authorization header and a long-lived refresh token in an httpOnly cookie, with
the refresh token stored only as a hash so a database leak cannot be replayed.

Passwords use bcrypt; refresh tokens use SHA-256. That split is deliberate and
the reasoning is in `hash_token` — using bcrypt for both is what made the
original rotation ineffective.
"""

from __future__ import annotations

import hashlib
import hmac
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import settings

# bcrypt raises on inputs longer than 72 bytes rather than truncating them.
# Only passwords go through it; see hash_token for why tokens do not.
_BCRYPT_MAX_BYTES = 72


def _clip(secret: str) -> bytes:
    return secret.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_clip(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_clip(password), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def hash_token(token: str) -> str:
    """Hash a refresh token for storage.

    SHA-256, not bcrypt. bcrypt only reads the first 72 bytes of its input, and
    a JWT is far longer than that — two refresh tokens for the same user share a
    byte-identical header and leading claims, so under bcrypt they collide and a
    rotated-away token keeps working forever. A refresh token is already high
    entropy and signed, so a fast digest is the right primitive; bcrypt's slowness
    exists for low-entropy passwords.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def verify_token_hash(token: str, hashed: str) -> bool:
    return hmac.compare_digest(hash_token(token), hashed)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(user_id: int, email: str) -> str:
    payload = {
        "userId": user_id,
        "email": email,
        "type": "access",
        "iat": _now(),
        "exp": _now() + timedelta(minutes=settings.ACCESS_TOKEN_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_ACCESS_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: int) -> tuple[str, datetime]:
    expires_at = _now() + timedelta(days=settings.REFRESH_TOKEN_DAYS)
    payload = {
        "userId": user_id,
        "type": "refresh",
        # A unique claim per issue, so rotation always produces a different token
        # even within the same second.
        "jti": uuid.uuid4().hex,
        "iat": _now(),
        "exp": expires_at,
    }
    token = jwt.encode(payload, settings.JWT_REFRESH_SECRET, algorithm=settings.JWT_ALGORITHM)
    return token, expires_at


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_ACCESS_SECRET, algorithms=[settings.JWT_ALGORITHM])


def decode_refresh_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_REFRESH_SECRET, algorithms=[settings.JWT_ALGORITHM])
