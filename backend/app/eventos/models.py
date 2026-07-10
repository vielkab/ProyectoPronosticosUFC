from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base

if TYPE_CHECKING:
    from app.peleadores.models import Peleador


class Evento(Base):
    __tablename__ = "eventos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    fecha: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    sede: Mapped[str] = mapped_column(String(160), nullable=False, default="")
    estado: Mapped[str] = mapped_column(String(30), nullable=False, default="programado")
    fuente_externa_id: Mapped[str | None] = mapped_column(String(80), unique=True, nullable=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    peleas: Mapped[list["Pelea"]] = relationship(back_populates="evento", cascade="all, delete-orphan")


class Pelea(Base):
    __tablename__ = "peleas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    evento_id: Mapped[int] = mapped_column(ForeignKey("eventos.id"), nullable=False, index=True)
    peleador_rojo_id: Mapped[int] = mapped_column(ForeignKey("peleadores.id"), nullable=False)
    peleador_azul_id: Mapped[int] = mapped_column(ForeignKey("peleadores.id"), nullable=False)
    division: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    estado: Mapped[str] = mapped_column(String(30), nullable=False, default="programada")
    orden: Mapped[int] = mapped_column(nullable=False, default=0)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)

    evento: Mapped["Evento"] = relationship(back_populates="peleas")
    peleador_rojo: Mapped["Peleador"] = relationship(foreign_keys=[peleador_rojo_id])
    peleador_azul: Mapped["Peleador"] = relationship(foreign_keys=[peleador_azul_id])
    resultado: Mapped["Resultado | None"] = relationship(
        back_populates="pelea",
        cascade="all, delete-orphan",
        uselist=False,
    )


class Resultado(Base):
    __tablename__ = "resultados"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    pelea_id: Mapped[int] = mapped_column(ForeignKey("peleas.id"), nullable=False, unique=True, index=True)
    ganador_id: Mapped[int] = mapped_column(ForeignKey("peleadores.id"), nullable=False)
    metodo: Mapped[str] = mapped_column(String(60), nullable=False, default="")
    round: Mapped[int | None] = mapped_column(nullable=True)
    registrado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    pelea: Mapped["Pelea"] = relationship(back_populates="resultado")
    ganador: Mapped["Peleador"] = relationship(foreign_keys=[ganador_id])
