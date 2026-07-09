from fastapi import APIRouter, Query

from app.peleadores.schemas import PeleadorResumen

router = APIRouter(prefix="/peleadores", tags=["peleadores"])


@router.get("", response_model=list[PeleadorResumen])
def listar_peleadores(busqueda: str | None = Query(default=None)) -> list[PeleadorResumen]:
    return [
        PeleadorResumen(
            id=1,
            nombre="Peleador Demo",
            division="Ligero",
            pais="Ecuador",
            busqueda=busqueda,
        )
    ]


@router.get("/{peleador_id}", response_model=PeleadorResumen)
def obtener_peleador(peleador_id: int) -> PeleadorResumen:
    return PeleadorResumen(
        id=peleador_id,
        nombre="Peleador Demo",
        division="Ligero",
        pais="Ecuador",
        busqueda=None,
    )
