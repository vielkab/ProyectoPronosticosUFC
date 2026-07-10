from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.apuestas.models import Apuesta
from app.apuestas.schemas import ApuestaEntrada
from app.eventos.models import Pelea
from app.eventos.service import _asegurar_datos_demo
from app.usuarios.models import Usuario


def crear_apuesta(db: Session, usuario: Usuario, payload: ApuestaEntrada) -> Apuesta:
    _asegurar_datos_demo(db)
    
    # 1. VALIDACIÓN DE SALDO: Revisa si el usuario tiene fondos suficientes
    saldo_actual = getattr(usuario, 'billetera', getattr(usuario, 'saldo', 0))
    if saldo_actual < payload.monto:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Saldo insuficiente para realizar esta apuesta.",
        )
        
    pelea = db.get(Pelea, payload.pelea_id)
    if not pelea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pelea no encontrada.")

    if payload.peleador_seleccionado_id not in {pelea.peleador_rojo_id, pelea.peleador_azul_id}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El peleador seleccionado no pertenece a esta pelea.",
        )

    # 2. DESCONTAR EL SALDO VIRTUAL: Se debita de inmediato al colocar la apuesta
    if hasattr(usuario, 'billetera'):
        usuario.billetera -= payload.monto
    elif hasattr(usuario, 'saldo'):
        usuario.saldo -= payload.monto

    apuesta = Apuesta(
        usuario_id=usuario.id,
        pelea_id=payload.pelea_id,
        peleador_seleccionado_id=payload.peleador_seleccionado_id,
        monto=payload.monto,
        metodo_victoria=payload.metodo_victoria,
        round=payload.round,
        cuota=1.8,
        estado="Pendiente",
        estado_pago="pendiente",
    )
    db.add(apuesta)
    db.commit()
    db.refresh(apuesta)
    return apuesta


def listar_historial(db: Session, usuario: Usuario) -> list[Apuesta]:
    return list(
        db.scalars(
            select(Apuesta)
            .where(Apuesta.usuario_id == usuario.id)
            .order_by(Apuesta.creado_en.desc())
        )
    )


def procesar_resultados_pelea(db: Session, pelea_id: int, peleador_ganador_id: int) -> dict:
    """
    Busca todas las apuestas 'Pendiente' de una pelea, las califica
    como 'Ganada' o 'Perdida', actualiza el estado de pago y premia al usuario.
    """
    stmt = select(Apuesta).where(Apuesta.pelea_id == pelea_id, Apuesta.estado == "Pendiente")
    apuestas_pendientes = list(db.scalars(stmt))

    aciertos = 0
    fallos = 0

    for apuesta in apuestas_pendientes:
        if apuesta.peleador_seleccionado_id == peleador_ganador_id:
            apuesta.estado = "Ganada"
            apuesta.estado_pago = "pagado"  # Se marca como pagado exitosamente
            aciertos += 1
            
            # Calcular ganancia
            ganancia_total = apuesta.monto * apuesta.cuota
            
            # Obtener el usuario dueño de la apuesta para ingresarle sus ganancias
            usuario_dueno = db.get(Usuario, apuesta.usuario_id)
            if usuario_dueno:
                if hasattr(usuario_dueno, 'billetera'):
                    usuario_dueno.billetera += ganancia_total
                elif hasattr(usuario_dueno, 'saldo'):
                    usuario_dueno.saldo += ganancia_total
        else:
            apuesta.estado = "Perdida"
            apuesta.estado_pago = "completado"  # La apuesta cerró aunque haya sido fallo
            fallos += 1

    db.commit()
    return {"status": "success", "apuestas_ganadas": aciertos, "apuestas_perdidas": fallos}


def obtener_estadisticas_usuario(db: Session, usuario: Usuario) -> dict:
    """
    Calcula el conteo de aciertos, fallos y rendimiento global (Win Rate)
    directamente para el panel del usuario.
    """
    stmt = select(Apuesta).where(Apuesta.usuario_id == usuario.id)
    apuestas = list(db.scalars(stmt))
    
    ganadas = sum(1 for a in apuestas if a.estado == "Ganada")
    perdidas = sum(1 for a in apuestas if a.estado == "Perdida")
    pendientes = sum(1 for a in apuestas if a.estado == "Pendiente")
    
    total_resueltas = ganadas + perdidas
    win_rate = (ganadas / total_resueltas * 100) if total_resueltas > 0 else 0.0
    
    return {
        "aciertos": ganadas,
        "fallos": perdidas,
        "pendientes": pendientes,
        "efectividad": round(win_rate, 2),
        "total_apuestas": len(apuestas)
    }