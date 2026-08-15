from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.pricing import calculate_quote, ensure_default_pricing, round_quote_total
from app.core.security import create_admin_token, get_current_admin, verify_password
from app.db.session import get_db
from app.models.company import Company
from app.models.guest import Guest, GuestPreference, GuestPreferenceItem
from app.models.order import Order, OrderWorkRange
from app.models.stock import (
    InventoryLine,
    InventorySession,
    InventoryStatus,
    StockDocument,
    StockMovement,
    StockMovementKind,
)
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
    InventoryLineAdd,
    InventoryLineBulkSave,
    InventoryLineRead,
    InventoryLineUpdate,
    InventorySessionCreate,
    InventorySessionDetail,
    InventorySessionRead,
    OrderCreate,
    OrderExpenseUpdate,
    OrderRead,
    OrderWorkRangeRead,
    StockBalanceRead,
    StockDocumentCreate,
    StockDocumentLineInput,
    StockDocumentLineRead,
    StockDocumentRead,
    StockDocumentUpdate,
    StockMovementCreate,
    StockMovementRead,
    TobaccoCreate,
    TobaccoRead,
    TobaccoUpdate,
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


@router.patch("/tobacco/{tobacco_id}", response_model=TobaccoRead)
def update_tobacco(
    tobacco_id: int,
    payload: TobaccoUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> TobaccoRead:
    item = db.scalar(select(TobaccoCatalog).where(TobaccoCatalog.id == tobacco_id))
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Позиция каталога не найдена")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.add(item)
    db.commit()
    db.refresh(item)
    return TobaccoRead.model_validate(item)


# ── Склад: остатки и движения ──────────────────────────────────────

def _balances(db: Session) -> dict[int, float]:
    """Текущий остаток по каждой позиции = SUM(delta_grams) из журнала."""
    rows = db.execute(
        select(StockMovement.tobacco_id, func.coalesce(func.sum(StockMovement.delta_grams), 0.0)).group_by(
            StockMovement.tobacco_id
        )
    ).all()
    return {tobacco_id: float(total) for tobacco_id, total in rows}


@router.get("/stock", response_model=list[StockBalanceRead])
def list_stock(
    brand: str = Query(default=""),
    strength: str = Query(default=""),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> list[StockBalanceRead]:
    statement = select(TobaccoCatalog).order_by(TobaccoCatalog.brand, TobaccoCatalog.flavor_name)
    if brand:
        statement = statement.where(TobaccoCatalog.brand == brand)
    if strength:
        statement = statement.where(TobaccoCatalog.strength == strength)

    items = db.scalars(statement).all()
    balances = _balances(db)

    result: list[StockBalanceRead] = []
    for item in items:
        balance = balances.get(item.id, 0.0)
        value = balance * item.cost_per_gram if item.cost_per_gram is not None else None
        result.append(
            StockBalanceRead(
                tobacco_id=item.id,
                brand=item.brand,
                flavor_name=item.flavor_name,
                strength=item.strength,
                cost_per_gram=item.cost_per_gram,
                balance_grams=balance,
                stock_value=value,
            )
        )
    return result


def _record_movement(
    db: Session,
    tobacco_id: int,
    kind: StockMovementKind,
    delta_grams: float,
    *,
    cost_per_gram: float | None = None,
    comment: str | None = None,
    inventory_session_id: int | None = None,
) -> StockMovement:
    item = db.scalar(select(TobaccoCatalog).where(TobaccoCatalog.id == tobacco_id))
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Позиция каталога не найдена")

    movement = StockMovement(
        tobacco_id=tobacco_id,
        kind=kind,
        delta_grams=delta_grams,
        cost_per_gram=cost_per_gram,
        comment=comment,
        inventory_session_id=inventory_session_id,
    )
    db.add(movement)
    return movement


@router.post("/stock/receipt", response_model=StockMovementRead, status_code=status.HTTP_201_CREATED)
def create_receipt(
    payload: StockMovementCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> StockMovementRead:
    movement = _record_movement(
        db,
        payload.tobacco_id,
        StockMovementKind.receipt,
        payload.grams,
        cost_per_gram=payload.cost_per_gram,
        comment=payload.comment,
    )
    # Если по позиции ещё не задана себестоимость, а её передали при приходе — сохраним.
    if payload.cost_per_gram is not None:
        item = db.scalar(select(TobaccoCatalog).where(TobaccoCatalog.id == payload.tobacco_id))
        if item is not None and item.cost_per_gram is None:
            item.cost_per_gram = payload.cost_per_gram
    db.commit()
    db.refresh(movement)
    return StockMovementRead.model_validate(movement)


@router.post("/stock/writeoff", response_model=StockMovementRead, status_code=status.HTTP_201_CREATED)
def create_writeoff(
    payload: StockMovementCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> StockMovementRead:
    movement = _record_movement(
        db,
        payload.tobacco_id,
        StockMovementKind.writeoff,
        -payload.grams,
        comment=payload.comment,
    )
    db.commit()
    db.refresh(movement)
    return StockMovementRead.model_validate(movement)


@router.get("/stock/{tobacco_id}/movements", response_model=list[StockMovementRead])
def list_movements(
    tobacco_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> list[StockMovementRead]:
    movements = db.scalars(
        select(StockMovement)
        .where(StockMovement.tobacco_id == tobacco_id)
        .order_by(StockMovement.created_at.desc(), StockMovement.id.desc())
    ).all()
    return [StockMovementRead.model_validate(item) for item in movements]


# ── Инвентаризация ─────────────────────────────────────────────────

def serialize_inventory_session(session: InventorySession) -> InventorySessionRead:
    counted = [line for line in session.lines if line.counted_grams is not None]
    diff_total = sum(line.counted_grams - line.expected_grams for line in counted)
    return InventorySessionRead(
        id=session.id,
        status=session.status,
        comment=session.comment,
        created_at=session.created_at,
        completed_at=session.completed_at,
        lines_total=len(session.lines),
        lines_counted=len(counted),
        diff_total=float(diff_total),
    )


def serialize_inventory_line(line: InventoryLine) -> InventoryLineRead:
    diff = line.counted_grams - line.expected_grams if line.counted_grams is not None else None
    return InventoryLineRead(
        id=line.id,
        tobacco_id=line.tobacco_id,
        brand=line.tobacco.brand,
        flavor_name=line.tobacco.flavor_name,
        strength=line.tobacco.strength,
        expected_grams=line.expected_grams,
        counted_grams=line.counted_grams,
        tare_weight=line.tare_weight,
        gross_weight=line.gross_weight,
        diff_grams=float(diff) if diff is not None else None,
    )


def serialize_stock_document(document: StockDocument) -> StockDocumentRead:
    return StockDocumentRead(
        id=document.id,
        kind=document.kind,
        inventory_session_id=document.inventory_session_id,
        comment=document.comment,
        created_at=document.created_at,
        lines=[
            StockDocumentLineRead(
                tobacco_id=movement.tobacco_id,
                brand=movement.tobacco.brand,
                flavor_name=movement.tobacco.flavor_name,
                strength=movement.tobacco.strength,
                grams=abs(movement.delta_grams),
                cost_per_gram=movement.cost_per_gram,
            )
            for movement in document.movements
        ],
    )


def load_session_documents(db: Session, session_id: int) -> list[StockDocument]:
    return list(
        db.scalars(
            select(StockDocument)
            .options(joinedload(StockDocument.movements).joinedload(StockMovement.tobacco))
            .where(StockDocument.inventory_session_id == session_id)
            .order_by(StockDocument.id)
        )
        .unique()
        .all()
    )


def serialize_inventory_detail(session: InventorySession, documents: list[StockDocument]) -> InventorySessionDetail:
    base = serialize_inventory_session(session)
    return InventorySessionDetail(
        **base.model_dump(),
        lines=[serialize_inventory_line(line) for line in session.lines],
        documents=[serialize_stock_document(document) for document in documents],
    )


def load_session(db: Session, session_id: int) -> InventorySession:
    session = db.scalar(
        select(InventorySession)
        .options(joinedload(InventorySession.lines).joinedload(InventoryLine.tobacco))
        .where(InventorySession.id == session_id)
    )
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Инвентаризация не найдена")
    return session


def inventory_detail_response(db: Session, session_id: int) -> InventorySessionDetail:
    session = load_session(db, session_id)
    return serialize_inventory_detail(session, load_session_documents(db, session_id))


@router.get("/inventories", response_model=list[InventorySessionRead])
def list_inventories(db: Session = Depends(get_db), _: User = Depends(get_current_admin)) -> list[InventorySessionRead]:
    sessions = (
        db.scalars(
            select(InventorySession)
            .options(joinedload(InventorySession.lines))
            .order_by(InventorySession.created_at.desc())
        )
        .unique()
        .all()
    )
    return [serialize_inventory_session(session) for session in sessions]


@router.post("/inventories", response_model=InventorySessionDetail, status_code=status.HTTP_201_CREATED)
def create_inventory(
    payload: InventorySessionCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> InventorySessionDetail:
    # Пустая сессия: позиции добавляются через поиск (не вываливаем весь каталог).
    session = InventorySession(comment=payload.comment)
    db.add(session)
    db.commit()
    return inventory_detail_response(db, session.id)


@router.get("/inventories/{session_id}", response_model=InventorySessionDetail)
def get_inventory(
    session_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> InventorySessionDetail:
    return inventory_detail_response(db, session_id)


@router.post("/inventories/{session_id}/lines", response_model=InventorySessionDetail, status_code=status.HTTP_201_CREATED)
def add_inventory_line(
    session_id: int,
    payload: InventoryLineAdd,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> InventorySessionDetail:
    session = load_session(db, session_id)
    if session.status is InventoryStatus.completed:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Инвентаризация завершена")

    item = db.scalar(select(TobaccoCatalog).where(TobaccoCatalog.id == payload.tobacco_id))
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Позиция каталога не найдена")
    if any(line.tobacco_id == payload.tobacco_id for line in session.lines):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Позиция уже добавлена в инвентаризацию")

    balance = _balances(db).get(payload.tobacco_id, 0.0)
    db.add(InventoryLine(session_id=session_id, tobacco_id=payload.tobacco_id, expected_grams=balance))
    db.commit()
    return inventory_detail_response(db, session_id)


@router.delete("/inventories/{session_id}/lines/{line_id}", response_model=InventorySessionDetail)
def remove_inventory_line(
    session_id: int,
    line_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> InventorySessionDetail:
    line = db.scalar(
        select(InventoryLine)
        .options(joinedload(InventoryLine.session))
        .where(InventoryLine.id == line_id, InventoryLine.session_id == session_id)
    )
    if line is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Строка инвентаризации не найдена")
    if line.session.status is InventoryStatus.completed:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Инвентаризация завершена")

    db.delete(line)
    db.commit()
    return inventory_detail_response(db, session_id)


@router.patch("/inventories/{session_id}/lines/{line_id}", response_model=InventoryLineRead)
def update_inventory_line(
    session_id: int,
    line_id: int,
    payload: InventoryLineUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> InventoryLineRead:
    line = db.scalar(
        select(InventoryLine)
        .options(joinedload(InventoryLine.tobacco), joinedload(InventoryLine.session))
        .where(InventoryLine.id == line_id, InventoryLine.session_id == session_id)
    )
    if line is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Строка инвентаризации не найдена")
    if line.session.status is InventoryStatus.completed:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Инвентаризация уже проведена")

    data = payload.model_dump(exclude_unset=True)
    if "tare_weight" in data:
        line.tare_weight = data["tare_weight"]
    if "gross_weight" in data:
        line.gross_weight = data["gross_weight"]

    # Факт: явный net приоритетнее; иначе, если заданы тара и брутто — считаем нетто.
    if "counted_grams" in data and data["counted_grams"] is not None:
        line.counted_grams = data["counted_grams"]
    elif line.tare_weight is not None and line.gross_weight is not None:
        line.counted_grams = max(line.gross_weight - line.tare_weight, 0.0)
    elif "counted_grams" in data:
        line.counted_grams = data["counted_grams"]  # позволяем явно очистить (None)

    db.add(line)
    db.commit()
    db.refresh(line)
    return serialize_inventory_line(line)


def _fill_document(
    db: Session,
    document: StockDocument,
    lines: list[StockDocumentLineInput],
    *,
    allowed_ids: set[int] | None = None,
) -> None:
    """Переписать строки документа: старые движения удаляются (cascade
    delete-orphan), новые собираются из lines. allowed_ids — ограничение по
    позициям (для документов из инвентаризации)."""
    sign = 1.0 if document.kind is StockMovementKind.receipt else -1.0
    document.movements.clear()
    for entry in lines:
        if allowed_ids is not None and entry.tobacco_id not in allowed_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Позиция не входит в эту инвентаризацию",
            )
        item = db.scalar(select(TobaccoCatalog).where(TobaccoCatalog.id == entry.tobacco_id))
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Позиция каталога не найдена")
        document.movements.append(
            StockMovement(
                tobacco_id=entry.tobacco_id,
                kind=document.kind,
                delta_grams=sign * entry.grams,
                cost_per_gram=entry.cost_per_gram,
                inventory_session_id=document.inventory_session_id,
                comment="Оприходование" if document.kind is StockMovementKind.receipt else "Списание",
            )
        )
        # При оприходовании с ценой обновляем себестоимость позиции (последняя цена).
        if document.kind is StockMovementKind.receipt and entry.cost_per_gram is not None:
            item.cost_per_gram = entry.cost_per_gram


def _build_document(
    db: Session,
    payload: StockDocumentCreate,
    *,
    inventory_session_id: int | None,
    allowed_ids: set[int] | None = None,
) -> StockDocument:
    """Создать документ оприходования/списания и его движения."""
    document = StockDocument(kind=payload.kind, inventory_session_id=inventory_session_id, comment=payload.comment)
    _fill_document(db, document, payload.lines, allowed_ids=allowed_ids)
    db.add(document)
    db.commit()
    return document


def load_document(db: Session, document_id: int) -> StockDocument:
    document = db.scalar(
        select(StockDocument)
        .options(joinedload(StockDocument.movements).joinedload(StockMovement.tobacco))
        .where(StockDocument.id == document_id)
    )
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Документ не найден")
    return document


@router.get("/stock/documents", response_model=list[StockDocumentRead])
def list_stock_documents(db: Session = Depends(get_db), _: User = Depends(get_current_admin)) -> list[StockDocumentRead]:
    documents = (
        db.scalars(
            select(StockDocument)
            .options(joinedload(StockDocument.movements).joinedload(StockMovement.tobacco))
            .order_by(StockDocument.created_at.desc(), StockDocument.id.desc())
        )
        .unique()
        .all()
    )
    return [serialize_stock_document(document) for document in documents]


@router.delete("/stock/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stock_document(
    document_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> None:
    """Удалить документ: его движения тоже удаляются (каскад), остаток восстанавливается."""
    document = db.scalar(select(StockDocument).where(StockDocument.id == document_id))
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Документ не найден")
    db.delete(document)
    db.commit()


@router.post("/stock/documents", response_model=StockDocumentRead, status_code=status.HTTP_201_CREATED)
def create_stock_document(
    payload: StockDocumentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> StockDocumentRead:
    """Самостоятельный документ оприходования/списания (без инвентаризации)."""
    document = _build_document(db, payload, inventory_session_id=None)
    return serialize_stock_document(load_document(db, document.id))


@router.put("/stock/documents/{document_id}", response_model=StockDocumentRead)
def update_stock_document(
    document_id: int,
    payload: StockDocumentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> StockDocumentRead:
    """Переписать строки документа: количества и себестоимость. Вид документа и
    привязка к инвентаризации сохраняются, остатки пересчитываются автоматически
    (старые движения документа удаляются вместе со строками)."""
    document = load_document(db, document_id)

    allowed_ids: set[int] | None = None
    if document.inventory_session_id is not None:
        session = load_session(db, document.inventory_session_id)
        allowed_ids = {line.tobacco_id for line in session.lines}

    document.comment = payload.comment
    _fill_document(db, document, payload.lines, allowed_ids=allowed_ids)
    db.commit()
    return serialize_stock_document(load_document(db, document_id))


@router.post("/inventories/{session_id}/documents", response_model=InventorySessionDetail, status_code=status.HTTP_201_CREATED)
def create_inventory_document(
    session_id: int,
    payload: StockDocumentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> InventorySessionDetail:
    """Создать из инвентаризации документ оприходования или списания.
    Строки предзаполняются на фронте разницей (факт − по базе), но приходят явно."""
    session = load_session(db, session_id)
    _build_document(
        db,
        payload,
        inventory_session_id=session_id,
        allowed_ids={line.tobacco_id for line in session.lines},
    )
    return inventory_detail_response(db, session_id)


@router.post("/inventories/{session_id}/save", response_model=InventorySessionDetail)
def save_inventory(
    session_id: int,
    payload: InventoryLineBulkSave,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> InventorySessionDetail:
    """Пакетно сохранить пересчёт: факт по всем строкам разом (без построчных запросов).
    Значения приходят уже посчитанными (нетто), тара/брутто — для истории."""
    session = load_session(db, session_id)
    lines_by_id = {line.id: line for line in session.lines}
    for item in payload.lines:
        line = lines_by_id.get(item.line_id)
        if line is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Строка инвентаризации не найдена")
        line.counted_grams = item.counted_grams
        line.tare_weight = item.tare_weight
        line.gross_weight = item.gross_weight
        db.add(line)
    db.commit()
    return inventory_detail_response(db, session_id)


@router.delete("/inventories/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inventory(
    session_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> None:
    session = db.scalar(select(InventorySession).where(InventorySession.id == session_id))
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Инвентаризация не найдена")
    if session.status is InventoryStatus.completed:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Проведённую инвентаризацию нельзя удалить")

    db.delete(session)
    db.commit()


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