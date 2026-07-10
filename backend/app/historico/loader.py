"""Carga única de los datasets históricos durante el arranque de FastAPI."""

from pathlib import Path

import pandas as pd


DATASETS_DIR = Path(__file__).resolve().parents[2] / "datasets"
historical_fights = pd.DataFrame()
historical_rankings = pd.DataFrame()


def load_historical_datasets() -> None:
    """Lee y prepara ambos datasets una sola vez al iniciar la aplicación."""
    global historical_fights, historical_rankings

    fights = pd.read_csv(
        DATASETS_DIR / "fights.csv",
        usecols=["Event_Date", "Fighter_1", "Fighter_2", "Winner"],
    )
    fights["Event_Date"] = pd.to_datetime(fights["Event_Date"], errors="coerce")
    historical_fights = fights.dropna(subset=["Event_Date"])

    rankings = pd.read_csv(
        DATASETS_DIR / "rankings_history.csv",
        usecols=["date", "weightclass", "fighter", "rank"],
    )
    rankings["date"] = pd.to_datetime(rankings["date"], errors="coerce")
    rankings["rank"] = pd.to_numeric(rankings["rank"], errors="coerce")
    historical_rankings = rankings.dropna(subset=["date", "weightclass", "fighter", "rank"])
