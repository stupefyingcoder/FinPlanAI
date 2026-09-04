"""The profile form's real payload must save.

Reproduces the 422 seen in the browser: the React form posts a flat snake_case
object whose `goals` field is a JSON *string*, which a strict list field rejects
with "Input should be a valid list". Worse, every other flat key was silently
ignored, so a save that did succeed would have stored an empty profile.
"""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

import pytest

_TMP_DB = Path(tempfile.gettempdir()) / "finplan_intake_test.db"
_TMP_DB.unlink(missing_ok=True)
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP_DB.as_posix()}"
os.environ.setdefault("JWT_ACCESS_SECRET", "test-access-secret")
os.environ.setdefault("JWT_REFRESH_SECRET", "test-refresh-secret")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

PASSWORD = "correct horse battery"

# Copied from the failing request, including the JSON-string goals.
FORM_PAYLOAD = {
    "dob": "1999-02-11",
    "age": 27,
    "gender": "Male",
    "occupation": "Salaried",
    "marital_status": "Single",
    "dependents_count": 0,
    "monthly_income": 50000,
    "monthly_expenses": 20000,
    "monthly_savings_amt": 15000,
    "monthly_savings_pct": 30.0,
    "has_loans": False,
    "loan_types": "[]",
    "approx_emi": None,
    "primary_goal": "Buy house / down payment",
    "goal_target": 5000000,
    "goal_timeline_years": 9,
    "pref_instruments": '["Equity","Gold"]',
    "invest_horizon": "Long (> 10 years)",
    "risk_level": "high",
    "risk_score": 80,
    "experience_level": "Beginner",
    "investable_assets": 40000,
    "outstanding_debt": 0,
    "full_name": "Rory Burns",
    "city": "Mysore",
    "state": "Karnataka",
    "goals": json.dumps(
        [
            {"id": 1788447150987.2817, "name": "Buy a car", "amount": 2500000,
             "date": "2030-07-04", "type": "secondary"},
            {"id": 1788447156411.125, "name": "Buy house / down payment", "amount": 5000000,
             "date": "2034-11-16", "type": "primary"},
        ]
    ),
    "preferred_assets": '["Equity","Gold"]',
    "insurance_policies": "[]",
    "dependents_ages": "[]",
}


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def auth(client):
    client.post(
        "/auth/signup",
        json={"fullName": "Rory Burns", "email": "rory@example.com", "password": PASSWORD},
    )
    token = client.post(
        "/auth/login", json={"email": "rory@example.com", "password": PASSWORD}
    ).json()["accessToken"]
    return {"Authorization": f"Bearer {token}"}


def test_the_form_payload_saves(client, auth):
    response = client.post("/api/profile", json=FORM_PAYLOAD, headers=auth)
    assert response.status_code == 200, response.text
    assert response.json()["profileCompleted"] is True


def test_the_flat_fields_actually_land(client, auth):
    """The original failure mode was silent data loss, not just the 422."""
    profile = client.get("/api/profile", headers=auth).json()["profile"]
    assert profile["age"] == 27
    assert profile["monthlyIncome"] == 50000
    assert profile["annualIncome"] == 600000  # derived from the monthly figure
    assert profile["netWorth"] == 40000
    assert profile["savingsRatePct"] == 30.0
    assert profile["goalAmount"] == 5000000
    assert profile["riskLevel"] == "high"
    assert profile["primaryGoal"] == "Buy house / down payment"


def test_json_string_goals_are_parsed_and_normalized(client, auth):
    extra = client.get("/api/profile", headers=auth).json()["profile"]["extra"]
    goals = extra["goals"]
    assert isinstance(goals, list) and len(goals) == 2
    primary = next(g for g in goals if g["role"] == "primary")
    assert primary["name"] == "Buy house / down payment"
    assert primary["targetAmount"] == 5000000
    assert primary["targetDate"] == "2034-11-16"


def test_predictions_work_from_a_form_saved_profile(client, auth):
    """The point of the fix: the saved profile must actually drive the models."""
    segment = client.get("/api/ml/segment", headers=auth)
    assert segment.status_code == 200, segment.text

    allocation = client.get("/api/ml/allocation", headers=auth)
    assert allocation.status_code == 200, allocation.text
    weights = allocation.json()["allocation"]
    assert sum(weights.values()) == pytest.approx(1.0, abs=1e-5)


def test_the_documented_nested_shape_still_works(client):
    """Accepting the flat payload must not break the typed schema."""
    from tests.test_api import PROFILE_PAYLOAD

    client.post(
        "/auth/signup",
        json={"fullName": "Nested", "email": "nested@example.com", "password": PASSWORD},
    )
    token = client.post(
        "/auth/login", json={"email": "nested@example.com", "password": PASSWORD}
    ).json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post("/api/profile", json=PROFILE_PAYLOAD, headers=headers)
    assert response.status_code == 200, response.text
    assert response.json()["profile"]["age"] == 34


def test_a_genuinely_invalid_payload_is_still_rejected(client, auth):
    response = client.post("/api/profile", json={"personal": {"age": 999}}, headers=auth)
    assert response.status_code == 422
