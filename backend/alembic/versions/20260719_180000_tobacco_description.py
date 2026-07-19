from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260719_180000"
down_revision = "20260528_121200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("tobacco_catalog")}

    if "description" not in columns:
        with op.batch_alter_table("tobacco_catalog") as batch_op:
            batch_op.add_column(sa.Column("description", sa.String(length=500), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("tobacco_catalog")}

    if "description" in columns:
        with op.batch_alter_table("tobacco_catalog") as batch_op:
            batch_op.drop_column("description")
