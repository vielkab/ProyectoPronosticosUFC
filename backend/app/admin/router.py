from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.admin.schemas import (
    ApuestaAdminResumen,
    CambiarEstadoApuestaEntrada,
    CambiarEstadoPeleaEntrada,
    CrearPeleaAdminEntrada,
    CrearPeleaCarteleraEntrada,
    EditarPeleaAdminEntrada,
    MensajeRespuesta,
    PeleaAdminDetalle,
    PeleaAdminResumen,
    PeleadorBusquedaAdmin,
    PrediccionAdminResumen,
    RegistrarResultadoEntrada,
    ResumenAdmin,
    ResumenBilletera,
    SincronizacionRespuesta,
    UsuarioAdminResumen,
)
from app.admin.service import (
    bloquear_usuario_admin,
    buscar_peleadores_admin,
    cambiar_estado_apuesta_admin,
    cambiar_estado_pelea,
    cancelar_pelea_admin,
    crear_pelea_admin,
    crear_pelea_cartelera,
    editar_pelea_admin,
    listar_apuestas_admin,
    listar_peleas_admin,
    listar_peleadores_por_division,
    listar_predicciones_admin,
    listar_usuarios_admin,
    obtener_pelea_admin,
    obtener_resumen_admin,
    obtener_resumen_billetera_admin,
    reactivar_usuario_admin,
    registrar_resultado_admin,
)
from app.auth.dependencias import obtener_usuario_actual
from app.core.base_de_datos import obtener_db
from app.eventos.schemas import PeleaCarteleraResumen
from app.eventos.service import sincronizar_eventos_mma
from app.usuarios.models import Usuario

router = APIRouter(tags=["admin"])


def requerir_admin(usuario_actual: Usuario = Depends(obtener_usuario_actual)) -> Usuario:
    if usuario_actual.rol != "administrador":
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Se requiere rol administrador.")
    return usuario_actual


# ── Resumen y sincronización ──────────────────────────────────────────────────

@router.get("/resumen", response_model=ResumenAdmin)
def obtener_resumen_admin_endpoint(
    db: Session = Depends(obtener_db),
    _: Usuario = Depends(requerir_admin),
) -> ResumenAdmin:
    return obtener_resumen_admin(db)


@router.post("/sincronizar", response_model=SincronizacionRespuesta)
def sincronizar_datos_endpoint(
    db: Session = Depends(obtener_db),
    _: Usuario = Depends(requerir_admin),
) -> SincronizacionRespuesta:
    return sincronizar_eventos_mma(db)


# ── Endpoint legado de cartelera (compatibilidad) ─────────────────────────────

@router.post("/cartelera/peleas", response_model=PeleaCarteleraResumen)
def crear_pelea_cartelera_endpoint(
    payload: CrearPeleaCarteleraEntrada,
    db: Session = Depends(obtener_db),
    _: Usuario = Depends(requerir_admin),
) -> PeleaCarteleraResumen:
    return crear_pelea_cartelera(db, payload)


# ── Gestión de peleas ─────────────────────────────────────────────────────────

@router.get("/peleas", response_model=list[PeleaAdminResumen])
def listar_peleas_admin_endpoint(
    db: Session = Depends(obtener_db),
    _: Usuario = Depends(requerir_admin),
) -> list[PeleaAdminResumen]:
    return listar_peleas_admin(db)


@router.post("/peleas", response_model=PeleaAdminDetalle, status_code=201)
def crear_pelea_admin_endpoint(
    payload: CrearPeleaAdminEntrada,
    db: Session = Depends(obtener_db),
    _: Usuario = Depends(requerir_admin),
) -> PeleaAdminDetalle:
    return crear_pelea_admin(db, payload)


@router.get("/peleas/{pelea_id}", response_model=PeleaAdminDetalle)
def obtener_pelea_admin_endpoint(
    pelea_id: int,
    db: Session = Depends(obtener_db),
    _: Usuario = Depends(requerir_admin),
) -> PeleaAdminDetalle:
    return obtener_pelea_admin(db, pelea_id)


@router.put("/peleas/{pelea_id}", response_model=PeleaAdminDetalle)
def editar_pelea_admin_endpoint(
    pelea_id: int,
    payload: EditarPeleaAdminEntrada,
    db: Session = Depends(obtener_db),
    _: Usuario = Depends(requerir_admin),
) -> PeleaAdminDetalle:
    return editar_pelea_admin(db, pelea_id, payload)


@router.patch("/peleas/{pelea_id}/estado", response_model=PeleaAdminDetalle)
def cambiar_estado_pelea_endpoint(
    pelea_id: int,
    payload: CambiarEstadoPeleaEntrada,
    db: Session = Depends(obtener_db),
    _: Usuario = Depends(requerir_admin),
) -> PeleaAdminDetalle:
    return cambiar_estado_pelea(db, pelea_id, payload)


@router.patch("/peleas/{pelea_id}/resultado", response_model=PeleaAdminDetalle)
def registrar_resultado_admin_endpoint(
    pelea_id: int,
    payload: RegistrarResultadoEntrada,
    db: Session = Depends(obtener_db),
    _: Usuario = Depends(requerir_admin),
) -> PeleaAdminDetalle:
    return registrar_resultado_admin(db, pelea_id, payload)


@router.delete("/peleas/{pelea_id}", response_model=MensajeRespuesta)
def cancelar_pelea_admin_endpoint(
    pelea_id: int,
    db: Session = Depends(obtener_db),
    _: Usuario = Depends(requerir_admin),
) -> MensajeRespuesta:
    return cancelar_pelea_admin(db, pelea_id)


# ── Gestión de apuestas ───────────────────────────────────────────────────────

@router.get("/apuestas", response_model=list[ApuestaAdminResumen])
def listar_apuestas_admin_endpoint(
    estado: str | None = Query(default=None),
    db: Session = Depends(obtener_db),
    _: Usuario = Depends(requerir_admin),
) -> list[ApuestaAdminResumen]:
    return listar_apuestas_admin(db, estado)


@router.patch("/apuestas/{apuesta_id}/estado", response_model=ApuestaAdminResumen)
def cambiar_estado_apuesta_endpoint(
    apuesta_id: int,
    payload: CambiarEstadoApuestaEntrada,
    db: Session = Depends(obtener_db),
    _: Usuario = Depends(requerir_admin),
) -> ApuestaAdminResumen:
    return cambiar_estado_apuesta_admin(db, apuesta_id, payload)


# ── Gestión de usuarios ───────────────────────────────────────────────────────

@router.get("/usuarios", response_model=list[UsuarioAdminResumen])
def listar_usuarios_admin_endpoint(
    db: Session = Depends(obtener_db),
    _: Usuario = Depends(requerir_admin),
) -> list[UsuarioAdminResumen]:
    return listar_usuarios_admin(db)


@router.patch("/usuarios/{usuario_id}/bloquear", response_model=MensajeRespuesta)
def bloquear_usuario_endpoint(
    usuario_id: int,
    db: Session = Depends(obtener_db),
    _: Usuario = Depends(requerir_admin),
) -> MensajeRespuesta:
    return bloquear_usuario_admin(db, usuario_id)


@router.patch("/usuarios/{usuario_id}/reactivar", response_model=MensajeRespuesta)
def reactivar_usuario_endpoint(
    usuario_id: int,
    db: Session = Depends(obtener_db),
    _: Usuario = Depends(requerir_admin),
) -> MensajeRespuesta:
    return reactivar_usuario_admin(db, usuario_id)


# ── Búsqueda de peleadores en BD ──────────────────────────────────────────────

@router.get("/peleadores/buscar", response_model=list[PeleadorBusquedaAdmin])
def buscar_peleadores_admin_endpoint(
    q: str = Query(default="", min_length=1),
    db: Session = Depends(obtener_db),
    _: Usuario = Depends(requerir_admin),
) -> list[PeleadorBusquedaAdmin]:
    return buscar_peleadores_admin(db, q)


@router.get("/peleadores/por-division", response_model=list[PeleadorBusquedaAdmin])
def listar_peleadores_por_division_endpoint(
    division: str = Query(min_length=2),
    db: Session = Depends(obtener_db),
    _: Usuario = Depends(requerir_admin),
) -> list[PeleadorBusquedaAdmin]:
    return listar_peleadores_por_division(db, division)


# ── Billetera admin ───────────────────────────────────────────────────────────

@router.get("/billetera/resumen", response_model=ResumenBilletera)
def obtener_resumen_billetera_endpoint(
    db: Session = Depends(obtener_db),
    _: Usuario = Depends(requerir_admin),
) -> ResumenBilletera:
    return obtener_resumen_billetera_admin(db)


# ── Predicciones admin ────────────────────────────────────────────────────────

@router.get("/predicciones", response_model=list[PrediccionAdminResumen])
def listar_predicciones_admin_endpoint(
    db: Session = Depends(obtener_db),
    _: Usuario = Depends(requerir_admin),
) -> list[PrediccionAdminResumen]:
    return listar_predicciones_admin(db)
