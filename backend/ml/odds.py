# ml/odds.py

from typing import Dict


HOUSE_MARGIN = 0.07


def probability_to_odds(
    probability: float,
    margin: float = HOUSE_MARGIN
) -> float:
    """
    Convierte una probabilidad (0-1)
    en una cuota decimal.
    """

    if probability <= 0:
        return 0.0

    fair_odds = 1 / probability

    bookmaker_odds = fair_odds * (1 - margin)

    return round(bookmaker_odds, 2)


def odds_to_probability(odds: float) -> float:
    """
    Convierte una cuota decimal
    en probabilidad implícita.
    """

    if odds <= 1:
        return 0.0

    return round(1 / odds, 4)


def generate_market(
    probabilities: Dict[str, float],
    margin: float = HOUSE_MARGIN
) -> Dict[str, Dict]:

    market = {}

    for outcome, probability in probabilities.items():

        market[outcome] = {

            "probability": round(probability, 4),

            "odds": probability_to_odds(
                probability,
                margin
            )

        }

    return market


def combine_probabilities(*probabilities: float) -> float:
    """
    Multiplica probabilidades independientes.

    Ejemplo:

    Max gana
    ×
    KO
    ×
    Round 2
    """

    result = 1.0

    for p in probabilities:
        result *= p

    return result


def combined_odds(
    *probabilities: float,
    margin: float = HOUSE_MARGIN
):

    probability = combine_probabilities(*probabilities)

    return {

        "probability": round(probability, 4),

        "odds": probability_to_odds(
            probability,
            margin
        )

    }