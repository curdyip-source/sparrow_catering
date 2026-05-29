from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260528_111900"
down_revision = None
branch_labels = None
depends_on = None


lead_status_enum = sa.Enum("new", "converted", "archived", name="leadstatus")
order_status_enum = sa.Enum("draft", "confirmed", "completed", "cancelled", name="orderstatus")
guest_bowl_enum = sa.Enum("turka", "phunnel", name="bowltype")


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    had_orders_table = "orders" in tables

    if "users" not in tables:
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("full_name", sa.String(length=120), nullable=False),
            sa.Column("login", sa.String(length=64), nullable=True),
            sa.Column("password_hash", sa.String(length=255), nullable=False),
            sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        tables.add("users")

    if "pricing_configs" not in tables:
        op.create_table(
            "pricing_configs",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("fuel_cost", sa.Float(), nullable=False, server_default="2000"),
            sa.Column("consumables_cost", sa.Float(), nullable=False, server_default="1600"),
            sa.Column("coal_price", sa.Float(), nullable=False, server_default="7.4"),
            sa.Column("tobacco_price_per_gram", sa.Float(), nullable=False, server_default="10"),
            sa.Column("master_hour_rate", sa.Float(), nullable=False, server_default="1200"),
            sa.Column("hookah_hour_factor", sa.Float(), nullable=False, server_default="1.5"),
            sa.Column("coals_per_hookah_session", sa.Float(), nullable=False, server_default="8"),
            sa.Column("tobacco_grams_per_hookah", sa.Float(), nullable=False, server_default="20"),
            sa.Column("service_fee_lt_threshold", sa.Float(), nullable=False, server_default="7000"),
            sa.Column("service_fee_gte_threshold", sa.Float(), nullable=False, server_default="8000"),
            sa.Column("additional_master_threshold", sa.Integer(), nullable=False, server_default="5"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        tables.add("pricing_configs")

    if "leads" not in tables:
        op.create_table(
            "leads",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("contact_name", sa.String(length=120), nullable=False),
            sa.Column("phone", sa.String(length=32), nullable=False),
            sa.Column("event_date", sa.Date(), nullable=False),
            sa.Column("event_time", sa.Time(), nullable=False),
            sa.Column("location", sa.String(length=255), nullable=False),
            sa.Column("hours", sa.Integer(), nullable=False),
            sa.Column("hookahs_count", sa.Integer(), nullable=False),
            sa.Column("quoted_total", sa.Float(), nullable=False),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("status", lead_status_enum, nullable=False, server_default="new"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        tables.add("leads")

    if "companies" not in tables:
        op.create_table(
            "companies",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("address", sa.String(length=255), nullable=False),
            sa.Column("contact_name", sa.String(length=120), nullable=False),
            sa.Column("phone", sa.String(length=32), nullable=False),
            sa.Column("comment", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_companies_name", "companies", ["name"], unique=True)
        tables.add("companies")

    if "orders" not in tables:
        op.create_table(
            "orders",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("lead_id", sa.Integer(), sa.ForeignKey("leads.id"), nullable=True),
            sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=True),
            sa.Column("event_date", sa.Date(), nullable=False),
            sa.Column("event_time", sa.Time(), nullable=False),
            sa.Column("location", sa.String(length=255), nullable=False, server_default=""),
            sa.Column("company_name", sa.String(length=255), nullable=False),
            sa.Column("company_address", sa.String(length=255), nullable=False),
            sa.Column("contact_name", sa.String(length=120), nullable=False),
            sa.Column("phone", sa.String(length=32), nullable=False),
            sa.Column("customer_comment", sa.Text(), nullable=True),
            sa.Column("hours", sa.Float(), nullable=False),
            sa.Column("hookahs_count", sa.Integer(), nullable=False),
            sa.Column("quoted_total", sa.Float(), nullable=False),
            sa.Column("fuel_expense", sa.Float(), nullable=True),
            sa.Column("consumables_expense", sa.Float(), nullable=True),
            sa.Column("coal_expense", sa.Float(), nullable=True),
            sa.Column("tobacco_expense", sa.Float(), nullable=True),
            sa.Column("labor_expense", sa.Float(), nullable=True),
            sa.Column("extra_expense", sa.Float(), nullable=True),
            sa.Column("extra_expense_comment", sa.Text(), nullable=True),
            sa.Column("actual_total", sa.Float(), nullable=True),
            sa.Column("status", order_status_enum, nullable=False, server_default="draft"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        )
        tables.add("orders")

    if "tobacco_catalog" not in tables:
        op.create_table(
            "tobacco_catalog",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("strength", sa.String(length=64), nullable=False),
            sa.Column("brand", sa.String(length=120), nullable=False),
            sa.Column("flavor_name", sa.String(length=120), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_tobacco_catalog_brand", "tobacco_catalog", ["brand"], unique=False)
        op.create_index("ix_tobacco_catalog_flavor_name", "tobacco_catalog", ["flavor_name"], unique=False)
        op.create_index("ix_tobacco_catalog_strength", "tobacco_catalog", ["strength"], unique=False)
        tables.add("tobacco_catalog")

    if "guests" not in tables:
        op.create_table(
            "guests",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
            sa.Column("full_name", sa.String(length=120), nullable=False),
            sa.Column("phone", sa.String(length=32), nullable=False),
            sa.Column("birth_date", sa.Date(), nullable=True),
            sa.Column("preferred_bowl", guest_bowl_enum, nullable=True),
            sa.Column("preference_comment", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_guests_company_id", "guests", ["company_id"], unique=False)
        op.create_index("ix_guests_full_name", "guests", ["full_name"], unique=False)
        tables.add("guests")

    if "guest_tobacco_preferences" not in tables:
        op.create_table(
            "guest_tobacco_preferences",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("guest_id", sa.Integer(), sa.ForeignKey("guests.id", ondelete="CASCADE"), nullable=False),
            sa.Column("tobacco_id", sa.Integer(), sa.ForeignKey("tobacco_catalog.id"), nullable=False),
            sa.Column("percent", sa.Float(), nullable=False),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        )
        op.create_index("ix_guest_tobacco_preferences_guest_id", "guest_tobacco_preferences", ["guest_id"], unique=False)
        op.create_index("ix_guest_tobacco_preferences_tobacco_id", "guest_tobacco_preferences", ["tobacco_id"], unique=False)

    if had_orders_table:
        inspector = sa.inspect(bind)
        order_columns = {column["name"] for column in inspector.get_columns("orders")}

        if "company_id" not in order_columns:
            op.add_column("orders", sa.Column("company_id", sa.Integer(), nullable=True))
        if "company_name" not in order_columns:
            op.add_column("orders", sa.Column("company_name", sa.String(length=255), nullable=True))
        if "company_address" not in order_columns:
            op.add_column("orders", sa.Column("company_address", sa.String(length=255), nullable=True))
        if "customer_comment" not in order_columns:
            op.add_column("orders", sa.Column("customer_comment", sa.Text(), nullable=True))
        if "fuel_expense" not in order_columns:
            op.add_column("orders", sa.Column("fuel_expense", sa.Float(), nullable=True))
        if "consumables_expense" not in order_columns:
            op.add_column("orders", sa.Column("consumables_expense", sa.Float(), nullable=True))
        if "coal_expense" not in order_columns:
            op.add_column("orders", sa.Column("coal_expense", sa.Float(), nullable=True))
        if "tobacco_expense" not in order_columns:
            op.add_column("orders", sa.Column("tobacco_expense", sa.Float(), nullable=True))
        if "labor_expense" not in order_columns:
            op.add_column("orders", sa.Column("labor_expense", sa.Float(), nullable=True))
        if "extra_expense" not in order_columns:
            op.add_column("orders", sa.Column("extra_expense", sa.Float(), nullable=True))
        if "extra_expense_comment" not in order_columns:
            op.add_column("orders", sa.Column("extra_expense_comment", sa.Text(), nullable=True))

        op.execute("UPDATE orders SET company_name = COALESCE(company_name, contact_name)")
        op.execute("UPDATE orders SET company_address = COALESCE(company_address, location)")
        op.execute("UPDATE orders SET location = COALESCE(location, '')")

        with op.batch_alter_table("orders") as batch_op:
            batch_op.alter_column("company_name", existing_type=sa.String(length=255), nullable=False)
            batch_op.alter_column("company_address", existing_type=sa.String(length=255), nullable=False)
            batch_op.alter_column("location", existing_type=sa.String(length=255), nullable=False)
            batch_op.alter_column("hours", existing_type=sa.Integer(), type_=sa.Float(), nullable=False)
            batch_op.create_foreign_key("fk_orders_company_id", "companies", ["company_id"], ["id"])

    if "order_work_ranges" not in tables:
        op.create_table(
            "order_work_ranges",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
            sa.Column("starts_at", sa.DateTime(timezone=False), nullable=False),
            sa.Column("ends_at", sa.DateTime(timezone=False), nullable=False),
        )
        op.create_index("ix_order_work_ranges_order_id", "order_work_ranges", ["order_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_order_work_ranges_order_id", table_name="order_work_ranges")
    op.drop_table("order_work_ranges")

    with op.batch_alter_table("orders") as batch_op:
        batch_op.drop_constraint("fk_orders_company_id", type_="foreignkey")
        batch_op.alter_column("hours", existing_type=sa.Float(), type_=sa.Integer(), nullable=False)
        batch_op.drop_column("extra_expense_comment")
        batch_op.drop_column("extra_expense")
        batch_op.drop_column("labor_expense")
        batch_op.drop_column("tobacco_expense")
        batch_op.drop_column("coal_expense")
        batch_op.drop_column("consumables_expense")
        batch_op.drop_column("fuel_expense")
        batch_op.drop_column("customer_comment")
        batch_op.drop_column("company_address")
        batch_op.drop_column("company_name")
        batch_op.drop_column("company_id")

    op.drop_index("ix_guest_tobacco_preferences_tobacco_id", table_name="guest_tobacco_preferences")
    op.drop_index("ix_guest_tobacco_preferences_guest_id", table_name="guest_tobacco_preferences")
    op.drop_table("guest_tobacco_preferences")

    op.drop_index("ix_guests_full_name", table_name="guests")
    op.drop_index("ix_guests_company_id", table_name="guests")
    op.drop_table("guests")

    op.drop_index("ix_tobacco_catalog_strength", table_name="tobacco_catalog")
    op.drop_index("ix_tobacco_catalog_flavor_name", table_name="tobacco_catalog")
    op.drop_index("ix_tobacco_catalog_brand", table_name="tobacco_catalog")
    op.drop_table("tobacco_catalog")

    op.drop_index("ix_companies_name", table_name="companies")
    op.drop_table("companies")

    guest_bowl_enum.drop(op.get_bind(), checkfirst=False)
    order_status_enum.drop(op.get_bind(), checkfirst=False)