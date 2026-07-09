from pydantic import BaseModel


class PeleadorResumen(BaseModel):
    id: int
    nombre: str
    division: str
    pais: str
    busqueda: str | None = None
