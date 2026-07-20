from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, func
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
    ver_pronostico: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
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

    @property
    def porcentaje_retiro(self) -> float | None:
        """Porcentaje a devolver mientras la apuesta siga disponible para retiro."""
        if self.estado != "Pendiente":
            return None
        return 0.70 if self.pelea.estado == "en_curso" else 0.90

    @property
    def monto_reembolso(self) -> float | None:
        porcentaje = self.porcentaje_retiro
        return round(self.monto * porcentaje, 2) if porcentaje is not None else None
