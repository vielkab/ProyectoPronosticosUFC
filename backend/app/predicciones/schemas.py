from pydantic import BaseModel


class PrediccionCombate(BaseModel):
    pelea_id: int
    peleador_a: int
    peleador_b: int
