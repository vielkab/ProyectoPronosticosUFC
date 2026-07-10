from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.admin.schemas import CrearPeleaCarteleraEntrada, ResumenAdmin, SincronizacionRespuesta
from app.admin.service import crear_pelea_cartelera, obtener_resumen_admin
from app.auth.dependencias import obtener_usuario_actual
from app.core.base_de_datos import obtener_db
from app.eventos.schemas import PeleaCarteleraResumen
from app.eventos.service import sincronizar_eventos_mma
from app.usuarios.models import Usuario

router = APIRouter(prefix="/admin", tags=["admin"])


def requerir_admin(usuario_actual: Usuario = Depends(obtener_usuario_actual)) -> Usuario:
    if usuario_actual.rol != "administrador":
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Se requiere rol administrador.")
    return usuario_actual


@router.get("/resumen", response_model=ResumenAdmin)
def obtener_resumen_admin_endpoint(
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(requerir_admin),
) -> ResumenAdmin:
    return obtener_resumen_admin(db)


@router.post("/sincronizar", response_model=SincronizacionRespuesta)
def sincronizar_datos_endpoint(
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(requerir_admin),
) -> SincronizacionRespuesta:
    return sincronizar_eventos_mma(db)


@router.post("/cartelera/peleas", response_model=PeleaCarteleraResumen)
def crear_pelea_cartelera_endpoint(
    payload: CrearPeleaCarteleraEntrada,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(requerir_admin),
) -> PeleaCarteleraResumen:
    return crear_pelea_cartelera(db, payload)
