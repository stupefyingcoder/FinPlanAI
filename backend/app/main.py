"""FinPlan AI — the single backend.

Replaces the Express service. It owns authentication, profiles and goals, and
serves the trained models directly by importing `finplan_ml` rather than calling
a second process.
"""

from __future__ import annotations

import logging
import sys
import warnings
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import REPO_ROOT, settings

# The ML package lives beside the backend in the monorepo. Adding it to the path
# keeps `pip install -e ../ml` optional for local development.
_ml_path = str(REPO_ROOT / "ml")
if _ml_path not in sys.path:
    sys.path.insert(0, _ml_path)

from app.db import Base, engine  # noqa: E402
from app.routers import ai, auth, goals, ml, profile  # noqa: E402

logger = logging.getLogger("finplan")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.API_VERSION,
    description="Financial planning with investor segmentation, portfolio allocation, "
    "gold forecasting and retrieval-grounded planning agents.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.FRONTEND_ORIGINS,
    allow_credentials=True,  # required for the httpOnly refresh cookie
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(goals.router)
app.include_router(ml.router)
app.include_router(ai.router)


@app.on_event("startup")
def on_startup() -> None:
    # Alembic owns the schema in deployment; this keeps a fresh clone runnable
    # with no migration step for the SQLite default.
    Base.metadata.create_all(bind=engine)

    if settings.using_default_secrets:
        warnings.warn(
            "JWT secrets are at their development defaults. Set JWT_ACCESS_SECRET and "
            "JWT_REFRESH_SECRET before deploying.",
            stacklevel=2,
        )

    try:
        from finplan_ml.registry import get_registry

        for component in get_registry().components:
            level = logging.INFO if component.available else logging.WARNING
            logger.log(level, "model %s: %s", component.name, component.detail)
    except Exception as exc:  # noqa: BLE001 - the API still serves CRUD without models
        logger.warning("ML package unavailable: %s", exc)


@app.get("/health", tags=["meta"])
def health():
    """Liveness plus the status of every model, in one call."""
    payload = {"ok": True, "version": settings.API_VERSION, "database": engine.url.get_backend_name()}
    try:
        from finplan_ml.registry import get_registry

        payload["models"] = get_registry().health()
    except Exception as exc:  # noqa: BLE001
        payload["models"] = {"ready": False, "error": str(exc)}
    return payload
