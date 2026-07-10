from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, JSON, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base


class Prediccion(Base):
    __tablename__ = "predicciones"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    pelea_id: Mapped[int] = mapped_column(ForeignKey("peleas.id"), nullable=False, unique=True, index=True)
    probabilidad_rojo: Mapped[float] = mapped_column(Float, nullable=False)
    probabilidad_azul: Mapped[float] = mapped_column(Float, nullable=False)
    cuota_rojo: Mapped[float | None] = mapped_column(Float, nullable=True)
    cuota_azul: Mapped[float | None] = mapped_column(Float, nullable=True)
    factores: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    explicacion: Mapped[str] = mapped_column(Text, nullable=False)
    acertada: Mapped[bool | None] = mapped_column(nullable=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    pelea = relationship("Pelea")
