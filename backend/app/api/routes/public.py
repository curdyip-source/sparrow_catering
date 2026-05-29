from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.pricing import calculate_quote, ensure_default_pricing
from app.db.session import get_db
from app.models.lead import Lead
from app.schemas.lead import LeadCreate, LeadResponse
from app.schemas.pricing import PricingConfigRead, QuoteBreakdown

router = APIRouter()


@router.get("/pricing/default", response_model=PricingConfigRead)
def get_default_pricing(db: Session = Depends(get_db)) -> PricingConfigRead:
    config = ensure_default_pricing(db)
    return PricingConfigRead.model_validate(config)


@router.post("/leads", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
def create_lead(payload: LeadCreate, db: Session = Depends(get_db)) -> LeadResponse:
    config = ensure_default_pricing(db)
    breakdown = calculate_quote(payload.hours, payload.hookahs_count, config)

    lead = Lead(
        contact_name=payload.contact_name,
        phone=payload.phone,
        event_date=payload.event_date,
        event_time=payload.event_time,
        location=payload.location,
        hours=payload.hours,
        hookahs_count=payload.hookahs_count,
        notes=payload.notes,
        quoted_total=breakdown.total,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    return LeadResponse(
        id=lead.id,
        quoted_total=lead.quoted_total,
        status=lead.status,
        breakdown=QuoteBreakdown.model_validate(breakdown),
    )
