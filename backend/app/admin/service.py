from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.admin.schemas import CrearPeleaCarteleraEntrada, ResumenAdmin
from app.apuestas.models import Apuesta
from app.eventos.models import Evento, Pelea
from app.eventos.service import _asegurar_datos_demo
from app.peleadores.models import Peleador
from app.predicciones.models import Prediccion
from app.usuarios.models import Usuario


def obtener_resumen_admin(db: Session) -> ResumenAdmin:
    _asegurar_datos_demo(db)
    usuarios = db.scalar(select(func.count(Usuario.id))) or 0
    apuestas = db.scalar(select(func.count(Apuesta.id))) or 0
    eventos = db.scalar(select(func.count(Evento.id))) or 0
    ingresos = db.scalar(
        select(func.coalesce(func.sum(Apuesta.monto), 0.0)).where(Apuesta.estado_pago == "pagado")
    ) or 0.0
    predicciones = db.scalar(select(func.count(Prediccion.id))) or 0
    aciertos = db.scalar(
        select(func.count(Prediccion.id)).where(Prediccion.acertada.is_(True))
    ) or 0
    errores = db.scalar(
        select(func.count(Prediccion.id)).where(Prediccion.acertada.is_(False))
    ) or 0
    evaluadas = aciertos + errores
    precision = round((aciertos / evaluadas) * 100, 2) if evaluadas else 0.0

    return ResumenAdmin(
        usuarios=usuarios,
        apuestas=apuestas,
        eventos=eventos,
        ingresos=float(ingresos),
        predicciones=predicciones,
        aciertos=aciertos,
        errores=errores,
        precision=precision,
    )


def crear_pelea_cartelera(db: Session, payload: CrearPeleaCarteleraEntrada) -> dict:
    evento = db.scalar(
        select(Evento).where(
            Evento.nombre == payload.evento_nombre.strip(),
            Evento.fecha == payload.fecha,
        )
    )
    if not evento:
        evento = Evento(nombre=payload.evento_nombre.strip(), fecha=payload.fecha)
        db.add(evento)

    evento.sede = payload.sede.strip()
    evento.estado = payload.estado_evento.strip() or "programado"

    rojo = _obtener_o_crear_peleador(db, payload.peleador_rojo_nombre)
    azul = _obtener_o_crear_peleador(db, payload.peleador_azul_nombre)
    db.flush()

    pelea = Pelea(
        evento_id=evento.id,
        peleador_rojo_id=rojo.id,
        peleador_azul_id=azul.id,
        division=payload.division.strip(),
        orden=payload.orden,
        estado=payload.estado_pelea.strip() or "programada",
    )
    db.add(pelea)
    db.commit()
    db.refresh(pelea)
    db.refresh(evento)

    return {
        "id": pelea.id,
        "evento_nombre": evento.nombre,
        "fecha": evento.fecha,
        "sede": evento.sede,
        "estado_evento": evento.estado,
        "division": pelea.division,
        "orden": pelea.orden,
        "peleador_rojo_nombre": rojo.nombre,
        "peleador_azul_nombre": azul.nombre,
    }


def _obtener_o_crear_peleador(db: Session, nombre: str) -> Peleador:
    nombre_limpio = nombre.strip()
    peleador = db.scalar(select(Peleador).where(Peleador.nombre == nombre_limpio))
    if peleador:
        return peleador

    peleador = Peleador(nombre=nombre_limpio)
    db.add(peleador)
    return peleador
