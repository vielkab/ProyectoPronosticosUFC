from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.base_de_datos import obtener_db
from app.core.seguridad import decodificar_token
from app.usuarios.models import Usuario

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def obtener_usuario_actual(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(obtener_db),
) -> Usuario:
    try:
        payload = decodificar_token(token)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado.",
        ) from error

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de acceso inválido.",
        )

    usuario_id = payload.get("sub")
    if not usuario_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se pudo validar la sesión.",
        )

    usuario = db.get(Usuario, int(usuario_id))
    if not usuario or not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no autorizado.",
        )

    return usuario
