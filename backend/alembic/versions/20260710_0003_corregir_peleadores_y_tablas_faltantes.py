"""corregir peleadores y tablas faltantes

Revision ID: 20260710_0003
Revises: 20260709_0002
Create Date: 2026-07-10 00:00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260710_0003"
down_revision = "20260709_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # ── 1. Recrear peleadores con columnas correctas ──────────────────────────
    # Eliminar peleas primero por FK — usando IF EXISTS para ser idempotente
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_peleas_id"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_peleas_evento_id"))
    conn.execute(sa.text("DROP TABLE IF EXISTS peleas CASCADE"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_peleadores_nombre"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_peleadores_id"))
    conn.execute(sa.text("DROP TABLE IF EXISTS peleadores CASCADE"))

    op.create_table(
        "peleadores",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=140), nullable=False),
        sa.Column("division", sa.String(length=80), nullable=False, server_default=""),
        sa.Column("pais", sa.String(length=80), nullable=False, server_default=""),
        sa.Column("record", sa.String(length=40), nullable=False, server_default=""),
        sa.Column("edad", sa.Integer(), nullable=True),
        sa.Column("altura_cm", sa.Float(), nullable=True),
        sa.Column("alcance_cm", sa.Float(), nullable=True),
        sa.Column("win_rate", sa.Float(), nullable=False, server_default="0"),
        sa.Column("ultimas_cinco", sa.String(length=10), nullable=False, server_default=""),
        sa.Column("significant_strikes_pm", sa.Float(), nullable=False, server_default="0"),
        sa.Column("takedown_accuracy", sa.Float(), nullable=False, server_default="0"),
        sa.Column("takedown_defense", sa.Float(), nullable=False, server_default="0"),
        sa.Column("estadisticas", sa.JSON(), nullable=True),
        sa.Column("fuente_externa_id", sa.String(length=80), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("nombre"),
        sa.UniqueConstraint("fuente_externa_id"),
    )
    op.create_index(op.f("ix_peleadores_id"), "peleadores", ["id"], unique=False)
    op.create_index(op.f("ix_peleadores_nombre"), "peleadores", ["nombre"], unique=True)

    op.create_table(
        "peleas",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("evento_id", sa.Integer(), nullable=False),
        sa.Column("peleador_rojo_id", sa.Integer(), nullable=False),
        sa.Column("peleador_azul_id", sa.Integer(), nullable=False),
        sa.Column("division", sa.String(length=80), nullable=False, server_default=""),
        sa.Column("estado", sa.String(length=30), nullable=False, server_default="programada"),
        sa.Column("orden", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("notas", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["evento_id"], ["eventos.id"]),
        sa.ForeignKeyConstraint(["peleador_rojo_id"], ["peleadores.id"]),
        sa.ForeignKeyConstraint(["peleador_azul_id"], ["peleadores.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_peleas_id"), "peleas", ["id"], unique=False)
    op.create_index(op.f("ix_peleas_evento_id"), "peleas", ["evento_id"], unique=False)

    # ── 2. Columnas faltantes en usuarios (solo agregar si no existen) ────────
    columnas_existentes = {
        row[0]
        for row in conn.execute(
            sa.text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'usuarios'"
            )
        )
    }
    if "cedula" not in columnas_existentes:
        op.add_column("usuarios", sa.Column("cedula", sa.String(length=30), nullable=True))
    if "fecha_nacimiento" not in columnas_existentes:
        op.add_column("usuarios", sa.Column("fecha_nacimiento", sa.DateTime(), nullable=True))
    if "acepta_terminos" not in columnas_existentes:
        op.add_column(
            "usuarios",
            sa.Column("acepta_terminos", sa.Boolean(), nullable=False, server_default=sa.false()),
        )

    # ── 3. Tablas faltantes ───────────────────────────────────────────────────
    tablas_existentes = {
        row[0]
        for row in conn.execute(
            sa.text(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'public'"
            )
        )
    }

    if "billeteras" not in tablas_existentes:
        op.create_table(
            "billeteras",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("usuario_id", sa.Integer(), nullable=False),
            sa.Column("saldo", sa.Float(), nullable=False, server_default="0"),
            sa.Column("moneda", sa.String(length=10), nullable=False, server_default="USD"),
            sa.Column("actualizado_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("usuario_id"),
        )
        op.create_index(op.f("ix_billeteras_id"), "billeteras", ["id"], unique=False)
        op.create_index(op.f("ix_billeteras_usuario_id"), "billeteras", ["usuario_id"], unique=True)

    if "recargas" not in tablas_existentes:
        op.create_table(
            "recargas",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("usuario_id", sa.Integer(), nullable=False),
            sa.Column("stripe_session_id", sa.String(length=255), nullable=False),
            sa.Column("monto", sa.Float(), nullable=False),
            sa.Column("estado", sa.String(length=40), nullable=False, server_default="completado"),
            sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("stripe_session_id"),
        )
        op.create_index(op.f("ix_recargas_id"), "recargas", ["id"], unique=False)
        op.create_index(op.f("ix_recargas_usuario_id"), "recargas", ["usuario_id"], unique=False)
        op.create_index(op.f("ix_recargas_stripe_session_id"), "recargas", ["stripe_session_id"], unique=True)

    if "codigos_autenticacion" not in tablas_existentes:
        op.create_table(
            "codigos_autenticacion",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("correo", sa.String(length=255), nullable=False),
            sa.Column("proposito", sa.String(length=30), nullable=False),
            sa.Column("codigo_hash", sa.String(length=128), nullable=False),
            sa.Column("payload", sa.JSON(), nullable=True),
            sa.Column("usado", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("expira_en", sa.DateTime(timezone=True), nullable=False),
            sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_codigos_autenticacion_id"), "codigos_autenticacion", ["id"], unique=False)
        op.create_index(op.f("ix_codigos_autenticacion_correo"), "codigos_autenticacion", ["correo"], unique=False)
        op.create_index(op.f("ix_codigos_autenticacion_proposito"), "codigos_autenticacion", ["proposito"], unique=False)


def downgrade() -> None:
    op.drop_table("codigos_autenticacion")
    op.drop_table("recargas")
    op.drop_table("billeteras")

    op.drop_column("usuarios", "acepta_terminos")
    op.drop_column("usuarios", "fecha_nacimiento")
    op.drop_column("usuarios", "cedula")

    op.drop_index("ix_peleas_evento_id", table_name="peleas")
    op.drop_index("ix_peleas_id", table_name="peleas")
    op.drop_table("peleas")
    op.drop_index("ix_peleadores_nombre", table_name="peleadores")
    op.drop_index("ix_peleadores_id", table_name="peleadores")
    op.drop_table("peleadores")
