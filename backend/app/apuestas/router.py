from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.apuestas.schemas import ApuestaEntrada, ApuestaResumen
from app.apuestas.service import crear_apuesta, listar_historial
from app.auth.dependencias import obtener_usuario_actual
from app.core.base_de_datos import obtener_db
from app.usuarios.models import Usuario

router = APIRouter(prefix="/apuestas", tags=["apuestas"])


@router.post("", response_model=ApuestaResumen)
def crear_apuesta_endpoint(
    payload: ApuestaEntrada,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(obtener_db),
) -> ApuestaResumen:
    return crear_apuesta(db, usuario_actual, payload)


@router.get("/historial", response_model=list[ApuestaResumen])
def listar_historial_endpoint(
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(obtener_db),
) -> list[ApuestaResumen]:
    return listar_historial(db, usuario_actual)
