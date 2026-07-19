from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260719_183000"
down_revision = "20260719_180000"
branch_labels = None
depends_on = None


NEW_COLUMNS = {
    "tare_weight": lambda: sa.Column("tare_weight", sa.Float(), nullable=True),
    "gross_weight": lambda: sa.Column("gross_weight", sa.Float(), nullable=True),
    "net_weight": lambda: sa.Column("net_weight", sa.Float(), nullable=True),
    "stock_updated_at": lambda: sa.Column("stock_updated_at", sa.DateTime(timezone=True), nullable=True),
}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("tobacco_catalog")}

    with op.batch_alter_table("tobacco_catalog") as batch_op:
        for name, factory in NEW_COLUMNS.items():
            if name not in columns:
                batch_op.add_column(factory())


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("tobacco_catalog")}

    with op.batch_alter_table("tobacco_catalog") as batch_op:
        for name in reversed(list(NEW_COLUMNS)):
            if name in columns:
                batch_op.drop_column(name)
