from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.pricing import calculate_quote, ensure_default_pricing, round_quote_total
from app.db.base import Base
from app.models.pricing_config import PricingConfig


def test_extra_master_starts_after_threshold() -> None:
    config = PricingConfig(
        fuel_cost=2000,
        consumables_cost=1600,
        coal_price=7.4,
        tobacco_price_per_gram=10,
        master_hour_rate=1200,
        hookah_hour_factor=1.5,
        coals_per_hookah_session=8,
        tobacco_grams_per_hookah=20,
        service_fee_lt_threshold=7000,
        service_fee_gte_threshold=8000,
        additional_master_threshold=5,
    )

    at_threshold = calculate_quote(hours=3, hookahs_count=5, config=config)
    above_threshold = calculate_quote(hours=3, hookahs_count=6, config=config)

    assert at_threshold.extra_master_cost == 0
    assert at_threshold.service_fee == 7000
    assert above_threshold.extra_master_cost == 3600
    assert above_threshold.service_fee == 8000


def test_ensure_default_pricing_upgrades_previous_default_base_costs() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)

    with Session(engine) as db:
        db.add(PricingConfig(fuel_cost=1800, consumables_cost=1600))
        db.commit()

        config = ensure_default_pricing(db)

        assert config.fuel_cost == 2000
        assert config.consumables_cost == 1600


def test_round_quote_total_matches_ui_rounding() -> None:
    assert round_quote_total(1249) == 1000
    assert round_quote_total(1250) == 1500
    assert round_quote_total(1499.99) == 1500