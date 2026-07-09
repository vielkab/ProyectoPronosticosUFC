from fastapi import APIRouter

from app.eventos.schemas import EventoResumen

router = APIRouter(prefix="/eventos", tags=["eventos"])


@router.get("", response_model=list[EventoResumen])
def listar_eventos() -> list[EventoResumen]:
    return [
        EventoResumen(
            id=1,
            nombre="UFC Demo Fight Night",
            fecha="2026-07-20",
            sede="Las Vegas",
        )
    ]
