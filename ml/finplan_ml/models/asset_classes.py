"""The asset classes the portfolio model allocates across.

A module of its own, deliberately: both the PyTorch definition and the NumPy
serving path need these names, and importing them from the torch module would
drag a 536 MB framework into a container that exists to avoid it.
"""

from __future__ import annotations

# Fixed order — the model's output columns are positional.
ASSET_CLASSES: tuple[str, ...] = ("RealEstate", "Equity", "Debt", "Cash", "Gold")

# The dataset columns those classes are trained on.
TARGET_COLUMNS: tuple[str, ...] = (
    "RealEstate_%",
    "Equity_%",
    "Debt_%",
    "Cash_%",
    "Gold_%",
)
