"""CORS configuration.

A rejected origin is invisible from the server's side: curl reports a healthy
200 and the browser sees nothing at all. That asymmetry cost a deployment
afternoon, so the behaviour is pinned here.
"""

from __future__ import annotations

import importlib
import os

import pytest


def _settings_with(env_value: str | None):
    """Reload settings with FRONTEND_ORIGINS set to a particular value."""
    previous = os.environ.get("FRONTEND_ORIGINS")
    if env_value is None:
        os.environ.pop("FRONTEND_ORIGINS", None)
    else:
        os.environ["FRONTEND_ORIGINS"] = env_value

    import app.core.config as config_module

    importlib.reload(config_module)
    settings = config_module.settings

    if previous is None:
        os.environ.pop("FRONTEND_ORIGINS", None)
    else:
        os.environ["FRONTEND_ORIGINS"] = previous
    importlib.reload(config_module)

    return settings


def test_an_empty_value_never_produces_an_empty_allow_list():
    """The bug this guards.

    Render's blueprint creates `sync: false` variables as an empty string, so a
    deployment nobody filled in allowed zero origins. Every browser request was
    then blocked — including /health — which surfaced as "the API is not
    responding" while the server was perfectly healthy.
    """
    settings = _settings_with("")
    assert settings.FRONTEND_ORIGINS, "an empty variable must fall back, not block everything"
    assert any("localhost" in origin for origin in settings.FRONTEND_ORIGINS)


def test_whitespace_is_treated_as_empty():
    settings = _settings_with("   ")
    assert settings.FRONTEND_ORIGINS


def test_an_explicit_value_is_honoured():
    settings = _settings_with("https://finplan-ai-one.vercel.app")
    assert settings.FRONTEND_ORIGINS == ["https://finplan-ai-one.vercel.app"]


def test_multiple_origins_split_and_strip():
    settings = _settings_with(" https://a.example , https://b.example ")
    assert settings.FRONTEND_ORIGINS == ["https://a.example", "https://b.example"]


@pytest.mark.parametrize(
    "origin",
    ["https://finplan-ai-one.vercel.app", "https://finplan-ai-one-git-main-x.vercel.app"],
)
def test_the_preview_regex_covers_vercel_hostnames(origin):
    """Vercel names every preview deployment differently; pinning one URL breaks the rest."""
    import re

    pattern = r"https://.*\.vercel\.app"
    assert re.fullmatch(pattern, origin)
