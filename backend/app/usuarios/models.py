from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base


class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = (UniqueConstraint("nombre", name="uq_usuarios_nombre"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    # Identificador único de Clerk para interceptar la sesión JIT
    clerk_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    
    nombre: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)
    correo: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    
    # Lo cambiamos a nullable=True para no romper registros antiguos durante la migración
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    rol: Mapped[str] = mapped_column(String(30), nullable=False, default="usuario")
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    
    # Campos de verificación de edad e identidad que ya tenías
    cedula: Mapped[str | None] = mapped_column(String(30), unique=True, nullable=True)
    fecha_nacimiento: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    acepta_terminos: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relación con la billetera intacta para la gestión de saldo
    billetera = relationship("Billetera", back_populates="usuario", uselist=False, cascade="all, delete-orphan")