from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime
import re
from typing import Any
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException, status

from app.core.configuracion import ajustes


@dataclass(frozen=True)
class PeleadorExterno:
    fuente_externa_id: str | None
    nombre: str
    division: str = ""
    pais: str = ""
    record: str = "0-0-0"
    edad: int | None = None
    altura_cm: float | None = None
    alcance_cm: float | None = None
    win_rate: float = 0.5
    ultimas_cinco: str = ""
    significant_strikes_pm: float = 0.0
    takedown_accuracy: float = 0.0
    takedown_defense: float = 0.0
    estadisticas: dict[str, Any] | None = None


@dataclass(frozen=True)
class PeleaExterna:
    fuente_externa_id: str | None
    rojo: PeleadorExterno
    azul: PeleadorExterno
    division: str = ""
    orden: int = 0


@dataclass(frozen=True)
class EventoExterno:
    fuente_externa_id: str | None
    nombre: str
    fecha: date
    sede: str = ""
    estado: str = "programado"
    peleas: tuple[PeleaExterna, ...] = ()


class MmaApiClient:
    def __init__(self, base_url: str | None = None, api_key: str | None = None) -> None:
        self.base_url = (base_url or ajustes.mma_api_url).rstrip("/")
        self.api_key = api_key if api_key is not None else ajustes.api_sports_key

    def esta_configurado(self) -> bool:
        key = self.api_key.strip()
        return bool(key and key.lower() not in {"tu-api-sports-key", "api-sports-key", "changeme"})

    def obtener_eventos(self, fecha: date | None = None) -> list[EventoExterno]:
        if not self.esta_configurado():
            return []

        peleas = self._obtener_items(self._construir_path_peleas(fecha), tolerar_error=fecha is None)
        if peleas:
            return self._agrupar_peleas_como_eventos(peleas)

        if fecha is not None:
            return []

        eventos = self._obtener_items(ajustes.mma_events_endpoint, tolerar_error=True)
        return [evento for item in eventos if isinstance(item, dict) and (evento := self._mapear_evento(item))]

    def obtener_peleadores(self, categoria: str | None = None) -> list[PeleadorExterno]:
        if not self.esta_configurado():
            return []

        paths = self._construir_paths_peleadores(categoria)
        items: list[dict[str, Any]] = []
        vistos: set[str] = set()
        for path in paths:
            for item in self._obtener_items(path):
                externo_id = str(item.get("id") or _nested_get(item, "fighter", "id") or item.get("name") or "")
                if externo_id and externo_id in vistos:
                    continue
                if externo_id:
                    vistos.add(externo_id)
                items.append(item)

        peleadores = [
            peleador
            for item in items
            if (peleador := self._mapear_peleador_desde_respuesta(item))
        ]
        return peleadores

    def _construir_paths_peleadores(self, categoria: str | None = None) -> list[str]:
        endpoint = ajustes.mma_fighters_endpoint
        if "?" in endpoint:
            return [endpoint]

        if categoria and categoria.strip():
            return [f"{endpoint}?{urlencode({'category': categoria.strip()})}"]

        categorias = [
            categoria.strip()
            for categoria in ajustes.mma_fighter_categories.split(",")
            if categoria.strip()
        ]
        limite = max(1, ajustes.mma_fighter_category_limit)
        if categorias:
            return [f"{endpoint}?{urlencode({'category': categoria})}" for categoria in categorias[:limite]]

        return [endpoint]

    def _construir_path_peleas(self, fecha: date | None = None) -> str:
        endpoint = ajustes.mma_fights_endpoint
        if fecha is None:
            return endpoint

        separador = "&" if "?" in endpoint else "?"
        return f"{endpoint}{separador}{urlencode({'date': fecha.isoformat()})}"

    def _obtener_items(self, path: str, tolerar_error: bool = False) -> list[dict[str, Any]]:
        try:
            data = self._get(path)
        except HTTPException:
            if tolerar_error:
                return []
            raise
        if isinstance(data, list):
            raw_items = data
        elif isinstance(data, dict):
            if _tiene_errores_api(data):
                if tolerar_error:
                    return []
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"API externa MMA no devolvio datos: {_detalle_error_data(data)}",
                )
            raw_items = data.get("response") or data.get("results") or data.get("data") or []
        else:
            raw_items = []
        return [item for item in raw_items if isinstance(item, dict)]

    def _get(self, path: str) -> Any:
        endpoint = path if path.startswith("/") else f"/{path}"
        url = path if path.startswith(("http://", "https://")) else f"{self.base_url}{endpoint}"
        try:
            with httpx.Client(timeout=15.0) as client:
                response = client.get(
                    url,
                    headers={
                        "x-apisports-key": self.api_key.strip(),
                        "x-rapidapi-key": self.api_key.strip(),
                    },
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as error:
            detalle = _detalle_error_api(error.response)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"API externa MMA respondio {error.response.status_code}: {detalle}",
            ) from error
        except httpx.HTTPError as error:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"No se pudo consultar la API externa de MMA: {error}",
            ) from error

    def _agrupar_peleas_como_eventos(self, peleas_raw: list[dict[str, Any]]) -> list[EventoExterno]:
        grupos: dict[tuple[str, str], list[PeleaExterna]] = {}
        metadatos: dict[tuple[str, str], dict[str, str]] = {}

        for indice, raw in enumerate(peleas_raw, start=1):
            pelea = self._mapear_pelea_api_sports(raw, indice)
            fecha = _extraer_fecha(raw)
            if not pelea or not fecha:
                continue

            nombre_evento = _extraer_nombre_evento(raw, pelea)
            clave = (fecha.isoformat(), nombre_evento)
            grupos.setdefault(clave, []).append(pelea)
            metadatos.setdefault(
                clave,
                {
                    "sede": _extraer_sede(raw),
                    "estado": _normalizar_estado(raw.get("status")),
                    "fuente_externa_id": _crear_id_evento(raw, fecha, nombre_evento),
                },
            )

        eventos: list[EventoExterno] = []
        for (fecha_texto, nombre), peleas in grupos.items():
            meta = metadatos[(fecha_texto, nombre)]
            eventos.append(
                EventoExterno(
                    fuente_externa_id=meta["fuente_externa_id"],
                    nombre=nombre,
                    fecha=date.fromisoformat(fecha_texto),
                    sede=meta["sede"],
                    estado=meta["estado"],
                    peleas=tuple(
                        PeleaExterna(
                            fuente_externa_id=pelea.fuente_externa_id,
                            rojo=pelea.rojo,
                            azul=pelea.azul,
                            division=pelea.division,
                            orden=orden,
                        )
                        for orden, pelea in enumerate(peleas, start=1)
                    ),
                )
            )

        return eventos

    def _mapear_evento(self, item: dict[str, Any]) -> EventoExterno | None:
        fecha = _extraer_fecha(item)
        if not fecha:
            return None

        nombre = _to_text(
            item.get("name")
            or item.get("title")
            or _nested_get(item, "event", "name")
            or _nested_get(item, "league", "name")
            or "Evento MMA"
        )

        peleas = tuple(
            pelea
            for indice, raw in enumerate(
                item.get("fights") or item.get("bouts") or self._obtener_peleas_de_evento(item)
            )
            if (pelea := self._mapear_pelea_evento(raw, indice + 1))
        )
        return EventoExterno(
            fuente_externa_id=str(item.get("id") or "") or None,
            nombre=nombre,
            fecha=fecha,
            sede=_extraer_sede(item),
            estado=_normalizar_estado(item.get("status")),
            peleas=peleas,
        )

    def _mapear_pelea_evento(self, item: Any, orden: int) -> PeleaExterna | None:
        if not isinstance(item, dict):
            return None
        return self._mapear_pelea(item, orden) or self._mapear_pelea_api_sports(item, orden)

    def _obtener_peleas_de_evento(self, item: dict[str, Any]) -> list[dict[str, Any]]:
        evento_id = item.get("id") or _nested_get(item, "event", "id")
        if not evento_id:
            return []

        separador = "&" if "?" in ajustes.mma_fights_endpoint else "?"
        path = f"{ajustes.mma_fights_endpoint}{separador}event={evento_id}"
        return self._obtener_items(path, tolerar_error=True)

    def _mapear_pelea(self, item: dict[str, Any], orden: int) -> PeleaExterna | None:
        if not isinstance(item, dict):
            return None
        rojo = self._mapear_peleador(item.get("red_corner") or item.get("fighter_1") or item.get("home"))
        azul = self._mapear_peleador(item.get("blue_corner") or item.get("fighter_2") or item.get("away"))
        if not rojo or not azul:
            return None
        return PeleaExterna(
            fuente_externa_id=str(item.get("id") or "") or None,
            rojo=rojo,
            azul=azul,
            division=_to_text(item.get("weight_class") or item.get("division") or rojo.division or azul.division),
            orden=orden,
        )

    def _mapear_pelea_api_sports(self, item: dict[str, Any], orden: int) -> PeleaExterna | None:
        fighters = item.get("fighters") if isinstance(item.get("fighters"), dict) else {}
        rojo_raw = (
            fighters.get("first")
            or fighters.get("red")
            or fighters.get("home")
            or fighters.get("fighter_1")
            or item.get("red_corner")
            or item.get("fighter_1")
            or item.get("home")
        )
        azul_raw = (
            fighters.get("second")
            or fighters.get("blue")
            or fighters.get("away")
            or fighters.get("fighter_2")
            or item.get("blue_corner")
            or item.get("fighter_2")
            or item.get("away")
        )
        rojo = self._mapear_peleador(rojo_raw)
        azul = self._mapear_peleador(azul_raw)
        if not rojo or not azul:
            return None

        return PeleaExterna(
            fuente_externa_id=str(item.get("id") or "") or None,
            rojo=rojo,
            azul=azul,
            division=_to_text(
                item.get("category")
                or item.get("weight_class")
                or item.get("division")
                or _nested_get(item, "weight", "name")
                or rojo.division
                or azul.division
            ).strip(),
            orden=orden,
        )

    def _mapear_peleador(self, item: Any) -> PeleadorExterno | None:
        if isinstance(item, str):
            nombre = item.strip()
            return PeleadorExterno(fuente_externa_id=None, nombre=nombre) if nombre else None
        if not isinstance(item, dict):
            return None

        nombre = _to_text(
            item.get("name")
            or item.get("full_name")
            or _unir_nombre(item)
        )
        if not nombre:
            return None

        wins = _to_float(item.get("wins"))
        losses = _to_float(item.get("losses"))
        draws = _to_float(item.get("draws"))
        total = wins + losses + draws
        record = str(item.get("record") or f"{int(wins)}-{int(losses)}-{int(draws)}")
        win_rate = wins / total if total else _to_float(item.get("win_rate"), 0.5)

        return PeleadorExterno(
            fuente_externa_id=str(item.get("id") or "") or None,
            nombre=nombre,
            division=_to_text(item.get("division") or item.get("weight_class") or item.get("category")),
            pais=_to_text(item.get("country") or _nested_get(item, "country", "name")),
            record=record,
            edad=_to_int(item.get("age")),
            altura_cm=_to_medida_cm(item.get("height_cm") or item.get("height"), tipo="altura"),
            alcance_cm=_to_medida_cm(item.get("reach_cm") or item.get("reach"), tipo="alcance"),
            win_rate=win_rate,
            ultimas_cinco=str(item.get("last_five") or item.get("recent_form") or "")[:5],
            significant_strikes_pm=_to_float(item.get("significant_strikes_pm")),
            takedown_accuracy=_to_float(item.get("takedown_accuracy")),
            takedown_defense=_to_float(item.get("takedown_defense")),
            estadisticas=item,
        )

    def _mapear_peleador_desde_respuesta(self, item: dict[str, Any]) -> PeleadorExterno | None:
        raw = item.get("fighter") or item.get("fighters") or item.get("athlete") or item
        if not isinstance(raw, dict):
            return None

        combinado = {**item, **raw}
        peleador = self._mapear_peleador(combinado)
        if not peleador:
            return None

        estadisticas = {**item, **(peleador.estadisticas or {})}
        return PeleadorExterno(
            fuente_externa_id=peleador.fuente_externa_id,
            nombre=peleador.nombre,
            division=peleador.division,
            pais=peleador.pais,
            record=peleador.record,
            edad=peleador.edad,
            altura_cm=peleador.altura_cm,
            alcance_cm=peleador.alcance_cm,
            win_rate=peleador.win_rate,
            ultimas_cinco=peleador.ultimas_cinco,
            significant_strikes_pm=peleador.significant_strikes_pm,
            takedown_accuracy=peleador.takedown_accuracy,
            takedown_defense=peleador.takedown_defense,
            estadisticas=estadisticas,
        )


def _extraer_fecha(item: dict[str, Any]) -> date | None:
    valor = (
        item.get("date")
        or item.get("event_date")
        or item.get("time")
        or _nested_get(item, "event", "date")
        or _nested_get(item, "fixture", "date")
    )
    if not valor and item.get("timestamp"):
        try:
            return datetime.fromtimestamp(int(item["timestamp"]), tz=UTC).date()
        except (TypeError, ValueError, OSError):
            return None
    if not valor:
        return None
    try:
        return date.fromisoformat(str(valor)[:10])
    except ValueError:
        return None


def _extraer_nombre_evento(item: dict[str, Any], pelea: PeleaExterna) -> str:
    nombre = (
        _nested_get(item, "event", "name")
        or _nested_get(item, "league", "name")
        or item.get("event")
        or item.get("competition")
        or item.get("name")
        or item.get("title")
    )
    return _to_text(nombre or f"{pelea.rojo.nombre} vs {pelea.azul.nombre}")


def _extraer_sede(item: dict[str, Any]) -> str:
    sede = item.get("location") or item.get("venue") or _nested_get(item, "venue", "name")
    ciudad = _nested_get(item, "venue", "city")
    pais = _nested_get(item, "country", "name") or item.get("country")
    partes = [_to_text(valor) for valor in (sede, ciudad, pais) if valor]
    return ", ".join(dict.fromkeys(partes))


def _extraer_id_evento(item: dict[str, Any]) -> str | None:
    valor = _nested_get(item, "event", "id") or _nested_get(item, "league", "id") or item.get("event_id")
    return str(valor) if valor else None


def _crear_id_evento(item: dict[str, Any], fecha: date, nombre: str) -> str:
    externo_id = _extraer_id_evento(item) or nombre.lower().replace(" ", "-")
    return f"api-sports:{externo_id}:{fecha.isoformat()}"


def _normalizar_estado(status_raw: Any) -> str:
    if isinstance(status_raw, dict):
        status_raw = status_raw.get("long") or status_raw.get("short")
    estado = str(status_raw or "programado").lower()
    if estado in {"finished", "ft", "finalizado", "finalizada"}:
        return "finalizado"
    if estado in {"cancelled", "canceled", "cancelado", "postponed"}:
        return "cancelado"
    return "programado"


def _nested_get(item: dict[str, Any], *keys: str) -> Any:
    actual: Any = item
    for key in keys:
        if not isinstance(actual, dict):
            return None
        actual = actual.get(key)
    return actual


def _unir_nombre(item: dict[str, Any]) -> str:
    partes = (
        item.get("firstname") or item.get("first_name"),
        item.get("lastname") or item.get("last_name"),
    )
    return " ".join(str(parte).strip() for parte in partes if parte)


def _to_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, dict):
        for key in ("name", "long", "short", "title", "value"):
            if value.get(key):
                return str(value[key]).strip()
        return ""
    return str(value).strip()


def _detalle_error_api(response: httpx.Response) -> str:
    try:
        data = response.json()
    except ValueError:
        return response.text[:300] or "sin detalle"

    if isinstance(data, dict):
        return _detalle_error_data(data)

    return str(data)[:300]


def _tiene_errores_api(data: dict[str, Any]) -> bool:
    errores = data.get("errors")
    if isinstance(errores, list):
        return len(errores) > 0
    if isinstance(errores, dict):
        return len(errores) > 0
    return bool(errores)


def _detalle_error_data(data: dict[str, Any]) -> str:
    if isinstance(data, dict):
        errores = data.get("errors")
        if errores:
            return _to_text(errores) or str(errores)[:300]
        mensaje = data.get("message") or data.get("detail")
        if mensaje:
            return _to_text(mensaje) or str(mensaje)[:300]
    return str(data)[:300]


def _to_float(value: Any, default: float = 0.0) -> float:
    parsed = _to_float_or_none(value)
    return default if parsed is None else parsed


def _to_float_or_none(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(str(value).replace("%", "").strip()) / (100 if "%" in str(value) else 1)
    except ValueError:
        return None


def _to_medida_cm(value: Any, tipo: str) -> float | None:
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value)

    texto = str(value).strip().lower()
    if not texto:
        return None

    numero = _to_float_or_none(texto.replace("cm", "").strip())
    if numero is not None and ("cm" in texto or numero > 90):
        return round(numero, 1)

    pulgadas = _medida_api_sports_a_pulgadas(texto, tipo)
    if pulgadas is None:
        return numero

    return round(pulgadas * 2.54, 1)


def _medida_api_sports_a_pulgadas(texto: str, tipo: str) -> float | None:
    numeros = [float(valor) for valor in re.findall(r"\d+(?:\.\d+)?", texto)]
    if not numeros:
        return None

    if "ft" in texto or "'" in texto:
        if tipo == "altura" and len(numeros) >= 2 and numeros[0] <= 8:
            return numeros[0] * 12 + numeros[1]
        return numeros[0]

    if "in" in texto:
        return numeros[0]

    return None


def _to_int(value: Any) -> int | None:
    parsed = _to_float_or_none(value)
    return int(parsed) if parsed is not None else None
