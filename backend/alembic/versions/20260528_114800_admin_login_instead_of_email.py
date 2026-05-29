from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260528_114800"
down_revision = "20260528_111900"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("users")}

    if "login" not in columns:
        op.add_column("users", sa.Column("login", sa.String(length=64), nullable=True))

    if "email" in columns:
        op.execute("UPDATE users SET login = COALESCE(login, split_part(email, '@', 1)) WHERE email IS NOT NULL")

    op.execute("UPDATE users SET login = COALESCE(login, 'admin_' || id::text)")

    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("login", existing_type=sa.String(length=64), nullable=False)
        batch_op.create_unique_constraint("uq_users_login", ["login"])


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_constraint("uq_users_login", type_="unique")
        batch_op.drop_column("login")