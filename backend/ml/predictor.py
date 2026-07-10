"""Carga y ejecución segura de los modelos de predicción.

Este módulo no carga artefactos al importarse.  Así la API puede iniciar aun
cuando el modelo todavía no haya sido entrenado, y el servicio puede usar su
estimación explicable como respaldo.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any, Mapping

import pandas as pd
from joblib import load


FEATURES = [
    "delta_height", "delta_reach", "delta_wins", "delta_losses",
    "delta_draws", "delta_str_acc", "delta_str_def", "delta_ko",
    "delta_sub", "delta_decision", "delta_r1", "delta_r2", "delta_r3",
    "delta_r4", "delta_r5",
]

_ROOT = Path(__file__).resolve().parent
_MODEL_CANDIDATES = {
    "winner": (_ROOT / "models" / "winner_model.joblib", _ROOT / "modelo" / "modelo_ganador.joblib"),
    "method": (_ROOT / "models" / "method_model.joblib", _ROOT / "modelo" / "modelo_metodo.joblib"),
    "round": (_ROOT / "models" / "round_model.joblib", _ROOT / "modelo" / "modelo_round.joblib"),
}
_ENCODER_CANDIDATES = {
    "method": (_ROOT / "models" / "method_label_encoder.joblib",),
    "round": (_ROOT / "models" / "round_label_encoder.joblib",),
}


class ModeloNoDisponible(RuntimeError):
    """El artefacto entrenado no está disponible o no puede leerse."""


def _numero(fighter: Mapping[str, Any] | Any, campo: str) -> float:
    valor = fighter.get(campo) if isinstance(fighter, Mapping) else getattr(fighter, campo, None)
    return float(valor or 0.0)


def build_features(fighter_a: Mapping[str, Any] | Any, fighter_b: Mapping[str, Any] | Any) -> pd.DataFrame:
    """Construye exactamente las variables usadas durante el entrenamiento."""
    campos = {
        "height": "altura_cm", "reach": "alcance_cm", "wins": "victorias",
        "losses": "derrotas", "draws": "empates", "str_acc": "striking_accuracy",
        "str_def": "striking_defense", "ko": "wins_ko_tko", "sub": "wins_submission",
        "decision": "wins_decision", "r1": "wins_round_1", "r2": "wins_round_2",
        "r3": "wins_round_3", "r4": "wins_round_4", "r5": "wins_round_5",
    }
    data = {
        f"delta_{destino}": _numero(fighter_a, origen) - _numero(fighter_b, origen)
        for destino, origen in campos.items()
    }
    return pd.DataFrame([data], columns=FEATURES)


def _cargar_primero(candidatos: tuple[Path, ...], nombre: str) -> Any:
    errores: list[str] = []
    for ruta in candidatos:
        if not ruta.is_file():
            continue
        try:
            return load(ruta)
        except Exception as exc:  # Un archivo mal copiado no debe derribar la API.
            errores.append(f"{ruta.name}: {exc}")
    detalle = "; ".join(errores) or "no se encontró ningún archivo de modelo"
    raise ModeloNoDisponible(f"Modelo {nombre} no disponible: {detalle}")


@lru_cache(maxsize=None)
def obtener_modelo(nombre: str) -> Any:
    if nombre not in _MODEL_CANDIDATES:
        raise ValueError(f"Modelo desconocido: {nombre}")
    return _cargar_primero(_MODEL_CANDIDATES[nombre], nombre)


@lru_cache(maxsize=None)
def _obtener_encoder(nombre: str) -> Any:
    return _cargar_primero(_ENCODER_CANDIDATES[nombre], f"encoder {nombre}")


def modelo_ganador_disponible() -> bool:
    try:
        obtener_modelo("winner")
    except ModeloNoDisponible:
        return False
    return True


def predecir_ganador(fighter_a: Mapping[str, Any] | Any, fighter_b: Mapping[str, Any] | Any) -> tuple[float, float]:
    """Devuelve las probabilidades de A y B, sin depender del orden de clases."""
    modelo = obtener_modelo("winner")
    probabilidades = modelo.predict_proba(build_features(fighter_a, fighter_b))[0]
    por_clase = dict(zip(modelo.classes_, probabilidades))
    prob_a = float(por_clase.get(1, por_clase.get("1", 0.0)))
    prob_b = float(por_clase.get(0, por_clase.get("0", 1.0 - prob_a)))
    return prob_a, prob_b


def probability_to_odds(probability: float, margin: float = 0.07) -> float | None:
    return None if probability <= 0 else round((1 / probability) * (1 - margin), 2)


def predict(fighter_a: Mapping[str, Any] | Any, fighter_b: Mapping[str, Any] | Any) -> dict[str, Any]:
    """Predicción completa para usos no HTTP; método y round son opcionales."""
    prob_a, prob_b = predecir_ganador(fighter_a, fighter_b)
    resultado: dict[str, Any] = {
        "winner": {
            "fighter_a_probability": prob_a, "fighter_b_probability": prob_b,
            "fighter_a_odds": probability_to_odds(prob_a), "fighter_b_odds": probability_to_odds(prob_b),
        }
    }
    caracteristicas = build_features(fighter_a, fighter_b)
    for nombre in ("method", "round"):
        try:
            modelo = obtener_modelo(nombre)
            encoder = _obtener_encoder(nombre)
            etiquetas = encoder.inverse_transform(modelo.classes_)
            resultado[nombre] = {
                str(etiqueta): {"probability": float(prob), "odds": probability_to_odds(float(prob))}
                for etiqueta, prob in zip(etiquetas, modelo.predict_proba(caracteristicas)[0])
            }
        except ModeloNoDisponible:
            continue
    return resultado
