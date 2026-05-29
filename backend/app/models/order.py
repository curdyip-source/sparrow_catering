from __future__ import annotations

from datetime import date, datetime, time
from enum import Enum
from typing import Optional

from sqlalchemy import Date, DateTime, Enum as SqlEnum, Float, ForeignKey, Integer, String, Text, Time, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class OrderStatus(str, Enum):
    draft = "draft"
    confirmed = "confirmed"
    completed = "completed"
    cancelled = "cancelled"


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    lead_id: Mapped[Optional[int]] = mapped_column(ForeignKey("leads.id"), nullable=True)
    company_id: Mapped[Optional[int]] = mapped_column(ForeignKey("companies.id"), nullable=True)
    event_date: Mapped[date] = mapped_column(Date)
    event_time: Mapped[time] = mapped_column(Time)
    location: Mapped[str] = mapped_column(String(255), default="")
    company_name: Mapped[str] = mapped_column(String(255))
    company_address: Mapped[str] = mapped_column(String(255))
    contact_name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(32))
    customer_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    hours: Mapped[float] = mapped_column(Float)
    hookahs_count: Mapped[int] = mapped_column(Integer)
    quoted_total: Mapped[float] = mapped_column(Float)
    fuel_expense: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    consumables_expense: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    coal_expense: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    tobacco_expense: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    labor_expense: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    extra_expense: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    extra_expense_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    actual_total: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[OrderStatus] = mapped_column(SqlEnum(OrderStatus), default=OrderStatus.draft)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    work_ranges: Mapped[list["OrderWorkRange"]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
        order_by="OrderWorkRange.starts_at",
    )


class OrderWorkRange(Base):
    __tablename__ = "order_work_ranges"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=False))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=False))

    order: Mapped[Order] = relationship(back_populates="work_ranges")
