from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, Enum as SqlEnum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class BowlType(str, Enum):
    turka = "turka"
    phunnel = "phunnel"


class Guest(Base):
    __tablename__ = "guests"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    full_name: Mapped[str] = mapped_column(String(120), index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    birth_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    company: Mapped["Company"] = relationship(back_populates="guests")
    preferences: Mapped[list["GuestPreference"]] = relationship(
        back_populates="guest",
        cascade="all, delete-orphan",
        order_by="desc(GuestPreference.created_at)",
    )


class GuestPreference(Base):
    __tablename__ = "guest_preferences"

    id: Mapped[int] = mapped_column(primary_key=True)
    guest_id: Mapped[int] = mapped_column(ForeignKey("guests.id", ondelete="CASCADE"), index=True)
    preferred_bowl: Mapped[Optional[BowlType]] = mapped_column(SqlEnum(BowlType), nullable=True)
    preference_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_actual: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    guest: Mapped[Guest] = relationship(back_populates="preferences")
    items: Mapped[list["GuestPreferenceItem"]] = relationship(
        back_populates="preference",
        cascade="all, delete-orphan",
        order_by="GuestPreferenceItem.sort_order",
    )


class GuestPreferenceItem(Base):
    __tablename__ = "guest_preference_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    preference_id: Mapped[int] = mapped_column(ForeignKey("guest_preferences.id", ondelete="CASCADE"), index=True)
    tobacco_id: Mapped[int] = mapped_column(ForeignKey("tobacco_catalog.id"), index=True)
    percent: Mapped[float] = mapped_column(Float)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    preference: Mapped[GuestPreference] = relationship(back_populates="items")
    tobacco: Mapped["TobaccoCatalog"] = relationship(back_populates="guest_preference_items")


from app.models.company import Company  # noqa: E402
from app.models.tobacco import TobaccoCatalog  # noqa: E402