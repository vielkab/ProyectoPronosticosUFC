# ml/predictor.py

from pathlib import Path

import pandas as pd
from joblib import load

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "ml" / "modelo"

winner_model = load(MODELS_DIR / "winner_model.joblib")
method_model = load(MODELS_DIR / "method_model.joblib")
round_model = load(MODELS_DIR / "round_model.joblib")
method_encoder = load(MODELS_DIR / "method_label_encoder.joblib")
round_encoder = load(MODELS_DIR / "round_label_encoder.joblib")

FEATURES = [
    "delta_height",
    "delta_reach",
    "delta_wins",
    "delta_losses",
    "delta_draws",
    "delta_str_acc",
    "delta_str_def",
    "delta_ko",
    "delta_sub",
    "delta_decision",
    "delta_r1",
    "delta_r2",
    "delta_r3",
    "delta_r4",
    "delta_r5",
]


def probability_to_odds(probability: float, margin: float = 0.07) -> float:
    if probability <= 0:
        return None

    fair_odds = 1 / probability
    return round(fair_odds * (1 - margin), 2)


def build_features(fighter_a: dict, fighter_b: dict) -> pd.DataFrame:
    data = {
        "delta_height": fighter_a["altura_cm"] - fighter_b["altura_cm"],
        "delta_reach": fighter_a["alcance_cm"] - fighter_b["alcance_cm"],
        "delta_wins": fighter_a["victorias"] - fighter_b["victorias"],
        "delta_losses": fighter_a["derrotas"] - fighter_b["derrotas"],
        "delta_draws": fighter_a["empates"] - fighter_b["empates"],
        "delta_str_acc": fighter_a["striking_accuracy"] - fighter_b["striking_accuracy"],
        "delta_str_def": fighter_a["striking_defense"] - fighter_b["striking_defense"],
        "delta_ko": fighter_a["wins_ko_tko"] - fighter_b["wins_ko_tko"],
        "delta_sub": fighter_a["wins_submission"] - fighter_b["wins_submission"],
        "delta_decision": fighter_a["wins_decision"] - fighter_b["wins_decision"],
        "delta_r1": fighter_a["wins_round_1"] - fighter_b["wins_round_1"],
        "delta_r2": fighter_a["wins_round_2"] - fighter_b["wins_round_2"],
        "delta_r3": fighter_a["wins_round_3"] - fighter_b["wins_round_3"],
        "delta_r4": fighter_a["wins_round_4"] - fighter_b["wins_round_4"],
        "delta_r5": fighter_a["wins_round_5"] - fighter_b["wins_round_5"],
    }

    return pd.DataFrame([data], columns=FEATURES)


def predict(fighter_a: dict, fighter_b: dict):
    features = build_features(fighter_a, fighter_b)

    winner_prob = winner_model.predict_proba(features)[0]
    method_prob = method_model.predict_proba(features)[0]
    round_prob = round_model.predict_proba(features)[0]

    method_labels = method_encoder.inverse_transform(method_model.classes_)
    round_labels = round_encoder.inverse_transform(round_model.classes_)

    return {
        "winner": {
            "fighter_a_probability": float(winner_prob[1]),
            "fighter_b_probability": float(winner_prob[0]),
            "fighter_a_odds": probability_to_odds(winner_prob[1]),
            "fighter_b_odds": probability_to_odds(winner_prob[0]),
        },
        "method": {
            method: {
                "probability": float(prob),
                "odds": probability_to_odds(prob),
            }
            for method, prob in zip(method_labels, method_prob)
        },
        "round": {
            int(r): {
                "probability": float(prob),
                "odds": probability_to_odds(prob),
            }
            for r, prob in zip(round_labels, round_prob)
        },
    }