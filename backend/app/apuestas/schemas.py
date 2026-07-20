from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ApuestaEntrada(BaseModel):
    pelea_id: int
    peleador_seleccionado_id: int
    monto: float = Field(gt=0)
    metodo_victoria: str | None = Field(default=None, max_length=60)
    round: int | None = Field(default=None, ge=1, le=5)
    ver_pronostico: bool = Field(default=False)


class ApuestaResumen(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    estado: str
    estado_pago: str
    monto: float
    cuota: float
    ver_pronostico: bool
    pelea_id: int
    peleador_seleccionado_id: int
    metodo_victoria: str | None = None
    round: int | None = None
    porcentaje_retiro: float | None = None
    monto_reembolso: float | None = None
    creado_en: datetime


class RetiroApuestaRespuesta(BaseModel):
    apuesta: ApuestaResumen
    reembolso: float
    porcentaje_reembolso: float
