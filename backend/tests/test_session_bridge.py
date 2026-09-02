"""Tests for the Streamlit session hand-off.

The property that matters: the iframe URL must never be enough on its own to
read someone else's finances.
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

import pytest

_TMP_DB = Path(tempfile.gettempdir()) / "finplan_bridge_test.db"
_TMP_DB.unlink(missing_ok=True)
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP_DB.as_posix()}"
os.environ.setdefault("JWT_ACCESS_SECRET", "test-access-secret")
os.environ.setdefault("JWT_REFRESH_SECRET", "test-refresh-secret")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from tests.test_api import PROFILE_PAYLOAD  # noqa: E402

PASSWORD = "correct horse battery"


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def auth(client):
    client.post(
        "/auth/signup",
        json={"fullName": "Bridge User", "email": "bridge@example.com", "password": PASSWORD},
    )
    token = client.post(
        "/auth/login", json={"email": "bridge@example.com", "password": PASSWORD}
    ).json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}
    client.post("/api/profile", json=PROFILE_PAYLOAD, headers=headers)
    return headers


def test_token_requires_authentication(client):
    assert client.post("/api/session/streamlit-token").status_code == 401


def test_exchange_returns_features_for_the_right_user(client, auth):
    token = client.post("/api/session/streamlit-token", headers=auth).json()["token"]
    body = client.get(f"/api/session/exchange?token={token}").json()
    assert body["fullName"] == "Bridge User"
    # The EMI conversion is applied here too, not just on the dashboard path.
    assert body["features"]["Loan_EMI_Obligations"] == pytest.approx(16.67, abs=0.1)


def test_a_forged_or_garbage_token_is_refused(client):
    assert client.get("/api/session/exchange?token=not-a-jwt").status_code == 401


def test_an_access_token_cannot_be_used_as_a_session_token(client, auth):
    """Audience scoping: the bridge accepts only tokens minted for the planner."""
    access = auth["Authorization"].split(" ", 1)[1]
    assert client.get(f"/api/session/exchange?token={access}").status_code == 401


def test_session_token_is_not_accepted_by_the_main_api(client, auth):
    """And the narrow token must not work the other way round either."""
    token = client.post("/api/session/streamlit-token", headers=auth).json()["token"]
    assert client.get("/api/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401
