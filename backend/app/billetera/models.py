from __future__ import annotations

from datetime import datetime

from sqlalchemy import Float, ForeignKey, String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base


class Billetera(Base):
    __tablename__ = "billeteras"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), unique=True, nullable=False, index=True)
    saldo: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    moneda: Mapped[str] = mapped_column(String(10), nullable=False, default="USD")
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    usuario = relationship("Usuario", back_populates="billetera")


class Recarga(Base):
    __tablename__ = "recargas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False, index=True)
    stripe_session_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    monto: Mapped[float] = mapped_column(Float, nullable=False)
    estado: Mapped[str] = mapped_column(String(40), nullable=False, default="completado")
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    usuario = relationship("Usuario")

