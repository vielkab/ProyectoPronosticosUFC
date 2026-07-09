from fastapi import APIRouter

from app.admin.schemas import ResumenAdmin

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/resumen", response_model=ResumenAdmin)
def obtener_resumen_admin() -> ResumenAdmin:
    return ResumenAdmin(usuarios=0, apuestas=0, eventos=0)
