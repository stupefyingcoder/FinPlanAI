"""Retrain the portfolio allocation network.

Run:  python -m training.train_portfolio

Writes `artifacts/portfolio_model.pt` (a state_dict, not a pickled module) and
`artifacts/portfolio_model_meta.json` with the feature list, scaler parameters
and held-out metrics.

Every reported number comes from a test split the model never saw, and is
printed next to a baseline that predicts the training-set mean allocation for
everyone. A model that cannot beat that baseline has learned nothing, and
without the comparison the raw error is uninterpretable.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from finplan_ml import config  # noqa: E402
from finplan_ml.models.features import (  # noqa: E402
    FeatureScaler,
    build_features,
    feature_names,
)
from finplan_ml.models.portfolio import (  # noqa: E402
    ASSET_CLASSES,
    TARGET_COLUMNS,
    PortfolioAllocationNet,
)

SEED = 42
EPOCHS = 220
BATCH_SIZE = 128
LR = 2e-3
WEIGHT_DECAY = 1e-4


def load_dataset() -> pd.DataFrame:
    df = pd.read_csv(config.CUSTOMERS_CSV)
    # Attach cluster assignments so segmentation feeds allocation.
    if config.CLUSTERED_CSV.exists():
        clusters = pd.read_csv(config.CLUSTERED_CSV)[["Customer_ID", "cluster"]]
        df = df.merge(clusters, on="Customer_ID", how="left")
    else:
        df["cluster"] = -1
    return df


def build_targets(df: pd.DataFrame) -> np.ndarray:
    y = df[list(TARGET_COLUMNS)].to_numpy(dtype=np.float64)
    totals = y.sum(axis=1, keepdims=True)
    if (totals <= 0).any():
        raise ValueError("found rows whose allocation columns do not sum above zero")
    return (y / totals).astype(np.float32)


def split_indices(n: int, rng: np.random.Generator) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    idx = rng.permutation(n)
    n_train, n_val = int(0.70 * n), int(0.15 * n)
    return idx[:n_train], idx[n_train : n_train + n_val], idx[n_train + n_val :]


def soft_cross_entropy(logits: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
    """Cross-entropy against soft targets — the right loss for proportions."""
    return -(target * torch.log_softmax(logits, dim=-1)).sum(dim=-1).mean()


def evaluate(pred: np.ndarray, true: np.ndarray) -> dict:
    """Errors in percentage points, which is how a reader will think about them."""
    abs_err = np.abs(pred - true) * 100.0
    return {
        "mae_pp_overall": float(abs_err.mean()),
        "mae_pp_per_class": {c: float(abs_err[:, i].mean()) for i, c in enumerate(ASSET_CLASSES)},
        "max_abs_err_pp": float(abs_err.max()),
        "mean_sum": float(pred.sum(axis=1).mean()),
    }


def main() -> int:
    torch.manual_seed(SEED)
    rng = np.random.default_rng(SEED)

    df = load_dataset()
    y = build_targets(df)
    print(f"dataset: {len(df)} rows, {len(ASSET_CLASSES)} asset classes")

    tr, va, te = split_indices(len(df), rng)

    # Fit the scaler on the training split only — never on all rows.
    x_tr, scaler = build_features(df.iloc[tr], scaler=None)
    x_va, _ = build_features(df.iloc[va], scaler=scaler)
    x_te, _ = build_features(df.iloc[te], scaler=scaler)
    y_tr, y_va, y_te = y[tr], y[va], y[te]
    print(f"split: train={len(tr)} val={len(va)} test={len(te)}  features={x_tr.shape[1]}")

    model = PortfolioAllocationNet(n_features=x_tr.shape[1])
    opt = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=WEIGHT_DECAY)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=EPOCHS)

    xt, yt = torch.from_numpy(x_tr), torch.from_numpy(y_tr)
    xv, yv = torch.from_numpy(x_va), torch.from_numpy(y_va)

    best_val, best_state, patience = float("inf"), None, 0
    for epoch in range(1, EPOCHS + 1):
        model.train()
        perm = torch.randperm(len(xt))
        for start in range(0, len(xt), BATCH_SIZE):
            batch = perm[start : start + BATCH_SIZE]
            opt.zero_grad()
            loss = soft_cross_entropy(model(xt[batch]), yt[batch])
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 5.0)
            opt.step()
        sched.step()

        model.eval()
        with torch.no_grad():
            val_loss = float(soft_cross_entropy(model(xv), yv))
        if val_loss < best_val - 1e-5:
            best_val, patience = val_loss, 0
            best_state = {k: v.clone() for k, v in model.state_dict().items()}
        else:
            patience += 1
        if epoch % 20 == 0 or epoch == 1:
            print(f"  epoch {epoch:3d}  val_loss {val_loss:.5f}{'  *' if patience == 0 else ''}")
        if patience >= 40:
            print(f"  early stop at epoch {epoch}")
            break

    if best_state is not None:
        model.load_state_dict(best_state)

    pred_te = model.allocate(torch.from_numpy(x_te)).numpy()
    metrics = evaluate(pred_te, y_te)

    # Baseline: everyone gets the training-set mean allocation.
    baseline = np.repeat(y_tr.mean(axis=0, keepdims=True), len(y_te), axis=0)
    baseline_metrics = evaluate(baseline, y_te)

    lift = 100.0 * (1 - metrics["mae_pp_overall"] / baseline_metrics["mae_pp_overall"])
    print("\n--- held-out test set ---")
    print(f"model    MAE {metrics['mae_pp_overall']:.3f} pp")
    print(f"baseline MAE {baseline_metrics['mae_pp_overall']:.3f} pp  (predict training mean)")
    print(f"improvement over baseline: {lift:.1f}%")
    print(f"allocations sum to {metrics['mean_sum']:.6f} on average")
    for c, v in metrics["mae_pp_per_class"].items():
        print(f"  {c:<11} MAE {v:.3f} pp")

    config.ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), config.PORTFOLIO_MODEL)
    meta = {
        "architecture": "PortfolioAllocationNet",
        "module": "finplan_ml.models.portfolio",
        "n_features": int(x_tr.shape[1]),
        "feature_names": feature_names(),
        "asset_classes": list(ASSET_CLASSES),
        "target_columns": list(TARGET_COLUMNS),
        "scaler": scaler.to_dict(),
        "seed": SEED,
        "split": {"train": len(tr), "val": len(va), "test": len(te)},
        "metrics": {"test": metrics, "baseline": baseline_metrics, "improvement_pct": lift},
    }
    config.PORTFOLIO_MODEL_META.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"\nsaved {config.PORTFOLIO_MODEL.name} and {config.PORTFOLIO_MODEL_META.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
