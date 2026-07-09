from pydantic import BaseModel


class BilleteraResumen(BaseModel):
    saldo: float
    moneda: str
