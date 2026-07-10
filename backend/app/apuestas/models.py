from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base


class Apuesta(Base):
    __tablename__ = "apuestas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False, index=True)
    pelea_id: Mapped[int] = mapped_column(ForeignKey("peleas.id"), nullable=False, index=True)
    peleador_seleccionado_id: Mapped[int] = mapped_column(ForeignKey("peleadores.id"), nullable=False)
    metodo_victoria: Mapped[str | None] = mapped_column(String(60), nullable=True)
    round: Mapped[int | None] = mapped_column(nullable=True)
    monto: Mapped[float] = mapped_column(Float, nullable=False)
    cuota: Mapped[float] = mapped_column(Float, nullable=False, default=1.8)
    estado: Mapped[str] = mapped_column(String(30), nullable=False, default="Pendiente")
    estado_pago: Mapped[str] = mapped_column(String(30), nullable=False, default="pendiente")
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    usuario = relationship("Usuario")
    pelea = relationship("Pelea")
    peleador_seleccionado = relationship("Peleador")
