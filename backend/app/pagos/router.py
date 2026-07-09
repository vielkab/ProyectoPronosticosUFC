from fastapi import APIRouter

from app.pagos.schemas import PagoRespuesta

router = APIRouter(prefix="/pagos", tags=["pagos"])


@router.post("/webhook", response_model=PagoRespuesta)
def webhook_stripe() -> PagoRespuesta:
    return PagoRespuesta(mensaje="Webhook pendiente de implementación")
