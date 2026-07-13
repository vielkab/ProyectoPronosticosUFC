from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.auth.bootstrap import asegurar_admin_inicial
from app.core.base_de_datos import aplicar_migraciones, inicializar_base_de_datos
from app.core.configuracion import ajustes
from app.historico.loader import load_historical_datasets
from app.peleadores.seed import poblar_peleadores


def crear_aplicacion() -> FastAPI:
    aplicacion = FastAPI(
        title=ajustes.app_nombre,
        version=ajustes.app_version,
        debug=ajustes.app_debug,
    )

    # En desarrollo permitir orígenes flexibles para evitar errores CORS
    if ajustes.app_env == "desarrollo":
        allow_origins = ["*"]
    else:
        allow_origins = ajustes.frontend_origenes_permitidos

    aplicacion.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @aplicacion.on_event("startup")
    def al_iniciar_aplicacion() -> None:
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            load_historical_datasets()
        except Exception as e:
            logger.error("Error al cargar datasets historicos: %s", str(e), exc_info=True)

        try:
            aplicar_migraciones()
            inicializar_base_de_datos()
            asegurar_admin_inicial()
            logger.info("Base de datos inicializada correctamente en el arranque.")
        except Exception as e:
            logger.error("Error critico durante la inicializacion de la base de datos en el arranque: %s", str(e), exc_info=True)

    @aplicacion.get("/salud", tags=["salud"])
    def obtener_salud() -> dict[str, str]:
        return {"estado": "ok"}

    @aplicacion.get("/debug-status", tags=["salud"])
    def obtener_estado_debug() -> dict:
        from sqlalchemy import text
        from app.core.base_de_datos import engine
        
        estado = {
            "app_env": ajustes.app_env,
            "database_url_configurada": bool(ajustes.database_url),
            "database_url_es_defecto": "localhost:5432" in ajustes.database_url,
            "stripe_configurado": bool(ajustes.stripe_secret_key.strip()),
            "smtp_configurado": bool(ajustes.smtp_host.strip()),
            "resend_configurado": bool(ajustes.resend_api_key.strip()),
            "guardar_codigos_desarrollo": ajustes.guardar_codigos_desarrollo,
            "base_datos_conexion": "Desconocido",
            "base_datos_error": None
        }
        
        try:
            with engine.connect() as conexion:
                conexion.execute(text("SELECT 1"))
            estado["base_datos_conexion"] = "Conexión exitosa"
        except Exception as e:
            estado["base_datos_conexion"] = "Fallo de conexión"
            estado["base_datos_error"] = str(e)
            
        return estado

    aplicacion.include_router(api_router)
    return aplicacion


app = crear_aplicacion()
