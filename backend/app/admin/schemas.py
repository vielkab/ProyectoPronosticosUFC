from pydantic import BaseModel


class ResumenAdmin(BaseModel):
    usuarios: int
    apuestas: int
    eventos: int
