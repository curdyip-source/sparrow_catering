from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260815_120000"
down_revision = "20260726_160000"
branch_labels = None
depends_on = None


INITIAL_COMMENT = "Первичный остаток"
DOCUMENT_COMMENT = "Начальные остатки"


def upgrade() -> None:
    """Свернуть «первичные остатки» (движения без документа, созданные миграцией
    stock_ledger из net_weight) в один документ оприходования — чтобы их можно
    было открыть и отредактировать как обычный приход, вписав себестоимость."""
    bind = op.get_bind()

    orphans = bind.execute(
        sa.text(
            """
            SELECT COUNT(*), MIN(created_at)
            FROM stock_movements
            WHERE document_id IS NULL
              AND inventory_session_id IS NULL
              AND kind = 'receipt'
              AND comment = :comment
            """
        ),
        {"comment": INITIAL_COMMENT},
    ).one()

    count, created_at = orphans
    if not count:
        return

    document_id = bind.execute(
        sa.text(
            """
            INSERT INTO stock_documents (kind, inventory_session_id, comment, created_at)
            VALUES ('receipt', NULL, :comment, :created_at)
            RETURNING id
            """
        ),
        {"comment": DOCUMENT_COMMENT, "created_at": created_at},
    ).scalar_one()

    bind.execute(
        sa.text(
            """
            UPDATE stock_movements
            SET document_id = :document_id
            WHERE document_id IS NULL
              AND inventory_session_id IS NULL
              AND kind = 'receipt'
              AND comment = :comment
            """
        ),
        {"document_id": document_id, "comment": INITIAL_COMMENT},
    )


def downgrade() -> None:
    bind = op.get_bind()
    # Открепляем движения и убираем сам документ — остатки не меняются.
    bind.execute(
        sa.text(
            """
            UPDATE stock_movements
            SET document_id = NULL
            WHERE document_id IN (
                SELECT id FROM stock_documents
                WHERE kind = 'receipt' AND inventory_session_id IS NULL AND comment = :comment
            )
            """
        ),
        {"comment": DOCUMENT_COMMENT},
    )
    bind.execute(
        sa.text(
            "DELETE FROM stock_documents WHERE kind = 'receipt' AND inventory_session_id IS NULL AND comment = :comment"
        ),
        {"comment": DOCUMENT_COMMENT},
    )
