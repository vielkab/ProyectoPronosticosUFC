from pydantic import BaseModel, ConfigDict, Field


class FactorPrediccion(BaseModel):
    nombre: str
    peleador_rojo: float
    peleador_azul: float
    peso: float


class OpcionMercado(BaseModel):
    probability: float
    odds: float | None


class PrediccionCombate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    pelea_id: int
    peleador_rojo_id: int
    peleador_azul_id: int
    probabilidad_rojo: float
    probabilidad_azul: float
    cuota_rojo: float
    cuota_azul: float
    cuota_rojo_con_pronostico: float  # cuota × 0.90
    cuota_azul_con_pronostico: float  # cuota × 0.90
    method: dict[str, OpcionMercado] = Field(default_factory=dict)
    round: dict[str, OpcionMercado] = Field(default_factory=dict)
    method_disponible: bool = False
    round_disponible: bool = False
    factores: list[FactorPrediccion]
    explicacion: str
