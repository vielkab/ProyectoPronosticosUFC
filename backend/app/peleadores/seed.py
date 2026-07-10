from pathlib import Path
import re

import pandas as pd

from app.core.base_de_datos import SesionLocal
from app.peleadores.models import Peleador


def poblar_peleadores():

    db = SesionLocal()

    try:

        # Si ya existen peleadores, salir
        if db.query(Peleador).first():
            return

        csv_path = (
            Path(__file__).parent.parent.parent
            / "datasets"
            / "fighter_dataset_enriched.csv"
        )

        df = pd.read_csv(csv_path)
        df = df.drop_duplicates(subset=["Fighter_Name"], keep="first")

        for _, row in df.iterrows():

            peleador = Peleador(
                nombre=row["Fighter_Name"],
                altura_cm=_to_medida_cm(row["Height"], tipo="altura"),
                alcance_cm=_to_medida_cm(row["Reach"], tipo="alcance"),
                victorias=_to_int(row["Wins"]),
                derrotas=_to_int(row["Losses"]),
                empates=_to_int(row["Draws"]),
                wins_dq=_to_int(row["Wins_DQ"]),
                striking_accuracy=_to_porcentaje(row["Str_Acc"]),
                striking_defense=_to_porcentaje(row["Str_Def"]),
                wins_ko_tko=_to_int(row["Wins_KO_TKO"]),
                wins_submission=_to_int(row["Wins_Submission"]),
                wins_decision=_to_int(row["Wins_Decision"]),
                wins_round_1=_to_int(row["Wins_Round_1"]),
                wins_round_2=_to_int(row["Wins_Round_2"]),
                wins_round_3=_to_int(row["Wins_Round_3"]),
                wins_round_4=_to_int(row["Wins_Round_4"]),
                wins_round_5=_to_int(row["Wins_Round_5"]),
            )

            db.add(peleador)

        db.commit()

    finally:
        db.close()


def _to_int(value):
    if value is None or value == "":
        return None

    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _to_porcentaje(value):
    if value is None or value == "":
        return None

    try:
        texto = str(value).strip()
        numero = float(texto.replace("%", ""))
        return numero / 100 if "%" in texto else numero
    except (TypeError, ValueError):
        return None


def _to_medida_cm(value, tipo: str):
    if value is None or value == "":
        return None

    if isinstance(value, (int, float)):
        return float(value)

    texto = str(value).strip().lower()
    if not texto:
        return None

    numero = _to_float_or_none(texto.replace("cm", "").strip())
    if numero is not None and ("cm" in texto or numero > 90):
        return round(numero, 1)

    pulgadas = _medida_api_sports_a_pulgadas(texto, tipo)
    if pulgadas is None:
        return numero

    return round(pulgadas * 2.54, 1)


def _medida_api_sports_a_pulgadas(texto: str, tipo: str):
    numeros = [float(valor) for valor in re.findall(r"\d+(?:\.\d+)?", texto)]
    if not numeros:
        return None

    if "ft" in texto or "'" in texto:
        if tipo == "altura" and len(numeros) >= 2 and numeros[0] <= 8:
            return numeros[0] * 12 + numeros[1]
        return numeros[0]

    if "in" in texto or '"' in texto:
        return numeros[0]

    return None


def _to_float_or_none(value):
    if value is None or value == "":
        return None

    try:
        texto = str(value).strip()
        return float(texto.replace("%", "")) / (100 if "%" in texto else 1)
    except (TypeError, ValueError):
        return None