from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.schemas import MensajeAuth
from app.auth.service import eliminar_cuenta_usuario
from app.auth.dependencias import obtener_usuario_actual
from app.core.base_de_datos import obtener_db
from app.usuarios.models import Usuario
from app.usuarios.schemas import PerfilUsuario

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


@router.get("/yo", response_model=PerfilUsuario)
def obtener_mi_perfil(usuario_actual: Usuario = Depends(obtener_usuario_actual)) -> PerfilUsuario:
    return PerfilUsuario.model_validate(usuario_actual)


@router.delete("/yo", response_model=MensajeAuth)
def eliminar_mi_cuenta(
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(obtener_db),
) -> MensajeAuth:
    return eliminar_cuenta_usuario(db=db, usuario=usuario_actual)
