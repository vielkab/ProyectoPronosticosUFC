from collections.abc import Generator
import logging
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, sessionmaker

from app.core.base import Base
from app.core.configuracion import ajustes
from app.core.modelos import *  # noqa: F403,F401

logger = logging.getLogger(__name__)

engine = None
SesionLocal = sessionmaker(autoflush=False, autocommit=False, class_=Session)


def _construir_url_sqlite_fallback() -> str:
    if ajustes.sqlite_fallback_url.strip():
        return ajustes.sqlite_fallback_url.strip()

    ruta_sqlite = Path(__file__).resolve().parents[2] / "pronostats_dev.db"
    return f"sqlite:///{ruta_sqlite.as_posix()}"


def _obtener_connect_args(database_url: str) -> dict[str, object]:
    if database_url.startswith("postgresql"):
        return {"connect_timeout": 5}

    if database_url.startswith("sqlite"):
        return {"check_same_thread": False}

    return {}


def _crear_engine(database_url: str):
    return create_engine(
        database_url,
        future=True,
        pool_pre_ping=not database_url.startswith("sqlite"),
        connect_args=_obtener_connect_args(database_url),
    )


def configurar_engine(database_url: str) -> None:
    global engine
    engine = _crear_engine(database_url)
    SesionLocal.configure(bind=engine)


def aplicar_migraciones() -> None:
    configuracion = Config(str(Path(__file__).resolve().parents[2] / "alembic.ini"))
    configuracion.set_main_option("sqlalchemy.url", ajustes.database_url)
    command.upgrade(configuracion, "head")


configurar_engine(ajustes.database_url)


def obtener_db() -> Generator[Session, None, None]:
    sesion = SesionLocal()
    try:
        yield sesion
    finally:
        sesion.close()


def _auto_migrar_columnas() -> None:
    from sqlalchemy import inspect
    try:
        inspector = inspect(engine)
        columnas = [col["name"] for col in inspector.get_columns("usuarios")]
        
        with engine.begin() as conexion:
            if "cedula" not in columnas:
                # SQLite no soporta UNIQUE directamente en ALTER TABLE ADD COLUMN de la misma forma en algunas versiones antiguas,
                # pero para este proyecto lo agregamos de manera compatible
                conexion.execute(text("ALTER TABLE usuarios ADD COLUMN cedula VARCHAR(30) NULL"))
                conexion.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_cedula ON usuarios (cedula)"))
            if "fecha_nacimiento" not in columnas:
                # Usamos TIMESTAMP ya que es compatible tanto con SQLite como con PostgreSQL
                conexion.execute(text("ALTER TABLE usuarios ADD COLUMN fecha_nacimiento TIMESTAMP NULL"))
            if "acepta_terminos" not in columnas:
                # Usamos DEFAULT FALSE ya que es el booleano estándar compatible con SQLite y PostgreSQL
                conexion.execute(text("ALTER TABLE usuarios ADD COLUMN acepta_terminos BOOLEAN NOT NULL DEFAULT FALSE"))
    except Exception as e:
        logger.warning("No se pudieron migrar automaticamente las nuevas columnas: %s", str(e))


def _asegurar_indices() -> None:
    with engine.begin() as conexion:
        conexion.execute(
            text("CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_nombre ON usuarios (nombre)")
        )


def inicializar_base_de_datos() -> None:
    try:
        Base.metadata.create_all(bind=engine)
        _auto_migrar_columnas()
        _asegurar_indices()
    except OperationalError:
        puede_hacer_fallback = (
            ajustes.app_env == "desarrollo"
            and ajustes.sqlite_fallback_habilitado
            and ajustes.database_url.startswith("postgresql")
        )

        if not puede_hacer_fallback:
            raise

        url_sqlite = _construir_url_sqlite_fallback()
        logger.warning(
            "No se pudo conectar a PostgreSQL en desarrollo. Se usara SQLite temporalmente en %s",
            url_sqlite,
        )
        configurar_engine(url_sqlite)
        Base.metadata.create_all(bind=engine)
        _auto_migrar_columnas()
        _asegurar_indices()
