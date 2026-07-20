from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.base_de_datos import obtener_db
from app.historico.schemas import PaginaPeleasHistoricas, RankingHistorico
from app.historico.service import get_rankings, get_recent_fights


router = APIRouter(tags=["histórico"])


@router.get("/historico/peleas", response_model=PaginaPeleasHistoricas)
def obtener_peleas_historicas(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(obtener_db),
) -> PaginaPeleasHistoricas:
    return get_recent_fights(db, page, size)


@router.get("/rankings", response_model=list[RankingHistorico])
def obtener_rankings(division: str = Query("Lightweight")) -> list[RankingHistorico]:
    return get_rankings(division)
