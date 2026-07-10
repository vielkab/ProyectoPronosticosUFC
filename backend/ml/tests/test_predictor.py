from ml.predictor import predict

fighter_a = {
    "altura_cm": 180,
    "alcance_cm": 183,
    "edad": 30,
    "victorias": 20,
    "derrotas": 2,
    "empates": 0,
    "striking_accuracy": 52,
    "striking_defense": 61,
    "wins_ko_tko": 10,
    "wins_submission": 5,
    "wins_decision": 5,
    "wins_round_1": 6,
    "wins_round_2": 4,
    "wins_round_3": 5,
    "wins_round_4": 3,
    "wins_round_5": 2,
}

fighter_b = {
    "altura_cm": 175,
    "alcance_cm": 178,
    "edad": 32,
    "victorias": 18,
    "derrotas": 4,
    "empates": 0,
    "striking_accuracy": 47,
    "striking_defense": 58,
    "wins_ko_tko": 8,
    "wins_submission": 4,
    "wins_decision": 6,
    "wins_round_1": 5,
    "wins_round_2": 3,
    "wins_round_3": 4,
    "wins_round_4": 2,
    "wins_round_5": 4,
}

resultado = predict(fighter_a, fighter_b)

print(resultado)