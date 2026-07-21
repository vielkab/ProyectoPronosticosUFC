import os
from fastapi import APIRouter, Request, HTTPException, status
from svix.webhooks import Webhook, WebhookVerificationError
from dotenv import load_dotenv

# Cargar las variables de entorno del archivo .env
load_dotenv()

router = APIRouter(
    prefix="/auth",
    tags=["Auth Webhooks"]
)

# Jalamos el secreto directamente desde tu archivo .env
CLERK_WEBHOOK_SECRET = os.getenv("CLERK_WEBHOOK_SECRET")

if not CLERK_WEBHOOK_SECRET:
    raise RuntimeError("Falta la variable CLERK_WEBHOOK_SECRET en el archivo .env")

@router.post("/webhook")
async def clerk_webhook(request: Request):
    # 1. Capturar los encabezados de verificación obligatorios de Svix
    headers = request.headers
    svix_id = headers.get("svix-id")
    svix_timestamp = headers.get("svix-timestamp")
    svix_signature = headers.get("svix-signature")

    # Si falta alguno de estos encabezados, rechazamos la petición de inmediato
    if not (svix_id and svix_timestamp and svix_signature):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Faltan encabezados de verificación de Svix"
        )

    # 2. Obtener el cuerpo de la petición como texto plano (bytes decodificados)
    body = await request.body()
    body_str = body.decode("utf-8")

    # 3. Verificar mediante la librería Svix que la petición realmente provenga de Clerk
    try:
        wh = Webhook(CLERK_WEBHOOK_SECRET)
        evt = wh.verify(body_str, headers)
    except WebhookVerificationError as e:
        print(f"🔴 Error de autenticación: Firma de webhook inválida. {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Firma de webhook inválida"
        )

    # 4. Procesar la información si la firma fue validada con éxito
    event_type = evt.get("type")
    event_data = evt.get("data", {})

    if event_type == "user.created":
        clerk_id = event_data.get("id")
        
        # 🔍 Capturar los metadatos enviados desde el formulario del Frontend
        unsafe_metadata = event_data.get("unsafe_metadata", {})
        cedula_meta = unsafe_metadata.get("cedula")
        fecha_nac_meta = unsafe_metadata.get("fecha_nacimiento")
        acepta_terminos_meta = unsafe_metadata.get("acepta_terminos", False)
        
        # Extraer el correo principal (Clerk los manda dentro de una lista)
        email_addresses = event_data.get("email_addresses", [])
        email = email_addresses[0].get("email_address") if email_addresses else None
        if email:
            email = email.strip().lower()
        
        # Extraer datos complementarios del perfil
        first_name = event_data.get("first_name", "") or ""
        last_name = event_data.get("last_name", "") or ""
        nombre_completo = f"{first_name} {last_name}".strip()
        if not nombre_completo:
            nombre_completo = event_data.get("username") or (email.split("@")[0] if email else f"user_{clerk_id[:6]}")

        # 🚀 Mensaje de confirmación en consola para saber que todo funcionó bien
        print("\n" + "="*50)
        print("🟢 ¡WEBHOOK RECIBIDO CON ÉXITO DESDE CLERK!")
        print(f"ID de Clerk: {clerk_id}")
        print(f"Email: {email}")
        print(f"Nombre: {nombre_completo}")
        print("="*50 + "\n")

        try:
            # 5. 🛠️ IMPORTACIONES EXTRAÍDAS DIRECTAMENTE DE TU BASE DE DATOS
            from app.core.base_de_datos import SesionLocal
            from app.usuarios.models import Usuario
            from app.billetera.models import Billetera

            # Abrir una sesión utilizando el context manager nativo de tu SesionLocal
            with SesionLocal() as db:
                # Buscar si el usuario ya existe en PostgreSQL usando el clerk_id
                usuario_existente = db.query(Usuario).filter(Usuario.clerk_id == clerk_id).first()
                
                if not usuario_existente and email:
                    # Buscar por correo por si se creó mediante el flujo JIT un milisegundo antes
                    usuario_existente = db.query(Usuario).filter(Usuario.correo == email).first()

                if usuario_existente:
                    usuario_existente.clerk_id = clerk_id
                    usuario_existente.correo = email if email else usuario_existente.correo
                    usuario_existente.cedula = cedula_meta
                    usuario_existente.fecha_nacimiento = fecha_nac_meta
                    usuario_existente.acepta_terminos = acepta_terminos_meta
                    if usuario_existente.nombre.strip().startswith("user_") and nombre_completo:
                        usuario_existente.nombre = nombre_completo
                    print(f"🔄 Usuario {clerk_id} ya existía en la BD. Sincronizado y actualizado con éxito.")
                else:
                    # Registrar de forma limpia y completa en la base de datos local
                    nuevo_usuario = Usuario(
                        clerk_id=clerk_id,
                        correo=email if email else "",
                        nombre=nombre_completo,
                        cedula=cedula_meta,
                        fecha_nacimiento=fecha_nac_meta,
                        acepta_terminos=acepta_terminos_meta,
                        rol="usuario",
                        activo=True
                    )
                    db.add(nuevo_usuario)
                    db.flush() # Obtener el id del usuario antes de guardarlo

                    # Inicializar su billetera correspondiente
                    nueva_billetera = Billetera(
                        usuario_id=nuevo_usuario.id,
                        saldo=0.0,
                        moneda="USD",
                    )
                    db.add(nueva_billetera)
                    print(f"💾 Guardando nuevo usuario {clerk_id} y su Billetera en PostgreSQL...")
                
                # Confirmar la transacción
                db.commit()
                print("🟢 ¡Datos persistidos en PostgreSQL con éxito desde el Webhook!")
                
        except Exception as db_error:
            print(f"🔴 Error al guardar en la base de datos local: {db_error}")
            return {"status": "error_base_datos", "detail": str(db_error)}

    return {"status": "success"}