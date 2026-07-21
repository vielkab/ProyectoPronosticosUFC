from fastapi import APIRouter, HTTPException, Request, status
from svix.webhooks import Webhook, WebhookVerificationError

from app.core.configuracion import ajustes

router = APIRouter(
    prefix="/auth",
    tags=["Auth Webhooks"]
)


@router.post("/webhook")
async def clerk_webhook(request: Request):
    if not ajustes.clerk_webhook_secret.strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CLERK_WEBHOOK_SECRET no esta configurado.",
        )

    headers = request.headers
    svix_id = headers.get("svix-id")
    svix_timestamp = headers.get("svix-timestamp")
    svix_signature = headers.get("svix-signature")

    if not (svix_id and svix_timestamp and svix_signature):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Faltan encabezados de verificacion de Svix",
        )

    body = await request.body()
    body_str = body.decode("utf-8")

    try:
        wh = Webhook(ajustes.clerk_webhook_secret)
        evt = wh.verify(body_str, headers)
    except WebhookVerificationError as error:
        print(f"Error de autenticacion: firma de webhook invalida. {error}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Firma de webhook invalida",
        ) from error

    event_type = evt.get("type")
    event_data = evt.get("data", {})

    if event_type == "user.created":
        clerk_id = event_data.get("id")

        unsafe_metadata = event_data.get("unsafe_metadata", {})
        cedula_meta = unsafe_metadata.get("cedula")
        fecha_nac_meta = unsafe_metadata.get("fecha_nacimiento")
        acepta_terminos_meta = unsafe_metadata.get("acepta_terminos", False)

        email_addresses = event_data.get("email_addresses", [])
        email = email_addresses[0].get("email_address") if email_addresses else None
        if email:
            email = email.strip().lower()

        first_name = event_data.get("first_name", "") or ""
        last_name = event_data.get("last_name", "") or ""
        nombre_completo = f"{first_name} {last_name}".strip()
        if not nombre_completo:
            nombre_completo = event_data.get("username") or (email.split("@")[0] if email else f"user_{clerk_id[:6]}")

        print("\n" + "=" * 50)
        print("Webhook recibido con exito desde Clerk")
        print(f"ID de Clerk: {clerk_id}")
        print(f"Email: {email}")
        print(f"Nombre: {nombre_completo}")
        print("=" * 50 + "\n")

        try:
            from app.core.base_de_datos import SesionLocal
            from app.usuarios.models import Usuario
            from app.billetera.models import Billetera

            with SesionLocal() as db:
                usuario_existente = db.query(Usuario).filter(Usuario.clerk_id == clerk_id).first()

                if not usuario_existente and email:
                    usuario_existente = db.query(Usuario).filter(Usuario.correo == email).first()

                if usuario_existente:
                    usuario_existente.clerk_id = clerk_id
                    usuario_existente.correo = email if email else usuario_existente.correo
                    usuario_existente.cedula = cedula_meta
                    usuario_existente.fecha_nacimiento = fecha_nac_meta
                    usuario_existente.acepta_terminos = acepta_terminos_meta
                    if usuario_existente.nombre.strip().startswith("user_") and nombre_completo:
                        usuario_existente.nombre = nombre_completo
                    print(f"Usuario {clerk_id} sincronizado con exito.")
                else:
                    nuevo_usuario = Usuario(
                        clerk_id=clerk_id,
                        correo=email if email else "",
                        nombre=nombre_completo,
                        cedula=cedula_meta,
                        fecha_nacimiento=fecha_nac_meta,
                        acepta_terminos=acepta_terminos_meta,
                        rol="usuario",
                        activo=True,
                    )
                    db.add(nuevo_usuario)
                    db.flush()

                    nueva_billetera = Billetera(
                        usuario_id=nuevo_usuario.id,
                        saldo=0.0,
                        moneda="USD",
                    )
                    db.add(nueva_billetera)
                    print(f"Guardando nuevo usuario {clerk_id} y su billetera en PostgreSQL...")

                db.commit()
                print("Datos persistidos en PostgreSQL con exito desde el webhook.")

        except Exception as db_error:
            print(f"Error al guardar en la base de datos local: {db_error}")
            return {"status": "error_base_datos", "detail": str(db_error)}

    return {"status": "success"}
