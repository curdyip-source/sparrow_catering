from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260528_121200"
down_revision = "20260528_115400"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    company_columns = {column["name"] for column in inspector.get_columns("companies")}
    guest_columns = {column["name"] for column in inspector.get_columns("guests")}

    with op.batch_alter_table("companies") as batch_op:
        if "address" in company_columns:
            batch_op.alter_column("address", existing_type=sa.String(length=255), nullable=True)
        if "contact_name" in company_columns:
            batch_op.alter_column("contact_name", existing_type=sa.String(length=120), nullable=True)
        if "phone" in company_columns:
            batch_op.alter_column("phone", existing_type=sa.String(length=32), nullable=True)

    with op.batch_alter_table("guests") as batch_op:
        if "phone" in guest_columns:
            batch_op.alter_column("phone", existing_type=sa.String(length=32), nullable=True)

    if "guest_preferences" not in tables:
        op.create_table(
            "guest_preferences",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("guest_id", sa.Integer(), sa.ForeignKey("guests.id", ondelete="CASCADE"), nullable=False),
            sa.Column(
                "preferred_bowl",
                postgresql.ENUM("turka", "phunnel", name="bowltype", create_type=False),
                nullable=True,
            ),
            sa.Column("preference_comment", sa.Text(), nullable=True),
            sa.Column("is_actual", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_guest_preferences_guest_id", "guest_preferences", ["guest_id"], unique=False)

    if "guest_preference_items" not in tables:
        op.create_table(
            "guest_preference_items",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("preference_id", sa.Integer(), sa.ForeignKey("guest_preferences.id", ondelete="CASCADE"), nullable=False),
            sa.Column("tobacco_id", sa.Integer(), sa.ForeignKey("tobacco_catalog.id"), nullable=False),
            sa.Column("percent", sa.Float(), nullable=False),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        )
        op.create_index("ix_guest_preference_items_preference_id", "guest_preference_items", ["preference_id"], unique=False)
        op.create_index("ix_guest_preference_items_tobacco_id", "guest_preference_items", ["tobacco_id"], unique=False)

    if "guest_tobacco_preferences" in tables and "preferred_bowl" in guest_columns and "preference_comment" in guest_columns:
        op.execute(
            """
            INSERT INTO guest_preferences (guest_id, preferred_bowl, preference_comment, is_actual, created_at)
            SELECT g.id, g.preferred_bowl, g.preference_comment, true, g.created_at
            FROM guests g
            WHERE g.preferred_bowl IS NOT NULL
               OR g.preference_comment IS NOT NULL
               OR EXISTS (SELECT 1 FROM guest_tobacco_preferences gtp WHERE gtp.guest_id = g.id)
            """
        )
        op.execute(
            """
            INSERT INTO guest_preference_items (preference_id, tobacco_id, percent, sort_order)
            SELECT gp.id, gtp.tobacco_id, gtp.percent, gtp.sort_order
            FROM guest_tobacco_preferences gtp
            JOIN guest_preferences gp ON gp.guest_id = gtp.guest_id
            """
        )


def downgrade() -> None:
    tables = set(sa.inspect(op.get_bind()).get_table_names())

    if "guest_preference_items" in tables:
        op.drop_index("ix_guest_preference_items_tobacco_id", table_name="guest_preference_items")
        op.drop_index("ix_guest_preference_items_preference_id", table_name="guest_preference_items")
        op.drop_table("guest_preference_items")

    if "guest_preferences" in tables:
        op.drop_index("ix_guest_preferences_guest_id", table_name="guest_preferences")
        op.drop_table("guest_preferences")