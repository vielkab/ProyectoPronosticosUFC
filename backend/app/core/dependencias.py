from collections.abc import Generator

from sqlalchemy.orm import Session

from app.core.base_de_datos import obtener_db


def obtener_sesion() -> Generator[Session, None, None]:
    yield from obtener_db()
