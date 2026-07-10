import os
import re

import pandas as pd


def parse_height(value):
    if pd.isna(value):
        return float("nan")

    text = str(value).strip()
    match = re.match(r"^(\d+)\s*'\s*(\d+(?:\.\d+)?)", text)
    if match:
        feet = int(match.group(1))
        inches = float(match.group(2))
        return feet * 12 + inches

    try:
        return float(text.replace('"', ''))
    except ValueError:
        return float("nan")


def parse_float(value):
    if pd.isna(value):
        return float("nan")

    text = str(value).strip().replace('%', '').replace('"', '')
    try:
        return float(text)
    except ValueError:
        return float("nan")


def stat(row, column):
    value = row.get(column, 0)
    if isinstance(value, pd.Series):
        value = value.iloc[0]
    return 0 if pd.isna(value) else value


def get_fighter(frame, name):
    fighter = frame.loc[name]
    if isinstance(fighter, pd.DataFrame):
        fighter = fighter.iloc[0]
    return fighter


# ==============================
# Cargar datasets
# ==============================

fighters = pd.read_csv("fighter_dataset_enriched.csv")
fights = pd.read_csv("fights.csv")

fighters["Height"] = fighters["Height"].apply(parse_height)
fighters["Reach"] = fighters["Reach"].apply(parse_float)
fighters["Str_Acc"] = fighters["Str_Acc"].apply(parse_float)
fighters["Str_Def"] = fighters["Str_Def"].apply(parse_float)

# ==============================
# Indexar peleadores
# ==============================

fighters = fighters.set_index("Fighter_Name")

rows = []

# ==============================
# Crear una fila por pelea
# ==============================

for _, fight in fights.iterrows():

    fighter1 = fight["Fighter_1"]
    fighter2 = fight["Fighter_2"]
    winner = fight["Winner"]

    # Determinar el perdedor
    if winner == fighter1:
        loser = fighter2
    elif winner == fighter2:
        loser = fighter1
    else:
        # Empate, NC o dato inválido
        continue

    # Ignorar peleadores que no estén en el dataset enriquecido
    if winner not in fighters.index:
        continue

    if loser not in fighters.index:
        continue

    w = get_fighter(fighters, winner)
    l = get_fighter(fighters, loser)

    rows.append({

        # Diferencias
        "delta_height": stat(w, "Height") - stat(l, "Height"),
        "delta_reach": stat(w, "Reach") - stat(l, "Reach"),

        "delta_wins": stat(w, "Wins") - stat(l, "Wins"),
        "delta_losses": stat(w, "Losses") - stat(l, "Losses"),
        "delta_draws": stat(w, "Draws") - stat(l, "Draws"),

        "delta_str_acc": stat(w, "Str_Acc") - stat(l, "Str_Acc"),
        "delta_str_def": stat(w, "Str_Def") - stat(l, "Str_Def"),

        "delta_ko": stat(w, "Wins_KO_TKO") - stat(l, "Wins_KO_TKO"),
        "delta_sub": stat(w, "Wins_Submission") - stat(l, "Wins_Submission"),
        "delta_decision": stat(w, "Wins_Decision") - stat(l, "Wins_Decision"),

        "delta_r1": stat(w, "Wins_Round_1") - stat(l, "Wins_Round_1"),
        "delta_r2": stat(w, "Wins_Round_2") - stat(l, "Wins_Round_2"),
        "delta_r3": stat(w, "Wins_Round_3") - stat(l, "Wins_Round_3"),
        "delta_r4": stat(w, "Wins_Round_4") - stat(l, "Wins_Round_4"),
        "delta_r5": stat(w, "Wins_Round_5") - stat(l, "Wins_Round_5"),

        # Etiquetas
        "winner": 1,
        "method": fight["Method"],
        "round": fight["End_Round"]

    })

    # ==========================
    # Agregar pelea invertida
    # ==========================

    rows.append({

        "delta_height": stat(l, "Height") - stat(w, "Height"),
        "delta_reach": stat(l, "Reach") - stat(w, "Reach"),

        "delta_wins": stat(l, "Wins") - stat(w, "Wins"),
        "delta_losses": stat(l, "Losses") - stat(w, "Losses"),
        "delta_draws": stat(l, "Draws") - stat(w, "Draws"),

        "delta_str_acc": stat(l, "Str_Acc") - stat(w, "Str_Acc"),
        "delta_str_def": stat(l, "Str_Def") - stat(w, "Str_Def"),

        "delta_ko": stat(l, "Wins_KO_TKO") - stat(w, "Wins_KO_TKO"),
        "delta_sub": stat(l, "Wins_Submission") - stat(w, "Wins_Submission"),
        "delta_decision": stat(l, "Wins_Decision") - stat(w, "Wins_Decision"),

        "delta_r1": stat(l, "Wins_Round_1") - stat(w, "Wins_Round_1"),
        "delta_r2": stat(l, "Wins_Round_2") - stat(w, "Wins_Round_2"),
        "delta_r3": stat(l, "Wins_Round_3") - stat(w, "Wins_Round_3"),
        "delta_r4": stat(l, "Wins_Round_4") - stat(w, "Wins_Round_4"),
        "delta_r5": stat(l, "Wins_Round_5") - stat(w, "Wins_Round_5"),

        "winner": 0,
        "method": fight["Method"],
        "round": fight["End_Round"]

    })


training = pd.DataFrame(rows)

os.makedirs("datasets", exist_ok=True)

training.to_csv(
    "datasets/training_dataset.csv",
    index=False
)

print(training.head())
print(f"{len(training)} ejemplos creados.")