from fastapi import APIRouter

# Importamos tu nuevo router simplificado de Clerk
from app.auth.router import router as auth_router

# Importamos los demás routers de tu aplicación 
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

# 🔑 Vinculamos el flujo de autenticación de Clerk con su prefijo correspondiente
# Esto evitará el error 404 si el frontend busca en '/auth' o '/api/auth'
api_router.include_router(auth_router, prefix="/auth", tags=["autenticacion"])

# 👥 Vinculamos el resto de tus módulos académicos con sus respectivos prefijos organizados
api_router.include_router(usuarios_router, prefix="/usuarios", tags=["usuarios"])
api_router.include_router(apuestas_router, prefix="/apuestas", tags=["apuestas"])
api_router.include_router(billetera_router, prefix="/billetera", tags=["billetera"])
api_router.include_router(eventos_router, prefix="/eventos", tags=["eventos"])
# Rutas con path completo (/historico/peleas, /rankings) — sin prefijo adicional
api_router.include_router(historico_router, tags=["historico"])
api_router.include_router(pagos_router, prefix="/pagos", tags=["pagos"])
api_router.include_router(peleadores_router, prefix="/peleadores", tags=["peleadores"])
api_router.include_router(predicciones_router, prefix="/predicciones", tags=["predicciones"])
api_router.include_router(admin_router, prefix="/admin", tags=["admin"])