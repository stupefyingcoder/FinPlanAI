"""Refit the investor segmentation model.

Run:  python -m training.train_clustering

Writes `artifacts/customer_clustering.joblib` plus accurate metadata.

Two reasons this is a refit rather than a reload:

1. The original `customer_clustering_k5.pkl` cannot be loaded on a current
   scikit-learn. It was pickled under 1.6.1 and raises
   `AttributeError: Can't get attribute '_RemainderColsList'` on 1.9. Pinning an
   old scikit-learn to read one pickle is not a foundation to build a service on.
2. Its metadata was wrong. `customer_clustering_k5_meta.json` claims a single
   numeric feature (`Current_Net_Worth`), but the clustered output CSV shows the
   fit actually used three scaled numerics plus one-hot goals. Anyone reading the
   metadata to understand the model would have been misled.

Cluster labels are derived from centroid statistics rather than hand-written, so
they cannot drift out of sync with the fit.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.compose import ColumnTransformer
from sklearn.metrics import silhouette_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from finplan_ml import config  # noqa: E402

SEED = 42
N_CLUSTERS = 5

NUMERIC = ["Current_Net_Worth", "Savings_Rate(%)", "Goal_Amount(₹)"]
CATEGORICAL = ["Primary_Financial_Goal"]


def build_pipeline() -> Pipeline:
    return Pipeline(
        [
            (
                "prep",
                ColumnTransformer(
                    [
                        ("num", StandardScaler(), NUMERIC),
                        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL),
                    ]
                ),
            ),
            ("kmeans", KMeans(n_clusters=N_CLUSTERS, n_init=25, random_state=SEED)),
        ]
    )


def label_clusters(df: pd.DataFrame) -> dict[str, str]:
    """Name each cluster from what is actually in it, keeping names unique.

    Two clusters can share a net-worth tier and a dominant goal while still being
    genuinely different groups. When that happens the label is disambiguated by
    goal size rather than left duplicated, because a segment name that does not
    identify one segment is worse than no name.
    """
    stats = df.groupby("cluster").agg(
        net_worth=("Current_Net_Worth", "median"),
        goal_amount=("Goal_Amount(₹)", "median"),
    )
    goal = df.groupby("cluster")["Primary_Financial_Goal"].agg(lambda s: s.value_counts().idxmax())

    ranked = stats["net_worth"].rank(pct=True)
    base: dict[int, str] = {}
    for cluster_id in stats.index:
        pct = ranked.loc[cluster_id]
        tier = "High NW" if pct >= 0.7 else ("Low NW" if pct <= 0.35 else "Mid NW")
        base[int(cluster_id)] = f"{tier} • {str(goal.loc[cluster_id]).replace('_', ' ')}"

    labels: dict[str, str] = {}
    for name in set(base.values()):
        members = [cid for cid, n in base.items() if n == name]
        if len(members) == 1:
            labels[str(members[0])] = name
            continue
        ordered = sorted(members, key=lambda c: stats.loc[c, "goal_amount"])
        qualifiers = ["modest goals", "large goals"] if len(ordered) == 2 else None
        for rank, cid in enumerate(ordered):
            qualifier = qualifiers[rank] if qualifiers else f"tier {rank + 1}"
            labels[str(cid)] = f"{name} ({qualifier})"
    return labels


def sweep_k(features: pd.DataFrame, candidates=range(3, 9)) -> dict[str, float]:
    """Score several k values so the chosen one is justified, not asserted."""
    scores: dict[str, float] = {}
    for k in candidates:
        pipe = Pipeline(
            [
                (
                    "prep",
                    ColumnTransformer(
                        [
                            ("num", StandardScaler(), NUMERIC),
                            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL),
                        ]
                    ),
                ),
                ("kmeans", KMeans(n_clusters=k, n_init=10, random_state=SEED)),
            ]
        )
        assigned = pipe.fit_predict(features)
        matrix = pipe.named_steps["prep"].transform(features)
        scores[str(k)] = float(silhouette_score(matrix, assigned, random_state=SEED))
    return scores


def main() -> int:
    df = pd.read_csv(config.CUSTOMERS_CSV)
    features = df[NUMERIC + CATEGORICAL]
    print(f"dataset: {len(df)} rows, features={NUMERIC + CATEGORICAL}")

    k_scores = sweep_k(features)
    best_k = max(k_scores, key=k_scores.get)
    print("silhouette by k: " + "  ".join(f"k={k}:{v:.3f}" for k, v in k_scores.items()))
    print(f"best k by silhouette: {best_k}; using k={N_CLUSTERS} to stay consistent with the deck")

    pipe = build_pipeline()
    assignments = pipe.fit_predict(features)
    df["cluster"] = assignments

    matrix = pipe.named_steps["prep"].transform(features)
    score = float(silhouette_score(matrix, assignments, random_state=SEED))
    counts = {str(int(k)): int(v) for k, v in pd.Series(assignments).value_counts().items()}
    labels = label_clusters(df)

    print(f"silhouette: {score:.4f}")
    for cid in sorted(labels, key=int):
        print(f"  cluster {cid}: n={counts.get(cid, 0):>5}  {labels[cid]}")

    config.ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipe, config.CLUSTER_MODEL)

    meta = {
        "model_file": config.CLUSTER_MODEL.name,
        "estimator": "sklearn.pipeline.Pipeline(ColumnTransformer -> KMeans)",
        "features_numeric": NUMERIC,
        "features_categorical": CATEGORICAL,
        "n_clusters": N_CLUSTERS,
        "seed": SEED,
        "silhouette_score": score,
        "silhouette_by_k": k_scores,
        "cluster_counts": counts,
        "cluster_labels": labels,
        "sklearn_version": __import__("sklearn").__version__,
    }
    config.CLUSTER_MODEL_META.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")

    out = df[["Customer_ID"] + NUMERIC + CATEGORICAL + ["cluster"]].copy()
    out["cluster_label"] = out["cluster"].astype(str).map(labels)
    out.to_csv(config.CLUSTERED_CSV, index=False, encoding="utf-8")

    print(f"\nsaved {config.CLUSTER_MODEL.name}, metadata and {config.CLUSTERED_CSV.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
