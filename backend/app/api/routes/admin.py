from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.pricing import calculate_quote, ensure_default_pricing, round_quote_total
from app.core.security import create_admin_token, get_current_admin, verify_password
from app.db.session import get_db
from app.models.company import Company
from app.models.guest import Guest, GuestPreference, GuestPreferenceItem
from app.models.order import Order, OrderWorkRange
from app.models.tobacco import TobaccoCatalog
from app.models.user import User
from app.schemas.admin import (
    AdminLoginRequest,
    AdminLoginResponse,
    AdminUserRead,
    CompanyCreate,
    CompanyRead,
    CompanyUpdate,
    GuestCreate,
    GuestPreferenceCreate,
    GuestPreferenceItemRead,
    GuestPreferenceRead,
    GuestRead,
    GuestPreferenceUpdate,
    GuestUpdate,
    OrderCreate,
    OrderExpenseUpdate,
    OrderRead,
    OrderWorkRangeRead,
    TobaccoCreate,
    TobaccoInventoryUpdate,
    TobaccoRead,
)
from app.schemas.pricing import PricingConfigRead, PricingConfigUpdate

router = APIRouter(prefix="/admin", tags=["admin"])


def serialize_guest_preference(preference: GuestPreference) -> GuestPreferenceRead:
    return GuestPreferenceRead(
        id=preference.id,
        preferred_bowl=preference.preferred_bowl,
        preference_comment=preference.preference_comment,
        is_actual=preference.is_actual,
        created_at=preference.created_at,
        items=[
            GuestPreferenceItemRead(
                id=item.id,
                percent=item.percent,
                tobacco=TobaccoRead.model_validate(item.tobacco),
            )
            for item in preference.items
        ],
    )


def serialize_guest(guest: Guest) -> GuestRead:
    return GuestRead(
        id=guest.id,
        company_id=guest.company_id,
        company_name=guest.company.name,
        full_name=guest.full_name,
        phone=guest.phone,
        birth_date=guest.birth_date,
        created_at=guest.created_at,
        preferences=[serialize_guest_preference(preference) for preference in guest.preferences],
    )


def serialize_order(order: Order) -> OrderRead:
    actual_profit = order.quoted_total - order.actual_total if order.actual_total is not None else None
    return OrderRead(
        id=order.id,
        company_id=order.company_id,
        company_name=order.company_name,
        company_address=order.company_address,
        contact_name=order.contact_name,
        phone=order.phone,
        customer_comment=order.customer_comment,
        location=order.location,
        event_date=order.event_date,
        event_time=order.event_time,
        hours=order.hours,
        hookahs_count=order.hookahs_count,
        quoted_total=order.quoted_total,
        fuel_expense=order.fuel_expense,
        consumables_expense=order.consumables_expense,
        coal_expense=order.coal_expense,
        tobacco_expense=order.tobacco_expense,
        labor_expense=order.labor_expense,
        extra_expense=order.extra_expense,
        extra_expense_comment=order.extra_expense_comment,
        actual_total=order.actual_total,
        actual_profit=actual_profit,
        status=order.status,
        work_ranges=[
            OrderWorkRangeRead(id=item.id, starts_at=item.starts_at, ends_at=item.ends_at)
            for item in order.work_ranges
        ],
    )


@router.post("/auth/login", response_model=AdminLoginResponse)
def login(payload: AdminLoginRequest, db: Session = Depends(get_db)) -> AdminLoginResponse:
    user = db.scalar(select(User).where(User.login == payload.login))

    if user is None or not verify_password(payload.password, user.password_hash) or not user.is_admin:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный логин или пароль")

    return AdminLoginResponse(token=create_admin_token(user), user=AdminUserRead.model_validate(user))


@router.get("/me", response_model=AdminUserRead)
def get_me(current_admin: User = Depends(get_current_admin)) -> AdminUserRead:
    return AdminUserRead.model_validate(current_admin)


@router.get("/pricing", response_model=PricingConfigRead)
def get_pricing_config(db: Session = Depends(get_db), _: User = Depends(get_current_admin)) -> PricingConfigRead:
    config = ensure_default_pricing(db)
    return PricingConfigRead.model_validate(config)


@router.patch("/pricing", response_model=PricingConfigRead)
def update_pricing_config(
    payload: PricingConfigUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> PricingConfigRead:
    config = ensure_default_pricing(db)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(config, field, value)

    db.add(config)
    db.commit()
    db.refresh(config)
    return PricingConfigRead.model_validate(config)


@router.get("/companies", response_model=list[CompanyRead])
def list_companies(
    query: str = Query(default="", max_length=120),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> list[CompanyRead]:
    statement = select(Company).order_by(Company.name)

    if query:
        pattern = f"%{query}%"
        statement = statement.where(
            or_(
                Company.name.ilike(pattern),
                Company.contact_name.ilike(pattern),
                Company.phone.ilike(pattern),
            )
        )

    companies = db.scalars(statement.limit(20)).all()
    return [CompanyRead.model_validate(company) for company in companies]


@router.post("/companies", response_model=CompanyRead, status_code=status.HTTP_201_CREATED)
def create_company(
    payload: CompanyCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> CompanyRead:
    existing = db.scalar(select(Company).where(Company.name == payload.name))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Компания уже существует")

    company = Company(**payload.model_dump())
    db.add(company)
    db.commit()
    db.refresh(company)
    return CompanyRead.model_validate(company)


@router.patch("/companies/{company_id}", response_model=CompanyRead)
def update_company(
    company_id: int,
    payload: CompanyUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> CompanyRead:
    company = db.scalar(select(Company).where(Company.id == company_id))
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Компания не найдена")

    if payload.name and payload.name != company.name:
        existing = db.scalar(select(Company).where(Company.name == payload.name))
        if existing is not None and existing.id != company_id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Компания уже существует")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(company, field, value)

    db.add(company)
    db.commit()
    db.refresh(company)
    return CompanyRead.model_validate(company)


@router.delete("/companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(
    company_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> None:
    company = db.scalar(select(Company).where(Company.id == company_id))
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Компания не найдена")

    orders = db.scalars(select(Order).where(Order.company_id == company_id)).all()
    for order in orders:
        order.company_id = None
        db.add(order)

    db.delete(company)
    db.commit()


@router.get("/tobacco", response_model=list[TobaccoRead])
def list_tobacco(
    query: str = Query(default="", max_length=120),
    limit: int = Query(default=500, ge=1, le=1000),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> list[TobaccoRead]:
    statement = select(TobaccoCatalog).order_by(TobaccoCatalog.brand, TobaccoCatalog.flavor_name)

    if query:
        pattern = f"%{query}%"
        statement = statement.where(
            or_(
                TobaccoCatalog.brand.ilike(pattern),
                TobaccoCatalog.flavor_name.ilike(pattern),
                TobaccoCatalog.strength.ilike(pattern),
            )
        )

    items = db.scalars(statement.limit(limit)).all()
    return [TobaccoRead.model_validate(item) for item in items]


@router.post("/tobacco", response_model=TobaccoRead, status_code=status.HTTP_201_CREATED)
def create_tobacco(
    payload: TobaccoCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> TobaccoRead:
    item = TobaccoCatalog(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return TobaccoRead.model_validate(item)


@router.patch("/tobacco/{tobacco_id}/inventory", response_model=TobaccoRead)
def update_tobacco_inventory(
    tobacco_id: int,
    payload: TobaccoInventoryUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> TobaccoRead:
    item = db.scalar(select(TobaccoCatalog).where(TobaccoCatalog.id == tobacco_id))
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Позиция каталога не найдена")

    if payload.tare_weight is not None:
        item.tare_weight = payload.tare_weight
    if payload.gross_weight is not None:
        item.gross_weight = payload.gross_weight

    # Чистый остаток: берём явно введённый, иначе считаем как вес с тарой минус вес тары.
    if payload.net_weight is not None:
        item.net_weight = payload.net_weight
    elif item.gross_weight is not None and item.tare_weight is not None:
        item.net_weight = item.gross_weight - item.tare_weight

    item.stock_updated_at = datetime.now(timezone.utc)

    db.add(item)
    db.commit()
    db.refresh(item)
    return TobaccoRead.model_validate(item)


@router.get("/guests", response_model=list[GuestRead])
def list_guests(
    company_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> list[GuestRead]:
    statement = (
        select(Guest)
        .options(
            joinedload(Guest.company),
            joinedload(Guest.preferences).joinedload(GuestPreference.items).joinedload(GuestPreferenceItem.tobacco),
        )
        .order_by(Guest.full_name)
    )

    if company_id is not None:
        statement = statement.where(Guest.company_id == company_id)

    guests = db.scalars(statement).unique().all()
    return [serialize_guest(guest) for guest in guests]


@router.post("/guests", response_model=GuestRead, status_code=status.HTTP_201_CREATED)
def create_guest(
    payload: GuestCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> GuestRead:
    company = db.scalar(select(Company).where(Company.id == payload.company_id))
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Компания не найдена")

    guest = Guest(
        company_id=payload.company_id,
        full_name=payload.full_name,
        phone=payload.phone,
        birth_date=payload.birth_date,
    )
    db.add(guest)
    db.commit()

    guest = db.scalar(
        select(Guest)
        .options(
            joinedload(Guest.company),
            joinedload(Guest.preferences).joinedload(GuestPreference.items).joinedload(GuestPreferenceItem.tobacco),
        )
        .where(Guest.id == guest.id)
    )
    if guest is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Не удалось загрузить гостя")
    return serialize_guest(guest)


@router.patch("/guests/{guest_id}", response_model=GuestRead)
def update_guest(
    guest_id: int,
    payload: GuestUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> GuestRead:
    guest = db.scalar(select(Guest).where(Guest.id == guest_id))
    if guest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Гость не найден")

    if payload.company_id is not None:
        company = db.scalar(select(Company).where(Company.id == payload.company_id))
        if company is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Компания не найдена")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(guest, field, value)

    db.add(guest)
    db.commit()

    guest = db.scalar(
        select(Guest)
        .options(
            joinedload(Guest.company),
            joinedload(Guest.preferences).joinedload(GuestPreference.items).joinedload(GuestPreferenceItem.tobacco),
        )
        .where(Guest.id == guest_id)
    )
    if guest is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Не удалось загрузить гостя")
    return serialize_guest(guest)


@router.delete("/guests/{guest_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_guest(
    guest_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> None:
    guest = db.scalar(select(Guest).where(Guest.id == guest_id))
    if guest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Гость не найден")

    db.delete(guest)
    db.commit()


@router.post("/guests/{guest_id}/preferences", response_model=GuestPreferenceRead, status_code=status.HTTP_201_CREATED)
def create_guest_preference(
    guest_id: int,
    payload: GuestPreferenceCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> GuestPreferenceRead:
    guest = db.scalar(select(Guest).where(Guest.id == guest_id))
    if guest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Гость не найден")

    tobacco_ids = [item.tobacco_id for item in payload.items]
    tobacco_items = db.scalars(select(TobaccoCatalog).where(TobaccoCatalog.id.in_(tobacco_ids))).all()
    if len(tobacco_items) != len(set(tobacco_ids)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не все позиции табака найдены")

    preference = GuestPreference(
        guest_id=guest_id,
        preferred_bowl=payload.preferred_bowl,
        preference_comment=payload.preference_comment,
        is_actual=payload.is_actual,
        items=[
            GuestPreferenceItem(tobacco_id=item.tobacco_id, percent=item.percent, sort_order=index)
            for index, item in enumerate(payload.items)
        ],
    )
    db.add(preference)
    db.commit()

    preference = db.scalar(
        select(GuestPreference)
        .options(joinedload(GuestPreference.items).joinedload(GuestPreferenceItem.tobacco))
        .where(GuestPreference.id == preference.id)
    )
    if preference is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Не удалось загрузить предпочтение")
    return serialize_guest_preference(preference)


@router.patch("/preferences/{preference_id}", response_model=GuestPreferenceRead)
def update_guest_preference(
    preference_id: int,
    payload: GuestPreferenceUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> GuestPreferenceRead:
    preference = db.scalar(
        select(GuestPreference)
        .options(joinedload(GuestPreference.items).joinedload(GuestPreferenceItem.tobacco))
        .where(GuestPreference.id == preference_id)
    )
    if preference is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Предпочтение не найдено")

    if payload.items is not None:
        tobacco_ids = [item.tobacco_id for item in payload.items]
        tobacco_items = db.scalars(select(TobaccoCatalog).where(TobaccoCatalog.id.in_(tobacco_ids))).all()
        if len(tobacco_items) != len(set(tobacco_ids)):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не все позиции табака найдены")
        preference.items = [
            GuestPreferenceItem(tobacco_id=item.tobacco_id, percent=item.percent, sort_order=index)
            for index, item in enumerate(payload.items)
        ]

    for field, value in payload.model_dump(exclude_unset=True, exclude={"items"}).items():
        setattr(preference, field, value)

    db.add(preference)
    db.commit()
    db.refresh(preference)
    return serialize_guest_preference(preference)


@router.delete("/preferences/{preference_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_guest_preference(
    preference_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> None:
    preference = db.scalar(select(GuestPreference).where(GuestPreference.id == preference_id))
    if preference is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Предпочтение не найдено")

    db.delete(preference)
    db.commit()


@router.get("/orders", response_model=list[OrderRead])
def list_orders(db: Session = Depends(get_db), _: User = Depends(get_current_admin)) -> list[OrderRead]:
    orders = db.scalars(select(Order).options(joinedload(Order.work_ranges)).order_by(Order.created_at.desc())).unique().all()
    return [serialize_order(order) for order in orders]


@router.post("/orders", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> OrderRead:
    company = None
    if payload.company_id is not None:
        company = db.scalar(select(Company).where(Company.id == payload.company_id))
        if company is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Компания не найдена")

    config = ensure_default_pricing(db)
    breakdown = calculate_quote(payload.hours, payload.hookahs_count, config)
    first_range = min(payload.work_ranges, key=lambda item: item.starts_at)
    order = Order(
        company_id=payload.company_id,
        event_date=first_range.starts_at.date(),
        event_time=first_range.starts_at.time(),
        location=payload.location,
        company_name=payload.company_name,
        company_address=payload.company_address or "",
        contact_name=payload.contact_name or "",
        phone=payload.phone or "",
        customer_comment=payload.customer_comment,
        hours=payload.hours,
        hookahs_count=payload.hookahs_count,
        quoted_total=round_quote_total(breakdown.total),
        work_ranges=[
            OrderWorkRange(starts_at=item.starts_at, ends_at=item.ends_at) for item in payload.work_ranges
        ],
    )

    if company is not None:
        company.address = payload.company_address or company.address
        company.contact_name = payload.contact_name or company.contact_name
        company.phone = payload.phone or company.phone
        company.comment = payload.customer_comment

    db.add(order)
    db.commit()

    order = db.scalar(select(Order).options(joinedload(Order.work_ranges)).where(Order.id == order.id))
    if order is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Не удалось загрузить заказ")
    return serialize_order(order)


@router.patch("/orders/{order_id}/expenses", response_model=OrderRead)
def update_order_expenses(
    order_id: int,
    payload: OrderExpenseUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> OrderRead:
    order = db.scalar(select(Order).options(joinedload(Order.work_ranges)).where(Order.id == order_id))
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заказ не найден")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(order, field, value)

    expense_fields = [
        order.fuel_expense,
        order.consumables_expense,
        order.coal_expense,
        order.tobacco_expense,
        order.labor_expense,
        order.extra_expense,
    ]
    if any(value is not None for value in expense_fields):
        order.actual_total = float(sum(value or 0 for value in expense_fields))

    db.add(order)
    db.commit()
    db.refresh(order)
    return serialize_order(order)


@router.delete("/orders/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> None:
    order = db.scalar(select(Order).where(Order.id == order_id))
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заказ не найден")

    db.delete(order)
    db.commit()