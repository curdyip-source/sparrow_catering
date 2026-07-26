from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260726_160000"
down_revision = "20260726_120000"
branch_labels = None
depends_on = None


# Тип уже существует (создан миграцией stock_ledger). postgresql.ENUM с
# create_type=False надёжно ссылается на него и НЕ выпускает CREATE TYPE
# (в отличие от sa.Enum(create_type=False), который его всё равно создаёт).
stock_kind_enum = postgresql.ENUM(
    "receipt", "writeoff", "inventory", name="stockmovementkind", create_type=False
)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    movement_columns = {column["name"] for column in inspector.get_columns("stock_movements")}

    if "stock_documents" not in tables:
        op.create_table(
            "stock_documents",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("kind", stock_kind_enum, nullable=False),
            sa.Column(
                "inventory_session_id",
                sa.Integer(),
                sa.ForeignKey("inventory_sessions.id", ondelete="SET NULL"),
                nullable=True,
                index=True,
            ),
            sa.Column("comment", sa.String(length=2000), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    if "document_id" not in movement_columns:
        with op.batch_alter_table("stock_movements") as batch_op:
            batch_op.add_column(sa.Column("document_id", sa.Integer(), nullable=True))
            batch_op.create_foreign_key(
                "fk_stock_movements_document_id",
                "stock_documents",
                ["document_id"],
                ["id"],
                ondelete="CASCADE",
            )
            batch_op.create_index("ix_stock_movements_document_id", ["document_id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    movement_columns = {column["name"] for column in inspector.get_columns("stock_movements")}

    if "document_id" in movement_columns:
        with op.batch_alter_table("stock_movements") as batch_op:
            batch_op.drop_index("ix_stock_movements_document_id")
            batch_op.drop_constraint("fk_stock_movements_document_id", type_="foreignkey")
            batch_op.drop_column("document_id")

    if "stock_documents" in tables:
        op.drop_table("stock_documents")
