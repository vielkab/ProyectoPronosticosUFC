from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.base_de_datos import obtener_db
from app.peleadores.schemas import PeleadorDetalle, PeleadorResumen
from app.peleadores.service import listar_peleadores, obtener_peleador

router = APIRouter(tags=["peleadores"])


@router.get("", response_model=list[PeleadorResumen])
def listar_peleadores_endpoint(
    busqueda: str | None = Query(default=None),
    categoria: str = Query(default="Lightweight"),
    db: Session = Depends(obtener_db),
) -> list[PeleadorResumen]:
    return listar_peleadores(db, busqueda, categoria)


@router.get("/{peleador_id}", response_model=PeleadorDetalle)
def obtener_peleador_endpoint(
    peleador_id: int,
    categoria: str = Query(default="Lightweight"),
    db: Session = Depends(obtener_db),
) -> PeleadorDetalle:
    return obtener_peleador(db, peleador_id, categoria)
