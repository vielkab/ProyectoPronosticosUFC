from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.auth.dependencias import obtener_usuario_actual
from app.core.base_de_datos import obtener_db
from app.pagos.schemas import CheckoutEntrada, CheckoutRespuesta, PagoRespuesta
from app.pagos.service import crear_checkout_session, procesar_webhook_stripe
from app.usuarios.models import Usuario

router = APIRouter(prefix="/pagos", tags=["pagos"])


@router.post("/checkout", response_model=CheckoutRespuesta)
def crear_checkout_endpoint(
    payload: CheckoutEntrada,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(obtener_db),
) -> CheckoutRespuesta:
    return crear_checkout_session(db, usuario_actual, payload.apuesta_id)


@router.post("/webhook", response_model=PagoRespuesta)
async def webhook_stripe(request: Request, db: Session = Depends(obtener_db)) -> PagoRespuesta:
    evento = await procesar_webhook_stripe(db, request)
    return PagoRespuesta(mensaje=f"Evento procesado: {evento}")
