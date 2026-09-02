# FinPlan AI

A GenAI-powered financial planning platform. It builds a profile from a user's net worth, risk appetite and goals, segments them against 5,000 synthetic investor records, produces a portfolio allocation and a five-year gold-price forecast from trained models, and explains the plan conversationally through a retrieval-grounded multi-agent system.

Built for **Use Case 9 — Finance Planning** by Team AI Mavericks.

> **Status: integration in progress.** The application and the machine-learning work were developed in parallel as separate codebases. This repository is where they are being merged into one product. See [Current state](#current-state) for exactly what is wired up and what is not — nothing below is claimed to work until it says it does.

---

## What it does

| Capability | How |
|---|---|
| Investor segmentation | K-Means (k=5) over synthetic investor profiles, silhouette 0.63 |
| Portfolio allocation | Neural network with a softmax head — 11 features → 5 asset classes summing to 1.0 |
| Gold price forecasting | Prophet, driver-based: forecasts USD gold, USD/INR and inflation, then feeds them into the main model |
| Conversational planning | Four Gemini agents — Risk, Goal, Synthesis, History — coordinated by an orchestrator |
| Grounded answers | RAG over a FAISS index of KYC, loan and insurance documents via LangChain |

## Architecture

```
Tier 1  Presentation    React 19 + Tailwind (:3001)
Tier 1b AI surface      Streamlit planner, embedded (:8501)
Tier 2  Application     FastAPI (:8000) — auth, profile, goals, /ml/*, /ai/*
Tier 3  Intelligence    ml/ imported as a package: agents, RAG, model registry
Tier 4  Persistence     MySQL 8 (SQLite fallback for zero-setup demo)
```

The models are served by the API, not by Streamlit. The Streamlit planner is a client of those
endpoints, so the React dashboard renders real predictions independently of it.

## Repository layout

```
frontend/                React dashboard — home, auth, profile setup, six tabs
ml/                      GenAI + ML: agents, RAG pipeline, FAISS index, trained models
  data/                  5,000-row synthetic dataset, sample customer & policy documents
  data/model data/       K-Means, portfolio net, Prophet artifacts
  rag_system/            Retrieval pipeline, vector store, document ingestion
legacy/express-backend/  Original Express + MySQL API — being ported to FastAPI, then removed
docs/                    Project deck and codebase documentation
```

## Current state

| Component | State |
|---|---|
| React dashboard | Imported, runs against the Express API |
| Express API (auth, profile, me) | Imported, working — **scheduled for replacement** |
| K-Means, Prophet, RAG, FAISS, agents | Imported and trained — **not yet exposed over HTTP** |
| Portfolio model | Artifact present but **not loadable** — see below |
| FastAPI backend | Not started |
| Docker | Not started |

### Known issues being worked through

1. **`full_portfolio_model.pth` cannot be loaded.** It was saved with `torch.save(model)` as a
   pickled `RobustPortfolioNN` instance, but that class definition is not in the repository, so
   `torch.load` raises `AttributeError`. It is being retrained from the 5,000-row dataset and
   re-saved as a `state_dict`.
2. **Clustering uses 2 of 39 features** (net worth, primary goal). Being refit on the profile
   fields the application actually collects.
3. **`ml/` is not yet importable** — flat imports mean modules only resolve when run from their own
   directory. Being packaged.
4. **`ml/requirements.txt` is incomplete** — `langgraph`, `langchain-huggingface` and `pdfplumber`
   are imported but unlisted; `fastapi` and `uvicorn` are commented out.
5. **Four Streamlit entry points exist.** One will be promoted to the embedded AI tab; the rest
   will be deleted.

## Data

The 5,000-record dataset is **synthetic**. It was generated because the sourced dataset held only
40 records — too few to train on. Distributions and ratios were derived from the RBI Household
Financial Survey, the SEBI Investor Survey, World Gold Council reports and the NSE Investment
Behaviour Study, with 5% noise added and logical relationships preserved (higher income implies
higher savings, and so on). The customer documents under `ml/data/` are likewise synthetic
personas, not real people.

## Getting started

Setup instructions will land with the FastAPI backend and Docker Compose. Until then, see
`docs/CODEBASE_DOCUMENTATION.md` for how to run the frontend and the Express API separately.

Copy `.env.example` to `.env` in `frontend/`, `ml/` and `legacy/express-backend/` and fill in your
own values. **Never commit a `.env`.**

## Team

Sanika Kulkarni · Kashish Jain · Sarang Kokane · Prajwal Kulkarni · Yatesh Ahire · Omkar Kokate · Uday Lowalekar

The GenAI and machine-learning codebase was developed by Sanika Kulkarni; the application backend
and dashboard by Kashish Jain and Yatesh Ahire. Commit attribution is preserved on the imports.
