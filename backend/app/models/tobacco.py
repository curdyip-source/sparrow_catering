from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TobaccoCatalog(Base):
    __tablename__ = "tobacco_catalog"

    id: Mapped[int] = mapped_column(primary_key=True)
    strength: Mapped[str] = mapped_column(String(64), index=True)
    brand: Mapped[str] = mapped_column(String(120), index=True)
    flavor_name: Mapped[str] = mapped_column(String(120), index=True)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Себестоимость за грамм (₽/г) — для оценки стоимости остатков.
    cost_per_gram: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    guest_preference_items: Mapped[list["GuestPreferenceItem"]] = relationship(back_populates="tobacco")


from app.models.guest import GuestPreferenceItem  # noqa: E402