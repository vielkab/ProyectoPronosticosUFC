from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ApuestaEntrada(BaseModel):
    pelea_id: int
    peleador_seleccionado_id: int
    monto: float = Field(gt=0)
    metodo_victoria: str | None = Field(default=None, max_length=60)
    round: int | None = Field(default=None, ge=1, le=5)


class ApuestaResumen(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    estado: str
    estado_pago: str
    monto: float
    cuota: float
    pelea_id: int
    peleador_seleccionado_id: int
    metodo_victoria: str | None = None
    round: int | None = None
    creado_en: datetime
