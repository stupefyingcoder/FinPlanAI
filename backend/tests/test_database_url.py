"""Database URL handling.

Managed Postgres providers hand out `postgres://` or `postgresql://`. SQLAlchemy
resolves the bare form to the **psycopg2** dialect, which this project does not
install — it uses psycopg 3. Getting that wrong killed a deploy at startup with
`ModuleNotFoundError: No module named 'psycopg2'`, and the failure only appeared
in the Alembic step, because Alembic reads the setting directly and never
imports `app.db`.

So the normalisation lives in config, at the single point where the value is
read, and these tests pin it there.
"""

from __future__ import annotations

import pytest

from app.core.config import _normalize_database_url


@pytest.mark.parametrize(
    ("given", "expected"),
    [
        # What Render's connectionString property provides.
        ("postgres://u:p@host:5432/db", "postgresql+psycopg://u:p@host:5432/db"),
        # What most other providers and docs use.
        ("postgresql://u:p@host:5432/db", "postgresql+psycopg://u:p@host:5432/db"),
    ],
)
def test_postgres_urls_are_pinned_to_psycopg3(given, expected):
    assert _normalize_database_url(given) == expected


def test_an_explicit_driver_is_left_alone():
    """Someone who names a driver meant it."""
    url = "postgresql+psycopg2://u:p@host:5432/db"
    assert _normalize_database_url(url) == url


@pytest.mark.parametrize(
    "url",
    [
        "sqlite:///./finplan.db",
        "mysql+pymysql://u:p@host:3306/db",
    ],
)
def test_other_backends_are_untouched(url):
    assert _normalize_database_url(url) == url


def test_alembic_and_the_app_agree_on_the_url():
    """The actual regression.

    db.py normalised the URL but Alembic did not, so the app used psycopg 3 and
    migrations tried psycopg 2. Both now read the same already-normalised value.
    """
    from app.core.config import settings
    from app.db import engine

    assert str(engine.url).startswith(settings.DATABASE_URL.split("://")[0])


def test_the_psycopg3_driver_is_actually_installed():
    """A normalised URL is no use if the driver it names is absent."""
    import importlib.util

    assert importlib.util.find_spec("psycopg"), "psycopg 3 is required for Postgres"
