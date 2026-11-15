"""add algo_registry table (F46)

Revision ID: 20261115_add_algo_registry
Revises: 20261027_f44p4_jarvis_tables
Create Date: 2026-11-15 07:22:00.000000

Additive only — creates algo_registry table.
No existing tables are modified.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20261115_add_algo_registry"
down_revision: Union[str, Sequence[str], None] = "20261027_f44p4_jarvis_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: create algo_registry table."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if "algo_registry" not in existing_tables:
        op.create_table(
            "algo_registry",
            sa.Column("algo_id", sa.String(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("algo_type", sa.String(), nullable=False),
            sa.Column("setup_key", sa.String(), nullable=True),
            sa.Column("instrument", sa.String(), nullable=False),
            sa.Column("status", sa.String(), nullable=False, server_default="paused"),
            sa.Column("description", sa.String(), nullable=True),
            sa.Column("config_json", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("algo_id"),
        )


def downgrade() -> None:
    """Downgrade schema: drop algo_registry table."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if "algo_registry" in inspector.get_table_names():
        op.drop_table("algo_registry")
