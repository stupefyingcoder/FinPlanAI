"""Smoke tests for the model registry.

These assert that each artifact loads and returns a sane shape. They are what
makes the pipeline reproducible: the original repository had trained models that
nobody could load, and nothing in it would have told you.
"""

from __future__ import annotations

import math

import pytest

from finplan_ml.registry import get_registry

# A representative profile, using the dataset's own column names.
SAMPLE_PROFILE = {
    "Age": 34,
    "Annual_Income": 1_450_000,
    "Monthly_Expenses": 52_000,
    "Savings_Rate(%)": 27.5,
    "Loan_EMI_Obligations": 17.0,  # percent of income, not rupees
    "Current_Net_Worth": 3_200_000,
    "Debt_to_Income_Ratio": 0.31,
    "Credit_Score": 762,
    "Investment_Experience(Years)": 6.0,
    "Financial_Knowledge_Score": 7.1,
    "Goal_Amount(₹)": 5_500_000,
    "Goal_Timeline(Years)": 12,
    "Risk_Taking_Ability": "Medium",
    "Occupation": "Salaried",
    "Primary_Financial_Goal": "Retirement",
    "Gender": "Female",
    "Marital_Status": "Married",
    "cluster": 3,
}


@pytest.fixture(scope="module")
def registry():
    return get_registry()


def test_every_component_loads(registry):
    unavailable = [c.name for c in registry.components if not c.available]
    assert not unavailable, f"components failed to load: {unavailable}"


def test_segmentation_returns_a_known_cluster(registry):
    result = registry.segmentation.predict(SAMPLE_PROFILE)
    n_clusters = registry.segmentation.meta["n_clusters"]
    assert 0 <= result["cluster_id"] < n_clusters
    assert result["label"] and not result["label"].startswith("Cluster ")


def test_segmentation_labels_are_unique(registry):
    """A segment name that names two segments is not a name."""
    labels = list(registry.segmentation.meta["cluster_labels"].values())
    assert len(labels) == len(set(labels)), f"duplicate cluster labels: {labels}"


def test_allocation_is_a_valid_distribution(registry):
    allocation = registry.portfolio.allocate(SAMPLE_PROFILE)
    assert set(allocation) == set(registry.portfolio.meta["asset_classes"])
    assert all(0.0 <= w <= 1.0 for w in allocation.values())
    assert math.isclose(sum(allocation.values()), 1.0, rel_tol=1e-5)


def test_allocation_responds_to_risk_appetite(registry):
    """A model that ignores its inputs would pass every other test here."""
    low = registry.portfolio.allocate({**SAMPLE_PROFILE, "Risk_Taking_Ability": "Low"})
    high = registry.portfolio.allocate({**SAMPLE_PROFILE, "Risk_Taking_Ability": "High"})
    assert any(abs(high[k] - low[k]) > 1e-4 for k in low), "allocation is identical regardless of risk"


def test_portfolio_beats_the_mean_baseline(registry):
    metrics = registry.portfolio.meta["metrics"]
    assert metrics["test"]["mae_pp_overall"] < metrics["baseline"]["mae_pp_overall"]


def test_gold_forecast_has_an_uncertainty_band(registry):
    series = registry.gold.series(limit=12)
    assert len(series) == 12
    for point in series:
        assert point["yhat_lower"] <= point["yhat_upper"]
        assert point["date"]


def test_vector_index_matches_the_embedding_dimension(registry):
    """The index must match whatever EMBED_MODEL is configured.

    An index can only be queried by the model that built it, and a mismatch does
    not raise — it returns confident nonsense. Pinning a literal here was wrong:
    text-embedding-004 (768) was retired for new API keys, so the index was
    rebuilt with gemini-embedding-001 (3072). What matters is that the two agree.
    """
    from finplan_ml import config

    expected = {
        "models/text-embedding-004": 768,
        "models/gemini-embedding-001": 3072,
        "models/gemini-embedding-2": 3072,
    }.get(config.EMBED_MODEL)

    assert registry.index.count > 0
    if expected:
        assert registry.index.dimension == expected, (
            f"index is {registry.index.dimension}-dimensional but EMBED_MODEL is "
            f"{config.EMBED_MODEL}; rebuild with `python -m training.build_index`"
        )


def test_missing_fields_raise_a_clear_error(registry):
    with pytest.raises(ValueError, match="missing required fields"):
        registry.segmentation.predict({"Age": 30})
