from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.eventos.models import Pelea
from app.eventos.service import _asegurar_datos_demo
from app.peleadores.models import Peleador
from app.predicciones.models import Prediccion
from app.predicciones.schemas import FactorPrediccion, PrediccionCombate


PESOS_FACTORES = {
    "win_rate": 0.28,
    "ultimas_cinco": 0.20,
    "significant_strikes_pm": 0.16,
    "takedown_accuracy": 0.14,
    "takedown_defense": 0.14,
    "alcance_cm": 0.04,
    "edad": 0.04,
}


def _racha_reciente(ultimas_cinco: str) -> float:
    resultados = [letra for letra in ultimas_cinco.upper() if letra in {"W", "L"}][:5]
    if not resultados:
        return 0.5
    return resultados.count("W") / len(resultados)


def _normalizar_par(valor_a: float, valor_b: float) -> tuple[float, float]:
    total = max(valor_a + valor_b, 0.0001)
    return valor_a / total, valor_b / total


def _valor_factor(peleador: Peleador, nombre: str) -> float:
    if nombre == "ultimas_cinco":
        return _racha_reciente(peleador.ultimas_cinco)
    if nombre == "edad":
        if peleador.edad is None:
            return 0.5
        return max(0.0, 1 - abs(peleador.edad - 30) / 20)
    valor = getattr(peleador, nombre)
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

    factores, prob_rojo, prob_azul = _calcular_factores(rojo, azul)
    prob_rojo_pct = round(prob_rojo * 100, 2)
    prob_azul_pct = round(100 - prob_rojo_pct, 2)
    favorito = rojo.nombre if prob_rojo_pct >= prob_azul_pct else azul.nombre
    explicacion = (
        "Prediccion heuristica sin Machine Learning. "
        f"Se ponderan win rate, forma reciente, striking, derribos, defensa, alcance y edad. "
        f"El favorito estadistico es {favorito}."
    )

    prediccion = db.scalar(select(Prediccion).where(Prediccion.pelea_id == pelea_id))
    factores_json = [factor.model_dump() for factor in factores]
    if prediccion:
        prediccion.probabilidad_rojo = prob_rojo_pct
        prediccion.probabilidad_azul = prob_azul_pct
        prediccion.factores = {"items": factores_json}
        prediccion.explicacion = explicacion
    else:
        prediccion = Prediccion(
            pelea_id=pelea_id,
            probabilidad_rojo=prob_rojo_pct,
            probabilidad_azul=prob_azul_pct,
            factores={"items": factores_json},
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
        factores=factores,
        explicacion=explicacion,
    )
