from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.admin.schemas import ResumenAdmin, SincronizacionRespuesta
from app.admin.service import obtener_resumen_admin
from app.core.base_de_datos import obtener_db
from app.eventos.service import sincronizar_eventos_mma

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/resumen", response_model=ResumenAdmin)
def obtener_resumen_admin_endpoint(db: Session = Depends(obtener_db)) -> ResumenAdmin:
    return obtener_resumen_admin(db)


@router.post("/sincronizar", response_model=SincronizacionRespuesta)
def sincronizar_datos_endpoint(db: Session = Depends(obtener_db)) -> SincronizacionRespuesta:
    return sincronizar_eventos_mma(db)
