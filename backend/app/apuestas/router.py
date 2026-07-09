from fastapi import APIRouter

from app.apuestas.schemas import ApuestaResumen

router = APIRouter(prefix="/apuestas", tags=["apuestas"])


@router.post("", response_model=ApuestaResumen)
def crear_apuesta() -> ApuestaResumen:
    return ApuestaResumen(id=1, estado="Pendiente", monto=10.0, cuota=1.8)


@router.get("/historial", response_model=list[ApuestaResumen])
def listar_historial() -> list[ApuestaResumen]:
    return [ApuestaResumen(id=1, estado="Pendiente", monto=10.0, cuota=1.8)]
