import json
import stripe
from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

# Importamos la configuración local para detectar el entorno
from app.core.configuracion import ajustes

# (Aquí se mantienen las importaciones de tus esquemas o modelos si las tienen arriba)
# from app.pagos.schemas import ... 

async def procesar_webhook_stripe(db: Session, request: Request) -> str:
    payload = await request.body()
    firma = request.headers.get("stripe-signature", "")

    # 🌟 BYPASS PARA DESARROLLO LOCAL
    # Intercepta el JSON simulado antes de que pase por la validación estricta de Stripe
    if ajustes.es_desarrollo:
        evento = json.loads(payload)
        tipo = evento["type"]
        objeto = evento["data"]["object"]
        
        if tipo == "checkout.session.completed":
            metadata = objeto.get("metadata", {})
            if metadata.get("tipo") == "recarga":
                _procesar_recarga_webhook(db, objeto)
            else:
                _actualizar_transaccion_por_session(db, objeto, "pagado")
                
        db.commit()
        return tipo

    # -----------------------------------------------------------------
    # FLUJO REAL DE PRODUCCIÓN (Solo corre si APP_ENV no es 'desarrollo')
    # -----------------------------------------------------------------
    if not ajustes.stripe_webhook_secret.strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe webhook no esta configurado. Define STRIPE_WEBHOOK_SECRET.",
        )

    try:
        evento = stripe.Webhook.construct_event(payload, firma, ajustes.stripe_webhook_secret)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payload invalido.") from error
    except stripe.SignatureVerificationError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Firma Stripe invalida.") from error

    tipo = evento["type"]
    objeto = evento["data"]["object"]

    if tipo == "checkout.session.completed":
        metadata = objeto.get("metadata", {})
        if metadata.get("tipo") == "recarga":
            _procesar_recarga_webhook(db, objeto)
        else:
            _actualizar_transaccion_por_session(db, objeto, "pagado")
    elif tipo == "payment_intent.succeeded":
        metadata = objeto.get("metadata", {})
        if metadata.get("tipo") == "recarga":
            _procesar_recarga_webhook(db, objeto)
        else:
            _actualizar_transaccion_por_payment_intent(db, objeto, "pagado")
    elif tipo == "payment_intent.payment_failed":
        _actualizar_transaccion_por_payment_intent(db, objeto, "fallido")

    db.commit()
    return tipo


# -----------------------------------------------------------------
# FUNCIONES AUXILIARES (Mantén las que tus compañeros ya programaron abajo)
# -----------------------------------------------------------------
def crear_checkout_session(db: Session, usuario, apuesta_id):
    # Aquí va el código original de tus compañeros para crear la sesión real
    pass

def _procesar_recarga_webhook(db: Session, objeto):
    # Aquí va el código original de tus compañeros que suma los créditos en la DB
    pass

def _actualizar_transaccion_por_session(db: Session, objeto, estado):
    # Aquí va el código original de tus compañeros
    pass

def _actualizar_transaccion_por_payment_intent(db: Session, objeto, estado):
    # Aquí va el código original de tus compañeros
    pass