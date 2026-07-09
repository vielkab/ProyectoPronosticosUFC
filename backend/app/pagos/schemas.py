from pydantic import BaseModel


class PagoRespuesta(BaseModel):
    mensaje: str
