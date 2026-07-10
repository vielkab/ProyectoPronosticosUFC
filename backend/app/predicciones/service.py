from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.eventos.models import Pelea
from app.eventos.service import _asegurar_datos_demo
from app.peleadores.models import Peleador
from app.predicciones.models import Prediccion
from app.predicciones.schemas import FactorPrediccion, PrediccionCombate
from ml.predictor import ModeloNoDisponible, predict


PESOS_FACTORES = {
    "win_rate": 0.30,
    "striking_accuracy": 0.18,
    "striking_defense": 0.16,
    "wins_ko_tko": 0.10,
    "wins_submission": 0.08,
    "alcance_cm": 0.10,
    "experiencia": 0.08,
}

def _normalizar_par(valor_a: float, valor_b: float) -> tuple[float, float]:
    total = valor_a + valor_b
    if total <= 0:
        return 0.5, 0.5
    return valor_a / total, valor_b / total


def _valor_factor(peleador: Peleador, nombre: str) -> float:
    if nombre == "win_rate":
        victorias = float(peleador.victorias or 0)
        total = victorias + float(peleador.derrotas or 0) + float(peleador.empates or 0)
        return victorias / total if total else 0.5
    if nombre == "experiencia":
        return float((peleador.victorias or 0) + (peleador.derrotas or 0) + (peleador.empates or 0))
    valor = getattr(peleador, nombre, 0.0)
    return float(valor or 0.0)


def _calcular_factores(rojo: Peleador, azul: Peleador) -> tuple[list[FactorPrediccion], float, float]:
    factores: list[FactorPrediccion] = []
    puntaje_rojo = 0.0
    puntaje_azul = 0.0

    for nombre, peso in PESOS_FACTORES.items():
        valor_rojo = _valor_factor(rojo, nombre)
        valor_azul = _valor_factor(azul, nombre)
        normalizado_rojo, normalizado_azul = _normalizar_par(valor_rojo, valor_azul)
        puntaje_rojo += normalizado_rojo * peso
        puntaje_azul += normalizado_azul * peso
        factores.append(
            FactorPrediccion(
                nombre=nombre,
                peleador_rojo=round(valor_rojo, 3),
                peleador_azul=round(valor_azul, 3),
                peso=peso,
            )
        )

    total = max(puntaje_rojo + puntaje_azul, 0.0001)
    return factores, puntaje_rojo / total, puntaje_azul / total


def obtener_prediccion(db: Session, pelea_id: int) -> PrediccionCombate:
    _asegurar_datos_demo(db)
    pelea = db.get(Pelea, pelea_id)
    if not pelea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pelea no encontrada.")

    rojo = db.get(Peleador, pelea.peleador_rojo_id)
    azul = db.get(Peleador, pelea.peleador_azul_id)
    if not rojo or not azul:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La pelea no tiene peleadores validos para calcular prediccion.",
        )

    factores, prob_rojo_heuristica, prob_azul_heuristica = _calcular_factores(rojo, azul)
    try:
        prediccion_modelo = predict(rojo, azul)
        ganador_modelo = prediccion_modelo["winner"]
        prob_rojo = ganador_modelo["fighter_a_probability"]
        prob_azul = ganador_modelo["fighter_b_probability"]
        metodos = prediccion_modelo.get("method", {})
        rounds = prediccion_modelo.get("round", {})
        origen = "modelo de Machine Learning"
    except ModeloNoDisponible:
        # La aplicación sigue operativa en instalaciones donde aún no se entrenó
        # el modelo; nunca se presenta esta estimación como ML.
        prob_rojo, prob_azul = prob_rojo_heuristica, prob_azul_heuristica
        metodos, rounds = {}, {}
        origen = "estimación estadística de respaldo"

    total_probabilidades = prob_rojo + prob_azul
    if total_probabilidades <= 0:
        prob_rojo, prob_azul = prob_rojo_heuristica, prob_azul_heuristica
        metodos, rounds = {}, {}
        origen = "estimación estadística de respaldo"
    else:
        prob_rojo /= total_probabilidades
        prob_azul /= total_probabilidades
    prob_rojo_pct = round(prob_rojo * 100, 2)
    prob_azul_pct = round(100 - prob_rojo_pct, 2)
    favorito = rojo.nombre if prob_rojo_pct >= prob_azul_pct else azul.nombre
    explicacion = (
        f"Predicción generada por {origen}. "
        "Los factores muestran récord, striking, métodos de victoria, alcance y experiencia. "
        f"El favorito estadistico es {favorito}."
    )
    if not metodos or not rounds:
        explicacion += " El modelo de método y/o round no está disponible todavía."

    prediccion = db.scalar(select(Prediccion).where(Prediccion.pelea_id == pelea_id))
    factores_json = [factor.model_dump() for factor in factores]
    if prediccion:
        prediccion.probabilidad_rojo = prob_rojo_pct
        prediccion.probabilidad_azul = prob_azul_pct
        prediccion.factores = {"items": factores_json, "method": metodos, "round": rounds}
        prediccion.explicacion = explicacion
    else:
        prediccion = Prediccion(
            pelea_id=pelea_id,
            probabilidad_rojo=prob_rojo_pct,
            probabilidad_azul=prob_azul_pct,
            factores={"items": factores_json, "method": metodos, "round": rounds},
            explicacion=explicacion,
        )
        db.add(prediccion)

    db.commit()

    return PrediccionCombate(
        pelea_id=pelea.id,
        peleador_rojo_id=pelea.peleador_rojo_id,
        peleador_azul_id=pelea.peleador_azul_id,
        probabilidad_rojo=prob_rojo_pct,
        probabilidad_azul=prob_azul_pct,
        method=metodos,
        round=rounds,
        method_disponible=bool(metodos),
        round_disponible=bool(rounds),
        factores=factores,
        explicacion=explicacion,
    )
