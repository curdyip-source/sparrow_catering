from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class PricingConfigRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    fuel_cost: float
    consumables_cost: float
    coal_price: float
    tobacco_price_per_gram: float
    master_hour_rate: float
    hookah_hour_factor: float
    coals_per_hookah_session: float
    tobacco_grams_per_hookah: float
    service_fee_lt_threshold: float
    service_fee_gte_threshold: float
    additional_master_threshold: int


class PricingConfigUpdate(BaseModel):
    fuel_cost: float | None = Field(default=None, ge=0)
    consumables_cost: float | None = Field(default=None, ge=0)
    coal_price: float | None = Field(default=None, ge=0)
    tobacco_price_per_gram: float | None = Field(default=None, ge=0)
    master_hour_rate: float | None = Field(default=None, ge=0)
    hookah_hour_factor: float | None = Field(default=None, ge=0)
    coals_per_hookah_session: float | None = Field(default=None, ge=0)
    tobacco_grams_per_hookah: float | None = Field(default=None, ge=0)
    service_fee_lt_threshold: float | None = Field(default=None, ge=0)
    service_fee_gte_threshold: float | None = Field(default=None, ge=0)
    additional_master_threshold: int | None = Field(default=None, ge=1)


class QuoteBreakdown(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    fuel_cost: float
    consumables_cost: float
    coal_cost: float
    tobacco_cost: float
    master_cost: float
    extra_master_cost: float
    service_fee: float
    total: float
