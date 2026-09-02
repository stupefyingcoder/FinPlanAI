"""Single source of truth for paths and environment settings.

Every module resolves files through this one, so the package works no matter
which directory the process was started from. Before this existed, modules used
relative paths and only ran when the working directory happened to be right.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# ml/ — the package lives at ml/finplan_ml/, so go up two levels.
ML_ROOT = Path(__file__).resolve().parents[1]

load_dotenv(ML_ROOT / ".env")

# --- Directories ---------------------------------------------------------
DATA_DIR = ML_ROOT / "data"
ARTIFACTS_DIR = ML_ROOT / "artifacts"
INDEX_DIR = ML_ROOT / "rag_index_faiss"
PLANS_DIR = ML_ROOT / "plans"

# --- Datasets ------------------------------------------------------------
CUSTOMERS_CSV = DATA_DIR / "finance_planning_customers_5000_v2_augmented_with_insurance_cat.csv"
CLUSTERED_CSV = DATA_DIR / "customers_clustered_k5.csv"
PROJECTIONS_CSV = DATA_DIR / "customer_projections.csv"

# --- Loose JSON at the ml/ root ------------------------------------------
CLUSTER_META = ML_ROOT / "cluster_meta.json"
CUSTOMER_DB = ML_ROOT / "customer_db.json"

# --- Trained artifacts ---------------------------------------------------
CLUSTER_MODEL = ARTIFACTS_DIR / "customer_clustering.joblib"
# Original pickle, unloadable on scikit-learn >= 1.7. Kept for provenance.
CLUSTER_MODEL_LEGACY = ARTIFACTS_DIR / "customer_clustering_k5.pkl"
CLUSTER_MODEL_META = ARTIFACTS_DIR / "customer_clustering_meta.json"

# Retrained portfolio network, saved as a state_dict (see training/).
PORTFOLIO_MODEL = ARTIFACTS_DIR / "portfolio_model.pt"
PORTFOLIO_MODEL_META = ARTIFACTS_DIR / "portfolio_model_meta.json"
# The original pickled-module checkpoint. Kept for provenance only: its class
# definition was never committed, so torch.load cannot reconstruct it.
PORTFOLIO_MODEL_LEGACY = ARTIFACTS_DIR / "full_portfolio_model.pth"
PORTFOLIO_CLASSES = ARTIFACTS_DIR / "classes.json"
PORTFOLIO_FEATURES = ARTIFACTS_DIR / "feature_columns.json"
MODEL_EXPLANATION = ARTIFACTS_DIR / "model_explanation.json"

GOLD_PROPHET_MODEL = ARTIFACTS_DIR / "gold_price_prophet_model.pkl"
GOLD_PROPHET_JSON = ARTIFACTS_DIR / "gold_price_prophet_model.json"
GOLD_FORECAST = ARTIFACTS_DIR / "model_output_forecast.json"
GOLD_DATASET = ARTIFACTS_DIR / "gold_price_pred_dataset.csv"

# --- Environment ---------------------------------------------------------
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# The original code read MODEL in some places and GEMINI_MODEL in others.
GEMINI_MODEL = os.getenv("GEMINI_MODEL") or os.getenv("MODEL") or "gemini-2.5-flash"
# 768-dimensional, matching the committed FAISS index.
EMBED_MODEL = os.getenv("EMBED_MODEL", "models/text-embedding-004")

API_PORT = int(os.getenv("PORT", "8000"))


def require_api_key() -> str:
    """Return the Gemini key, or explain precisely what is missing."""
    if not GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Copy ml/.env.example to ml/.env and add "
            "a key from https://aistudio.google.com/apikey"
        )
    return GEMINI_API_KEY
