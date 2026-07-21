from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import select, delete, func
import stripe

from app.auth.dependencias import obtener_usuario_actual
from app.core.base_de_datos import obtener_db
from app.core.configuracion import ajustes
from app.usuarios.models import Usuario
from app.billetera.models import Billetera, Recarga
from app.billetera.schemas import (
    BilleteraResumen,
    RecargaEntrada,
    CheckoutRespuestaRecarga,
    ConfirmarRecargaEntrada,
    RecargaResumenSchema,
)

router = APIRouter(tags=["billetera"])


@router.get("", response_model=BilleteraResumen)
def obtener_billetera(
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(obtener_db),
) -> BilleteraResumen:
    """Obtiene el saldo actual de la billetera del usuario y su historial reciente."""
    billetera = db.scalar(select(Billetera).where(Billetera.usuario_id == usuario_actual.id))
    if not billetera:
        billetera = Billetera(usuario_id=usuario_actual.id, saldo=0.0, moneda="USD")
        db.add(billetera)
        db.commit()
        db.refresh(billetera)

    # Obtener el historial limitado a las 5 recargas más recientes
    recargas_query = (
        select(Recarga)
        .where(Recarga.usuario_id == usuario_actual.id)
        .order_by(Recarga.creado_en.desc())
        .limit(5)
    )
    recargas = db.scalars(recargas_query).all()
    
    recientes = [
        RecargaResumenSchema(
            monto=r.monto,
            estado=r.estado,
            creado_en=r.creado_en
        )
        for r in recargas
    ]

    return BilleteraResumen(saldo=billetera.saldo, moneda=billetera.moneda, recientes=recientes)


@router.post("/recargar", response_model=CheckoutRespuestaRecarga)
def recargar_creditos(
    payload: RecargaEntrada,
    request: Request,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(obtener_db),
) -> CheckoutRespuestaRecarga:
    """Inicia un proceso de recarga de créditos (moneda virtual) usando Stripe Checkout."""
    if payload.monto <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El monto de la recarga debe ser mayor a cero.",
        )

    # Validar el límite diario de recarga (5000 créditos por día / 24 horas)
    limite_tiempo = datetime.now(timezone.utc) - timedelta(days=1)
    total_recar_24h = db.scalar(
        select(func.coalesce(func.sum(Recarga.monto), 0.0))
        .where(
            Recarga.usuario_id == usuario_actual.id,
            Recarga.estado == "completado",
            Recarga.creado_en >= limite_tiempo,
        )
    )

    if total_recar_24h + payload.monto > ajustes.limite_diario_recarga:
        cupo_disponible = max(0.0, ajustes.limite_diario_recarga - total_recar_24h)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Has excedido el limite diario de recargas. El limite maximo es de {int(ajustes.limite_diario_recarga)} creditos por dia (24 horas). "
                f"Has recargado {total_recar_24h:.2f} creditos en las ultimas 24 horas. Cupo disponible: {cupo_disponible:.2f} creditos."
            ),
        )

    if not ajustes.stripe_secret_key.strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe Test Mode no esta configurado. Define la variable de entorno STRIPE_SECRET_KEY.",
        )

    stripe.api_key = ajustes.stripe_secret_key
    origen_frontend = request.headers.get("origin") or ajustes.frontend_url_base
    if not origen_frontend.strip() and ajustes.es_desarrollo:
        origen_frontend = "http://localhost:5173"
    if origen_frontend.endswith("/"):
        origen_frontend = origen_frontend[:-1]

    try:
        # Configuramos success_url para incluir el session_id dinámico de Stripe Checkout
        session = stripe.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": "Recarga de Créditos (Moneda Virtual)",
                            "description": f"Recarga para la cuenta de {usuario_actual.nombre}",
                        },
                        "unit_amount": int(round(payload.monto * 100)),
                    },
                    "quantity": 1,
                }
            ],
            success_url=f"{origen_frontend}/billetera?stripe=success&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{origen_frontend}/billetera?stripe=cancel",
            metadata={
                "tipo": "recarga",
                "usuario_id": str(usuario_actual.id),
                "monto": str(payload.monto),
            },
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear sesión de pago en Stripe: {str(e)}",
        )

    return CheckoutRespuestaRecarga(checkout_url=session.url, session_id=session.id)


@router.post("/confirmar", response_model=BilleteraResumen)
def confirmar_recarga(
    payload: ConfirmarRecargaEntrada,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(obtener_db),
) -> BilleteraResumen:
    """Verifica el estado del pago directamente en Stripe y acredita el saldo al usuario."""
    if not ajustes.stripe_secret_key.strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe Test Mode no esta configurado. Define la variable de entorno STRIPE_SECRET_KEY.",
        )

    stripe.api_key = ajustes.stripe_secret_key

    # 1. Comprobar si ya procesamos esta recarga para evitar duplicar saldo
    recarga_existente = db.scalar(
        select(Recarga).where(Recarga.stripe_session_id == payload.session_id)
    )
    if recarga_existente:
        return obtener_billetera(usuario_actual, db)

    # 2. Consultar el estado de la sesión en Stripe
    try:
        session = stripe.checkout.Session.retrieve(payload.session_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se pudo verificar la sesión de Stripe: {str(e)}",
        )

    if session.payment_status != "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La sesión de Stripe no se ha pagado.",
        )

    # 3. Validar que la recarga pertenece al usuario autenticado
    metadata = session.get("metadata", {})
    metadata_usuario_id = metadata.get("usuario_id")
    monto_str = metadata.get("monto")

    if not metadata_usuario_id or int(metadata_usuario_id) != usuario_actual.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta transacción de recarga no pertenece a tu usuario.",
        )

    try:
        monto = float(monto_str) if monto_str else (session.amount_total / 100.0)
    except ValueError:
        monto = session.amount_total / 100.0

    # 4. Actualizar el saldo
    billetera = db.scalar(select(Billetera).where(Billetera.usuario_id == usuario_actual.id))
    if not billetera:
        billetera = Billetera(usuario_id=usuario_actual.id, saldo=0.0, moneda="USD")
        db.add(billetera)

    billetera.saldo += monto

    # 5. Guardar registro en el historial de recargas
    nueva_recarga = Recarga(
        usuario_id=usuario_actual.id,
        stripe_session_id=payload.session_id,
        monto=monto,
        estado="completado"
    )
    db.add(nueva_recarga)
    db.flush()

    # 6. Limpieza automática del historial: mantener las últimas 5 recargas para ahorrar recursos,
    # pero nunca eliminar recargas de las últimas 24 horas para poder validar el límite diario.
    limite = 5
    ids_recientes_query = (
        select(Recarga.id)
        .where(Recarga.usuario_id == usuario_actual.id)
        .order_by(Recarga.creado_en.desc())
        .limit(limite)
    )
    ids_recientes = db.scalars(ids_recientes_query).all()
    if ids_recientes:
        limite_tiempo = datetime.now(timezone.utc) - timedelta(days=1)
        db.execute(
            delete(Recarga)
            .where(Recarga.usuario_id == usuario_actual.id)
            .where(Recarga.id.not_in(ids_recientes))
            .where(Recarga.creado_en < limite_tiempo)
        )

    db.commit()

    return obtener_billetera(usuario_actual, db)
