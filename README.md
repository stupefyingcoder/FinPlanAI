# FinPlan AI

A GenAI-powered financial planning platform. It builds a profile from a user's net worth, risk appetite and goals, segments them against 5,000 synthetic investor records, produces a portfolio allocation and a five-year gold-price forecast from trained models, and explains the plan conversationally through a retrieval-grounded multi-agent system.

Built for **Use Case 9 — Finance Planning** by Team AI Mavericks.

> **Status: integration in progress.** The application and the machine-learning work were developed in parallel as separate codebases. This repository is where they are being merged into one product. One FastAPI service now owns authentication, profiles, goals and the trained models; the React dashboard has not yet been rewired to consume the prediction endpoints. See [Current state](#current-state).

---

## What it does

| Capability | How |
|---|---|
| Investor segmentation | K-Means (k=5) over synthetic investor profiles, silhouette 0.42 |
| Portfolio allocation | Neural network with a softmax head — 37 features to 5 asset classes summing to 1.0 |
| Gold price forecasting | Prophet, driver-based: forecasts USD gold, USD/INR and inflation, then feeds them into the main model |
| Conversational planning | Four Gemini agents — Risk, Goal, Synthesis, History — coordinated by an orchestrator |
| Grounded answers | RAG over a FAISS index of KYC, loan and insurance documents via LangChain |

## Architecture

```
Tier 1  Presentation    React 19 + Tailwind (:3001)
Tier 1b AI surface      Streamlit planner, embedded (:8501)
Tier 2  Application     FastAPI (:8000) — auth, profile, goals, /api/ml/*, /api/ai/*
Tier 3  Intelligence    ml/ imported as a package: agents, RAG, model registry
Tier 4  Persistence     SQLite by default, MySQL via DATABASE_URL
```

### API

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/signup` `/auth/login` `/auth/refresh` `/auth/logout` | JWT access token plus a rotating httpOnly refresh cookie |
| GET | `/api/me` | Current account |
| GET, POST | `/api/profile` | Financial profile |
| GET, POST, PATCH, DELETE | `/api/goals` | Financial goals |
| GET | `/api/ml/segment` `/api/ml/allocation` `/api/ml/forecast/gold` | Model predictions for the signed-in user |
| POST | `/api/ai/plan` | Segment, allocation and a written plan |
| GET | `/health` `/api/ml/health` | Liveness and per-model status |

Interactive docs at `http://localhost:8000/docs`.

The models are served by the API, not by Streamlit. The Streamlit planner is a client of those
endpoints, so the React dashboard renders real predictions independently of it.

## Repository layout

```
backend/                 FastAPI — auth, profile, goals, ML and AI routers
  app/routers/           auth, profile, goals, ml, ai
  app/services/          profile to model-feature mapping
  alembic/versions/      migrations
frontend/                React dashboard — home, auth, profile setup, six tabs
ml/                      GenAI + ML, importable as the finplan_ml package
  finplan_ml/            config, registry, models, agents
  artifacts/             trained K-Means, portfolio net, Prophet outputs
  training/              the scripts that produce those artifacts
  data/                  5,000-row synthetic dataset, sample customer and policy documents
docs/                    Project deck and codebase documentation
```

## Current state

| Component | State |
|---|---|
| FastAPI backend | Auth, profile, goals, ML and AI routes; 15 integration tests |
| Segmentation, allocation, gold forecast | Trained, registered and served over HTTP |
| Alembic migrations | Initial migration creates all four tables |
| React dashboard | Runs; the API base is now configurable, but the tabs do not yet call the prediction endpoints |
| Express backend | **Removed** — fully replaced by FastAPI |
| RAG, agents, Streamlit planner | Packaged and importable; not yet embedded in the dashboard |
| Docker | Not started |

### Model results

| Model | Result |
|---|---|
| Portfolio allocation | 2.77pp mean absolute error on a held-out split, against 6.15pp for a predict-the-average baseline — a 55% improvement. Outputs always sum to 1.0. |
| Investor segmentation | k=5, silhouette 0.42. Scores for k=3 to 8 are recorded in `ml/artifacts/customer_clustering_meta.json`. |
| Gold forecast | Prophet, 237 monthly points to 2030 with an uncertainty band. |

Both models were retrained here because the inherited checkpoints could not be loaded: one pickled
a class that was never committed, the other was written by an incompatible scikit-learn. The
training scripts are in `ml/training/`.

### Still to do

1. The dashboard tabs do not yet render predictions; they show placeholder data.
2. The Streamlit planner is not embedded in the dashboard.
3. No Docker setup yet.
4. `google-generativeai` is deprecated upstream; the agent code should move to `google-genai`.

## Data

The 5,000-record dataset is **synthetic**. It was generated because the sourced dataset held only
40 records — too few to train on. Distributions and ratios were derived from the RBI Household
Financial Survey, the SEBI Investor Survey, World Gold Council reports and the NSE Investment
Behaviour Study, with 5% noise added and logical relationships preserved (higher income implies
higher savings, and so on). The customer documents under `ml/data/` are likewise synthetic
personas, not real people.

## Getting started

No database required — the backend defaults to SQLite.

```bash
# 1. Python environment (backend and ML share one)
python -m venv ml/.venv
ml/.venv/Scripts/python -m pip install -r ml/requirements.txt -r backend/requirements.txt

# 2. Database
cd backend
../ml/.venv/Scripts/python -m alembic upgrade head

# 3. API  ->  http://localhost:8000/docs
../ml/.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000

# 4. Frontend  ->  http://localhost:3001
cd ../frontend && npm install && npm start
```

Tests:

```bash
cd backend && ../ml/.venv/Scripts/python -m pytest tests -q   # 15 API tests
cd ../ml   && .venv/Scripts/python -m pytest tests -q         # 9 model tests
```

Copy `.env.example` to `.env` in `backend/`, `frontend/` and `ml/` and fill in your own values.
A Gemini key is needed only for the written narrative — every model prediction works without one.
**Never commit a `.env`.**

## Team

Sanika Kulkarni · Kashish Jain · Sarang Kokane · Prajwal Kulkarni · Yatesh Ahire · Omkar Kokate · Uday Lowalekar

The GenAI and machine-learning codebase was developed by Sanika Kulkarni; the application backend
and dashboard by Kashish Jain and Yatesh Ahire. Commit attribution is preserved on the imports.
