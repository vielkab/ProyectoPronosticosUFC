from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.configuracion import ajustes

ALGORITMO_JWT = "HS256"
MINUTOS_REFRESH = 60 * 24 * 7


def generar_hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verificar_password(password_plano: str, password_hash: str) -> bool:
    return bcrypt.checkpw(
        password_plano.encode("utf-8"),
        password_hash.encode("utf-8"),
    )


def crear_token_acceso(subject: str) -> str:
    expiracion = datetime.now(timezone.utc) + timedelta(minutes=ajustes.jwt_expire_minutes)
    payload = {"sub": subject, "type": "access", "exp": expiracion}
    return jwt.encode(payload, ajustes.jwt_secret, algorithm=ALGORITMO_JWT)


def crear_token_refresh(subject: str) -> str:
    expiracion = datetime.now(timezone.utc) + timedelta(minutes=MINUTOS_REFRESH)
    payload = {"sub": subject, "type": "refresh", "exp": expiracion}
    return jwt.encode(payload, ajustes.jwt_secret, algorithm=ALGORITMO_JWT)


def decodificar_token(token: str) -> dict:
    return jwt.decode(token, ajustes.jwt_secret, algorithms=[ALGORITMO_JWT])
