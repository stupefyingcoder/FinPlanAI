"""The NumPy serving path must match the PyTorch training path exactly.

Serving dropped PyTorch to get the image small enough for free hosting. That is
only safe if the two implementations agree — a silent divergence here would
mis-advise every user while every other test still passed.
"""

from __future__ import annotations

import json

import numpy as np
import pytest

from finplan_ml import config
from finplan_ml.models.portfolio_numpy import NumpyPortfolioNet

torch = pytest.importorskip("torch", reason="training-only dependency")


@pytest.fixture(scope="module")
def meta():
    return json.loads(config.PORTFOLIO_MODEL_META.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def both_models(meta):
    from finplan_ml.models.portfolio import PortfolioAllocationNet

    state = torch.load(config.PORTFOLIO_MODEL, map_location="cpu")
    reference = PortfolioAllocationNet(n_features=int(meta["n_features"]))
    reference.load_state_dict(state)
    reference.eval()

    return reference, NumpyPortfolioNet.load(config.PORTFOLIO_WEIGHTS)


def test_the_two_implementations_agree(both_models, meta):
    reference, ported = both_models
    rng = np.random.default_rng(0)
    x = rng.normal(size=(500, int(meta["n_features"]))).astype(np.float32)

    expected = reference.allocate(torch.from_numpy(x)).numpy()
    actual = ported.allocate(x)

    # float32 arithmetic, so exact equality is not the bar; 1e-5 is far tighter
    # than any allocation is reported to.
    assert np.abs(expected - actual).max() < 1e-5


def test_numpy_allocations_are_valid_distributions(both_models, meta):
    _, ported = both_models
    rng = np.random.default_rng(1)
    x = rng.normal(size=(200, int(meta["n_features"]))).astype(np.float32)

    allocations = ported.allocate(x)
    assert np.all(allocations >= 0.0) and np.all(allocations <= 1.0)
    assert np.allclose(allocations.sum(axis=1), 1.0, atol=1e-6)


def test_extreme_inputs_do_not_overflow(both_models, meta):
    """Softmax without a max-subtraction would produce NaN here."""
    _, ported = both_models
    x = np.full((3, int(meta["n_features"])), 1e4, dtype=np.float32)
    allocations = ported.allocate(x)
    assert not np.isnan(allocations).any()
    assert np.allclose(allocations.sum(axis=1), 1.0, atol=1e-6)


def test_wrong_feature_count_is_rejected(both_models):
    _, ported = both_models
    with pytest.raises(ValueError, match="expected"):
        ported.allocate(np.zeros((1, 5), dtype=np.float32))
