from fastapi import APIRouter

from app.billetera.schemas import BilleteraResumen

router = APIRouter(prefix="/billetera", tags=["billetera"])


@router.get("", response_model=BilleteraResumen)
def obtener_billetera() -> BilleteraResumen:
    return BilleteraResumen(saldo=0.0, moneda="USD")


@router.post("/depositos", response_model=BilleteraResumen)
def crear_deposito() -> BilleteraResumen:
    return BilleteraResumen(saldo=50.0, moneda="USD")
