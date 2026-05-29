from __future__ import annotations

from datetime import date, time
from typing import Optional

from pydantic import BaseModel, Field

from app.models.lead import LeadStatus
from app.schemas.pricing import QuoteBreakdown


class LeadCreate(BaseModel):
    contact_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=6, max_length=32)
    event_date: date
    event_time: time
    location: str = Field(min_length=4, max_length=255)
    hours: int = Field(ge=1, le=24)
    hookahs_count: int = Field(ge=1, le=30)
    notes: Optional[str] = Field(default=None, max_length=2000)


class LeadResponse(BaseModel):
    id: int
    quoted_total: float
    status: LeadStatus
    breakdown: QuoteBreakdown
