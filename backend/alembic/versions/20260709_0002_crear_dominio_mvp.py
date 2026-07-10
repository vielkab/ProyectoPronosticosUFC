"""crear dominio mvp

Revision ID: 20260709_0002
Revises: 20260708_0001
Create Date: 2026-07-09 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260709_0002"
down_revision = "20260708_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "peleadores",

        sa.Column("id", sa.Integer(), primary_key=True),

        sa.Column("nombre", sa.String(140), nullable=False, unique=True),

        sa.Column("altura_cm", sa.Float(), nullable=True),

        sa.Column("alcance_cm", sa.Float(), nullable=True),

        sa.Column("victorias", sa.Integer(), nullable=False),

        sa.Column("derrotas", sa.Integer(), nullable=False),

        sa.Column("empates", sa.Integer(), nullable=False),

        sa.Column("striking_accuracy", sa.Float(), nullable=True),

        sa.Column("striking_defense", sa.Float(), nullable=True),

        sa.Column("wins_ko_tko", sa.Integer(), nullable=False),

        sa.Column("wins_submission", sa.Integer(), nullable=False),

        sa.Column("wins_decision", sa.Integer(), nullable=False),

        sa.Column("wins_dq", sa.Integer(), nullable=False),

        sa.Column("wins_round_1", sa.Integer(), nullable=False),

        sa.Column("wins_round_2", sa.Integer(), nullable=False),

        sa.Column("wins_round_3", sa.Integer(), nullable=False),

        sa.Column("wins_round_4", sa.Integer(), nullable=False),

        sa.Column("wins_round_5", sa.Integer(), nullable=False),

        sa.Column("api_id", sa.Integer(), nullable=True, unique=True),

        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("api_id"),
        sa.UniqueConstraint("nombre"),
    )
    op.create_index(op.f("ix_peleadores_id"), "peleadores", ["id"], unique=False)
    op.create_index(op.f("ix_peleadores_nombre"), "peleadores", ["nombre"], unique=True)

    op.create_table(
        "eventos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=160), nullable=False),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("sede", sa.String(length=160), nullable=False),
        sa.Column("estado", sa.String(length=30), nullable=False),
        sa.Column("fuente_externa_id", sa.String(length=80), nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("fuente_externa_id"),
    )
    op.create_index(op.f("ix_eventos_fecha"), "eventos", ["fecha"], unique=False)
    op.create_index(op.f("ix_eventos_id"), "eventos", ["id"], unique=False)
    op.create_index(op.f("ix_eventos_nombre"), "eventos", ["nombre"], unique=False)

    op.create_table(
        "peleas",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("evento_id", sa.Integer(), nullable=False),
        sa.Column("peleador_rojo_id", sa.Integer(), nullable=False),
        sa.Column("peleador_azul_id", sa.Integer(), nullable=False),
        sa.Column("division", sa.String(length=80), nullable=False),
        sa.Column("estado", sa.String(length=30), nullable=False),
        sa.Column("orden", sa.Integer(), nullable=False),
        sa.Column("notas", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["evento_id"], ["eventos.id"]),
        sa.ForeignKeyConstraint(["peleador_azul_id"], ["peleadores.id"]),
        sa.ForeignKeyConstraint(["peleador_rojo_id"], ["peleadores.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_peleas_evento_id"), "peleas", ["evento_id"], unique=False)
    op.create_index(op.f("ix_peleas_id"), "peleas", ["id"], unique=False)

    op.create_table(
        "apuestas",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("pelea_id", sa.Integer(), nullable=False),
        sa.Column("peleador_seleccionado_id", sa.Integer(), nullable=False),
        sa.Column("metodo_victoria", sa.String(length=60), nullable=True),
        sa.Column("round", sa.Integer(), nullable=True),
        sa.Column("monto", sa.Float(), nullable=False),
        sa.Column("cuota", sa.Float(), nullable=False),
        sa.Column("estado", sa.String(length=30), nullable=False),
        sa.Column("estado_pago", sa.String(length=30), nullable=False),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("actualizado_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["pelea_id"], ["peleas.id"]),
        sa.ForeignKeyConstraint(["peleador_seleccionado_id"], ["peleadores.id"]),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_apuestas_id"), "apuestas", ["id"], unique=False)
    op.create_index(op.f("ix_apuestas_pelea_id"), "apuestas", ["pelea_id"], unique=False)
    op.create_index(op.f("ix_apuestas_usuario_id"), "apuestas", ["usuario_id"], unique=False)

    op.create_table(
        "predicciones",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("pelea_id", sa.Integer(), nullable=False),
        sa.Column("probabilidad_rojo", sa.Float(), nullable=False),
        sa.Column("probabilidad_azul", sa.Float(), nullable=False),
        sa.Column("factores", sa.JSON(), nullable=False),
        sa.Column("explicacion", sa.Text(), nullable=False),
        sa.Column("acertada", sa.Boolean(), nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["pelea_id"], ["peleas.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_predicciones_id"), "predicciones", ["id"], unique=False)
    op.create_index(op.f("ix_predicciones_pelea_id"), "predicciones", ["pelea_id"], unique=True)

    op.create_table(
        "resultados",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("pelea_id", sa.Integer(), nullable=False),
        sa.Column("ganador_id", sa.Integer(), nullable=False),
        sa.Column("metodo", sa.String(length=60), nullable=False),
        sa.Column("round", sa.Integer(), nullable=True),
        sa.Column("registrado_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["ganador_id"], ["peleadores.id"]),
        sa.ForeignKeyConstraint(["pelea_id"], ["peleas.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_resultados_id"), "resultados", ["id"], unique=False)
    op.create_index(op.f("ix_resultados_pelea_id"), "resultados", ["pelea_id"], unique=True)

    op.create_table(
        "transacciones",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("apuesta_id", sa.Integer(), nullable=False),
        sa.Column("stripe_session_id", sa.String(length=255), nullable=True),
        sa.Column("payment_intent", sa.String(length=255), nullable=True),
        sa.Column("estado", sa.String(length=40), nullable=False),
        sa.Column("monto", sa.Float(), nullable=False),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["apuesta_id"], ["apuestas.id"]),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("stripe_session_id"),
    )
    op.create_index(op.f("ix_transacciones_apuesta_id"), "transacciones", ["apuesta_id"], unique=False)
    op.create_index(op.f("ix_transacciones_id"), "transacciones", ["id"], unique=False)
    op.create_index(op.f("ix_transacciones_usuario_id"), "transacciones", ["usuario_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_transacciones_usuario_id"), table_name="transacciones")
    op.drop_index(op.f("ix_transacciones_id"), table_name="transacciones")
    op.drop_index(op.f("ix_transacciones_apuesta_id"), table_name="transacciones")
    op.drop_table("transacciones")
    op.drop_index(op.f("ix_resultados_pelea_id"), table_name="resultados")
    op.drop_index(op.f("ix_resultados_id"), table_name="resultados")
    op.drop_table("resultados")
    op.drop_index(op.f("ix_predicciones_pelea_id"), table_name="predicciones")
    op.drop_index(op.f("ix_predicciones_id"), table_name="predicciones")
    op.drop_table("predicciones")
    op.drop_index(op.f("ix_apuestas_usuario_id"), table_name="apuestas")
    op.drop_index(op.f("ix_apuestas_pelea_id"), table_name="apuestas")
    op.drop_index(op.f("ix_apuestas_id"), table_name="apuestas")
    op.drop_table("apuestas")
    op.drop_index(op.f("ix_peleas_id"), table_name="peleas")
    op.drop_index(op.f("ix_peleas_evento_id"), table_name="peleas")
    op.drop_table("peleas")
    op.drop_index(op.f("ix_eventos_nombre"), table_name="eventos")
    op.drop_index(op.f("ix_eventos_id"), table_name="eventos")
    op.drop_index(op.f("ix_eventos_fecha"), table_name="eventos")
    op.drop_table("eventos")
    op.drop_index(op.f("ix_peleadores_nombre"), table_name="peleadores")
    op.drop_index(op.f("ix_peleadores_id"), table_name="peleadores")
    op.drop_table("peleadores")
