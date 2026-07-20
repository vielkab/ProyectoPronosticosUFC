from __future__ import annotations
from sqlalchemy.orm import Session

from app.usuarios.models import Usuario
from app.usuarios.schemas import UsuarioPublico

def construir_perfil_usuario_autenticado(usuario: Usuario) -> dict:
    """
    Toma el usuario validado (ya sea existente o creado por el flujo JIT de Clerk)
    y lo transforma en un diccionario seguro listo para el frontend.
    """
    usuario_publico = UsuarioPublico.model_validate(usuario)
    
    return {
        "autenticado": True,
        "usuario": {
            "id": usuario_publico.id,
            "nombre": usuario_publico.nombre,
            "correo": usuario_publico.correo,
            "rol": usuario_publico.rol,
            "activo": usuario.activo,
            "cedula": usuario.cedula,
            "fecha_nacimiento": usuario.fecha_nacimiento,
        }
    }


def eliminar_cuenta_usuario(db: Session, usuario: Usuario) -> dict:
    """Elimina la cuenta del usuario actual y retorna un mensaje de confirmación."""
    db.delete(usuario)
    db.commit()

    return {
        "mensaje": "Cuenta eliminada correctamente.",
    }