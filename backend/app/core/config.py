"""Backend settings, all overridable by environment variable.

SQLite is the default so the project runs with no database to install; MySQL is
used in production by setting DATABASE_URL.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_ROOT.parent

load_dotenv(BACKEND_ROOT / ".env")


def _bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    APP_NAME = "FinPlan AI"
    API_VERSION = "0.3.0"

    # Zero-setup default; set DATABASE_URL to mysql+pymysql://... for production.
    DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{(BACKEND_ROOT / 'finplan.db').as_posix()}")

    JWT_ACCESS_SECRET = os.getenv("JWT_ACCESS_SECRET", "dev-access-secret-change-me")
    JWT_REFRESH_SECRET = os.getenv("JWT_REFRESH_SECRET", "dev-refresh-secret-change-me")
    JWT_ALGORITHM = "HS256"
    ACCESS_TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_MINUTES", "15"))
    REFRESH_TOKEN_DAYS = int(os.getenv("REFRESH_TOKEN_DAYS", "7"))

    REFRESH_COOKIE_NAME = "refresh_token"
    COOKIE_SECURE = _bool("COOKIE_SECURE", False)
    COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")

    # An *empty* value must not mean "allow nothing". Render's blueprint creates
    # `sync: false` variables with an empty string, so a deployment where nobody
    # filled it in ended up with an allow-list of zero origins — the browser was
    # then blocked from every response, including /health, which presents as
    # "the API is not responding" while curl reports a perfectly healthy 200.
    _DEFAULT_ORIGINS = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3001"
    FRONTEND_ORIGINS = [
        o.strip()
        for o in (os.getenv("FRONTEND_ORIGINS", "").strip() or _DEFAULT_ORIGINS).split(",")
        if o.strip()
    ]

    # Vercel gives every preview deployment its own hostname, so pinning only the
    # production URL breaks each preview. Set FRONTEND_ORIGIN_REGEX to something
    # like https://.*\.vercel\.app to cover them.
    FRONTEND_ORIGIN_REGEX = os.getenv("FRONTEND_ORIGIN_REGEX", "").strip() or None

    # Seconds to wait before falling back to a deterministic answer. A
    # multi-agent reply is several sequential Gemini calls, so 25s was short
    # enough to time out on genuinely healthy requests.
    LLM_TIMEOUT_SECONDS = float(os.getenv("LLM_TIMEOUT_SECONDS", "45"))

    @property
    def using_default_secrets(self) -> bool:
        return "change-me" in self.JWT_ACCESS_SECRET or "change-me" in self.JWT_REFRESH_SECRET


settings = Settings()
