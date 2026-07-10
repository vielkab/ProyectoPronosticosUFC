from fastapi import HTTPException, status

from app.historico import loader
from app.historico.schemas import PaginaPeleasHistoricas, PeleaHistorica, RankingHistorico


def _verificar_datasets_cargados() -> None:
    if loader.historical_fights.empty or loader.historical_rankings.empty:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Los datasets históricos todavía no están cargados.",
        )


def get_recent_fights(page: int, size: int) -> PaginaPeleasHistoricas:
    _verificar_datasets_cargados()
    fights = loader.historical_fights.sort_values("Event_Date", ascending=False, kind="stable")
    total = len(fights)
    inicio = (page - 1) * size
    filas = fights.iloc[inicio : inicio + size]
    items = [
        PeleaHistorica(
            fecha=fila.Event_Date.strftime("%Y-%m-%d"),
            peleador_1=str(fila.Fighter_1),
            peleador_2=str(fila.Fighter_2),
            ganador=str(fila.Winner),
        )
        for fila in filas.itertuples(index=False)
    ]
    return PaginaPeleasHistoricas(page=page, size=size, total=total, items=items)


def get_rankings(division: str) -> list[RankingHistorico]:
    _verificar_datasets_cargados()
    rankings_division = loader.historical_rankings[
        loader.historical_rankings["weightclass"].str.casefold() == division.strip().casefold()
    ]
    if rankings_division.empty:
        return []

    fecha_mas_reciente = rankings_division["date"].max()
    ranking_actual = rankings_division[
        (rankings_division["date"] == fecha_mas_reciente)
        & (rankings_division["rank"] >= 1)
    ]
    ranking_actual = ranking_actual.sort_values("rank", kind="stable")
    return [
        RankingHistorico(rank=int(fila.rank), fighter=str(fila.fighter))
        for fila in ranking_actual.itertuples(index=False)
    ]
