from __future__ import annotations

from fastapi import HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session
import stripe

from app.apuestas.models import Apuesta
from app.core.configuracion import ajustes
from app.pagos.models import Transaccion
from app.pagos.schemas import CheckoutRespuesta
from app.usuarios.models import Usuario


def crear_checkout_session(db: Session, usuario: Usuario, apuesta_id: int) -> CheckoutRespuesta:
    apuesta = db.get(Apuesta, apuesta_id)
    if not apuesta or apuesta.usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Apuesta no encontrada.")
    if not ajustes.stripe_secret_key.strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe Test Mode no esta configurado. Define STRIPE_SECRET_KEY.",
        )

    stripe.api_key = ajustes.stripe_secret_key
    session = stripe.checkout.Session.create(
        mode="payment",
        payment_method_types=["card"],
        line_items=[
            {
                "price_data": {
                    "currency": "usd",
                    "product_data": {"name": f"Apuesta PronoStats #{apuesta.id}"},
                    "unit_amount": int(round(apuesta.monto * 100)),
                },
                "quantity": 1,
            }
        ],
        success_url=f"{ajustes.frontend_url}/apuestas?stripe=success",
        cancel_url=f"{ajustes.frontend_url}/apuestas?stripe=cancel",
        metadata={"apuesta_id": str(apuesta.id), "usuario_id": str(usuario.id)},
    )

    transaccion = Transaccion(
        usuario_id=usuario.id,
        apuesta_id=apuesta.id,
        stripe_session_id=session.id,
        payment_intent=getattr(session, "payment_intent", None),
        estado="checkout_creado",
        monto=apuesta.monto,
    )
    db.add(transaccion)
    apuesta.estado_pago = "checkout_creado"
    db.commit()

    return CheckoutRespuesta(checkout_url=session.url, session_id=session.id)


async def procesar_webhook_stripe(db: Session, request: Request) -> str:
    payload = await request.body()
    firma = request.headers.get("stripe-signature", "")

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
        _actualizar_transaccion_por_session(db, objeto, "pagado")
    elif tipo == "payment_intent.succeeded":
        _actualizar_transaccion_por_payment_intent(db, objeto, "pagado")
    elif tipo == "payment_intent.payment_failed":
        _actualizar_transaccion_por_payment_intent(db, objeto, "fallido")

    db.commit()
    return tipo


def _actualizar_transaccion_por_session(db: Session, session: dict, estado: str) -> None:
    session_id = session.get("id")
    transaccion = db.scalar(select(Transaccion).where(Transaccion.stripe_session_id == session_id))
    if not transaccion:
        return
    transaccion.estado = estado
    transaccion.payment_intent = session.get("payment_intent")
    transaccion.apuesta.estado_pago = estado


def _actualizar_transaccion_por_payment_intent(db: Session, intent: dict, estado: str) -> None:
    payment_intent = intent.get("id")
    transaccion = db.scalar(select(Transaccion).where(Transaccion.payment_intent == payment_intent))
    if not transaccion:
        return
    transaccion.estado = estado
    transaccion.apuesta.estado_pago = estado
