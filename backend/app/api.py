from fastapi import APIRouter

# Importamos tu nuevo router simplificado de Clerk
from app.auth.router import router as auth_router

# Importamos los demás routers de tu aplicación 
# (Ajusta los nombres de las carpetas si varían un poco en tu estructura)
from app.usuarios.router import router as usuarios_router
from app.apuestas.router import router as apuestas_router
from app.billetera.router import router as billetera_router
from app.eventos.router import router as eventos_router
from app.historico.router import router as historico_router
from app.pagos.router import router as pagos_router
from app.peleadores.router import router as peleadores_router
from app.predicciones.router import router as predicciones_router
from app.admin.router import router as admin_router

api_router = APIRouter()

# Vinculamos el nuevo flujo de autenticación de Clerk
api_router.include_router(auth_router)

# Vinculamos el resto de tus módulos académicos
api_router.include_router(usuarios_router)
api_router.include_router(apuestas_router)
api_router.include_router(billetera_router)
api_router.include_router(eventos_router)
api_router.include_router(historico_router)
api_router.include_router(pagos_router)
api_router.include_router(peleadores_router)
api_router.include_router(predicciones_router)
api_router.include_router(admin_router)