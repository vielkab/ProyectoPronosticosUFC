from __future__ import annotations

from sqlalchemy import Column, Float, Integer, JSON, String

from app.core.base import Base


class Peleador(Base):
    __tablename__ = "peleadores"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(140), unique=True, nullable=False, index=True)

    # Datos demográficos
    division: str = Column(String(80), nullable=False, default="")
    pais: str = Column(String(80), nullable=False, default="")
    record: str = Column(String(40), nullable=False, default="")
    edad = Column(Integer, nullable=True)
    altura_cm = Column(Float, nullable=True)
    alcance_cm = Column(Float, nullable=True)

    # Estadísticas para el motor de pronósticos
    win_rate = Column(Float, nullable=False, default=0.0)
    ultimas_cinco: str = Column(String(10), nullable=False, default="")
    significant_strikes_pm = Column(Float, nullable=False, default=0.0)
    takedown_accuracy = Column(Float, nullable=False, default=0.0)
    takedown_defense = Column(Float, nullable=False, default=0.0)

    # Estadísticas extendidas (JSON libre para datos de la API)
    estadisticas = Column(JSON, nullable=True)

    # Referencia a la fuente externa (API-Sports)
    fuente_externa_id: str | None = Column(String(80), unique=True, nullable=True)
