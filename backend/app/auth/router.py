from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.auth.schemas import (
    LoginEntrada,
    MensajeAuth,
    RefreshEntrada,
    RegistroUsuarioEntrada,
    RestablecerPasswordEntrada,
    SolicitudRecuperacionEntrada,
    TokensRespuesta,
    VerificarRecuperacionEntrada,
    VerificarRegistroEntrada,
)
from app.auth.service import (
    validar_codigo_recuperacion,
    iniciar_sesion_usuario,
    refrescar_tokens_usuario,
    registrar_nuevo_usuario,
    restablecer_password,
    solicitar_recuperacion_password,
    verificar_registro_usuario,
)
from app.core.base_de_datos import obtener_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=MensajeAuth, status_code=status.HTTP_202_ACCEPTED)
def registrar_usuario(
    payload: RegistroUsuarioEntrada,
    request: Request,
    db: Session = Depends(obtener_db),
) -> MensajeAuth:
    return registrar_nuevo_usuario(db=db, payload=payload, request=request)


@router.post("/register/verify", response_model=TokensRespuesta)
def verificar_registro(
    payload: VerificarRegistroEntrada,
    request: Request,
    db: Session = Depends(obtener_db),
) -> TokensRespuesta:
    return verificar_registro_usuario(db=db, payload=payload, request=request)


@router.post("/login", response_model=TokensRespuesta)
def iniciar_sesion(
    payload: LoginEntrada,
    request: Request,
    db: Session = Depends(obtener_db),
) -> TokensRespuesta:
    return iniciar_sesion_usuario(db=db, payload=payload, request=request)


@router.post("/refresh", response_model=TokensRespuesta)
def refrescar_token(
    payload: RefreshEntrada,
    db: Session = Depends(obtener_db),
) -> TokensRespuesta:
    return refrescar_tokens_usuario(db=db, refresh_token=payload.refresh_token)


@router.post("/password/forgot", response_model=MensajeAuth, status_code=status.HTTP_202_ACCEPTED)
def solicitar_recuperacion(
    payload: SolicitudRecuperacionEntrada,
    db: Session = Depends(obtener_db),
) -> MensajeAuth:
    return solicitar_recuperacion_password(db=db, usuario=payload.usuario)


@router.post("/password/verify-code", response_model=MensajeAuth)
def verificar_codigo_recuperacion(
    payload: VerificarRecuperacionEntrada,
    db: Session = Depends(obtener_db),
) -> MensajeAuth:
    return validar_codigo_recuperacion(db=db, payload=payload)


@router.post("/password/reset", response_model=MensajeAuth)
def resetear_password(
    payload: RestablecerPasswordEntrada,
    db: Session = Depends(obtener_db),
) -> MensajeAuth:
    return restablecer_password(db=db, payload=payload)
