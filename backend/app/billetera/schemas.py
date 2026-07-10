from datetime import datetime
from pydantic import BaseModel, Field


class RecargaResumenSchema(BaseModel):
    monto: float
    estado: str
    creado_en: datetime


class BilleteraResumen(BaseModel):
    saldo: float
    moneda: str
    recientes: list[RecargaResumenSchema] = []


class RecargaEntrada(BaseModel):
    monto: float = Field(..., gt=0, description="Monto a recargar en la billetera")


class CheckoutRespuestaRecarga(BaseModel):
    checkout_url: str
    session_id: str


class ConfirmarRecargaEntrada(BaseModel):
    session_id: str = Field(..., description="ID de la sesión de Stripe Checkout")
