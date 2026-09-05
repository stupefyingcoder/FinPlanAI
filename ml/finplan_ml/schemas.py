# schemas_v2.py
from __future__ import annotations
from typing import List, Dict, Optional
from pydantic import BaseModel, Field



# For new customers (full feature set from website form)
class NewCustomerProfile(BaseModel):
    Customer_ID: str = "unknown"
    Name: Optional[str] = None
    Age: Optional[int] = None
    Gender: Optional[str] = None
    Occupation: Optional[str] = None
    Marital_Status: Optional[str] = None
    Number_of_Dependents: Optional[int] = None
    Monthly_Income: Optional[float] = None
    Monthly_Expenses: Optional[float] = None
    Monthly_Savings: Optional[float] = None
    Loans: Optional[str] = None
    Loan_Type: Optional[str] = None
    EMI: Optional[float] = None
    Primary_Financial_Goal: Optional[str] = None
    Target_Amount: Optional[float] = None
    Goal_Timeline_Years: Optional[int] = None
    Preferred_Investment_Instrument: Optional[str] = None
    Investment_Horizon: Optional[str] = None
    Risk_Comfort_Level: Optional[str] = None
    Health_Insurance_Coverage: Optional[float] = None
    Life_Insurance_Coverage: Optional[float] = None
    Emergency_Fund: Optional[float] = None

# For customers from DB (existing mapping)
class DBCustomerProfile(BaseModel):
    Customer_ID: str = "unknown"
    Name: Optional[str] = None
    Age: Optional[int] = None
    Gender: Optional[str] = None
    Occupation: Optional[str] = None
    Marital_Status: Optional[str] = None
    Number_of_Dependents: Optional[int] = None
    Annual_Income: Optional[float] = None
    Monthly_Expenses: Optional[float] = None
    Current_Net_Worth: Optional[float] = None
    Risk_Taking_Ability: Optional[str] = None        # low | moderate | high
    Preferred_Investment_Horizon: Optional[str] = None  # short | medium | long
    Primary_Financial_Goal: Optional[str] = None
    Goal_Timeline_Years: Optional[int] = None
    Monthly_Surplus: Optional[float] = None
    Starting_Principal: Optional[float] = None
    Inflation_Rate_At_Investment_Start: Optional[float] = 5.0


class SWOT(BaseModel):
    strengths: List[str] = []
    weaknesses: List[str] = []
    opportunities: List[str] = []
    threats: List[str] = []


class PlanText(BaseModel):
    label: str                                   # Personalized | Peer/Cluster | Safety-First
    narrative: str                               # full written plan text (no charts)
    swot: Optional[SWOT] = None                  # filled for Personalized; optional for others
    citations: List[str] = []                    # sources used by RAG (doc ids)


class CustomerPlanTexts(BaseModel):
    customer_id: str
    plans: List[PlanText]
