from __future__ import annotations
import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.core.base_de_datos import obtener_db
from app.usuarios.models import Usuario
from app.billetera.models import Billetera

security_scheme = HTTPBearer()

# URL de desarrollo proporcionada en tu entorno .env
CLERK_ISSUER_URL = "https://precious-alien-55.clerk.accounts.dev"
CLERK_JWKS_URL = f"{CLERK_ISSUER_URL}/.well-known/jwks.json"

async def obtener_usuario_actual(
    creds: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(obtener_db),
) -> Usuario:
    token = creds.credentials
    try:
        # Obtener las llaves públicas JWKS de tu instancia de Clerk
        async with httpx.AsyncClient() as cliente:
            respuesta = await cliente.get(CLERK_JWKS_URL)
            jwks = respuesta.json()

        # Decodificar el JWT y validar contra el emisor oficial de Clerk
        payload = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            options={"verify_aud": False},
            issuer=CLERK_ISSUER_URL
        )
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión de Clerk inválida, expirada o malformada.",
        ) from error

    clerk_user_id = payload.get("sub")
    if not clerk_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se pudo determinar el identificador de Clerk en el token.",
        )

    # Extraer el email desde las claims conocidas de Clerk
    def extraer_email(claims: dict) -> str | None:
        valor_directo = claims.get("email")
        if isinstance(valor_directo, str) and valor_directo.strip():
            return valor_directo.strip()

        emails = claims.get("emails")
        if isinstance(emails, list) and emails:
            primero = emails[0]
            if isinstance(primero, str) and primero.strip():
                return primero.strip()
            if isinstance(primero, dict):
                for clave in ("email", "email_address", "value"):
                    valor = primero.get(clave)
                    if isinstance(valor, str) and valor.strip():
                        return valor.strip()

        email_addresses = claims.get("email_addresses")
        if isinstance(email_addresses, list) and email_addresses:
            primero = email_addresses[0]
            if isinstance(primero, str) and primero.strip():
                return primero.strip()
            if isinstance(primero, dict):
                for clave in ("email", "email_address", "value"):
                    valor = primero.get(clave)
                    if isinstance(valor, str) and valor.strip():
                        return valor.strip()

        return None

    email = extraer_email(payload)
    if email:
        email = email.strip().lower()

    # --- FLUJO DE AUTENTICACIÓN JIT (Just-In-Time) ---
    # 1. Buscar correspondencia directa por clerk_id
    usuario = db.scalar(select(Usuario).where(Usuario.clerk_id == clerk_user_id))

    if not usuario and email:
        # 2. Si no tiene clerk_id pero coincide el correo, migramos la cuenta existente
        usuario = db.scalar(
            select(Usuario).where(func.lower(Usuario.correo) == func.lower(email))
        )
        if usuario:
            usuario.clerk_id = clerk_user_id
            if not usuario.correo:
                usuario.correo = email
            db.commit()

    if usuario:
        # Actualizar el nombre si el usuario fue creado con nombre provisional
        nombre_real = (
            payload.get("name")
            or payload.get("full_name")
            or payload.get("given_name")
            or payload.get("preferred_username")
            or payload.get("username")
        )
        if nombre_real:
            nombre_real = nombre_real.strip()
            nombre_actual = usuario.nombre.strip()
            if nombre_real and nombre_real != nombre_actual and nombre_actual.startswith("user_"):
                usuario.nombre = nombre_real
                db.commit()

    if not usuario:
        # 3. Si es completamente nuevo, lo registramos usando los claims del JWT
        nombre_provisional = (
            payload.get("name")
            or payload.get("full_name")
            or payload.get("given_name")
            or payload.get("preferred_username")
            or payload.get("username")
            or (email.split("@")[0] if email else f"user_{clerk_user_id[:6]}")
        )

        usuario = Usuario(
            clerk_id=clerk_user_id,
            nombre=nombre_provisional.strip(),
            correo=email if email else "",
            rol="usuario",
            activo=True
        )
        db.add(usuario)
        db.flush()  # Generar el ID autoincremental de la base de datos

        # Inicializar automáticamente la billetera oficial de PronoStats UFC para este usuario
        billetera = Billetera(
            usuario_id=usuario.id,
            saldo=0.0,
            moneda="USD",
        )
        db.add(billetera)
        db.commit()
        db.refresh(usuario)

    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta cuenta se encuentra suspendida o deshabilitada.",
        )

    return usuario