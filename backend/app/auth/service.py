from __future__ import annotations

from datetime import datetime, timedelta, timezone
from hashlib import sha256
from secrets import randbelow

from fastapi import HTTPException, Request, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.auth.models import CodigoAutenticacion
from app.auth.schemas import (
    LoginEntrada,
    MensajeAuth,
    RegistroUsuarioEntrada,
    RestablecerPasswordEntrada,
    VerificarRecuperacionEntrada,
    TokensRespuesta,
    VerificarRegistroEntrada,
)
from app.core.configuracion import ajustes
from app.core.correo import enviar_correo
from app.core.seguridad import (
    crear_token_acceso,
    crear_token_refresh,
    decodificar_token,
    generar_hash_password,
    verificar_password,
)
from app.usuarios.models import Usuario
from app.billetera.models import Billetera
from app.usuarios.schemas import UsuarioPublico

MAX_INTENTOS_LOGIN = 5
VENTANA_BLOQUEO_MINUTOS = 15
MINUTOS_CODIGO_REGISTRO = 15
MINUTOS_CODIGO_RECUPERACION = 15
PROPOSITO_REGISTRO = "registro"
PROPOSITO_RECUPERACION = "recuperacion"
_intentos_login: dict[str, list[datetime]] = {}


def _normalizar_correo(correo: str) -> str:
    return correo.strip().lower()


def _obtener_clave_bloqueo(request: Request, identificador: str) -> str:
    cliente = request.client.host if request.client else "desconocido"
    return f"{cliente}:{identificador.strip().lower()}"


def _limpiar_intentos_expirados(clave: str) -> list[datetime]:
    limite = datetime.now(timezone.utc) - timedelta(minutes=VENTANA_BLOQUEO_MINUTOS)
    intentos = _intentos_login.get(clave, [])
    intentos_validos = [intento for intento in intentos if intento >= limite]
    _intentos_login[clave] = intentos_validos
    return intentos_validos


def _verificar_limite_login(request: Request, identificador: str) -> None:
    clave = _obtener_clave_bloqueo(request, identificador)
    intentos = _limpiar_intentos_expirados(clave)

    if len(intentos) >= MAX_INTENTOS_LOGIN:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos de login. Intenta nuevamente mas tarde.",
        )


def _registrar_intento_fallido(request: Request, identificador: str) -> None:
    clave = _obtener_clave_bloqueo(request, identificador)
    intentos = _limpiar_intentos_expirados(clave)
    intentos.append(datetime.now(timezone.utc))
    _intentos_login[clave] = intentos


def _limpiar_intentos_exitosos(request: Request, identificador: str) -> None:
    clave = _obtener_clave_bloqueo(request, identificador)
    _intentos_login.pop(clave, None)


def _construir_respuesta_tokens(usuario: Usuario) -> TokensRespuesta:
    usuario_publico = UsuarioPublico.model_validate(usuario)
    return TokensRespuesta(
        access_token=crear_token_acceso(str(usuario.id)),
        refresh_token=crear_token_refresh(str(usuario.id)),
        usuario=usuario_publico,
    )


def _hash_codigo(codigo: str) -> str:
    return sha256(codigo.strip().encode("utf-8")).hexdigest()


def _generar_codigo() -> str:
    return f"{randbelow(1_000_000):06d}"


def _obtener_expiracion(minutos: int) -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=minutos)


def _normalizar_fecha(fecha: datetime) -> datetime:
    if fecha.tzinfo is None:
        return fecha.replace(tzinfo=timezone.utc)
    return fecha


def _buscar_usuario_por_correo(db: Session, correo: str) -> Usuario | None:
    return db.scalar(select(Usuario).where(Usuario.correo == correo))


def _buscar_usuario_por_nombre(db: Session, nombre: str) -> Usuario | None:
    return db.scalar(select(Usuario).where(Usuario.nombre == nombre.strip()))


def _buscar_usuario_por_cedula(db: Session, cedula: str) -> Usuario | None:
    return db.scalar(select(Usuario).where(Usuario.cedula == cedula.strip()))


def _invalidar_codigos(db: Session, correo: str, proposito: str) -> None:
    codigos = db.scalars(
        select(CodigoAutenticacion).where(
            CodigoAutenticacion.correo == correo,
            CodigoAutenticacion.proposito == proposito,
            CodigoAutenticacion.usado.is_(False),
        )
    ).all()

    for codigo in codigos:
        codigo.usado = True


def _obtener_codigo_activo(db: Session, correo: str, proposito: str) -> CodigoAutenticacion | None:
    codigo = db.scalar(
        select(CodigoAutenticacion)
        .where(
            CodigoAutenticacion.correo == correo,
            CodigoAutenticacion.proposito == proposito,
            CodigoAutenticacion.usado.is_(False),
        )
        .order_by(CodigoAutenticacion.creado_en.desc())
    )

    if not codigo:
        return None

    if _normalizar_fecha(codigo.expira_en) < datetime.now(timezone.utc):
        codigo.usado = True
        db.commit()
        return None

    return codigo


def _crear_y_enviar_codigo(
    db: Session,
    *,
    correo: str,
    proposito: str,
    payload: dict | None,
    minutos_expiracion: int,
    asunto: str,
    mensaje: str,
) -> None:
    _invalidar_codigos(db, correo, proposito)
    codigo_plano = _generar_codigo()

    registro_codigo = CodigoAutenticacion(
        correo=correo,
        proposito=proposito,
        codigo_hash=_hash_codigo(codigo_plano),
        payload=payload,
        expira_en=_obtener_expiracion(minutos_expiracion),
        usado=False,
    )

    db.add(registro_codigo)
    db.commit()

    contenido = (
        f"{mensaje}\n\n"
        f"Codigo: {codigo_plano}\n"
        f"Vigencia: {minutos_expiracion} minutos.\n"
    )
    enviar_correo(correo, asunto, contenido)


def _validar_codigo(
    db: Session,
    *,
    correo: str,
    proposito: str,
    codigo_ingresado: str,
) -> CodigoAutenticacion:
    codigo = _obtener_codigo_activo(db, correo, proposito)
    if not codigo or codigo.codigo_hash != _hash_codigo(codigo_ingresado):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El codigo es invalido o ya expiro.",
        )

    return codigo


def _mensaje_entrega_codigo() -> str:
    mensaje = "Te enviamos un codigo al correo registrado."
    if not ajustes.smtp_host.strip() and ajustes.guardar_codigos_desarrollo:
        mensaje += " En desarrollo puedes revisar backend/codigos_desarrollo/ para ver el codigo generado."
    return mensaje


def registrar_nuevo_usuario(
    db: Session,
    payload: RegistroUsuarioEntrada,
    request: Request,
) -> MensajeAuth:
    correo_normalizado = _normalizar_correo(payload.correo)
    usuario_normalizado = payload.usuario.strip()

    if _buscar_usuario_por_correo(db, correo_normalizado) or _buscar_usuario_por_nombre(db, usuario_normalizado):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una cuenta con ese usuario o correo.",
        )

    if _buscar_usuario_por_cedula(db, payload.cedula):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una cuenta registrada con esa cedula.",
        )

    _crear_y_enviar_codigo(
        db,
        correo=correo_normalizado,
        proposito=PROPOSITO_REGISTRO,
        payload={
            "usuario": usuario_normalizado,
            "password_hash": generar_hash_password(payload.password),
            "cedula": payload.cedula.strip(),
            "fecha_nacimiento": payload.fecha_nacimiento.isoformat(),
            "acepta_terminos": payload.acepta_terminos,
        },
        minutos_expiracion=MINUTOS_CODIGO_REGISTRO,
        asunto="Codigo de verificacion de PronoStats UFC",
        mensaje="Usa este codigo para activar tu cuenta en PronoStats UFC.",
    )

    _limpiar_intentos_exitosos(request, correo_normalizado)
    return MensajeAuth(
        mensaje=f"{_mensaje_entrega_codigo()} Ingresa ese codigo para crear tu cuenta."
    )


def verificar_registro_usuario(
    db: Session,
    payload: VerificarRegistroEntrada,
    request: Request,
) -> TokensRespuesta:
    correo_normalizado = _normalizar_correo(payload.correo)
    codigo = _validar_codigo(
        db,
        correo=correo_normalizado,
        proposito=PROPOSITO_REGISTRO,
        codigo_ingresado=payload.codigo,
    )

    datos_registro = codigo.payload or {}
    usuario_nombre = str(datos_registro.get("usuario", "")).strip()
    password_hash = str(datos_registro.get("password_hash", "")).strip()

    if not usuario_nombre or not password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El registro pendiente no es valido. Solicita un codigo nuevo.",
        )

    if _buscar_usuario_por_correo(db, correo_normalizado) or _buscar_usuario_por_nombre(db, usuario_nombre):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una cuenta con ese usuario o correo.",
        )

    cedula = datos_registro.get("cedula")
    if cedula and _buscar_usuario_por_cedula(db, cedula):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una cuenta registrada con esa cedula.",
        )

    fecha_nacimiento_str = datos_registro.get("fecha_nacimiento")
    fecha_nacimiento = datetime.fromisoformat(fecha_nacimiento_str) if fecha_nacimiento_str else None

    usuario = Usuario(
        nombre=usuario_nombre,
        correo=correo_normalizado,
        password_hash=password_hash,
        rol="usuario",
        activo=True,
        cedula=cedula,
        fecha_nacimiento=fecha_nacimiento,
        acepta_terminos=datos_registro.get("acepta_terminos", False),
    )

    db.add(usuario)
    
    # Crear e inicializar la billetera del usuario
    billetera = Billetera(
        usuario=usuario,
        saldo=0.0,
        moneda="USD",
    )
    db.add(billetera)

    codigo.usado = True
    db.commit()
    db.refresh(usuario)

    _limpiar_intentos_exitosos(request, correo_normalizado)
    return _construir_respuesta_tokens(usuario)


def iniciar_sesion_usuario(
    db: Session,
    payload: LoginEntrada,
    request: Request,
) -> TokensRespuesta:
    usuario_ingresado = payload.usuario.strip()
    _verificar_limite_login(request, usuario_ingresado)

    usuario = db.scalar(
        select(Usuario).where(
            (Usuario.nombre == usuario_ingresado) | (Usuario.correo == usuario_ingresado.lower())
        )
    )

    if not usuario or not verificar_password(payload.password, usuario.password_hash):
        _registrar_intento_fallido(request, usuario_ingresado)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contrasena incorrecta.",
        )

    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta aun no esta disponible.",
        )

    _limpiar_intentos_exitosos(request, usuario_ingresado)
    return _construir_respuesta_tokens(usuario)


def refrescar_tokens_usuario(db: Session, refresh_token: str) -> TokensRespuesta:
    try:
        payload = decodificar_token(refresh_token)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token invalido.",
        ) from error

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token enviado no es un refresh token valido.",
        )

    usuario_id = payload.get("sub")
    if not usuario_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token invalido.",
        )

    usuario = db.get(Usuario, int(usuario_id))
    if not usuario or not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se pudo refrescar la sesion.",
        )

    return _construir_respuesta_tokens(usuario)


def solicitar_recuperacion_password(db: Session, usuario: str) -> MensajeAuth:
    usuario_existente = db.scalar(
        select(Usuario).where(
            (Usuario.nombre == usuario.strip()) | (Usuario.correo == usuario.strip().lower()),
            Usuario.activo.is_(True),
        )
    )

    if usuario_existente:
        _crear_y_enviar_codigo(
            db,
            correo=usuario_existente.correo,
            proposito=PROPOSITO_RECUPERACION,
            payload=None,
            minutos_expiracion=MINUTOS_CODIGO_RECUPERACION,
            asunto="Codigo de recuperacion de PronoStats UFC",
            mensaje="Usa este codigo para restablecer tu contrasena en PronoStats UFC.",
        )

    return MensajeAuth(
        mensaje=f"Si el correo existe, {_mensaje_entrega_codigo().lower()} Usalo para restablecer tu contrasena."
    )


def validar_codigo_recuperacion(
    db: Session,
    payload: VerificarRecuperacionEntrada,
) -> MensajeAuth:
    usuario = db.scalar(
        select(Usuario).where(
            (Usuario.nombre == payload.usuario.strip()) | (Usuario.correo == payload.usuario.strip().lower())
        )
    )
    if not usuario or not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No existe una cuenta activa asociada a ese usuario.",
        )

    _validar_codigo(
        db,
        correo=usuario.correo,
        proposito=PROPOSITO_RECUPERACION,
        codigo_ingresado=payload.codigo,
    )

    return MensajeAuth(mensaje="Codigo verificado correctamente.")


def restablecer_password(db: Session, payload: RestablecerPasswordEntrada) -> MensajeAuth:
    usuario = db.scalar(
        select(Usuario).where(
            (Usuario.nombre == payload.usuario.strip()) | (Usuario.correo == payload.usuario.strip().lower())
        )
    )
    if not usuario or not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No existe una cuenta activa asociada a ese usuario.",
        )

    codigo = _validar_codigo(
        db,
        correo=usuario.correo,
        proposito=PROPOSITO_RECUPERACION,
        codigo_ingresado=payload.codigo,
    )

    usuario.password_hash = generar_hash_password(payload.password)
    codigo.usado = True
    db.commit()

    return MensajeAuth(mensaje="Tu contrasena fue actualizada correctamente.")


def eliminar_cuenta_usuario(db: Session, usuario: Usuario) -> MensajeAuth:
    db.execute(
        delete(CodigoAutenticacion).where(CodigoAutenticacion.correo == usuario.correo)
    )
    db.delete(usuario)
    db.commit()
    return MensajeAuth(mensaje="Tu cuenta fue eliminada correctamente.")
