from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.eventos.models import Pelea, Resultado
from app.historico import loader
from app.historico.schemas import PaginaPeleasHistoricas, PeleaHistorica, RankingHistorico


def _verificar_datasets_cargados() -> None:
    if loader.historical_fights.empty or loader.historical_rankings.empty:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Los datasets históricos todavía no están cargados.",
        )


def get_recent_fights(db: Session, page: int, size: int) -> PaginaPeleasHistoricas:
    peleas_con_resultado = db.scalars(
        select(Pelea)
        .join(Pelea.resultado)
        .options(
            selectinload(Pelea.evento),
            selectinload(Pelea.peleador_rojo),
            selectinload(Pelea.peleador_azul),
            selectinload(Pelea.resultado).selectinload(Resultado.ganador),
        )
    ).all()

    items = [
        PeleaHistorica(
            fecha=pelea.evento.fecha.isoformat(),
            peleador_1=pelea.peleador_rojo.nombre,
            peleador_2=pelea.peleador_azul.nombre,
            ganador=pelea.resultado.ganador.nombre,
        )
        for pelea in peleas_con_resultado
        if pelea.resultado and pelea.resultado.ganador
    ]

    if not loader.historical_fights.empty:
        items.extend(
            PeleaHistorica(
                fecha=fila.Event_Date.strftime("%Y-%m-%d"),
                peleador_1=str(fila.Fighter_1),
                peleador_2=str(fila.Fighter_2),
                ganador=str(fila.Winner),
            )
            for fila in loader.historical_fights.itertuples(index=False)
        )

    if not items:
        _verificar_datasets_cargados()

    items.sort(key=lambda pelea: pelea.fecha, reverse=True)
    total = len(items)
    inicio = (page - 1) * size
    return PaginaPeleasHistoricas(page=page, size=size, total=total, items=items[inicio : inicio + size])


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
