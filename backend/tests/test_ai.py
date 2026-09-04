"""The conversational planner.

The property worth protecting: with no Gemini key configured — which is the
default for anyone who clones this — the AI tab must still answer, and the
segment, allocation and forecast must be untouched. A dashboard that goes blank
because a third-party key is missing is worse than one that explains itself.
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

import pytest

_TMP_DB = Path(tempfile.gettempdir()) / "finplan_ai_test.db"
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
        json={"fullName": "AI Tester", "email": "ai@example.com", "password": PASSWORD},
    )
    token = client.post(
        "/auth/login", json={"email": "ai@example.com", "password": PASSWORD}
    ).json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}
    client.post("/api/profile", json=PROFILE_PAYLOAD, headers=headers)
    return headers


def test_status_reports_whether_the_planner_is_configured(client):
    body = client.get("/api/ai/status").json()
    assert "available" in body and "detail" in body
    assert isinstance(body["available"], bool)


def test_chat_requires_authentication(client):
    assert client.post("/api/ai/chat", json={"message": "hello"}).status_code == 401


def test_chat_answers_even_without_an_api_key(client, auth):
    response = client.post(
        "/api/ai/chat", json={"message": "Am I saving enough for retirement?"}, headers=auth
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["answer"].strip(), "an empty answer is a broken tab"
    assert body["generated_by"] in {"agents", "gemini", "fallback"}
    assert isinstance(body["sources"], list)


def test_chat_rejects_an_empty_message(client, auth):
    assert client.post("/api/ai/chat", json={"message": ""}, headers=auth).status_code == 422


def test_chat_needs_a_profile_to_reason_about(client):
    """Without a profile there is nothing to ground an answer in."""
    client.post(
        "/auth/signup",
        json={"fullName": "No Profile", "email": "noprofile@example.com", "password": PASSWORD},
    )
    token = client.post(
        "/auth/login", json={"email": "noprofile@example.com", "password": PASSWORD}
    ).json()["accessToken"]
    response = client.post(
        "/api/ai/chat",
        json={"message": "what should I do?"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 409


def test_plan_still_returns_real_model_output_without_a_key(client, auth):
    """The numbers are local computations; only the prose should degrade."""
    body = client.post("/api/ai/plan", headers=auth).json()
    assert body["narrative"].strip()
    assert sum(body["allocation"].values()) == pytest.approx(1.0, abs=1e-5)
    assert body["segment"]["label"]
    if body["generated_by"] == "fallback":
        assert body["note"], "a degraded plan should say why"


def test_the_profile_reaches_the_agents_with_units_intact(client, auth):
    """The agents speak in rupees; the models speak in percentages of income."""
    from finplan_ml.assistant import features_to_profile

    features = {
        "Annual_Income": 1_440_000,
        "Monthly_Expenses": 52_000,
        "Savings_Rate(%)": 27.5,
        "Loan_EMI_Obligations": 16.67,  # percent
        "Age": 34,
        "Risk_Taking_Ability": "Medium",
        "Primary_Financial_Goal": "Emergency_Fund",
        "Goal_Amount(₹)": 5_500_000,
        "Goal_Timeline(Years)": 12,
    }
    profile = features_to_profile(features, name="AI Tester")

    # DBCustomerProfile is annual-income based; the agent tools read Annual_Income
    # and Risk_Taking_Ability, and it is the only schema carrying both.
    assert profile.Annual_Income == pytest.approx(1_440_000)
    assert profile.Monthly_Expenses == pytest.approx(52_000)
    # income/12 - expenses = 120,000 - 52,000
    assert profile.Monthly_Surplus == pytest.approx(68_000, abs=100)
    assert profile.Risk_Taking_Ability == "Medium"
    assert profile.Primary_Financial_Goal == "Emergency Fund"
