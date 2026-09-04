"""Portfolio allocation network.

A multi-output regression network with a softmax head, so every prediction is a
valid allocation that sums to 1. This is what the project deck describes.

Why this file exists at all: the original checkpoint (`full_portfolio_model.pth`)
was written with `torch.save(model)`, which pickles a reference to the class
`RobustPortfolioNN`. That class was never committed, so `torch.load` raises
`AttributeError` and nobody -- including the authors -- can reconstruct the
model. The fix is structural, not cosmetic: the architecture lives in version
control here, and training saves a `state_dict`, which is portable.

A note on the target. The old artifacts disagreed with each other. `classes.json`
lists Bonds / Crypto / Mutual Funds / SIPs / Stocks, which are the values of the
dataset's `Current_Investment_Type` column -- meaning the original model
classified which product a customer *already holds* and presented the softmax
probabilities as if they were a recommended allocation. The dataset also carries
five genuine allocation columns that sum to 100% per row. We train on those
instead: it is a real allocation model, and it matches what the deck claims.
"""

from __future__ import annotations

from typing import Sequence

import torch
import torch.nn as nn

# Defined without torch so the serving path can read them; re-exported here
# because this is where a reader looks for them.
from finplan_ml.models.asset_classes import ASSET_CLASSES, TARGET_COLUMNS  # noqa: F401


class PortfolioAllocationNet(nn.Module):
    """MLP mapping a customer profile to an allocation over ASSET_CLASSES.

    The forward pass returns logits; use `allocate()` for normalized weights.
    Keeping softmax out of `forward` lets training use a numerically stable
    log-softmax loss.
    """

    def __init__(self, n_features: int, hidden: Sequence[int] = (64, 32), dropout: float = 0.15):
        super().__init__()
        self.n_features = int(n_features)
        self.n_classes = len(ASSET_CLASSES)

        layers: list[nn.Module] = []
        prev = self.n_features
        for width in hidden:
            layers += [nn.Linear(prev, width), nn.ReLU(), nn.Dropout(dropout)]
            prev = width
        layers.append(nn.Linear(prev, self.n_classes))
        self.net = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)

    @torch.no_grad()
    def allocate(self, x: torch.Tensor) -> torch.Tensor:
        """Return allocations in [0, 1] that sum to 1 along the last axis."""
        self.eval()
        return torch.softmax(self.forward(x), dim=-1)
