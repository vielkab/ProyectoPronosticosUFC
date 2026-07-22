from fastapi import APIRouter, Depends
from app.usuarios.models import Usuario
from app.auth.dependencias import obtener_usuario_actual

# 🟢 Se remueve el prefix="/auth" duplicado aquí para evitar la ruta /auth/auth/
router = APIRouter(tags=["auth"])

@router.get("/estado-sesion")
def verificar_estado_sesion(
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
) -> dict:
    """
    Endpoint rápido para que el frontend valide si el token enviado en los headers
    es correcto y retorne la información limpia guardada en PostgreSQL.
    """
    return {
        "autenticado": True,
        "usuario": {
            "id": usuario_actual.id,
            "nombre": usuario_actual.nombre,
            "correo": usuario_actual.correo,
            "rol": usuario_actual.rol,
            "activo": usuario_actual.activo
        }
    }