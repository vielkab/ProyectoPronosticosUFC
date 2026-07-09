from fastapi import APIRouter

from app.predicciones.schemas import PrediccionCombate

router = APIRouter(prefix="/predicciones", tags=["predicciones"])


@router.get("/{pelea_id}", response_model=PrediccionCombate)
def obtener_prediccion(pelea_id: int) -> PrediccionCombate:
    return PrediccionCombate(pelea_id=pelea_id, peleador_a=64, peleador_b=36)
