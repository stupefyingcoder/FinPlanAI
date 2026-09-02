"""SQLAlchemy models.

Four tables: accounts, refresh tokens, profiles and goals. `financial_goals` is
the one table from the documented schema that was never built — the Goals tab and
the Goal agent both need it, so it closes the loop between the UI and the AI.
Budgets and transactions remain deliberately out of scope.
"""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class UserAccount(Base):
    __tablename__ = "user_accounts"

    user_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    profile_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    goals = relationship("FinancialGoal", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")


class RefreshToken(Base):
    """One row per issued refresh token, storing only a bcrypt hash."""

    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user_accounts.user_id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user = relationship("UserAccount", back_populates="refresh_tokens")


class UserProfile(Base):
    """The financial profile behind every prediction.

    Fields the models consume are real columns so they can be queried and
    validated; the rest of the multi-step form is kept in `extra` rather than
    spread across fifty rarely-read columns as the original MySQL table did.
    """

    __tablename__ = "user_profiles"

    profile_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_accounts.user_id", ondelete="CASCADE"), unique=True, index=True
    )

    # Personal
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(50), nullable=True)
    marital_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    occupation: Mapped[str | None] = mapped_column(String(100), nullable=True)
    dependents_count: Mapped[int] = mapped_column(Integer, default=0)

    # Financials
    monthly_income: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    monthly_expenses: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    annual_income: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    savings_rate_pct: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    net_worth: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    outstanding_debt: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    approx_emi: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    emergency_fund: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    credit_score: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Goal and preferences
    primary_goal: Mapped[str | None] = mapped_column(String(100), nullable=True)
    goal_amount: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    goal_timeline_years: Mapped[int | None] = mapped_column(Integer, nullable=True)
    risk_level: Mapped[str | None] = mapped_column(String(30), nullable=True)
    experience_level: Mapped[str | None] = mapped_column(String(30), nullable=True)
    invest_horizon: Mapped[str | None] = mapped_column(String(60), nullable=True)

    # Everything else the multi-step form collects, kept verbatim.
    extra: Mapped[dict] = mapped_column(JSON, default=dict)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("UserAccount", back_populates="profile")


class FinancialGoal(Base):
    __tablename__ = "financial_goals"

    goal_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user_accounts.user_id", ondelete="CASCADE"), index=True)
    goal_name: Mapped[str] = mapped_column(String(255), nullable=False)
    target_amount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    current_amount: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    priority: Mapped[str] = mapped_column(String(20), default="medium")
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("UserAccount", back_populates="goals")
