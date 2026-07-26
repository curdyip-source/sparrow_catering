from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import DateTime, Enum as SqlEnum, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class StockMovementKind(str, Enum):
    receipt = "receipt"  # оприходование (+)
    writeoff = "writeoff"  # списание (−)
    inventory = "inventory"  # корректировка по инвентаризации (±)


class InventoryStatus(str, Enum):
    draft = "draft"  # идёт подсчёт
    completed = "completed"  # проведена, движения записаны


class StockMovement(Base):
    """Складской журнал. Остаток позиции = SUM(delta_grams)."""

    __tablename__ = "stock_movements"

    id: Mapped[int] = mapped_column(primary_key=True)
    tobacco_id: Mapped[int] = mapped_column(ForeignKey("tobacco_catalog.id", ondelete="CASCADE"), index=True)
    kind: Mapped[StockMovementKind] = mapped_column(SqlEnum(StockMovementKind))
    # Знаковое изменение остатка в граммах: + приход, − расход.
    delta_grams: Mapped[float] = mapped_column(Float)
    # Снимок себестоимости на момент прихода (для receipt), ₽/г.
    cost_per_gram: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    # Документ (оприходование/списание), который породил движение.
    document_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("stock_documents.id", ondelete="CASCADE"), nullable=True, index=True
    )
    inventory_session_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("inventory_sessions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    tobacco: Mapped["TobaccoCatalog"] = relationship()


class StockDocument(Base):
    """Документ движения товара: оприходование или списание. Может быть создан
    из инвентаризации (тогда inventory_session_id заполнен)."""

    __tablename__ = "stock_documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Переиспользуем тип движения (только receipt/writeoff); валидируем в схеме.
    kind: Mapped[StockMovementKind] = mapped_column(SqlEnum(StockMovementKind))
    inventory_session_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("inventory_sessions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    comment: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    movements: Mapped[list["StockMovement"]] = relationship(
        cascade="all, delete-orphan",
        order_by="StockMovement.id",
    )


class InventorySession(Base):
    __tablename__ = "inventory_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    status: Mapped[InventoryStatus] = mapped_column(SqlEnum(InventoryStatus), default=InventoryStatus.draft)
    comment: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    lines: Mapped[list["InventoryLine"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="InventoryLine.id",
    )


class InventoryLine(Base):
    __tablename__ = "inventory_lines"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("inventory_sessions.id", ondelete="CASCADE"), index=True)
    tobacco_id: Mapped[int] = mapped_column(ForeignKey("tobacco_catalog.id", ondelete="CASCADE"))
    # Остаток по базе на момент старта сессии (снимок).
    expected_grams: Mapped[float] = mapped_column(Float)
    # Фактически посчитанный вес нетто; NULL = ещё не считали.
    counted_grams: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    # Помощник взвешивания: тара и вес с тарой (брутто).
    tare_weight: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    gross_weight: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    session: Mapped[InventorySession] = relationship(back_populates="lines")
    tobacco: Mapped["TobaccoCatalog"] = relationship()


from app.models.tobacco import TobaccoCatalog  # noqa: E402
