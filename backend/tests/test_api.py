"""End-to-end API tests against a temporary SQLite database.

These walk the path a real user takes — sign up, log in, save a profile, then ask
for a segment, an allocation and a plan — because that whole chain is what had
never once run in this project.
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

import pytest

# Point the app at a scratch database before importing it.
_TMP_DB = Path(tempfile.gettempdir()) / "finplan_test.db"
_TMP_DB.unlink(missing_ok=True)
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP_DB.as_posix()}"
os.environ.setdefault("JWT_ACCESS_SECRET", "test-access-secret")
os.environ.setdefault("JWT_REFRESH_SECRET", "test-refresh-secret")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

EMAIL = "asha.rao@example.com"
PASSWORD = "correct horse battery"

PROFILE_PAYLOAD = {
    "personal": {
        "fullName": "Asha Rao",
        "age": 34,
        "gender": "Female",
        "maritalStatus": "Married",
        "occupation": "Salaried",
    },
    "financials": {
        "monthlyIncome": 120000,
        "monthlyExpenses": 52000,
        "monthlySavingsPct": 27.5,
        "investableAssets": 3200000,
        "outstandingDebt": 450000,
        "emergencyFund": 300000,
        "creditScore": 762,
    },
    "loans": {"hasLoans": True, "loanTypes": ["Home"], "approxEmi": 20000},
    "goals": [{"name": "Retirement", "targetAmount": 5500000, "role": "primary"}],
    "preferences": {
        "experience": "Intermediate",
        "riskLevel": "Moderate",
        "investHorizon": "Long (> 10 years)",
    },
}


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def auth(client):
    """Sign up and log in once; return the header and the client's cookies."""
    r = client.post("/auth/signup", json={"fullName": "Asha Rao", "email": EMAIL, "password": PASSWORD})
    assert r.status_code == 201, r.text

    r = client.post("/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["fullName"] == "Asha Rao"
    assert body["profileCompleted"] is False
    return {"Authorization": f"Bearer {body['accessToken']}"}


def test_health_reports_models(client):
    body = client.get("/health").json()
    assert body["ok"] is True
    assert body["models"]["ready"] is True, body["models"]


def test_signup_rejects_duplicate_email(client, auth):
    r = client.post("/auth/signup", json={"fullName": "Someone", "email": EMAIL, "password": PASSWORD})
    assert r.status_code == 400


def test_login_rejects_wrong_password(client, auth):
    r = client.post("/auth/login", json={"email": EMAIL, "password": "wrong password"})
    assert r.status_code == 401


def test_protected_routes_require_a_token(client):
    assert client.get("/api/me").status_code == 401
    assert client.get("/api/goals").status_code == 401


def test_refresh_token_is_not_accepted_as_an_access_token(client, auth):
    """The two secrets differ, so a refresh token must never authorize a request."""
    refresh = client.cookies.get("refresh_token")
    assert refresh
    r = client.get("/api/me", headers={"Authorization": f"Bearer {refresh}"})
    assert r.status_code == 401


def test_me_returns_the_account(client, auth):
    body = client.get("/api/me", headers=auth).json()
    assert body["account"]["email"] == EMAIL


def test_allocation_requires_a_profile_first(client, auth):
    r = client.get("/api/ml/allocation", headers=auth)
    assert r.status_code == 409
    assert "profile" in r.json()["detail"].lower()


def test_saving_a_profile_marks_the_account_complete(client, auth):
    r = client.post("/api/profile", json=PROFILE_PAYLOAD, headers=auth)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["profileCompleted"] is True
    assert body["profile"]["age"] == 34
    assert client.get("/api/me", headers=auth).json()["profileCompleted"] is True


def test_emi_is_converted_from_rupees_to_percent(client, auth):
    """The profile stores a rupee EMI; the model expects a percentage of income.

    20,000 of 120,000 monthly income is 16.7%. Sending 20000 through unconverted
    would be far outside the training range and produce a garbage allocation.
    """
    from app.db import SessionLocal
    from app.models import UserAccount, UserProfile
    from app.services.ml_mapping import profile_to_features

    # Scope to this test's own user. Test modules share one engine — it is bound
    # at first import — so assuming the database holds exactly one profile breaks
    # as soon as another module signs someone up.
    with SessionLocal() as db:
        user = db.query(UserAccount).filter(UserAccount.email == EMAIL).one()
        profile = db.query(UserProfile).filter(UserProfile.user_id == user.user_id).one()
        features = profile_to_features(profile)

    assert features["Loan_EMI_Obligations"] == pytest.approx(16.67, abs=0.1)
    assert features["Risk_Taking_Ability"] == "Medium"  # form says "Moderate"
    assert features["Annual_Income"] == pytest.approx(1_440_000)


def test_segment_and_allocation(client, auth):
    segment = client.get("/api/ml/segment", headers=auth)
    assert segment.status_code == 200, segment.text
    assert 0 <= segment.json()["cluster_id"] < 5

    allocation = client.get("/api/ml/allocation", headers=auth)
    assert allocation.status_code == 200, allocation.text
    weights = allocation.json()["allocation"]
    assert sum(weights.values()) == pytest.approx(1.0, abs=1e-5)
    assert all(0.0 <= w <= 1.0 for w in weights.values())


def test_gold_forecast(client):
    body = client.get("/api/ml/forecast/gold?limit=8").json()
    assert len(body["points"]) == 8
    assert all(p["yhat_lower"] <= p["yhat_upper"] for p in body["points"])


def test_plan_survives_a_missing_gemini_key(client, auth):
    """The whole point of the fallback: no key must still produce a usable plan."""
    r = client.post("/api/ai/plan", headers=auth)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["narrative"].strip()
    assert sum(body["allocation"].values()) == pytest.approx(1.0, abs=1e-5)
    assert body["generated_by"] in {"gemini", "fallback"}
    if body["generated_by"] == "fallback":
        assert body["note"]


def test_goals_crud_and_ownership(client, auth):
    created = client.post(
        "/api/goals",
        json={"goal_name": "House deposit", "target_amount": 2_000_000, "current_amount": 500_000},
        headers=auth,
    )
    assert created.status_code == 201, created.text
    goal = created.json()
    assert goal["progress_pct"] == 25.0

    listed = client.get("/api/goals", headers=auth).json()
    assert len(listed) == 1

    patched = client.patch(
        f"/api/goals/{goal['goal_id']}", json={"current_amount": 1_000_000}, headers=auth
    ).json()
    assert patched["progress_pct"] == 50.0

    # A second account must not see or touch the first account's goal.
    client.post("/auth/signup", json={"fullName": "Other", "email": "other@example.com", "password": PASSWORD})
    other = client.post("/auth/login", json={"email": "other@example.com", "password": PASSWORD}).json()
    other_auth = {"Authorization": f"Bearer {other['accessToken']}"}
    assert client.get("/api/goals", headers=other_auth).json() == []
    assert client.patch(
        f"/api/goals/{goal['goal_id']}", json={"current_amount": 1}, headers=other_auth
    ).status_code == 404
    assert client.delete(f"/api/goals/{goal['goal_id']}", headers=other_auth).status_code == 404

    assert client.delete(f"/api/goals/{goal['goal_id']}", headers=auth).status_code == 204


def test_refresh_rotates_and_old_token_stops_working(client):
    """Rotation is the point: a stolen refresh token must die on next use."""
    fresh = TestClient(app)
    fresh.post("/auth/signup", json={"fullName": "Rot", "email": "rot@example.com", "password": PASSWORD})
    fresh.post("/auth/login", json={"email": "rot@example.com", "password": PASSWORD})
    original = fresh.cookies.get("refresh_token")

    first = fresh.post("/auth/refresh")
    assert first.status_code == 200, first.text
    rotated = fresh.cookies.get("refresh_token")
    assert rotated != original

    replay = TestClient(app)
    replay.cookies.set("refresh_token", original)
    assert replay.post("/auth/refresh").status_code == 401


def test_logout_revokes_the_session(client):
    fresh = TestClient(app)
    fresh.post("/auth/signup", json={"fullName": "Out", "email": "out@example.com", "password": PASSWORD})
    fresh.post("/auth/login", json={"email": "out@example.com", "password": PASSWORD})
    assert fresh.post("/auth/logout").status_code == 200
    assert fresh.post("/auth/refresh").status_code == 401
