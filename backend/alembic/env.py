from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core import modelos  # noqa: F401
from app.core.base import Base
from app.core.configuracion import ajustes

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Usamos la URL que ya esté en la configuración (por ejemplo, si se cambió dinámicamente a SQLite),
# de lo contrario, usamos la de ajustes.
url = config.get_main_option("sqlalchemy.url")
if not url:
    url = ajustes.database_url
    config.set_main_option("sqlalchemy.url", url)

target_metadata = Base.metadata


def ejecutar_migraciones_offline() -> None:
    url_actual = config.get_main_option("sqlalchemy.url") or url
    context.configure(
        url=url_actual,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def ejecutar_migraciones_online() -> None:
    configuracion = config.get_section(config.config_ini_section, {})
    url_actual = config.get_main_option("sqlalchemy.url") or url
    configuracion["sqlalchemy.url"] = url_actual

    engine = engine_from_config(
        configuracion,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with engine.connect() as conexion:
        context.configure(connection=conexion, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    ejecutar_migraciones_offline()
else:
    ejecutar_migraciones_online()
