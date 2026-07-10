from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr


class UsuarioPublico(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    correo: EmailStr
    rol: str


class PerfilUsuario(UsuarioPublico):
    activo: bool
    cedula: str | None = None
    fecha_nacimiento: datetime | None = None
    acepta_terminos: bool = False

