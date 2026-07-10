from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class PeleadorEnPelea(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    division: str
    pais: str
    record: str
    edad: int | None = None
    altura_cm: float | None = None
    alcance_cm: float | None = None
    win_rate: float
    ultimas_cinco: str
    significant_strikes_pm: float
    takedown_accuracy: float
    takedown_defense: float


class PeleaResumen(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    evento_id: int
    peleador_rojo_id: int
    peleador_azul_id: int
    division: str
    estado: str
    orden: int
    peleador_rojo: PeleadorEnPelea
    peleador_azul: PeleadorEnPelea


class PeleaCarteleraResumen(BaseModel):
    id: int
    evento_nombre: str
    fecha: date
    sede: str
    estado_evento: str
    division: str
    orden: int
    peleador_rojo_nombre: str
    peleador_azul_nombre: str


class EventoResumen(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    fecha: date
    sede: str
    estado: str


class EventoDetalle(EventoResumen):
    peleas: list[PeleaResumen] = Field(default_factory=list)


class SincronizacionRespuesta(BaseModel):
    eventos: int
    peleas: int
    peleadores: int
    fuente: str


class ResultadoEntrada(BaseModel):
    ganador_id: int
    metodo: str = Field(default="", max_length=60)
    round: int | None = Field(default=None, ge=1, le=5)


class ResultadoSalida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pelea_id: int
    ganador_id: int
    metodo: str
    round: int | None
