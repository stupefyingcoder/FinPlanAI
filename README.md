# FinPlan AI

A GenAI-powered financial planning platform. It builds a profile from a user's net worth, risk appetite and goals, segments them against 5,000 synthetic investor records, produces a portfolio allocation and a five-year gold-price forecast from trained models, and explains the plan conversationally through a retrieval-grounded multi-agent system.

Built for **Use Case 9 — Finance Planning** by Team AI Mavericks.

[![CI](https://github.com/stupefyingcoder/FinPlanAI/actions/workflows/ci.yml/badge.svg?branch=phase-2-fastapi-backend)](https://github.com/stupefyingcoder/FinPlanAI/actions/workflows/ci.yml)

> The application and the machine-learning work were built as separate codebases; this repository is where they were merged into one product. A signed-in user gets an investor segment, a portfolio allocation and a written plan produced by trained models from their own profile.

```bash
docker compose up --build
# dashboard  http://localhost:3000   sign in: demo@finplan.ai / demo1234
# API docs   http://localhost:8000/docs
```

No database to install, no API key required. The demo account comes with a profile and three goals already filled in.

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
| POST/GET | `/api/session/streamlit-token` `/api/session/exchange` | Short-lived signed hand-off to the embedded planner |
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
| FastAPI backend | Auth, profile, goals, ML, AI and session routes; 26 integration tests |
| Segmentation, allocation, gold forecast | Trained, registered and served over HTTP |
| Alembic migrations | Initial migration creates all four tables |
| Results tab | Renders the model's allocation and the user's segment |
| Market Analysis tab | Renders the Prophet forecast with its uncertainty band |
| Financial Goals tab | Real CRUD against `financial_goals` |
| AI Insights tab | Plan summary rendered natively, planner embedded via a signed session token |
| Docker | `docker compose up` runs Postgres/MySQL, the API and the dashboard |
| CI | Both test suites, the frontend build, the image build, and a job proving serving needs no PyTorch |
| Deployment | Blueprints for Render (API + Postgres) and Vercel (dashboard) |
| Express backend | **Removed** — fully replaced by FastAPI |
| Streamlit planner | **Removed** — the agents run inside the API |

Market indices, stock and currency figures on the Market Analysis tab remain illustrative
sample data — there is no live market feed connected, and the UI says so.

### Model results

| Model | Result |
|---|---|
| Portfolio allocation | **2.77pp** mean absolute error on a held-out split, against **6.15pp** for a predict-the-average baseline — a 55% improvement. Outputs always sum to 1.0. |
| Investor segmentation | k=5, silhouette **0.42**. Scores for k=3 to 8 are recorded in the metadata; k=7 scores higher and k=5 is a stated trade-off for interpretability. |
| Gold forecast | Prophet with external regressors, 237 monthly points to 2030 with an uncertainty band. |

Full methodology, per-class errors, behavioural checks and known limitations:
**[docs/MODEL_CARD.md](docs/MODEL_CARD.md)**.

Both models were retrained here because the inherited checkpoints could not be loaded: one pickled
a class that was never committed, the other was written by an incompatible scikit-learn. The
training scripts are in `ml/training/`.

### Still to do

1. `google-generativeai` is deprecated upstream; the agent code should move to `google-genai`.
2. No live market data — the non-gold figures on Market Analysis are sample data.
3. The RAG document corpus is small (72 vectors over the sample policy documents).

## Data

The 5,000-record dataset is **synthetic**. It was generated because the sourced dataset held only
40 records — too few to train on. Distributions and ratios were derived from the RBI Household
Financial Survey, the SEBI Investor Survey, World Gold Council reports and the NSE Investment
Behaviour Study, with 5% noise added and logical relationships preserved (higher income implies
higher savings, and so on). The customer documents under `ml/data/` are likewise synthetic
personas, not real people.

## Getting started

### With Docker (recommended)

```bash
docker compose up --build
```

Four services: MySQL, the FastAPI backend, the Streamlit planner and the dashboard behind nginx.
Migrations and the demo seed run automatically on first boot. Add a `GEMINI_API_KEY` to the
environment for LLM-written plans; without one the narrative is generated locally and every model
prediction is unaffected.

### Without Docker

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

Optionally, the embedded planner for the AI Insights tab:

```bash
cd ml && .venv/Scripts/python -m streamlit run streamlit_app.py   # -> :8501
```

Tests:

```bash
cd backend && ../ml/.venv/Scripts/python -m pytest tests -q   # 20 API tests
cd ../ml   && .venv/Scripts/python -m pytest tests -q         # 9 model tests
```

Seed the demo account (optional, but it saves filling in the profile form):

```bash
cd backend && ../ml/.venv/Scripts/python -m app.seed
```

Copy `.env.example` to `.env` in `backend/`, `frontend/` and `ml/` and fill in your own values.
A Gemini key is needed only for the written narrative — every model prediction works without one.
**Never commit a `.env`.**

## Deploying

The API and the dashboard deploy separately: a static bundle on a CDN is free and
faster than serving it from the API container.

**API + database — Render.** `render.yaml` is a blueprint: point Render at this
repository and it creates the web service and a Postgres instance, generates the
JWT secrets, and wires the connection string. Two values are left for you:
`GEMINI_API_KEY` (optional) and `FRONTEND_ORIGINS` (the Vercel URL, once you have
it).

**Dashboard — Vercel.** Import the repository, set the root directory to
`frontend/`, and set `REACT_APP_API_URL` to the Render URL. Create React App
inlines that at build time, so changing it needs a redeploy.

Two things that bite on free tiers, both already handled:

- **Cold starts.** Free instances sleep after inactivity and take up to a minute
  to wake. The dashboard polls `/health` on load and shows a "waking the server"
  banner instead of hanging silently.
- **Cross-site cookies.** Once the API and the dashboard are on different
  domains, the refresh cookie needs `Secure` and `SameSite=None` or the browser
  drops it — which presents as "login works, then I'm logged out". `render.yaml`
  sets both.

The image deliberately excludes PyTorch. The allocation network is 4,677
parameters and runs in NumPy from `artifacts/portfolio_model.npz`; installing a
536 MB framework to do three matrix multiplies is what puts a project like this
over free-tier limits. Training still uses PyTorch — see `ml/requirements.txt`
versus `ml/requirements-serve.txt` — and a CI job installs only the serving set,
asserts `torch` is not importable, and predicts an allocation anyway.

## Team

Sanika Kulkarni · Kashish Jain · Sarang Kokane · Prajwal Kulkarni · Yatesh Ahire · Omkar Kokate · Uday Lowalekar

The GenAI and machine-learning codebase was developed by Sanika Kulkarni; the application backend
and dashboard by Kashish Jain and Yatesh Ahire. Commit attribution is preserved on the imports.
