from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260528_115400"
down_revision = "20260528_114800"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("users")}

    if "email" in columns:
        with op.batch_alter_table("users") as batch_op:
            batch_op.drop_column("email")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("users")}

    if "email" not in columns:
        with op.batch_alter_table("users") as batch_op:
            batch_op.add_column(sa.Column("email", sa.String(length=255), nullable=True))
            batch_op.create_unique_constraint("uq_users_email", ["email"])