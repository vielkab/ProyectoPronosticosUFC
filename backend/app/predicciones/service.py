from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.eventos.models import Pelea
from app.peleadores.models import Peleador
from app.predicciones.models import Prediccion
from app.predicciones.schemas import FactorPrediccion, PrediccionCombate

# Margen de la casa para calcular cuotas (7%)
_MARGEN_CASA = 0.07
# Descuento por ver pronóstico (10%)
DESCUENTO_VER_PRONOSTICO = 0.10

# Pesos usando los campos reales del modelo Peleador actual
PESOS_FACTORES = {
    "win_rate": 0.30,
    "ultimas_cinco": 0.20,
    "significant_strikes_pm": 0.16,
    "takedown_accuracy": 0.14,
    "takedown_defense": 0.14,
    "alcance_cm": 0.04,
    "edad": 0.02,
}


def calcular_cuota(probabilidad: float) -> float:
    """Convierte probabilidad (0-1) a cuota decimal con margen de casa."""
    if probabilidad <= 0:
        return 10.0  # cuota máxima si prob es 0
    cuota_justa = 1.0 / probabilidad
    return round(cuota_justa * (1 - _MARGEN_CASA), 2)


def _racha_reciente(ultimas_cinco: str) -> float:
    resultados = [c for c in ultimas_cinco.upper() if c in {"W", "L"}][:5]
    if not resultados:
        return 0.5
    return resultados.count("W") / len(resultados)


def _normalizar_par(valor_a: float, valor_b: float) -> tuple[float, float]:
    total = valor_a + valor_b
    if total <= 0:
        return 0.5, 0.5
    return valor_a / total, valor_b / total


def _valor_factor(peleador: Peleador, nombre: str) -> float:
    if nombre == "ultimas_cinco":
        return _racha_reciente(peleador.ultimas_cinco or "")
    if nombre == "edad":
        if peleador.edad is None:
            return 0.5
        # Pico de rendimiento alrededor de 30 años
        return max(0.0, 1 - abs(peleador.edad - 30) / 20)
    valor = getattr(peleador, nombre, None)
    return float(valor or 0.0)


def _calcular_factores(rojo: Peleador, azul: Peleador) -> tuple[list[FactorPrediccion], float, float]:
    factores: list[FactorPrediccion] = []
    puntaje_rojo = 0.0
    puntaje_azul = 0.0

    for nombre, peso in PESOS_FACTORES.items():
        valor_rojo = _valor_factor(rojo, nombre)
        valor_azul = _valor_factor(azul, nombre)
        norm_rojo, norm_azul = _normalizar_par(valor_rojo, valor_azul)
        puntaje_rojo += norm_rojo * peso
        puntaje_azul += norm_azul * peso
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
    pelea = db.get(Pelea, pelea_id)
    if not pelea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pelea no encontrada.")

    rojo = db.get(Peleador, pelea.peleador_rojo_id)
    azul = db.get(Peleador, pelea.peleador_azul_id)
    if not rojo or not azul:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La pelea no tiene peleadores válidos para calcular predicción.",
        )

    factores, prob_rojo, prob_azul = _calcular_factores(rojo, azul)
    prob_rojo_pct = round(prob_rojo * 100, 2)
    prob_azul_pct = round(100 - prob_rojo_pct, 2)

    # Calcular cuotas desde probabilidades
    cuota_rojo = calcular_cuota(prob_rojo)
    cuota_azul = calcular_cuota(prob_azul)
    cuota_rojo_con_pronostico = round(cuota_rojo * (1 - DESCUENTO_VER_PRONOSTICO), 2)
    cuota_azul_con_pronostico = round(cuota_azul * (1 - DESCUENTO_VER_PRONOSTICO), 2)

    favorito = rojo.nombre if prob_rojo_pct >= prob_azul_pct else azul.nombre
    explicacion = (
        "Predicción heurística basada en win rate, forma reciente, striking, "
        f"derribos, defensa, alcance y edad. El favorito estadístico es {favorito}."
    )

    prediccion = db.scalar(select(Prediccion).where(Prediccion.pelea_id == pelea_id))
    factores_json = [f.model_dump() for f in factores]
    if prediccion:
        prediccion.probabilidad_rojo = prob_rojo_pct
        prediccion.probabilidad_azul = prob_azul_pct
        prediccion.cuota_rojo = cuota_rojo
        prediccion.cuota_azul = cuota_azul
        prediccion.factores = {"items": factores_json}
        prediccion.explicacion = explicacion
    else:
        prediccion = Prediccion(
            pelea_id=pelea_id,
            probabilidad_rojo=prob_rojo_pct,
            probabilidad_azul=prob_azul_pct,
            cuota_rojo=cuota_rojo,
            cuota_azul=cuota_azul,
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
        cuota_rojo=cuota_rojo,
        cuota_azul=cuota_azul,
        cuota_rojo_con_pronostico=cuota_rojo_con_pronostico,
        cuota_azul_con_pronostico=cuota_azul_con_pronostico,
        factores=factores,
        explicacion=explicacion,
        method={},
        round={},
        method_disponible=False,
        round_disponible=False,
    )
