"""agregar hora a eventos

Revision ID: 20260710_0004
Revises: 20260710_0003
Create Date: 2026-07-10 12:00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260710_0004"
down_revision = "20260710_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    columnas = {
        row[0]
        for row in conn.execute(
            sa.text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'eventos'"
            )
        )
    }
    if "hora" not in columnas:
        op.add_column("eventos", sa.Column("hora", sa.Time(), nullable=True))


def downgrade() -> None:
    op.drop_column("eventos", "hora")
