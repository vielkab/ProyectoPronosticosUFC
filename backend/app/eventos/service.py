from __future__ import annotations

from datetime import UTC, date, datetime

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.apuestas.models import Apuesta
from app.eventos.mma_api_client import EventoExterno, MmaApiClient, PeleadorExterno
from app.eventos.models import Evento, Pelea, Resultado
from app.eventos.schemas import ResultadoEntrada
from app.peleadores.models import Peleador
from app.predicciones.models import Prediccion

def _asegurar_datos_demo(db: Session) -> None:
    if db.scalar(select(func.count(Evento.id))) > 0:
        return

    topuria = Peleador(
        nombre="Ilia Topuria",
        division="Ligero",
        pais="Georgia/Espana",
        record="17-0-0",
        edad=29,
        altura_cm=170,
        alcance_cm=175,
        win_rate=1.0,
        ultimas_cinco="WWWWW",
        significant_strikes_pm=4.69,
        takedown_accuracy=0.56,
        takedown_defense=0.92,
    )
    oliveira = Peleador(
        nombre="Charles Oliveira",
        division="Ligero",
        pais="Brasil",
        record="35-10-0",
        edad=36,
        altura_cm=178,
        alcance_cm=188,
        win_rate=0.78,
        ultimas_cinco="WLWLW",
        significant_strikes_pm=3.41,
        takedown_accuracy=0.41,
        takedown_defense=0.57,
    )
    evento = Evento(
        nombre="UFC Demo Fight Night",
        fecha=date(2026, 7, 20),
        sede="Las Vegas",
        estado="programado",
    )
    db.add_all([topuria, oliveira, evento])
    db.flush()
    db.add(
        Pelea(
            evento_id=evento.id,
            peleador_rojo_id=topuria.id,
            peleador_azul_id=oliveira.id,
            division="Ligero",
            orden=1,
        )
    )
    db.commit()


def listar_eventos(db: Session) -> list[Evento]:
    if db.scalar(select(func.count(Evento.id))) == 0:
        sincronizar_eventos_mma(db)

    return list(db.scalars(select(Evento).order_by(Evento.fecha.asc())))


def listar_peleas_cartelera(
    db: Session,
    desde: date | None = None,
    hasta: date | None = None,
) -> list[dict]:
    if desde and hasta and desde > hasta:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha inicial no puede ser mayor que la fecha final.",
        )

    fecha_minima = desde or datetime.now(UTC).date()
    consulta = (
        select(Pelea)
        .join(Pelea.evento)
        .options(
            selectinload(Pelea.evento),
            selectinload(Pelea.peleador_rojo),
            selectinload(Pelea.peleador_azul),
        )
        .where(Evento.fecha >= fecha_minima)
        .where(Pelea.estado.in_({"programada", "en_curso"}))
        .order_by(Evento.fecha.asc(), Pelea.orden.asc(), Pelea.id.asc())
    )

    if hasta:
        consulta = consulta.where(Evento.fecha <= hasta)

    if not desde and not hasta:
        consulta = consulta.limit(20)

    return [_mapear_pelea_cartelera(pelea) for pelea in db.scalars(consulta)]


def _mapear_pelea_cartelera(pelea: Pelea) -> dict:
    return {
        "id": pelea.id,
        "evento_nombre": pelea.evento.nombre,
        "fecha": pelea.evento.fecha,
        "sede": pelea.evento.sede,
        "estado_evento": pelea.evento.estado,
        "division": pelea.division,
        "orden": pelea.orden,
        "peleador_rojo_nombre": pelea.peleador_rojo.nombre,
        "peleador_azul_nombre": pelea.peleador_azul.nombre,
    }


def sincronizar_eventos_mma(db: Session, cliente: MmaApiClient | None = None) -> dict[str, int | str]:
    cliente = cliente or MmaApiClient()
    eventos_externos = cliente.obtener_eventos()
    fuente = "api_externa" if eventos_externos else "demo"

    if not eventos_externos:
        _asegurar_datos_demo(db)
        return {
            "eventos": db.scalar(select(func.count(Evento.id))) or 0,
            "peleas": db.scalar(select(func.count(Pelea.id))) or 0,
            "peleadores": db.scalar(select(func.count(Peleador.id))) or 0,
            "fuente": fuente,
        }

    eventos_sincronizados = 0
    peleas_sincronizadas = 0
    peleadores_sincronizados: set[int] = set()

    for evento_externo in eventos_externos:
        evento = _upsert_evento(db, evento_externo)
        eventos_sincronizados += 1
        for pelea_externa in evento_externo.peleas:
            rojo = _upsert_peleador(db, pelea_externa.rojo)
            azul = _upsert_peleador(db, pelea_externa.azul)
            peleadores_sincronizados.update({rojo.id, azul.id})
            _upsert_pelea(db, evento, rojo, azul, pelea_externa.division, pelea_externa.orden)
            peleas_sincronizadas += 1

    db.commit()
    return {
        "eventos": eventos_sincronizados,
        "peleas": peleas_sincronizadas,
        "peleadores": len(peleadores_sincronizados),
        "fuente": fuente,
    }


def _upsert_evento(db: Session, externo: EventoExterno) -> Evento:
    evento = None
    if externo.fuente_externa_id:
        evento = db.scalar(select(Evento).where(Evento.fuente_externa_id == externo.fuente_externa_id))
    if not evento:
        evento = db.scalar(select(Evento).where(Evento.nombre == externo.nombre, Evento.fecha == externo.fecha))
    if not evento:
        evento = Evento(nombre=externo.nombre, fecha=externo.fecha)
        db.add(evento)

    evento.sede = externo.sede
    evento.estado = externo.estado
    evento.fuente_externa_id = externo.fuente_externa_id
    db.flush()
    return evento


def _upsert_peleador(db: Session, externo: PeleadorExterno) -> Peleador:
    peleador = None
    if externo.fuente_externa_id:
        peleador = db.scalar(select(Peleador).where(Peleador.fuente_externa_id == externo.fuente_externa_id))
    if not peleador:
        peleador = db.scalar(select(Peleador).where(Peleador.nombre == externo.nombre))
    if not peleador:
        peleador = Peleador(nombre=externo.nombre)
        db.add(peleador)

    peleador.division = externo.division or peleador.division
    peleador.pais = externo.pais or peleador.pais
    peleador.record = externo.record or peleador.record
    peleador.edad = externo.edad
    peleador.altura_cm = externo.altura_cm
    peleador.alcance_cm = externo.alcance_cm
    peleador.win_rate = externo.win_rate
    peleador.ultimas_cinco = externo.ultimas_cinco
    peleador.significant_strikes_pm = externo.significant_strikes_pm
    peleador.takedown_accuracy = externo.takedown_accuracy
    peleador.takedown_defense = externo.takedown_defense
    peleador.estadisticas = externo.estadisticas
    peleador.fuente_externa_id = externo.fuente_externa_id
    db.flush()
    return peleador


def _upsert_pelea(db: Session, evento: Evento, rojo: Peleador, azul: Peleador, division: str, orden: int) -> Pelea:
    pelea = db.scalar(
        select(Pelea).where(
            Pelea.evento_id == evento.id,
            Pelea.peleador_rojo_id == rojo.id,
            Pelea.peleador_azul_id == azul.id,
        )
    )
    if not pelea:
        pelea = Pelea(evento_id=evento.id, peleador_rojo_id=rojo.id, peleador_azul_id=azul.id)
        db.add(pelea)
    pelea.division = division
    pelea.orden = orden
    db.flush()
    return pelea


def obtener_evento(db: Session, evento_id: int) -> Evento:
    evento = db.scalar(
        select(Evento)
        .options(
            selectinload(Evento.peleas).selectinload(Pelea.peleador_rojo),
            selectinload(Evento.peleas).selectinload(Pelea.peleador_azul),
        )
        .where(Evento.id == evento_id)
    )
    if not evento:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento no encontrado.")
    return evento


def registrar_resultado(db: Session, pelea_id: int, payload: ResultadoEntrada) -> Resultado:
    pelea = db.get(Pelea, pelea_id)
    if not pelea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pelea no encontrada.")

    if payload.ganador_id not in {pelea.peleador_rojo_id, pelea.peleador_azul_id}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El ganador debe pertenecer a la pelea seleccionada.",
        )

    resultado = db.scalar(select(Resultado).where(Resultado.pelea_id == pelea_id))
    if resultado:
        resultado.ganador_id = payload.ganador_id
        resultado.metodo = payload.metodo
        resultado.round = payload.round
    else:
        resultado = Resultado(
            pelea_id=pelea_id,
            ganador_id=payload.ganador_id,
            metodo=payload.metodo,
            round=payload.round,
        )
        db.add(resultado)

    pelea.estado = "finalizada"
    apuestas = db.scalars(select(Apuesta).where(Apuesta.pelea_id == pelea_id)).all()
    for apuesta in apuestas:
        apuesta.estado = "Ganada" if apuesta.peleador_seleccionado_id == payload.ganador_id else "Perdida"

    prediccion = db.scalar(select(Prediccion).where(Prediccion.pelea_id == pelea_id))
    if prediccion:
        favorito_id = (
            pelea.peleador_rojo_id
            if prediccion.probabilidad_rojo >= prediccion.probabilidad_azul
            else pelea.peleador_azul_id
        )
        prediccion.acertada = favorito_id == payload.ganador_id

    db.commit()
    db.refresh(resultado)
    return resultado
