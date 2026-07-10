import re

import pandas as pd

# Leer archivos
fighters = pd.read_csv("fighters.csv")
fights = pd.read_csv("fights.csv")


def parse_height(value):
    if pd.isna(value):
        return float("nan")

    text = str(value).strip()
    match = re.match(r"^(\d+)\s*'\s*(\d+(?:\.\d+)?)", text)
    if match:
        feet = int(match.group(1))
        inches = float(match.group(2))
        return feet * 12 + inches

    return float("nan")


def parse_float(value):
    if pd.isna(value):
        return float("nan")

    text = str(value).strip().replace('%', '').replace('"', '')
    try:
        return float(text)
    except ValueError:
        return float("nan")

# Calcular edad
fighters["DOB"] = pd.to_datetime(fighters["DOB"])

today = pd.Timestamp.today()

fighters["Age"] = (
    (today - fighters["DOB"]).dt.days / 365.25
)

# Filtrar
fighters = fighters[fighters["Age"] <= 40]

# Obtener nombres válidos
valid_fighters = set(fighters["Fighter_Name"])

# Filtrar peleas
fights = fights[
    fights["Winner"].isin(valid_fighters)
]



# ==========================
# Seleccionar columnas útiles
# ==========================

fighters = fighters[
    [
        "Fighter_Name",
        "Height",
        "Reach",
        "Wins",
        "Losses",
        "Draws",
        "Str_Acc",
        "Str_Def"
    ]
]

fighters["Height"] = fighters["Height"].apply(parse_height)
fighters["Reach"] = fighters["Reach"].apply(parse_float)
fighters["Str_Acc"] = fighters["Str_Acc"].apply(parse_float)
fighters["Str_Def"] = fighters["Str_Def"].apply(parse_float)

def normalize_method(method: str) -> str:
    method = str(method).lower()

    if "ko" in method or "tko" in method:
        return "KO_TKO"

    if "submission" in method:
        return "Submission"

    if "decision" in method:
        return "Decision"

    if "dq" in method:
        return "DQ"

    return "Other"

fights["Method"] = fights["Method"].apply(normalize_method)
# ====================================
# Contar victorias por método
# ====================================

method_counts = (
    fights
    .groupby(["Winner", "Method"])
    .size()
    .unstack(fill_value=0)
)

# Renombrar columnas

method_counts.columns = [
    f"Wins_{c.replace('/', '_').replace(' ', '_')}"
    for c in method_counts.columns
]

# ====================================
# Contar victorias por round
# ====================================

round_counts = (
    fights
    .groupby(["Winner", "End_Round"])
    .size()
    .unstack(fill_value=0)
)

round_counts.columns = [
    f"Wins_Round_{int(c)}"
    for c in round_counts.columns
]

# ====================================
# Unir todo
# ====================================

dataset = (
    fighters
    .merge(
        method_counts,
        left_on="Fighter_Name",
        right_index=True,
        how="left"
    )
    .merge(
        round_counts,
        left_on="Fighter_Name",
        right_index=True,
        how="left"
    )
)

# Reemplazar NaN por 0

dataset = dataset.fillna(0)

# Guardar

dataset.to_csv(
    "fighter_dataset_enriched.csv",
    index=False
)

print(dataset.head())