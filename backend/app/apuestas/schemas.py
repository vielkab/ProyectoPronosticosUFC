from pydantic import BaseModel


class ApuestaResumen(BaseModel):
    id: int
    estado: str
    monto: float
    cuota: float
