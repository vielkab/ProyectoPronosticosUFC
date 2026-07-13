"""agregar cuotas a predicciones y ver_pronostico a apuestas

Revision ID: 20260710_0005
Revises: 20260710_0004
Create Date: 2026-07-10 14:00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260710_0005"
down_revision = "20260710_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    cols_predicciones = {
        row[0]
        for row in conn.execute(
            sa.text("SELECT column_name FROM information_schema.columns WHERE table_name = 'predicciones'")
        )
    }
    if "cuota_rojo" not in cols_predicciones:
        op.add_column("predicciones", sa.Column("cuota_rojo", sa.Float(), nullable=True))
    if "cuota_azul" not in cols_predicciones:
        op.add_column("predicciones", sa.Column("cuota_azul", sa.Float(), nullable=True))

    cols_apuestas = {
        row[0]
        for row in conn.execute(
            sa.text("SELECT column_name FROM information_schema.columns WHERE table_name = 'apuestas'")
        )
    }
    if "ver_pronostico" not in cols_apuestas:
        op.add_column(
            "apuestas",
            sa.Column("ver_pronostico", sa.Boolean(), nullable=False, server_default=sa.false()),
        )


def downgrade() -> None:
    op.drop_column("apuestas", "ver_pronostico")
    op.drop_column("predicciones", "cuota_azul")
    op.drop_column("predicciones", "cuota_rojo")
