from pydantic import BaseModel


class EventoResumen(BaseModel):
    id: int
    nombre: str
    fecha: str
    sede: str
