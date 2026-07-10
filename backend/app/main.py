from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.auth.bootstrap import asegurar_admin_inicial
from app.core.base_de_datos import aplicar_migraciones, inicializar_base_de_datos
from app.core.configuracion import ajustes


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
        allow_origins = [ajustes.frontend_url]

    aplicacion.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @aplicacion.on_event("startup")
    def al_iniciar_aplicacion() -> None:
        aplicar_migraciones()
        inicializar_base_de_datos()
        asegurar_admin_inicial()

    @aplicacion.get("/salud", tags=["salud"])
    def obtener_salud() -> dict[str, str]:
        return {"estado": "ok"}

    aplicacion.include_router(api_router)
    return aplicacion


app = crear_aplicacion()
