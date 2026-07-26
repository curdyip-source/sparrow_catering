from __future__ import annotations

from datetime import date, datetime, time
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.guest import BowlType
from app.models.order import OrderStatus
from app.models.stock import InventoryStatus, StockMovementKind


class AdminLoginRequest(BaseModel):
    login: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=6, max_length=255)


class AdminUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    login: str
    is_admin: bool


class AdminLoginResponse(BaseModel):
    token: str
    user: AdminUserRead


class CompanyCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    address: Optional[str] = Field(default=None, max_length=255)
    contact_name: Optional[str] = Field(default=None, max_length=120)
    phone: Optional[str] = Field(default=None, max_length=32)
    comment: Optional[str] = Field(default=None, max_length=2000)


class CompanyUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    address: Optional[str] = Field(default=None, max_length=255)
    contact_name: Optional[str] = Field(default=None, max_length=120)
    phone: Optional[str] = Field(default=None, max_length=32)
    comment: Optional[str] = Field(default=None, max_length=2000)


class CompanyRead(CompanyCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int


class TobaccoCreate(BaseModel):
    strength: str = Field(min_length=1, max_length=64)
    brand: str = Field(min_length=1, max_length=120)
    flavor_name: str = Field(min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    cost_per_gram: Optional[float] = Field(default=None, ge=0)


class TobaccoRead(TobaccoCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int


class TobaccoUpdate(BaseModel):
    strength: Optional[str] = Field(default=None, min_length=1, max_length=64)
    brand: Optional[str] = Field(default=None, min_length=1, max_length=120)
    flavor_name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    cost_per_gram: Optional[float] = Field(default=None, ge=0)


# ── Склад: остатки и движения ──────────────────────────────────────

class StockBalanceRead(BaseModel):
    tobacco_id: int
    brand: str
    flavor_name: str
    strength: str
    cost_per_gram: Optional[float] = None
    balance_grams: float
    stock_value: Optional[float] = None  # balance_grams × cost_per_gram


class StockMovementCreate(BaseModel):
    tobacco_id: int
    grams: float = Field(gt=0)  # всегда положительное, знак задаёт тип операции
    cost_per_gram: Optional[float] = Field(default=None, ge=0)
    comment: Optional[str] = Field(default=None, max_length=2000)


class StockMovementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tobacco_id: int
    kind: StockMovementKind
    delta_grams: float
    cost_per_gram: Optional[float] = None
    inventory_session_id: Optional[int] = None
    comment: Optional[str] = None
    created_at: datetime


# ── Инвентаризация ─────────────────────────────────────────────────

class InventorySessionCreate(BaseModel):
    comment: Optional[str] = Field(default=None, max_length=2000)


class InventoryLineAdd(BaseModel):
    tobacco_id: int


class InventoryLineUpdate(BaseModel):
    counted_grams: Optional[float] = Field(default=None, ge=0)
    tare_weight: Optional[float] = Field(default=None, ge=0)
    gross_weight: Optional[float] = Field(default=None, ge=0)


class InventoryLineBulkItem(BaseModel):
    line_id: int
    counted_grams: Optional[float] = Field(default=None, ge=0)
    tare_weight: Optional[float] = Field(default=None, ge=0)
    gross_weight: Optional[float] = Field(default=None, ge=0)


class InventoryLineBulkSave(BaseModel):
    lines: list[InventoryLineBulkItem]


class InventoryLineRead(BaseModel):
    id: int
    tobacco_id: int
    brand: str
    flavor_name: str
    strength: str
    expected_grams: float
    counted_grams: Optional[float] = None
    tare_weight: Optional[float] = None
    gross_weight: Optional[float] = None
    diff_grams: Optional[float] = None  # counted − expected, None если не считали


class InventorySessionRead(BaseModel):
    id: int
    status: InventoryStatus
    comment: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    lines_total: int
    lines_counted: int
    diff_total: float  # сумма (counted − expected) по посчитанным строкам


class StockDocumentLineInput(BaseModel):
    tobacco_id: int
    grams: float = Field(gt=0)
    cost_per_gram: Optional[float] = Field(default=None, ge=0)


class StockDocumentCreate(BaseModel):
    kind: StockMovementKind
    comment: Optional[str] = Field(default=None, max_length=2000)
    lines: list[StockDocumentLineInput] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_kind(self) -> "StockDocumentCreate":
        if self.kind not in (StockMovementKind.receipt, StockMovementKind.writeoff):
            raise ValueError("Документ может быть только оприходованием или списанием")
        return self


class StockDocumentLineRead(BaseModel):
    tobacco_id: int
    brand: str
    flavor_name: str
    strength: str
    grams: float  # абсолютная величина
    cost_per_gram: Optional[float] = None


class StockDocumentRead(BaseModel):
    id: int
    kind: StockMovementKind
    inventory_session_id: Optional[int] = None
    comment: Optional[str] = None
    created_at: datetime
    lines: list[StockDocumentLineRead]


class InventorySessionDetail(InventorySessionRead):
    lines: list[InventoryLineRead]
    documents: list[StockDocumentRead]


class GuestPreferenceItemPayload(BaseModel):
    tobacco_id: int
    percent: float = Field(gt=0, le=100)


class GuestPreferenceItemRead(BaseModel):
    id: int
    percent: float
    tobacco: TobaccoRead


class GuestPreferenceCreate(BaseModel):
    preferred_bowl: Optional[BowlType] = None
    preference_comment: Optional[str] = Field(default=None, max_length=2000)
    is_actual: bool = True
    items: list[GuestPreferenceItemPayload] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_percent(self) -> "GuestPreferenceCreate":
        total = sum(item.percent for item in self.items)
        if round(total, 2) != 100:
            raise ValueError("Сумма процентов по табаку должна быть 100")
        return self


class GuestPreferenceUpdate(BaseModel):
    preferred_bowl: Optional[BowlType] = None
    preference_comment: Optional[str] = Field(default=None, max_length=2000)
    is_actual: Optional[bool] = None
    items: Optional[list[GuestPreferenceItemPayload]] = Field(default=None, min_length=1)

    @model_validator(mode="after")
    def validate_percent(self) -> "GuestPreferenceUpdate":
        if self.items is None:
            return self
        total = sum(item.percent for item in self.items)
        if round(total, 2) != 100:
            raise ValueError("Сумма процентов по табаку должна быть 100")
        return self


class GuestCreate(BaseModel):
    company_id: int
    full_name: str = Field(min_length=2, max_length=120)
    phone: Optional[str] = Field(default=None, max_length=32)
    birth_date: Optional[date] = None


class GuestUpdate(BaseModel):
    company_id: Optional[int] = None
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    phone: Optional[str] = Field(default=None, max_length=32)
    birth_date: Optional[date] = None


class GuestPreferenceRead(BaseModel):
    id: int
    preferred_bowl: Optional[BowlType]
    preference_comment: Optional[str]
    is_actual: bool
    created_at: datetime
    items: list[GuestPreferenceItemRead]


class GuestRead(BaseModel):
    id: int
    company_id: int
    company_name: str
    full_name: str
    phone: Optional[str]
    birth_date: Optional[date]
    created_at: datetime
    preferences: list[GuestPreferenceRead]


class WorkRangePayload(BaseModel):
    starts_at: datetime
    ends_at: datetime

    @model_validator(mode="after")
    def validate_range(self) -> "WorkRangePayload":
        if self.ends_at <= self.starts_at:
            raise ValueError("Окончание должно быть позже начала")
        return self


class OrderCreate(BaseModel):
    company_id: Optional[int] = None
    company_name: str = Field(min_length=2, max_length=255)
    company_address: Optional[str] = Field(default=None, max_length=255)
    contact_name: Optional[str] = Field(default=None, max_length=120)
    phone: Optional[str] = Field(default=None, max_length=32)
    customer_comment: Optional[str] = Field(default=None, max_length=2000)
    location: str = Field(default="", max_length=255)
    hookahs_count: int = Field(ge=1, le=30)
    hours: float = Field(gt=0, le=72)
    work_ranges: list[WorkRangePayload] = Field(min_length=1)


class OrderExpenseUpdate(BaseModel):
    fuel_expense: Optional[float] = Field(default=None, ge=0)
    consumables_expense: Optional[float] = Field(default=None, ge=0)
    coal_expense: Optional[float] = Field(default=None, ge=0)
    tobacco_expense: Optional[float] = Field(default=None, ge=0)
    labor_expense: Optional[float] = Field(default=None, ge=0)
    extra_expense: Optional[float] = Field(default=None, ge=0)
    extra_expense_comment: Optional[str] = Field(default=None, max_length=1000)
    status: Optional[OrderStatus] = None


class OrderWorkRangeRead(BaseModel):
    id: int
    starts_at: datetime
    ends_at: datetime


class OrderRead(BaseModel):
    id: int
    company_id: Optional[int]
    company_name: str
    company_address: str
    contact_name: str
    phone: str
    customer_comment: Optional[str]
    location: str
    event_date: date
    event_time: time
    hours: float
    hookahs_count: int
    quoted_total: float
    fuel_expense: Optional[float]
    consumables_expense: Optional[float]
    coal_expense: Optional[float]
    tobacco_expense: Optional[float]
    labor_expense: Optional[float]
    extra_expense: Optional[float]
    extra_expense_comment: Optional[str]
    actual_total: Optional[float]
    actual_profit: Optional[float]
    status: OrderStatus
    work_ranges: list[OrderWorkRangeRead]
