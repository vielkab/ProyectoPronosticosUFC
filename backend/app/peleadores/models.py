from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class Peleador(Base):
    __tablename__ = "peleadores"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(140), nullable=False, unique=True, index=True)
    division: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    pais: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    record: Mapped[str] = mapped_column(String(40), nullable=False, default="0-0-0")
    edad: Mapped[int | None] = mapped_column(nullable=True)
    altura_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    alcance_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    win_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)
    ultimas_cinco: Mapped[str] = mapped_column(String(5), nullable=False, default="")
    significant_strikes_pm: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    takedown_accuracy: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    takedown_defense: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    estadisticas: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    fuente_externa_id: Mapped[str | None] = mapped_column(String(80), unique=True, nullable=True)
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
