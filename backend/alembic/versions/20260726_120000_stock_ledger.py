from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260726_120000"
down_revision = "20260719_183000"
branch_labels = None
depends_on = None


# Enum-типы создаёт сам create_table (по одному разу на тип). Отдельные .create()
# не зовём, иначе тип создаётся дважды и падает на DuplicateObject.
stock_kind_enum = sa.Enum("receipt", "writeoff", "inventory", name="stockmovementkind")
inventory_status_enum = sa.Enum("draft", "completed", name="inventorystatus")

OLD_STOCK_COLUMNS = ("net_weight", "gross_weight", "tare_weight", "stock_updated_at")


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    catalog_columns = {column["name"] for column in inspector.get_columns("tobacco_catalog")}

    # 1. Себестоимость за грамм на позицию каталога.
    if "cost_per_gram" not in catalog_columns:
        with op.batch_alter_table("tobacco_catalog") as batch_op:
            batch_op.add_column(sa.Column("cost_per_gram", sa.Float(), nullable=True))

    # 2. Новые таблицы журнала и инвентаризаций.
    if "inventory_sessions" not in tables:
        op.create_table(
            "inventory_sessions",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("status", inventory_status_enum, nullable=False, server_default="draft"),
            sa.Column("comment", sa.String(length=2000), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        )

    if "inventory_lines" not in tables:
        op.create_table(
            "inventory_lines",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "session_id",
                sa.Integer(),
                sa.ForeignKey("inventory_sessions.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column(
                "tobacco_id",
                sa.Integer(),
                sa.ForeignKey("tobacco_catalog.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("expected_grams", sa.Float(), nullable=False),
            sa.Column("counted_grams", sa.Float(), nullable=True),
            sa.Column("tare_weight", sa.Float(), nullable=True),
            sa.Column("gross_weight", sa.Float(), nullable=True),
        )

    if "stock_movements" not in tables:
        op.create_table(
            "stock_movements",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "tobacco_id",
                sa.Integer(),
                sa.ForeignKey("tobacco_catalog.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column("kind", stock_kind_enum, nullable=False),
            sa.Column("delta_grams", sa.Float(), nullable=False),
            sa.Column("cost_per_gram", sa.Float(), nullable=True),
            sa.Column(
                "inventory_session_id",
                sa.Integer(),
                sa.ForeignKey("inventory_sessions.id", ondelete="SET NULL"),
                nullable=True,
                index=True,
            ),
            sa.Column("comment", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 3. Перенос текущих остатков (net_weight) в первичное оприходование.
    if "net_weight" in catalog_columns:
        op.execute(
            sa.text(
                """
                INSERT INTO stock_movements (tobacco_id, kind, delta_grams, comment, created_at)
                SELECT id, 'receipt', net_weight, 'Первичный остаток', now()
                FROM tobacco_catalog
                WHERE net_weight IS NOT NULL AND net_weight > 0
                """
            )
        )

    # 4. Старые weight-колонки каталога больше не нужны.
    columns_to_drop = [name for name in OLD_STOCK_COLUMNS if name in catalog_columns]
    if columns_to_drop:
        with op.batch_alter_table("tobacco_catalog") as batch_op:
            for name in columns_to_drop:
                batch_op.drop_column(name)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    catalog_columns = {column["name"] for column in inspector.get_columns("tobacco_catalog")}

    with op.batch_alter_table("tobacco_catalog") as batch_op:
        for name in OLD_STOCK_COLUMNS:
            if name not in catalog_columns:
                column = (
                    sa.Column(name, sa.DateTime(timezone=True), nullable=True)
                    if name == "stock_updated_at"
                    else sa.Column(name, sa.Float(), nullable=True)
                )
                batch_op.add_column(column)

    if "stock_movements" in tables:
        op.drop_table("stock_movements")
    if "inventory_lines" in tables:
        op.drop_table("inventory_lines")
    if "inventory_sessions" in tables:
        op.drop_table("inventory_sessions")

    stock_kind_enum.drop(bind, checkfirst=True)
    inventory_status_enum.drop(bind, checkfirst=True)

    if "cost_per_gram" in catalog_columns:
        with op.batch_alter_table("tobacco_catalog") as batch_op:
            batch_op.drop_column("cost_per_gram")