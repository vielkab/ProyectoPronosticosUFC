from pydantic import BaseModel


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
