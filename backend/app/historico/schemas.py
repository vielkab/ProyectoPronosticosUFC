from pydantic import BaseModel


class PeleaHistorica(BaseModel):
    fecha: str
    peleador_1: str
    peleador_2: str
    ganador: str


class PaginaPeleasHistoricas(BaseModel):
    page: int
    size: int
    total: int
    items: list[PeleaHistorica]


class RankingHistorico(BaseModel):
    rank: int
    fighter: str
