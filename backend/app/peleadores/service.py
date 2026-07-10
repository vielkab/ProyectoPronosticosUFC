from __future__ import annotations

from time import monotonic
from zlib import crc32

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.eventos.mma_api_client import MmaApiClient, PeleadorExterno

_CACHE_TTL_SEGUNDOS = 60
_cache_peleadores: dict[str, list[PeleadorExterno]] = {}
_cache_expira_en: dict[str, float] = {}


def listar_peleadores(db: Session, busqueda: str | None = None, categoria: str = "Lightweight") -> list[dict]:
    peleadores = sorted(_obtener_peleadores_api(categoria=categoria), key=lambda peleador: peleador.nombre)
    if busqueda:
        termino = busqueda.strip().lower()
        peleadores = [peleador for peleador in peleadores if termino in peleador.nombre.lower()]
    return [_mapear_resumen(peleador) for peleador in peleadores]


def _obtener_peleadores_api(categoria: str = "Lightweight", cliente: MmaApiClient | None = None) -> list[PeleadorExterno]:
    global _cache_expira_en, _cache_peleadores

    categoria_normalizada = categoria.strip() or "Lightweight"
    ahora = monotonic()
    if _cache_peleadores.get(categoria_normalizada) and ahora < _cache_expira_en.get(categoria_normalizada, 0.0):
        return _cache_peleadores[categoria_normalizada]

    cliente = cliente or MmaApiClient()
    if not cliente.esta_configurado():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="API-SPORTS no esta configurada. Define una API_SPORTS_KEY real en el backend.",
        )

    peleadores = cliente.obtener_peleadores(categoria=categoria_normalizada)
    if not peleadores:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"API-SPORTS no devolvio peleadores para la categoria {categoria_normalizada}.",
        )

    _cache_peleadores[categoria_normalizada] = peleadores
    _cache_expira_en[categoria_normalizada] = ahora + _CACHE_TTL_SEGUNDOS
    return _cache_peleadores[categoria_normalizada]


def _mapear_resumen(externo: PeleadorExterno) -> dict:
    return {
        "id": _crear_id_local(externo),
        "nombre": externo.nombre,
        "division": externo.division,
        "pais": externo.pais,
        "record": externo.record,
        "edad": externo.edad,
        "altura_cm": externo.altura_cm,
        "alcance_cm": externo.alcance_cm,
    }


def _mapear_detalle(externo: PeleadorExterno) -> dict:
    return {
        **_mapear_resumen(externo),
        "win_rate": externo.win_rate,
        "ultimas_cinco": externo.ultimas_cinco,
        "significant_strikes_pm": externo.significant_strikes_pm,
        "takedown_accuracy": externo.takedown_accuracy,
        "takedown_defense": externo.takedown_defense,
        "estadisticas": externo.estadisticas,
    }


def _crear_id_local(externo: PeleadorExterno) -> int:
    valor = externo.fuente_externa_id or externo.nombre
    if valor.isdigit():
        return int(valor)
    return crc32(valor.encode("utf-8")) or 1


def obtener_peleador(db: Session, peleador_id: int, categoria: str = "Lightweight") -> dict:
    for peleador in _obtener_peleadores_api(categoria=categoria):
        if _crear_id_local(peleador) == peleador_id:
            return _mapear_detalle(peleador)

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Peleador no encontrado en API-SPORTS.")
