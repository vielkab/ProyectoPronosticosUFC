from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.admin.schemas import ResumenAdmin
from app.apuestas.models import Apuesta
from app.eventos.models import Evento
from app.eventos.service import _asegurar_datos_demo
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
