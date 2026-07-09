from pydantic import BaseModel, ConfigDict


class FactorPrediccion(BaseModel):
    nombre: str
    peleador_rojo: float
    peleador_azul: float
    peso: float


class PrediccionCombate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    pelea_id: int
    peleador_rojo_id: int
    peleador_azul_id: int
    probabilidad_rojo: float
    probabilidad_azul: float
    factores: list[FactorPrediccion]
    explicacion: str
