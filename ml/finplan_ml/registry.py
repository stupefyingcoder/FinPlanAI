"""Model registry: load every artifact once, report honestly what is available.

The FastAPI backend calls `get_registry()` at startup. Each model reports its own
status, so a missing Prophet install or an unset API key degrades one endpoint
instead of preventing the service from booting -- but the status is always
visible rather than silently swallowed, which is how the previous code hid the
fact that its portfolio checkpoint had never loaded.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Any, Mapping

import numpy as np

from finplan_ml import config


@dataclass
class ComponentStatus:
    name: str
    available: bool
    detail: str
    meta: dict = field(default_factory=dict)

    def as_dict(self) -> dict:
        return {"name": self.name, "available": self.available, "detail": self.detail, **({"meta": self.meta} if self.meta else {})}


class SegmentationModel:
    """K-Means investor segmentation over the fitted preprocessing pipeline."""

    def __init__(self) -> None:
        self.pipeline = None
        self.meta: dict = {}
        self.status = self._load()

    def _load(self) -> ComponentStatus:
        if not config.CLUSTER_MODEL.exists():
            return ComponentStatus(
                "segmentation", False,
                f"{config.CLUSTER_MODEL.name} not found — run `python -m training.train_clustering`",
            )
        try:
            import joblib

            self.pipeline = joblib.load(config.CLUSTER_MODEL)
            if config.CLUSTER_MODEL_META.exists():
                self.meta = json.loads(config.CLUSTER_MODEL_META.read_text(encoding="utf-8"))
            return ComponentStatus(
                "segmentation", True,
                f"k={self.meta.get('n_clusters')} silhouette={self.meta.get('silhouette_score'):.4f}"
                if self.meta.get("silhouette_score") else "loaded",
                {"labels": self.meta.get("cluster_labels", {})},
            )
        except Exception as exc:  # pragma: no cover - depends on local artifacts
            return ComponentStatus("segmentation", False, f"{type(exc).__name__}: {exc}")

    def predict(self, profile: Mapping[str, Any]) -> dict:
        """Assign a profile to a segment using the fitted model, not heuristics."""
        if not self.status.available:
            raise RuntimeError(f"segmentation unavailable: {self.status.detail}")
        import pandas as pd

        numeric = self.meta.get("features_numeric", [])
        categorical = self.meta.get("features_categorical", [])
        row = {col: profile.get(col) for col in numeric + categorical}
        missing = [c for c, v in row.items() if v is None]
        if missing:
            raise ValueError(f"missing required fields for segmentation: {missing}")

        cluster_id = int(self.pipeline.predict(pd.DataFrame([row]))[0])
        return {
            "cluster_id": cluster_id,
            "label": self.meta.get("cluster_labels", {}).get(str(cluster_id), f"Cluster {cluster_id}"),
        }


class PortfolioModel:
    """Softmax-head allocation network over the five asset classes."""

    def __init__(self) -> None:
        self.model = None
        self.meta: dict = {}
        self.scaler = None
        self.status = self._load()

    def _load(self) -> ComponentStatus:
        if not (config.PORTFOLIO_MODEL.exists() and config.PORTFOLIO_MODEL_META.exists()):
            return ComponentStatus(
                "portfolio", False,
                f"{config.PORTFOLIO_MODEL.name} not found — run `python -m training.train_portfolio`",
            )
        try:
            import torch

            from finplan_ml.models.features import FeatureScaler
            from finplan_ml.models.portfolio import PortfolioAllocationNet

            self.meta = json.loads(config.PORTFOLIO_MODEL_META.read_text(encoding="utf-8"))
            self.scaler = FeatureScaler.from_dict(self.meta["scaler"])
            self.model = PortfolioAllocationNet(n_features=int(self.meta["n_features"]))
            self.model.load_state_dict(torch.load(config.PORTFOLIO_MODEL, map_location="cpu"))
            self.model.eval()
            mae = self.meta.get("metrics", {}).get("test", {}).get("mae_pp_overall")
            return ComponentStatus(
                "portfolio", True,
                f"test MAE {mae:.2f}pp" if mae else "loaded",
                {"asset_classes": self.meta.get("asset_classes", [])},
            )
        except Exception as exc:  # pragma: no cover - depends on local artifacts
            return ComponentStatus("portfolio", False, f"{type(exc).__name__}: {exc}")

    def allocate(self, profile: Mapping[str, Any], strict: bool = True) -> dict[str, float]:
        """Allocate across asset classes.

        With `strict`, a field in an implausible range raises instead of
        returning a confident-looking allocation derived from a bad unit.
        """
        if not self.status.available:
            raise RuntimeError(f"portfolio model unavailable: {self.status.detail}")
        import torch

        from finplan_ml.models.features import build_features, out_of_range_fields, profile_to_frame

        problems = out_of_range_fields(profile, self.scaler)
        if problems and strict:
            raise ValueError("implausible input: " + "; ".join(problems))

        frame = profile_to_frame(profile)
        matrix, _ = build_features(frame, scaler=self.scaler)
        weights = self.model.allocate(torch.from_numpy(matrix)).numpy()[0]
        return {c: float(w) for c, w in zip(self.meta["asset_classes"], weights)}


class GoldForecast:
    """Prophet gold-price forecast.

    The five-year projection does not vary per user, so the committed forecast is
    served directly and the Prophet model itself is only needed to regenerate it.
    That keeps a heavy, awkward-to-install dependency off the API's critical path.
    """

    def __init__(self) -> None:
        self.rows: list[dict] = []
        self.status = self._load()

    def _load(self) -> ComponentStatus:
        if not config.GOLD_FORECAST.exists():
            return ComponentStatus("gold_forecast", False, f"{config.GOLD_FORECAST.name} not found")
        try:
            data = json.loads(config.GOLD_FORECAST.read_text(encoding="utf-8"))
            self.rows = data if isinstance(data, list) else [data]
            spans = f"{self.rows[0].get('ds', '?')[:10]} to {self.rows[-1].get('ds', '?')[:10]}"
            return ComponentStatus("gold_forecast", True, f"{len(self.rows)} points, {spans}")
        except Exception as exc:  # pragma: no cover
            return ComponentStatus("gold_forecast", False, f"{type(exc).__name__}: {exc}")

    def series(self, limit: int | None = None) -> list[dict]:
        if not self.status.available:
            raise RuntimeError(f"gold forecast unavailable: {self.status.detail}")
        rows = [
            {
                "date": r.get("ds"),
                "yhat": r.get("yhat"),
                "yhat_lower": r.get("yhat_lower"),
                "yhat_upper": r.get("yhat_upper"),
                "trend": r.get("trend"),
            }
            for r in self.rows
        ]
        return rows[-limit:] if limit else rows


class VectorIndex:
    """FAISS index backing retrieval. Loaded without calling the embedding API."""

    def __init__(self) -> None:
        self.dimension: int | None = None
        self.count: int | None = None
        self.status = self._load()

    def _load(self) -> ComponentStatus:
        index_file = config.INDEX_DIR / "index.faiss"
        if not index_file.exists():
            return ComponentStatus("vector_index", False, f"{index_file} not found")
        try:
            import faiss

            index = faiss.read_index(str(index_file))
            self.dimension, self.count = index.d, index.ntotal
            return ComponentStatus(
                "vector_index", True, f"{index.ntotal} vectors, dim {index.d}",
                {"dimension": index.d, "vectors": index.ntotal},
            )
        except Exception as exc:  # pragma: no cover
            return ComponentStatus("vector_index", False, f"{type(exc).__name__}: {exc}")


class Registry:
    def __init__(self) -> None:
        self.segmentation = SegmentationModel()
        self.portfolio = PortfolioModel()
        self.gold = GoldForecast()
        self.index = VectorIndex()

    @property
    def components(self) -> list[ComponentStatus]:
        return [self.segmentation.status, self.portfolio.status, self.gold.status, self.index.status]

    def health(self) -> dict:
        components = self.components
        return {
            "ready": all(c.available for c in components),
            "gemini_key_present": bool(config.GEMINI_API_KEY),
            "components": [c.as_dict() for c in components],
        }


@lru_cache(maxsize=1)
def get_registry() -> Registry:
    """Load once per process."""
    return Registry()


if __name__ == "__main__":
    health = get_registry().health()
    print(json.dumps(health, indent=2, ensure_ascii=False))
    raise SystemExit(0 if health["ready"] else 1)
