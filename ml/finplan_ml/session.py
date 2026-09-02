"""Resolve the signed-in dashboard user when running embedded.

The Streamlit planner runs inside an iframe on the dashboard and cannot read the
app's Authorization header or its httpOnly cookie. The dashboard therefore passes
a short-lived signed token as `?session=`, which this module exchanges with the
backend for the viewer's identity and model features.

Deliberately fail-soft: when the app is opened directly — no token, or the API is
not running — it returns None and Streamlit carries on in standalone mode.
"""

from __future__ import annotations

import os
from typing import Any

API_BASE = os.getenv("FINPLAN_API_BASE", "http://localhost:8000")
_TIMEOUT_SECONDS = 8


def _read_token() -> str | None:
    """Read ?session= across Streamlit versions (query_params is the modern API)."""
    try:
        import streamlit as st
    except ImportError:  # pragma: no cover - only runs under Streamlit
        return None

    try:
        value = st.query_params.get("session")
    except AttributeError:  # Streamlit < 1.30
        params = st.experimental_get_query_params()
        value = params.get("session", [None])[0]

    if isinstance(value, list):
        value = value[0] if value else None
    return value or None


def load_session_profile() -> dict[str, Any] | None:
    """Return {userId, fullName, features} for the embedding user, or None.

    Never raises: an unreachable API or an expired token simply means the planner
    runs standalone rather than showing an error the viewer cannot act on.
    """
    token = _read_token()
    if not token:
        return None

    try:
        import requests  # noqa: PLC0415 - optional at import time

        response = requests.get(
            f"{API_BASE}/api/session/exchange", params={"token": token}, timeout=_TIMEOUT_SECONDS
        )
        if response.status_code != 200:
            return None
        return response.json()
    except Exception:  # noqa: BLE001 - standalone mode is always an acceptable outcome
        return None
