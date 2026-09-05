"""Pure-NumPy inference for the portfolio allocation network.

The network is 37 → 64 → 32 → 5: three matrix multiplies, two ReLUs and a
softmax, 4,677 parameters in total. PyTorch is a 536 MB dependency to evaluate
that, which is the usual reason a project like this runs locally and never gets
a live link — most free hosting tiers cannot fit the wheel.

So training keeps PyTorch and serving does not. `training/train_portfolio.py`
writes both a `.pt` state_dict and a `.npz` of the same weights; this module
reads the `.npz`. The equality of the two paths is asserted by a test rather
than assumed, because a silent divergence here would mis-advise every user.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np

from finplan_ml.models.asset_classes import ASSET_CLASSES


class NumpyPortfolioNet:
    """The trained allocation network, without the framework it was trained in."""

    def __init__(self, weights: dict[str, np.ndarray]) -> None:
        # Stored in PyTorch's (out, in) orientation; transpose once at load so the
        # forward pass is a plain x @ W.
        self.layers: list[tuple[np.ndarray, np.ndarray]] = []
        index = 0
        while f"w{index}" in weights:
            self.layers.append(
                (
                    np.asarray(weights[f"w{index}"], dtype=np.float32).T,
                    np.asarray(weights[f"b{index}"], dtype=np.float32),
                )
            )
            index += 1

        if not self.layers:
            raise ValueError("no layers found in the weight file")

        self.n_features = int(self.layers[0][0].shape[0])
        self.n_classes = int(self.layers[-1][1].shape[0])

    @classmethod
    def load(cls, path: str | Path) -> "NumpyPortfolioNet":
        with np.load(str(path)) as data:
            return cls({key: data[key] for key in data.files})

    def logits(self, x: np.ndarray) -> np.ndarray:
        x = np.asarray(x, dtype=np.float32)
        if x.ndim == 1:
            x = x.reshape(1, -1)
        if x.shape[1] != self.n_features:
            raise ValueError(f"expected {self.n_features} features, got {x.shape[1]}")

        # Dropout is identity at inference, so it simply does not appear here.
        for i, (weight, bias) in enumerate(self.layers):
            x = x @ weight + bias
            if i < len(self.layers) - 1:
                x = np.maximum(x, 0.0)  # ReLU
        return x

    def allocate(self, x: np.ndarray) -> np.ndarray:
        """Allocations in [0, 1] summing to 1 along the last axis."""
        z = self.logits(x)
        # Subtract the row max before exponentiating: standard guard against
        # overflow on large logits.
        z = z - z.max(axis=-1, keepdims=True)
        exp = np.exp(z)
        return exp / exp.sum(axis=-1, keepdims=True)


def export_state_dict(state_dict, path: str | Path) -> Path:
    """Write a torch state_dict out as the .npz this module reads.

    Called by the training script; kept here so the export format and the reader
    live side by side and cannot drift apart.
    """
    arrays: dict[str, np.ndarray] = {}
    index = 0
    for key, tensor in state_dict.items():
        if not key.endswith(".weight"):
            continue
        bias_key = key.replace(".weight", ".bias")
        arrays[f"w{index}"] = tensor.detach().cpu().numpy().astype(np.float32)
        arrays[f"b{index}"] = state_dict[bias_key].detach().cpu().numpy().astype(np.float32)
        index += 1

    path = Path(path)
    np.savez(path, **arrays)
    return path


__all__ = ["NumpyPortfolioNet", "export_state_dict", "ASSET_CLASSES"]
