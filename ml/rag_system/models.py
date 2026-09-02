from pydantic import BaseModel, Field
from typing import List, Optional

class FinancialPlan(BaseModel):
    plan_id: str
    customer_id: str
    summary: str
    details: dict
    timestamp: str

class ChatHistory(BaseModel):
    customer_id: str
    messages: List[dict]  # {"role": "user"|"agent", "content": str, "timestamp": str}

class CustomerProfile(BaseModel):
    customer_id: str
    name: str
    age: Optional[int]
    income: Optional[float]
    documents: List[str] = Field(default_factory=list)
    plans: List[FinancialPlan] = Field(default_factory=list)
    chat_history: Optional[ChatHistory] = None
