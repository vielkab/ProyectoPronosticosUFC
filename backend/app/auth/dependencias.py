from __future__ import annotations
import time
import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
from jose.exceptions import JWTError, ExpiredSignatureError
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError

from app.core.base_de_datos import obtener_db
from app.usuarios.models import Usuario
from app.billetera.models import Billetera

from app.core.configuracion import ajustes

security_scheme = HTTPBearer()

def _clerk_issuer_url() -> str:
    return ajustes.clerk_issuer_url.rstrip("/")

def _clerk_jwks_url() -> str:
    return f"{_clerk_issuer_url()}/.well-known/jwks.json"

# --- CACHE GLOBAL PARA JWKS ---
_jwks_cache: dict | None = None
_jwks_last_fetch: float = 0.0
CACHE_TTL_SEGUNDOS = 86400  # 24 horas

async def obtener_jwks_con_cache() -> dict:
    """
    Obtiene las llaves JWKS de Clerk de forma asíncrona, manejando 
    un caché simple en memoria basado en tiempo de vida (TTL).
    """
    global _jwks_cache, _jwks_last_fetch
    ahora = time.time()
    
    if _jwks_cache and (ahora - _jwks_last_fetch < CACHE_TTL_SEGUNDOS):
        return _jwks_cache
        
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            respuesta = await client.get(_clerk_jwks_url())
            respuesta.raise_for_status()
            _jwks_cache = respuesta.json()
            _jwks_last_fetch = ahora
            return _jwks_cache
    except Exception as error:
        if _jwks_cache:
            return _jwks_cache
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No se pudo establecer comunicación con el proveedor de identidad.",
        ) from error


async def obtener_usuario_actual(
    creds: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(obtener_db),
) -> Usuario:
    token = creds.credentials
    
    try:
        # 1. Traer de forma segura las llaves criptográficas (públicas)
        jwks = await obtener_jwks_con_cache()
        
        # 2. 🔒 VALIDACIÓN COMPLETA
        payload = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            audience=None,
            issuer=_clerk_issuer_url()
        )
    except ExpiredSignatureError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La sesión ha expirado. Por favor, vuelve a iniciar sesión.",
        ) from error
    except (JWTError, Exception) as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión inválida, firma corrupta o token malformado.",
        ) from error

    clerk_user_id = payload.get("sub")
    if not clerk_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se pudo determinar el identificador de Clerk en el token.",
        )

    # --- EXTRACCIÓN DE CLAIMS (Optimizado con Walrus Operator) ---
    def extraer_email(claims: dict) -> str | None:
        if valor_directo := claims.get("email"):
            return str(valor_directo).strip().lower()

        for clave in ("emails", "email_addresses"):
            if lista := claims.get(clave):
                primero = lista[0]
                if isinstance(primero, str):
                    return primero.strip().lower()
                if isinstance(primero, dict):
                    for k in ("email", "email_address", "value"):
                        if v := primero.get(k):
                            return str(v).strip().lower()
        return None

    def extraer_nombre(claims: dict) -> str | None:
        claves_nombre = ["name", "full_name", "given_name", "preferred_username", "username"]
        for clave in claves_nombre:
            if valor := claims.get(clave):
                return str(valor).strip()
        return None

    email = extraer_email(payload)
    nombre_real = extraer_nombre(payload)

    # --- FLUJO JIT ---
    # 1. Buscar correspondencia directa por clerk_id
    usuario = db.scalar(select(Usuario).where(Usuario.clerk_id == clerk_user_id))

    if not usuario and email:
        # 2. Sincronizar por correo para evitar duplicados molestos
        usuario = db.scalar(
            select(Usuario).where(func.lower(Usuario.correo) == email)
        )
        if usuario:
            try:
                usuario.clerk_id = clerk_user_id
                db.commit()
            except IntegrityError:
                db.rollback()
                usuario = db.scalar(select(Usuario).where(Usuario.clerk_id == clerk_user_id))

    # 3. Actualizar nombre si el actual es genérico o vacío
    if usuario and nombre_real:
        if usuario.nombre.strip().startswith("user_") or not usuario.nombre.strip():
            try:
                usuario.nombre = nombre_real
                db.commit()
            except Exception:
                db.rollback()

    # 4. Si es completamente nuevo, se registra protegiendo de condiciones de carrera (Race Conditions)
    if not usuario:
        nombre_provisional = nombre_real or (email.split("@")[0] if email else f"user_{clerk_user_id[:6]}")

        try:
            usuario = Usuario(
                clerk_id=clerk_user_id,
                nombre=nombre_provisional,
                correo=email or "",
                rol="usuario",
                activo=True
            )
            db.add(usuario)
            db.flush()  # Reserva el ID en la BD sin soltar la transacción

            billetera = Billetera(
                usuario_id=usuario.id,
                saldo=0.0,
                moneda="USD",
            )
            db.add(billetera)
            db.commit()
            db.refresh(usuario)
        except IntegrityError:
            # 🛡️ CAPTURA DE CONCURRENCIA
            db.rollback()
            usuario = db.scalar(select(Usuario).where(Usuario.clerk_id == clerk_user_id))
            if not usuario and email:
                usuario = db.scalar(select(Usuario).where(func.lower(Usuario.correo) == email))

    if not usuario or not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta cuenta se encuentra suspendida o no pudo ser inicializada.",
        )

    return usuario