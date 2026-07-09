from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.base_de_datos import obtener_db
from app.predicciones.schemas import PrediccionCombate
from app.predicciones.service import obtener_prediccion

router = APIRouter(tags=["predicciones"])


@router.get("/predicciones/{pelea_id}", response_model=PrediccionCombate)
def obtener_prediccion_endpoint(
    pelea_id: int,
    db: Session = Depends(obtener_db),
) -> PrediccionCombate:
    return obtener_prediccion(db, pelea_id)


@router.get("/predictions/{fight_id}", response_model=PrediccionCombate)
def obtener_prediccion_alias_endpoint(
    fight_id: int,
    db: Session = Depends(obtener_db),
) -> PrediccionCombate:
    return obtener_prediccion(db, fight_id)
