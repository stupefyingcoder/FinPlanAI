"""Feature construction for the portfolio model.

Training and inference both call `build_features`, so the two cannot drift apart
-- the failure mode where a model scores well offline and produces nonsense in
the app because the serving code encoded a column differently.

The fitted means and standard deviations are saved alongside the weights and
replayed at inference; nothing is re-fitted on a single incoming request.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any, Mapping, Sequence

import numpy as np
import pandas as pd

# Raw numeric columns, standardized.
NUMERIC_COLUMNS: tuple[str, ...] = (
    "Age",
    "Annual_Income",
    "Monthly_Expenses",
    "Savings_Rate(%)",
    "Loan_EMI_Obligations",
    "Current_Net_Worth",
    "Debt_to_Income_Ratio",
    "Credit_Score",
    "Investment_Experience(Years)",
    "Financial_Knowledge_Score",
    "Goal_Amount(₹)",
    "Goal_Timeline(Years)",
    "Saving_Amt",
)

# Ordered categories: risk maps to 0/1/2 rather than one-hot, because it is ordinal.
RISK_ORDER: tuple[str, ...] = ("Low", "Medium", "High")

# Categories must match the dataset exactly. A value that matches nothing encodes
# as all-zeros, which the model reads as a valid-but-unusual profile rather than
# as an error -- so an omitted category is silently wrong, not loudly wrong.
ONE_HOT_COLUMNS: dict[str, tuple[str, ...]] = {
    "Occupation": ("Business", "Retired", "Salaried", "Self-employed", "Student"),
    "Primary_Financial_Goal": ("Education", "Emergency_Fund", "House", "Retirement", "Wealth"),
    "Gender": ("Male", "Female", "Non-binary", "Prefer_not_to_say"),
    "Marital_Status": ("Married", "Single", "Divorced", "Widowed"),
}

# Units that the column names do not convey. Loan_EMI_Obligations in particular
# is a percentage of income (0-45), not a rupee amount -- passing rupees produces
# a z-score in the thousands and a meaningless allocation.
COLUMN_UNITS: dict[str, str] = {
    "Loan_EMI_Obligations": "percent of income (0-45)",
    "Savings_Rate(%)": "percent (0-100)",
    "Debt_to_Income_Ratio": "ratio (0-1)",
    "Annual_Income": "INR per year",
    "Monthly_Expenses": "INR per month",
    "Goal_Amount(₹)": "INR",
}

# Standardized features are clipped to this many standard deviations. Guards the
# serving path against a caller sending the wrong unit.
CLIP_Z = 6.0

N_CLUSTERS = 5


@dataclass
class FeatureScaler:
    """Standardization parameters learned on the training split only."""

    columns: list[str]
    mean: list[float]
    std: list[float]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: Mapping[str, Any]) -> "FeatureScaler":
        return cls(columns=list(d["columns"]), mean=list(d["mean"]), std=list(d["std"]))


def add_derived_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Add columns the model needs that are not stored in the CSV.

    Derives on missing *or* null, not just missing. A serving payload carries the
    key with a null value, which an "is the column present?" check treats as
    supplied — and a null propagates through standardization to a NaN logit and a
    NaN allocation.
    """
    df = df.copy()
    derived = df["Annual_Income"] * df["Savings_Rate(%)"] / 100.0
    if "Saving_Amt" not in df.columns:
        df["Saving_Amt"] = derived
    else:
        df["Saving_Amt"] = pd.to_numeric(df["Saving_Amt"], errors="coerce").fillna(derived)
    return df


def feature_names(include_cluster: bool = True) -> list[str]:
    names = list(NUMERIC_COLUMNS) + ["Risk_Taking_Ability_ordinal"]
    for col, cats in ONE_HOT_COLUMNS.items():
        names += [f"{col}_{c}" for c in cats]
    if include_cluster:
        names += [f"Cluster_{i}" for i in range(N_CLUSTERS)]
    return names


def build_features(
    df: pd.DataFrame,
    scaler: FeatureScaler | None = None,
    include_cluster: bool = True,
) -> tuple[np.ndarray, FeatureScaler]:
    """Turn raw rows into a float32 matrix.

    Pass `scaler=None` to fit standardization (training); pass a fitted scaler to
    reuse it (validation, test, serving).
    """
    df = add_derived_columns(df)

    numeric = pd.DataFrame(index=df.index)
    for col in NUMERIC_COLUMNS:
        numeric[col] = pd.to_numeric(df.get(col), errors="coerce")

    if scaler is None:
        # Fitting: impute from the training distribution before learning stats.
        numeric = numeric.fillna(numeric.median(numeric_only=True))
        mean = numeric.mean().astype(float)
        std = numeric.std().replace(0.0, 1.0).astype(float)
        scaler = FeatureScaler(
            columns=list(numeric.columns),
            mean=[float(x) for x in mean.values],
            std=[float(x) for x in std.values],
        )
    mean_s = pd.Series(scaler.mean, index=scaler.columns)
    std_s = pd.Series(scaler.std, index=scaler.columns)
    numeric = (numeric[scaler.columns] - mean_s) / std_s
    # Anything still missing becomes the training mean, which is 0 once
    # standardized. Never a row-wise median: on a single serving row that is
    # itself NaN, which silently poisons the whole prediction.
    numeric = numeric.fillna(0.0)
    numeric = numeric.clip(lower=-CLIP_Z, upper=CLIP_Z)

    blocks: list[np.ndarray] = [numeric.to_numpy(dtype=np.float32)]

    risk = df["Risk_Taking_Ability"].map({c: i for i, c in enumerate(RISK_ORDER)})
    blocks.append(risk.fillna(1).to_numpy(dtype=np.float32).reshape(-1, 1))

    for col, cats in ONE_HOT_COLUMNS.items():
        values = df[col].astype(str) if col in df.columns else pd.Series([""] * len(df), index=df.index)
        for cat in cats:
            blocks.append((values == cat).to_numpy(dtype=np.float32).reshape(-1, 1))

    if include_cluster:
        cluster = pd.to_numeric(df.get("cluster", pd.Series([-1] * len(df), index=df.index)), errors="coerce")
        cluster = cluster.fillna(-1).astype(int)
        for i in range(N_CLUSTERS):
            blocks.append((cluster == i).to_numpy(dtype=np.float32).reshape(-1, 1))

    matrix = np.hstack(blocks).astype(np.float32)
    expected = len(feature_names(include_cluster))
    if matrix.shape[1] != expected:
        raise ValueError(f"built {matrix.shape[1]} features, expected {expected}")
    return matrix, scaler


def out_of_range_fields(profile: Mapping[str, Any], scaler: FeatureScaler) -> list[str]:
    """Name numeric fields sitting absurdly far from the training distribution.

    Callers surface these rather than returning a confident-looking allocation
    built from a value in the wrong unit.
    """
    flagged: list[str] = []
    for col, mean, std in zip(scaler.columns, scaler.mean, scaler.std):
        value = profile.get(col)
        if value is None or std <= 0:
            continue
        try:
            z = (float(value) - mean) / std
        except (TypeError, ValueError):
            continue
        if abs(z) > CLIP_Z:
            unit = COLUMN_UNITS.get(col)
            flagged.append(f"{col}={value} is {abs(z):.0f} sd from the training mean" + (f"; expected {unit}" if unit else ""))
    return flagged


def profile_to_frame(profile: Mapping[str, Any]) -> pd.DataFrame:
    """Wrap a single incoming profile dict as a one-row frame for serving."""
    required = set(NUMERIC_COLUMNS) | {"Risk_Taking_Ability"} | set(ONE_HOT_COLUMNS)
    row = {k: profile.get(k) for k in required if k != "Saving_Amt"}
    row["Saving_Amt"] = profile.get("Saving_Amt")
    row["cluster"] = profile.get("cluster", -1)
    return pd.DataFrame([row])
