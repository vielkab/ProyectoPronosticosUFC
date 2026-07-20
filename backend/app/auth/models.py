from __future__ import annotations
from datetime import datetime
from sqlalchemy import Boolean, DateTime, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.base import Base

class CodigoAutenticacion(Base):
    """
    Tabla conservada para compatibilidad y auditoría histórica.
    Clerk gestiona los flujos activos de OTP, pero esta estructura permanece 
    disponible para futuros flujos de verificación internos de PronoStats.
    """
    __tablename__ = "codigos_autenticacion"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    correo: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    proposito: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    codigo_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    usado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    expira_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )