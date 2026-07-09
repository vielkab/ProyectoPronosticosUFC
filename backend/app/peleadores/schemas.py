from pydantic import BaseModel, ConfigDict


class PeleadorResumen(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    division: str
    pais: str
    record: str
    edad: int | None = None
    altura_cm: float | None = None
    alcance_cm: float | None = None


class PeleadorDetalle(PeleadorResumen):
    win_rate: float
    ultimas_cinco: str
    significant_strikes_pm: float
    takedown_accuracy: float
    takedown_defense: float
    estadisticas: dict | None = None
