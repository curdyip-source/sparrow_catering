from __future__ import annotations

from dataclasses import dataclass
import math

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.pricing_config import PricingConfig


UPGRADABLE_DEFAULT_BASE_COSTS = [
    {
        "fuel_cost": 1500,
        "consumables_cost": 1500,
    },
    {
        "fuel_cost": 1800,
        "consumables_cost": 1600,
    },
]

CURRENT_DEFAULT_BASE_COSTS = {
    "fuel_cost": 2000,
    "consumables_cost": 1600,
}


@dataclass
class PricingBreakdownData:
    fuel_cost: float
    consumables_cost: float
    coal_cost: float
    tobacco_cost: float
    master_cost: float
    extra_master_cost: float
    service_fee: float
    total: float


def ensure_default_pricing(db: Session) -> PricingConfig:
    config = db.scalar(select(PricingConfig).limit(1))
    if config is not None:
        if any(
            config.fuel_cost == default_costs["fuel_cost"]
            and config.consumables_cost == default_costs["consumables_cost"]
            for default_costs in UPGRADABLE_DEFAULT_BASE_COSTS
        ):
            config.fuel_cost = CURRENT_DEFAULT_BASE_COSTS["fuel_cost"]
            config.consumables_cost = CURRENT_DEFAULT_BASE_COSTS["consumables_cost"]
            db.commit()
            db.refresh(config)
        return config

    config = PricingConfig()
    db.add(config)
    db.commit()
    db.refresh(config)
    return config


def calculate_quote(hours: int, hookahs_count: int, config: PricingConfig) -> PricingBreakdownData:
    extra_master_cost = config.master_hour_rate * hours if hookahs_count > config.additional_master_threshold else 0
    service_fee = config.service_fee_gte_threshold if hookahs_count > config.additional_master_threshold else config.service_fee_lt_threshold
    coal_cost = config.hookah_hour_factor * config.coals_per_hookah_session * config.coal_price * hours * hookahs_count
    tobacco_cost = (
        config.hookah_hour_factor
        * config.tobacco_grams_per_hookah
        * config.tobacco_price_per_gram
        * hours
        * hookahs_count
    )
    master_cost = config.master_hour_rate * hours
    total = (
        config.fuel_cost
        + config.consumables_cost
        + coal_cost
        + tobacco_cost
        + master_cost
        + extra_master_cost
        + service_fee
    )

    return PricingBreakdownData(
        fuel_cost=round(config.fuel_cost, 2),
        consumables_cost=round(config.consumables_cost, 2),
        coal_cost=round(coal_cost, 2),
        tobacco_cost=round(tobacco_cost, 2),
        master_cost=round(master_cost, 2),
        extra_master_cost=round(extra_master_cost, 2),
        service_fee=round(service_fee, 2),
        total=round(total, 2),
    )


def round_quote_total(value: float) -> float:
    return math.floor(value / 500 + 0.5) * 500
