from datetime import date

from pydantic import BaseModel, Field


class ResumenAdmin(BaseModel):
    usuarios: int
    apuestas: int
    eventos: int
    ingresos: float
    predicciones: int
    aciertos: int
    errores: int
    precision: float


class SincronizacionRespuesta(BaseModel):
    eventos: int
    peleas: int
    peleadores: int
    fuente: str


class CrearPeleaCarteleraEntrada(BaseModel):
    evento_nombre: str = Field(min_length=2, max_length=160)
    fecha: date
    sede: str = Field(default="", max_length=160)
    estado_evento: str = Field(default="programado", max_length=30)
    peleador_rojo_nombre: str = Field(min_length=2, max_length=140)
    peleador_azul_nombre: str = Field(min_length=2, max_length=140)
    division: str = Field(default="", max_length=80)
    orden: int = Field(default=1, ge=1)
    estado_pelea: str = Field(default="programada", max_length=30)
