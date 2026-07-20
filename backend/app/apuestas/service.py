from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.apuestas.models import Apuesta
from app.apuestas.schemas import ApuestaEntrada
from app.billetera.models import Billetera
from app.eventos.models import Pelea
from app.predicciones.models import Prediccion
from app.predicciones.service import DESCUENTO_VER_PRONOSTICO
from app.usuarios.models import Usuario


def crear_apuesta(db: Session, usuario: Usuario, payload: ApuestaEntrada) -> Apuesta:
    pelea = db.get(Pelea, payload.pelea_id)
    if not pelea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pelea no encontrada.")

    if pelea.estado not in {"programada", "en_curso"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pueden aceptar apuestas para una pelea finalizada o cancelada.",
        )

    if payload.peleador_seleccionado_id not in {pelea.peleador_rojo_id, pelea.peleador_azul_id}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El peleador seleccionado no pertenece a esta pelea.",
        )

    # Obtener o calcular cuota desde predicción
    prediccion = db.scalar(select(Prediccion).where(Prediccion.pelea_id == payload.pelea_id))

    if prediccion and prediccion.cuota_rojo and prediccion.cuota_azul:
        if payload.peleador_seleccionado_id == pelea.peleador_rojo_id:
            cuota_base = prediccion.cuota_rojo
        else:
            cuota_base = prediccion.cuota_azul
    else:
        # Fallback: cuota neutra si no hay predicción
        cuota_base = 1.8

    # Aplicar descuento del 10% si el usuario eligió ver el pronóstico
    if payload.ver_pronostico:
        cuota_final = round(cuota_base * (1 - DESCUENTO_VER_PRONOSTICO), 2)
    else:
        cuota_final = cuota_base

    # Validar saldo
    billetera = db.scalar(select(Billetera).where(Billetera.usuario_id == usuario.id))
    if not billetera or billetera.saldo < payload.monto:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Saldo insuficiente para realizar esta apuesta.",
        )

    # Descontar saldo
    billetera.saldo -= payload.monto

    apuesta = Apuesta(
        usuario_id=usuario.id,
        pelea_id=payload.pelea_id,
        peleador_seleccionado_id=payload.peleador_seleccionado_id,
        monto=payload.monto,
        metodo_victoria=payload.metodo_victoria,
        round=payload.round,
        cuota=cuota_final,
        ver_pronostico=payload.ver_pronostico,
        estado="Pendiente",
        estado_pago="pendiente",
    )
    db.add(apuesta)
    db.commit()
    db.refresh(apuesta)
    return apuesta


def listar_historial(db: Session, usuario: Usuario) -> list[Apuesta]:
    return list(
        db.scalars(
            select(Apuesta)
            .where(Apuesta.usuario_id == usuario.id)
            .order_by(Apuesta.creado_en.desc())
        )
    )


def cobrar_apuesta(db: Session, usuario: Usuario, apuesta_id: int) -> Apuesta:
    apuesta = db.scalar(
        select(Apuesta).where(Apuesta.id == apuesta_id, Apuesta.usuario_id == usuario.id)
    )
    if not apuesta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Apuesta no encontrada.")

    if apuesta.estado != "Ganada":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se pueden cobrar apuestas ganadas.",
        )

    if apuesta.estado_pago != "pendiente":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta apuesta ya fue procesada.",
        )

    billetera = db.scalar(select(Billetera).where(Billetera.usuario_id == usuario.id))
    if not billetera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Billetera no encontrada.")

    cobro = db.execute(
        update(Apuesta)
        .where(
            Apuesta.id == apuesta_id,
            Apuesta.usuario_id == usuario.id,
            Apuesta.estado == "Ganada",
            Apuesta.estado_pago == "pendiente",
        )
        .values(estado_pago="pagado")
    )
    if cobro.rowcount != 1:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta apuesta ya fue cobrada.")

    billetera.saldo += apuesta.monto * apuesta.cuota
    db.commit()
    db.refresh(apuesta)
    return apuesta


def retirar_apuesta(db: Session, usuario: Usuario, apuesta_id: int) -> tuple[Apuesta, float, float]:
    """Cancela una apuesta pendiente y devuelve parte de su monto a la billetera."""
    apuesta = db.scalar(
        select(Apuesta).where(Apuesta.id == apuesta_id, Apuesta.usuario_id == usuario.id)
    )
    if not apuesta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Apuesta no encontrada.")

    if apuesta.estado != "Pendiente" or apuesta.estado_pago != "pendiente":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta apuesta ya no está disponible para retiro.",
        )

    pelea = db.get(Pelea, apuesta.pelea_id)
    if not pelea or pelea.estado not in {"programada", "en_curso"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede retirar una apuesta de una pelea finalizada o cancelada.",
        )

    porcentaje = 0.70 if pelea.estado == "en_curso" else 0.90
    reembolso = round(apuesta.monto * porcentaje, 2)
    billetera = db.scalar(select(Billetera).where(Billetera.usuario_id == usuario.id))
    if not billetera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Billetera no encontrada.")

    retiro = db.execute(
        update(Apuesta)
        .where(
            Apuesta.id == apuesta_id,
            Apuesta.usuario_id == usuario.id,
            Apuesta.estado == "Pendiente",
            Apuesta.estado_pago == "pendiente",
        )
        .values(estado="Retirada", estado_pago="reembolsado")
    )
    if retiro.rowcount != 1:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta apuesta ya fue procesada.")

    billetera.saldo += reembolso
    db.commit()
    db.refresh(apuesta)
    return apuesta, reembolso, porcentaje


def procesar_resultados_pelea(db: Session, pelea_id: int, peleador_ganador_id: int) -> dict:
    """Resuelve apuestas pendientes; las ganadas quedan disponibles para cobro."""

    apuestas = db.scalars(
        select(Apuesta).where(Apuesta.pelea_id == pelea_id, Apuesta.estado == "Pendiente")
    ).all()

    ganadas = 0
    perdidas = 0
    for apuesta in apuestas:
        if apuesta.peleador_seleccionado_id == peleador_ganador_id:
            apuesta.estado = "Ganada"
            apuesta.estado_pago = "pendiente"
            ganadas += 1
        else:
            apuesta.estado = "Perdida"
            apuesta.estado_pago = "completado"
            perdidas += 1

    db.commit()
    return {"apuestas_ganadas": ganadas, "apuestas_perdidas": perdidas}


def obtener_estadisticas_usuario(db: Session, usuario: Usuario) -> dict:
    apuestas = db.scalars(select(Apuesta).where(Apuesta.usuario_id == usuario.id)).all()
    ganadas = sum(1 for a in apuestas if a.estado == "Ganada")
    perdidas = sum(1 for a in apuestas if a.estado == "Perdida")
    pendientes = sum(1 for a in apuestas if a.estado == "Pendiente")
    total = ganadas + perdidas
    return {
        "aciertos": ganadas,
        "fallos": perdidas,
        "pendientes": pendientes,
        "efectividad": round(ganadas / total * 100, 2) if total else 0.0,
        "total_apuestas": len(apuestas),
    }
