from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.apuestas.models import Apuesta
from app.apuestas.schemas import ApuestaEntrada
from app.eventos.models import Pelea
from app.eventos.service import _asegurar_datos_demo
from app.usuarios.models import Usuario


def crear_apuesta(db: Session, usuario: Usuario, payload: ApuestaEntrada) -> Apuesta:
    _asegurar_datos_demo(db)
    pelea = db.get(Pelea, payload.pelea_id)
    if not pelea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pelea no encontrada.")

    if payload.peleador_seleccionado_id not in {pelea.peleador_rojo_id, pelea.peleador_azul_id}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El peleador seleccionado no pertenece a esta pelea.",
        )

    apuesta = Apuesta(
        usuario_id=usuario.id,
        pelea_id=payload.pelea_id,
        peleador_seleccionado_id=payload.peleador_seleccionado_id,
        monto=payload.monto,
        metodo_victoria=payload.metodo_victoria,
        round=payload.round,
        cuota=1.8,
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
