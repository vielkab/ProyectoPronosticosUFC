from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CheckoutEntrada(BaseModel):
    apuesta_id: int


class CheckoutRespuesta(BaseModel):
    checkout_url: str
    session_id: str


class PagoRespuesta(BaseModel):
    mensaje: str


class TransaccionSalida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario_id: int
    apuesta_id: int
    stripe_session_id: str | None
    payment_intent: str | None
    estado: str
    monto: float
    creado_en: datetime
