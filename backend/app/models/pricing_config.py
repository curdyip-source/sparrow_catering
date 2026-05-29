from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PricingConfig(Base):
    __tablename__ = "pricing_configs"

    id: Mapped[int] = mapped_column(primary_key=True)
    fuel_cost: Mapped[float] = mapped_column(Float, default=2000)
    consumables_cost: Mapped[float] = mapped_column(Float, default=1600)
    coal_price: Mapped[float] = mapped_column(Float, default=7.4)
    tobacco_price_per_gram: Mapped[float] = mapped_column(Float, default=10)
    master_hour_rate: Mapped[float] = mapped_column(Float, default=1200)
    hookah_hour_factor: Mapped[float] = mapped_column(Float, default=1.5)
    coals_per_hookah_session: Mapped[float] = mapped_column(Float, default=8)
    tobacco_grams_per_hookah: Mapped[float] = mapped_column(Float, default=20)
    service_fee_lt_threshold: Mapped[float] = mapped_column(Float, default=7000)
    service_fee_gte_threshold: Mapped[float] = mapped_column(Float, default=8000)
    additional_master_threshold: Mapped[int] = mapped_column(Integer, default=5)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
