"""Database engine, session factory and the declarative base."""

from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


_url = settings.DATABASE_URL

# Managed Postgres providers hand out postgres:// URLs, which SQLAlchemy 2 does
# not recognise; normalise rather than making every deploy edit its own env var.
if _url.startswith("postgres://"):
    _url = _url.replace("postgres://", "postgresql+psycopg://", 1)
elif _url.startswith("postgresql://"):
    _url = _url.replace("postgresql://", "postgresql+psycopg://", 1)

_connect_args = {"check_same_thread": False} if _url.startswith("sqlite") else {}

# pool_recycle: free tiers drop idle connections, and a stale one surfaces as a
# confusing error on the first request after a quiet period.
engine = create_engine(_url, connect_args=_connect_args, pool_pre_ping=True, pool_recycle=300)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
