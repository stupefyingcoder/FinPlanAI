"""Request and response models.

The profile payload keeps the nested shape the React multi-step form already
sends (personal / residence / financials / loans / goals / preferences / ...), so
porting the backend does not force a frontend rewrite.
"""

from __future__ import annotations

from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# --------------------------------------------------------------------- auth
class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    # The form has sent either key at different times; accept both.
    name: str | None = Field(default=None, min_length=2, max_length=100)
    fullName: str | None = Field(default=None, min_length=2, max_length=100)

    @property
    def resolved_name(self) -> str:
        return (self.name or self.fullName or "").strip()

    @field_validator("fullName")
    @classmethod
    def _at_least_one_name(cls, v, info):
        if not v and not info.data.get("name"):
            raise ValueError("either name or fullName is required")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class SignupResponse(BaseModel):
    message: str
    user: dict


class LoginResponse(BaseModel):
    accessToken: str
    profileCompleted: bool
    fullName: str
    userId: int


class AccessTokenResponse(BaseModel):
    accessToken: str


class MessageResponse(BaseModel):
    message: str


class MeResponse(BaseModel):
    account: dict
    profileCompleted: bool


# ------------------------------------------------------------------ profile
class PersonalSection(BaseModel):
    fullName: str | None = None
    email: str | None = None
    phone: str | None = None
    dob: str | None = None
    age: int | None = Field(default=None, ge=0, le=120)
    gender: str | None = None
    maritalStatus: str | None = None
    occupation: str | None = None


class FinancialsSection(BaseModel):
    monthlyIncome: float | None = Field(default=None, ge=0)
    monthlyExpenses: float | None = Field(default=None, ge=0)
    monthlySavingsPct: float | None = Field(default=None, ge=0, le=100)
    annualGrossIncome: float | None = Field(default=None, ge=0)
    investableAssets: float | None = Field(default=None, ge=0)
    outstandingDebt: float | None = Field(default=None, ge=0)
    emergencyFund: float | None = Field(default=None, ge=0)
    creditScore: int | None = Field(default=None, ge=300, le=900)


class LoansSection(BaseModel):
    hasLoans: bool = False
    loanTypes: list[str] = Field(default_factory=list)
    approxEmi: float | None = Field(default=None, ge=0)


class GoalItem(BaseModel):
    model_config = ConfigDict(extra="allow")
    name: str
    targetAmount: float = Field(ge=0)
    targetDate: str | None = None
    role: str | None = None


class PreferencesSection(BaseModel):
    experience: str | None = None
    riskLevel: str | None = None
    investHorizon: str | None = None
    preferredAssets: list[str] = Field(default_factory=list)
    desiredEmergencyMonths: int | None = Field(default=None, ge=0, le=60)


class ProfileRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    personal: PersonalSection = Field(default_factory=PersonalSection)
    financials: FinancialsSection = Field(default_factory=FinancialsSection)
    loans: LoansSection = Field(default_factory=LoansSection)
    goals: list[GoalItem] = Field(default_factory=list)
    preferences: PreferencesSection = Field(default_factory=PreferencesSection)
    residence: dict[str, Any] = Field(default_factory=dict)
    family: dict[str, Any] = Field(default_factory=dict)
    employment: dict[str, Any] = Field(default_factory=dict)
    insurance: list[dict[str, Any]] = Field(default_factory=list)
    tax: dict[str, Any] = Field(default_factory=dict)
    notes: str | None = None


class ProfileResponse(BaseModel):
    profileCompleted: bool
    profile: dict


# -------------------------------------------------------------------- goals
class GoalCreate(BaseModel):
    goal_name: str = Field(min_length=1, max_length=255)
    target_amount: float = Field(gt=0)
    current_amount: float = Field(default=0, ge=0)
    target_date: date | None = None
    priority: Literal["low", "medium", "high"] = "medium"
    status: Literal["active", "completed", "paused"] = "active"


class GoalUpdate(BaseModel):
    goal_name: str | None = Field(default=None, min_length=1, max_length=255)
    target_amount: float | None = Field(default=None, gt=0)
    current_amount: float | None = Field(default=None, ge=0)
    target_date: date | None = None
    priority: Literal["low", "medium", "high"] | None = None
    status: Literal["active", "completed", "paused"] | None = None


class GoalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    goal_id: int
    goal_name: str
    target_amount: float
    current_amount: float
    target_date: date | None
    priority: str
    status: str
    progress_pct: float = 0.0


# ----------------------------------------------------------------------- ml
class AllocationResponse(BaseModel):
    allocation: dict[str, float]
    source: str = "model"


class SegmentResponse(BaseModel):
    cluster_id: int
    label: str


class PlanResponse(BaseModel):
    segment: SegmentResponse
    allocation: dict[str, float]
    narrative: str
    generated_by: Literal["gemini", "fallback"]
    note: str | None = None
