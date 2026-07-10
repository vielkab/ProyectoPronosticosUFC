from datetime import date, datetime
from pydantic import BaseModel, EmailStr, Field, field_validator

from app.usuarios.schemas import UsuarioPublico


def normalizar_usuario(usuario: str) -> str:
    usuario_limpio = " ".join(usuario.strip().split())
    if len(usuario_limpio) < 3:
        raise ValueError("El usuario debe tener al menos 3 caracteres.")
    if len(usuario_limpio) > 30:
        raise ValueError("El usuario no puede superar los 30 caracteres.")
    if not all(caracter.isalnum() or caracter in "._- " for caracter in usuario_limpio):
        raise ValueError("El usuario solo puede incluir letras, numeros, espacios, puntos, guiones o guion bajo.")
    return usuario_limpio


def validar_password_segura(password: str) -> str:
    if len(password) < 8:
        raise ValueError("La contrasena debe tener al menos 8 caracteres.")
    if not any(caracter.isupper() for caracter in password):
        raise ValueError("La contrasena debe incluir al menos una mayuscula.")
    if not any(caracter.islower() for caracter in password):
        raise ValueError("La contrasena debe incluir al menos una minuscula.")
    if not any(caracter.isdigit() for caracter in password):
        raise ValueError("La contrasena debe incluir al menos un numero.")
    return password


class RegistroUsuarioEntrada(BaseModel):
    usuario: str = Field(min_length=3, max_length=30)
    correo: EmailStr
    password: str = Field(min_length=8, max_length=128)
    cedula: str = Field(min_length=5, max_length=30)
    fecha_nacimiento: datetime
    acepta_terminos: bool

    @field_validator("usuario")
    @classmethod
    def validar_usuario(cls, value: str) -> str:
        return normalizar_usuario(value)

    @field_validator("password")
    @classmethod
    def validar_password(cls, value: str) -> str:
        return validar_password_segura(value)

    @field_validator("cedula")
    @classmethod
    def validar_cedula(cls, value: str) -> str:
        value_clean = value.strip()
        if not value_clean:
            raise ValueError("La cedula no puede estar vacia.")
        if not all(c.isdigit() or c == "-" for c in value_clean):
            raise ValueError("La cedula solo puede contener numeros y guiones.")
        return value_clean

    @field_validator("fecha_nacimiento")
    @classmethod
    def validar_edad(cls, value: datetime) -> datetime:
        hoy = date.today()
        fecha_nac = value.date()
        edad = hoy.year - fecha_nac.year - ((hoy.month, hoy.day) < (fecha_nac.month, fecha_nac.day))
        if edad < 18:
            raise ValueError("Debes ser mayor de edad (18 anos o mas) para registrarte.")
        return value

    @field_validator("acepta_terminos")
    @classmethod
    def validar_acepta_terminos(cls, value: bool) -> bool:
        if not value:
            raise ValueError("Debes aceptar los terminos y condiciones y declarar la mayoria de edad.")
        return value



class VerificarRegistroEntrada(BaseModel):
    correo: EmailStr
    codigo: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class LoginEntrada(BaseModel):
    usuario: str = Field(min_length=3, max_length=30)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("usuario")
    @classmethod
    def validar_usuario(cls, value: str) -> str:
        return normalizar_usuario(value)


class RefreshEntrada(BaseModel):
    refresh_token: str


class SolicitudRecuperacionEntrada(BaseModel):
    usuario: str = Field(min_length=3, max_length=30)

    @field_validator("usuario")
    @classmethod
    def validar_usuario(cls, value: str) -> str:
        return normalizar_usuario(value)


class VerificarRecuperacionEntrada(BaseModel):
    usuario: str = Field(min_length=3, max_length=30)
    codigo: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")

    @field_validator("usuario")
    @classmethod
    def validar_usuario(cls, value: str) -> str:
        return normalizar_usuario(value)


class RestablecerPasswordEntrada(BaseModel):
    usuario: str = Field(min_length=3, max_length=30)
    codigo: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
    password: str = Field(min_length=8, max_length=128)

    @field_validator("usuario")
    @classmethod
    def validar_usuario(cls, value: str) -> str:
        return normalizar_usuario(value)

    @field_validator("password")
    @classmethod
    def validar_password(cls, value: str) -> str:
        return validar_password_segura(value)


class MensajeAuth(BaseModel):
    mensaje: str


class TokensRespuesta(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    usuario: UsuarioPublico
