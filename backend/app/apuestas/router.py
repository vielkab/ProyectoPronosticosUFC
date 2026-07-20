from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.apuestas.schemas import ApuestaEntrada, ApuestaResumen
# Importamos las nuevas funciones aquí:
from app.apuestas.service import (
    cobrar_apuesta,
    crear_apuesta,
    listar_historial,
    procesar_resultados_pelea,
    obtener_estadisticas_usuario,
)
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


@router.post("/{apuesta_id}/cobrar", response_model=ApuestaResumen)
def cobrar_apuesta_endpoint(
    apuesta_id: int,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(obtener_db),
) -> ApuestaResumen:
    """Acredita una apuesta ganada una sola vez en la billetera del usuario."""
    return cobrar_apuesta(db, usuario_actual, apuesta_id)


# --- NUEVOS ENDPOINTS PARA TU PANEL Y LÓGICA DE APUESTAS ---

@router.get("/panel-estadisticas")
def mi_panel_estadisticas_endpoint(
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(obtener_db),
) -> dict:
    """
    Retorna el conteo de aciertos, fallos y efectividad del usuario logueado.
    """
    return obtener_estadisticas_usuario(db, usuario_actual)


@router.post("/resolver-pelea/{pelea_id}")
def resolver_apuestas_pelea_endpoint(
    pelea_id: int,
    peleador_ganador_id: int,
    db: Session = Depends(obtener_db),
) -> dict:
    """
    Endpoint administrativo para cerrar una pelea y calificar las apuestas.
    """
    return procesar_resultados_pelea(db, pelea_id, peleador_ganador_id)
