from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.base_de_datos import obtener_db
from app.eventos.schemas import (
    EventoDetalle,
    EventoResumen,
    ResultadoEntrada,
    ResultadoSalida,
    SincronizacionRespuesta,
)
from app.eventos.service import listar_eventos, obtener_evento, registrar_resultado, sincronizar_eventos_mma

router = APIRouter(prefix="/eventos", tags=["eventos"])


@router.get("", response_model=list[EventoResumen])
def listar_eventos_endpoint(db: Session = Depends(obtener_db)) -> list[EventoResumen]:
    return listar_eventos(db)


@router.post("/sincronizar", response_model=SincronizacionRespuesta)
def sincronizar_eventos_endpoint(db: Session = Depends(obtener_db)) -> SincronizacionRespuesta:
    return sincronizar_eventos_mma(db)


@router.get("/{evento_id}", response_model=EventoDetalle)
def obtener_evento_endpoint(evento_id: int, db: Session = Depends(obtener_db)) -> EventoDetalle:
    return obtener_evento(db, evento_id)


@router.post("/peleas/{pelea_id}/resultado", response_model=ResultadoSalida)
def registrar_resultado_endpoint(
    pelea_id: int,
    payload: ResultadoEntrada,
    db: Session = Depends(obtener_db),
) -> ResultadoSalida:
    return registrar_resultado(db, pelea_id, payload)
