from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.auth.dependencias import obtener_usuario_actual
from app.core.base_de_datos import obtener_db
from app.core import configuracion
# Importamos los esquemas y las funciones del servicio
from app.pagos.schemas import CheckoutEntrada, CheckoutRespuesta, PagoRespuesta
from app.pagos.service import crear_checkout_session, procesar_webhook_stripe, _procesar_recarga_webhook
from app.usuarios.models import Usuario

router = APIRouter(prefix="/pagos", tags=["pagos"])


@router.post("/checkout", response_model=CheckoutRespuesta)
def crear_checkout_endpoint(
    payload: CheckoutEntrada,
    request: Request,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(obtener_db),
) -> CheckoutRespuesta:
    
    # 🌟 INTERCEPCIÓN EN MODO DESARROLLO (Bypass local directo)
    if configuracion.settings.APP_ENV == "desarrollo":
        # 1. Armamos el diccionario simulado imitando la estructura de Stripe
        objeto_simulado = {
            "amount_total": 2000,  # Representa $20.00 en tus pruebas
            "metadata": {
                "usuario_id": str(usuario_actual.id),
                "tipo": "recarga"
            }
        }
        
        # 2. Impactamos la función que guarda los créditos usando la misma transacción
        _procesar_recarga_webhook(db, objeto_simulado)
        
        # 3. Confirmamos los cambios de inmediato en PostgreSQL
        db.commit()
        print(f"🚀 [Stripe Bypass Directo] Créditos sumados con éxito para el usuario ID: {usuario_actual.id}")
        
        origen_frontend = request.headers.get("origin") or configuracion.settings.FRONTEND_URL
        if origen_frontend.endswith("/"):
            origen_frontend = origen_frontend[:-1]

        # 4. Devolvemos la URL del frontend para que redirija al instante
        return CheckoutRespuesta(
            url=f"{origen_frontend}/billetera?status=success"
        )

    # -----------------------------------------------------------------
    # FLUJO REAL (PRODUCCIÓN)
    # -----------------------------------------------------------------
    return crear_checkout_session(db, usuario_actual, payload.apuesta_id)


@router.post("/webhook", response_model=PagoRespuesta)
async def webhook_stripe(request: Request, db: Session = Depends(obtener_db)) -> PagoRespuesta:
    # Este endpoint queda intacto por si en producción se necesita recibir los eventos reales de Stripe
    evento = await procesar_webhook_stripe(db, request)
    return PagoRespuesta(mensaje=f"Evento procesado: {evento}")