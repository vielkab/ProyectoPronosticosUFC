from fastapi import APIRouter, Depends
from httpcore import request
from sqlalchemy.orm import Session

from app.core.base_de_datos import obtener_db
from app.predicciones.schemas import PrediccionCombate
from app.predicciones.service import obtener_prediccion
from backend.ml.predictor import build_features
from backend.ml.modelo import modelo_ganador, modelo_metodo, modelo_round

router = APIRouter(tags=["predicciones"])


@router.get("/predicciones/{pelea_id}", response_model=PrediccionCombate)
def obtener_prediccion(pelea_id: int):

    pelea = build_features(
        request.peleador_a,
        request.peleador_b
    )

    winner = modelo_ganador.predict_proba(pelea)[0]

    method = modelo_metodo.predict_proba(pelea)[0]

    rounds = modelo_round.predict_proba(pelea)[0]

    return {

        "winner":winner.tolist(),

        "method":method.tolist(),

        "round":rounds.tolist()

    }

@router.get("/predictions/{fight_id}", response_model=PrediccionCombate)
def obtener_prediccion_alias_endpoint(
    fight_id: int,
    db: Session = Depends(obtener_db),
) -> PrediccionCombate:
    return obtener_prediccion(db, fight_id)
