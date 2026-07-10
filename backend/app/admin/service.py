from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

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
    PeleadorBasicoSalida,
    PeleadorBusquedaAdmin,
    RegistrarResultadoEntrada,
    ResumenAdmin,
    ResumenBilletera,
    ResultadoSalidaAdmin,
    UsuarioAdminResumen,
)
from app.apuestas.models import Apuesta
from app.eventos.models import Evento, Pelea, Resultado
from app.eventos.service import _asegurar_datos_demo
from app.peleadores.models import Peleador
from app.predicciones.models import Prediccion
from app.usuarios.models import Usuario


# ── Resumen ───────────────────────────────────────────────────────────────────

def obtener_resumen_admin(db: Session) -> ResumenAdmin:
    _asegurar_datos_demo(db)
    usuarios = db.scalar(select(func.count(Usuario.id))) or 0
    apuestas = db.scalar(select(func.count(Apuesta.id))) or 0
    eventos = db.scalar(select(func.count(Evento.id))) or 0
    ingresos = db.scalar(
        select(func.coalesce(func.sum(Apuesta.monto), 0.0)).where(Apuesta.estado_pago == "pagado")
    ) or 0.0
    predicciones = db.scalar(select(func.count(Prediccion.id))) or 0
    aciertos = db.scalar(
        select(func.count(Prediccion.id)).where(Prediccion.acertada.is_(True))
    ) or 0
    errores = db.scalar(
        select(func.count(Prediccion.id)).where(Prediccion.acertada.is_(False))
    ) or 0
    evaluadas = aciertos + errores
    precision = round((aciertos / evaluadas) * 100, 2) if evaluadas else 0.0

    return ResumenAdmin(
        usuarios=usuarios,
        apuestas=apuestas,
        eventos=eventos,
        ingresos=float(ingresos),
        predicciones=predicciones,
        aciertos=aciertos,
        errores=errores,
        precision=precision,
    )


# ── Cartelera (endpoint legado) ───────────────────────────────────────────────

def crear_pelea_cartelera(db: Session, payload: CrearPeleaCarteleraEntrada) -> dict:
    evento = db.scalar(
        select(Evento).where(
            Evento.nombre == payload.evento_nombre.strip(),
            Evento.fecha == payload.fecha,
        )
    )
    if not evento:
        evento = Evento(nombre=payload.evento_nombre.strip(), fecha=payload.fecha)
        db.add(evento)

    evento.sede = payload.sede.strip()
    evento.estado = payload.estado_evento.strip() or "programado"

    rojo = _obtener_o_crear_peleador(db, payload.peleador_rojo_nombre)
    azul = _obtener_o_crear_peleador(db, payload.peleador_azul_nombre)
    db.flush()

    pelea = Pelea(
        evento_id=evento.id,
        peleador_rojo_id=rojo.id,
        peleador_azul_id=azul.id,
        division=payload.division.strip(),
        orden=payload.orden,
        estado=payload.estado_pelea.strip() or "programada",
    )
    db.add(pelea)
    db.commit()
    db.refresh(pelea)
    db.refresh(evento)

    return {
        "id": pelea.id,
        "evento_nombre": evento.nombre,
        "fecha": evento.fecha,
        "sede": evento.sede,
        "estado_evento": evento.estado,
        "division": pelea.division,
        "orden": pelea.orden,
        "peleador_rojo_nombre": rojo.nombre,
        "peleador_azul_nombre": azul.nombre,
    }


def _obtener_o_crear_peleador(db: Session, nombre: str) -> Peleador:
    nombre_limpio = nombre.strip()
    peleador = db.scalar(select(Peleador).where(Peleador.nombre == nombre_limpio))
    if peleador:
        return peleador
    peleador = Peleador(nombre=nombre_limpio)
    db.add(peleador)
    return peleador


# ── Peleas admin ──────────────────────────────────────────────────────────────

def _cargar_pelea(db: Session, pelea_id: int) -> Pelea:
    pelea = db.scalar(
        select(Pelea)
        .options(
            selectinload(Pelea.evento),
            selectinload(Pelea.peleador_rojo),
            selectinload(Pelea.peleador_azul),
            selectinload(Pelea.resultado).selectinload(Resultado.ganador),
        )
        .where(Pelea.id == pelea_id)
    )
    if not pelea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pelea no encontrada.")
    return pelea


def _mapear_pelea_resumen(pelea: Pelea) -> PeleaAdminResumen:
    hora_str = pelea.evento.hora.strftime("%H:%M") if pelea.evento.hora else None
    return PeleaAdminResumen(
        id=pelea.id,
        evento=pelea.evento.nombre,
        categoria=pelea.division,
        estado=pelea.estado,
        fecha_hora=str(pelea.evento.fecha) if pelea.evento.fecha else None,
        hora=hora_str,
        peleador_rojo_id=pelea.peleador_rojo_id,
        peleador_azul_id=pelea.peleador_azul_id,
        peleador_rojo=PeleadorBasicoSalida(id=pelea.peleador_rojo.id, nombre=pelea.peleador_rojo.nombre),
        peleador_azul=PeleadorBasicoSalida(id=pelea.peleador_azul.id, nombre=pelea.peleador_azul.nombre),
    )


def _mapear_pelea_detalle(pelea: Pelea) -> PeleaAdminDetalle:
    resumen = _mapear_pelea_resumen(pelea)
    resultado = None
    if pelea.resultado:
        resultado = ResultadoSalidaAdmin(
            ganador_id=pelea.resultado.ganador_id,
            ganador_nombre=pelea.resultado.ganador.nombre,
            metodo=pelea.resultado.metodo,
            round=pelea.resultado.round,
        )
    return PeleaAdminDetalle(**resumen.model_dump(), resultado=resultado)


def listar_peleas_admin(db: Session) -> list[PeleaAdminResumen]:
    peleas = db.scalars(
        select(Pelea)
        .options(
            selectinload(Pelea.evento),
            selectinload(Pelea.peleador_rojo),
            selectinload(Pelea.peleador_azul),
        )
        .order_by(Pelea.id.desc())
    ).all()
    return [_mapear_pelea_resumen(p) for p in peleas]


def obtener_pelea_admin(db: Session, pelea_id: int) -> PeleaAdminDetalle:
    pelea = _cargar_pelea(db, pelea_id)
    return _mapear_pelea_detalle(pelea)


def crear_pelea_admin(db: Session, payload: CrearPeleaAdminEntrada) -> PeleaAdminDetalle:
    from datetime import time as time_type
    rojo = db.get(Peleador, payload.peleador_rojo_id)
    if not rojo:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Peleador rojo no encontrado en la base de datos.")
    azul = db.get(Peleador, payload.peleador_azul_id)
    if not azul:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Peleador azul no encontrado en la base de datos.")

    # Parsear hora opcional
    hora_parsed: time_type | None = None
    if payload.hora:
        try:
            partes = payload.hora.strip().split(":")
            hora_parsed = time_type(int(partes[0]), int(partes[1]))
        except (ValueError, IndexError):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Formato de hora inválido. Use HH:MM.")

    evento = db.scalar(
        select(Evento).where(Evento.nombre == payload.evento.strip(), Evento.fecha == payload.fecha)
    )
    if not evento:
        evento = Evento(
            nombre=payload.evento.strip(),
            fecha=payload.fecha,
            hora=hora_parsed,
            sede=payload.sede.strip(),
            estado="programado",
        )
        db.add(evento)
        db.flush()
    else:
        # Actualizar hora si se proporcionó
        if hora_parsed is not None:
            evento.hora = hora_parsed

    pelea = Pelea(
        evento_id=evento.id,
        peleador_rojo_id=rojo.id,
        peleador_azul_id=azul.id,
        division=payload.categoria.strip(),
        estado=payload.estado,
        orden=payload.orden,
    )
    db.add(pelea)
    db.commit()
    db.refresh(pelea)

    # Generar pronóstico automáticamente al crear la pelea
    try:
        from app.predicciones.service import obtener_prediccion
        obtener_prediccion(db, pelea.id)
    except Exception:
        pass  # No bloquear la creación si el pronóstico falla

    return obtener_pelea_admin(db, pelea.id)


def editar_pelea_admin(db: Session, pelea_id: int, payload: EditarPeleaAdminEntrada) -> PeleaAdminDetalle:
    pelea = _cargar_pelea(db, pelea_id)

    if pelea.estado in {"finalizada", "cancelada"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"No se puede editar una pelea en estado '{pelea.estado}'.",
        )

    if payload.peleador_rojo_id is not None:
        if not db.get(Peleador, payload.peleador_rojo_id):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Peleador rojo no encontrado.")
        pelea.peleador_rojo_id = payload.peleador_rojo_id

    if payload.peleador_azul_id is not None:
        if not db.get(Peleador, payload.peleador_azul_id):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Peleador azul no encontrado.")
        pelea.peleador_azul_id = payload.peleador_azul_id

    if payload.categoria is not None:
        pelea.division = payload.categoria.strip()
    if payload.orden is not None:
        pelea.orden = payload.orden

    if payload.evento is not None or payload.fecha is not None or payload.sede is not None:
        nombre_evento = payload.evento.strip() if payload.evento else pelea.evento.nombre
        fecha_evento = payload.fecha if payload.fecha else pelea.evento.fecha
        sede_evento = payload.sede.strip() if payload.sede is not None else pelea.evento.sede

        evento_existente = db.scalar(
            select(Evento).where(Evento.nombre == nombre_evento, Evento.fecha == fecha_evento)
        )
        if evento_existente and evento_existente.id != pelea.evento_id:
            pelea.evento_id = evento_existente.id
        else:
            pelea.evento.nombre = nombre_evento
            pelea.evento.fecha = fecha_evento
            pelea.evento.sede = sede_evento

    db.commit()
    return obtener_pelea_admin(db, pelea_id)


def cambiar_estado_pelea(db: Session, pelea_id: int, payload: CambiarEstadoPeleaEntrada) -> PeleaAdminDetalle:
    pelea = db.get(Pelea, pelea_id)
    if not pelea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pelea no encontrada.")
    pelea.estado = payload.estado
    db.commit()
    return obtener_pelea_admin(db, pelea_id)


def registrar_resultado_admin(db: Session, pelea_id: int, payload: RegistrarResultadoEntrada) -> PeleaAdminDetalle:
    pelea = db.get(Pelea, pelea_id)
    if not pelea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pelea no encontrada.")

    if payload.ganador_id not in {pelea.peleador_rojo_id, pelea.peleador_azul_id}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El ganador debe ser uno de los peleadores de la pelea.",
        )

    resultado_existente = db.scalar(select(Resultado).where(Resultado.pelea_id == pelea_id))
    if resultado_existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El resultado de esta pelea ya fue registrado.",
        )

    resultado = Resultado(
        pelea_id=pelea_id,
        ganador_id=payload.ganador_id,
        metodo=payload.metodo,
        round=payload.round,
    )
    db.add(resultado)
    pelea.estado = "finalizada"

    # Resolver apuestas pendientes
    apuestas = db.scalars(
        select(Apuesta).where(Apuesta.pelea_id == pelea_id, Apuesta.estado == "Pendiente")
    ).all()
    for apuesta in apuestas:
        apuesta.estado = "Ganada" if apuesta.peleador_seleccionado_id == payload.ganador_id else "Perdida"

    # Evaluar predicción si existe
    prediccion = db.scalar(select(Prediccion).where(Prediccion.pelea_id == pelea_id))
    if prediccion:
        favorito_id = (
            pelea.peleador_rojo_id
            if prediccion.probabilidad_rojo >= prediccion.probabilidad_azul
            else pelea.peleador_azul_id
        )
        prediccion.acertada = favorito_id == payload.ganador_id

    db.commit()
    return obtener_pelea_admin(db, pelea_id)


def cancelar_pelea_admin(db: Session, pelea_id: int) -> MensajeRespuesta:
    pelea = db.get(Pelea, pelea_id)
    if not pelea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pelea no encontrada.")
    if pelea.estado == "cancelada":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="La pelea ya está cancelada.")
    if pelea.estado == "finalizada":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No se puede cancelar una pelea finalizada.")

    pelea.estado = "cancelada"

    apuestas = db.scalars(
        select(Apuesta).where(Apuesta.pelea_id == pelea_id, Apuesta.estado == "Pendiente")
    ).all()
    for apuesta in apuestas:
        apuesta.estado = "Cancelada"

    db.commit()
    return MensajeRespuesta(mensaje=f"Pelea #{pelea_id} cancelada y {len(apuestas)} apuesta(s) cancelada(s).")


# ── Apuestas admin ────────────────────────────────────────────────────────────

def listar_apuestas_admin(db: Session, estado: str | None = None) -> list[ApuestaAdminResumen]:
    consulta = select(Apuesta).order_by(Apuesta.creado_en.desc())
    if estado:
        estados_validos = {"Pendiente", "Ganada", "Perdida", "Cancelada"}
        if estado not in estados_validos:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Estado inválido. Valores permitidos: {', '.join(estados_validos)}",
            )
        consulta = consulta.where(Apuesta.estado == estado)
    apuestas = db.scalars(consulta).all()
    return [
        ApuestaAdminResumen(
            id=a.id,
            usuario_id=a.usuario_id,
            pelea_id=a.pelea_id,
            peleador_seleccionado_id=a.peleador_seleccionado_id,
            monto=a.monto,
            cuota=a.cuota,
            estado=a.estado,
            estado_pago=a.estado_pago,
            creado_en=a.creado_en.isoformat() if isinstance(a.creado_en, datetime) else str(a.creado_en),
        )
        for a in apuestas
    ]


def cambiar_estado_apuesta_admin(db: Session, apuesta_id: int, payload: CambiarEstadoApuestaEntrada) -> ApuestaAdminResumen:
    apuesta = db.get(Apuesta, apuesta_id)
    if not apuesta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Apuesta no encontrada.")
    apuesta.estado = payload.estado
    db.commit()
    db.refresh(apuesta)
    return ApuestaAdminResumen(
        id=apuesta.id,
        usuario_id=apuesta.usuario_id,
        pelea_id=apuesta.pelea_id,
        peleador_seleccionado_id=apuesta.peleador_seleccionado_id,
        monto=apuesta.monto,
        cuota=apuesta.cuota,
        estado=apuesta.estado,
        estado_pago=apuesta.estado_pago,
        creado_en=apuesta.creado_en.isoformat() if isinstance(apuesta.creado_en, datetime) else str(apuesta.creado_en),
    )


# ── Usuarios admin ────────────────────────────────────────────────────────────

def listar_usuarios_admin(db: Session) -> list[UsuarioAdminResumen]:
    usuarios = db.scalars(select(Usuario).order_by(Usuario.id.asc())).all()
    return [
        UsuarioAdminResumen(id=u.id, nombre=u.nombre, correo=u.correo, rol=u.rol, activo=u.activo)
        for u in usuarios
    ]


def bloquear_usuario_admin(db: Session, usuario_id: int) -> MensajeRespuesta:
    usuario = db.get(Usuario, usuario_id)
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    if usuario.rol == "administrador":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No se puede bloquear a un administrador.")
    if not usuario.activo:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El usuario ya está bloqueado.")
    usuario.activo = False
    db.commit()
    return MensajeRespuesta(mensaje=f"Usuario '{usuario.nombre}' bloqueado.")


def reactivar_usuario_admin(db: Session, usuario_id: int) -> MensajeRespuesta:
    usuario = db.get(Usuario, usuario_id)
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    if usuario.activo:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El usuario ya está activo.")
    usuario.activo = True
    db.commit()
    return MensajeRespuesta(mensaje=f"Usuario '{usuario.nombre}' reactivado.")


# ── Búsqueda de peleadores en BD ──────────────────────────────────────────────

def buscar_peleadores_admin(db: Session, q: str) -> list[PeleadorBusquedaAdmin]:
    termino = q.strip().lower()
    if not termino:
        return []
    peleadores = db.scalars(
        select(Peleador)
        .where(Peleador.nombre.ilike(f"%{termino}%"))
        .order_by(Peleador.nombre.asc())
        .limit(20)
    ).all()
    return [
        PeleadorBusquedaAdmin(
            id=p.id,
            nombre=p.nombre,
            division=p.division or "",
            record=p.record or "",
            pais=p.pais or "",
        )
        for p in peleadores
    ]


def listar_peleadores_por_division(db: Session, division: str) -> list[PeleadorBusquedaAdmin]:
    """
    Devuelve peleadores de la BD que coincidan con la división.
    Si hay menos de 5, intenta sincronizar desde la API primero.
    """
    from app.eventos.mma_api_client import MmaApiClient
    from app.eventos.service import _upsert_peleador

    division_limpia = division.strip()
    if not division_limpia:
        return []

    def _consultar_bd() -> list[Peleador]:
        return db.scalars(
            select(Peleador)
            .where(Peleador.division.ilike(division_limpia))
            .order_by(Peleador.nombre.asc())
        ).all()

    en_bd = _consultar_bd()

    # Si hay pocos, intentar sincronizar desde la API (no falla si la API no responde)
    if len(en_bd) < 5:
        try:
            cliente = MmaApiClient()
            if cliente.esta_configurado():
                externos = cliente.obtener_peleadores(categoria=division_limpia)
                for externo in externos:
                    _upsert_peleador(db, externo)
                db.commit()
                en_bd = _consultar_bd()
        except Exception:
            pass  # Si la API falla, usamos lo que hay en BD

    return [
        PeleadorBusquedaAdmin(
            id=p.id,
            nombre=p.nombre,
            division=p.division or "",
            record=p.record or "",
            pais=p.pais or "",
        )
        for p in en_bd
    ]


# ── Resumen billetera admin ───────────────────────────────────────────────────

def obtener_resumen_billetera_admin(db: Session) -> ResumenBilletera:
    from app.admin.schemas import ResumenBilletera, TransaccionAdminResumen
    from app.billetera.models import Recarga
    from app.pagos.models import Transaccion

    total_recargas = db.scalar(
        select(func.coalesce(func.sum(Recarga.monto), 0.0)).where(Recarga.estado == "completado")
    ) or 0.0

    total_apostado = db.scalar(
        select(func.coalesce(func.sum(Apuesta.monto), 0.0)).where(Apuesta.estado_pago == "pagado")
    ) or 0.0

    # Ganancias casa = suma de montos de apuestas PERDIDAS (el sistema se queda con ese dinero)
    ganancias_casa = db.scalar(
        select(func.coalesce(func.sum(Apuesta.monto), 0.0)).where(Apuesta.estado == "Perdida")
    ) or 0.0

    # Pagos a ganadores = suma de (monto × cuota) para apuestas GANADAS
    apuestas_ganadas = db.scalars(
        select(Apuesta).where(Apuesta.estado == "Ganada")
    ).all()
    pagos_ganadores = sum(a.monto * a.cuota for a in apuestas_ganadas)

    utilidad_neta = round(ganancias_casa - pagos_ganadores, 2)

    transacciones = db.scalars(
        select(Transaccion).order_by(Transaccion.creado_en.desc()).limit(20)
    ).all()

    return ResumenBilletera(
        total_recargas=round(float(total_recargas), 2),
        total_apostado=round(float(total_apostado), 2),
        ganancias_casa=round(float(ganancias_casa), 2),
        pagos_ganadores=round(pagos_ganadores, 2),
        utilidad_neta=utilidad_neta,
        transacciones_recientes=[
            TransaccionAdminResumen(
                id=t.id,
                usuario_id=t.usuario_id,
                monto=t.monto,
                estado=t.estado,
                creado_en=t.creado_en.isoformat() if isinstance(t.creado_en, datetime) else str(t.creado_en),
            )
            for t in transacciones
        ],
    )


# ── Predicciones admin ────────────────────────────────────────────────────────

def listar_predicciones_admin(db: Session) -> list[dict]:
    from app.predicciones.models import Prediccion
    from sqlalchemy.orm import selectinload as _sl

    predicciones = db.scalars(
        select(Prediccion)
        .options(
            _sl(Prediccion.pelea).selectinload(Pelea.peleador_rojo),
            _sl(Prediccion.pelea).selectinload(Pelea.peleador_azul),
            _sl(Prediccion.pelea).selectinload(Pelea.evento),
        )
        .order_by(Prediccion.id.desc())
    ).all()

    resultado = []
    for p in predicciones:
        pelea = p.pelea
        resultado.append({
            "prediccion_id": p.id,
            "pelea_id": p.pelea_id,
            "evento": pelea.evento.nombre if pelea.evento else "—",
            "fecha": str(pelea.evento.fecha) if pelea.evento else None,
            "peleador_rojo": pelea.peleador_rojo.nombre if pelea.peleador_rojo else "—",
            "peleador_azul": pelea.peleador_azul.nombre if pelea.peleador_azul else "—",
            "probabilidad_rojo": p.probabilidad_rojo,
            "probabilidad_azul": p.probabilidad_azul,
            "cuota_rojo": p.cuota_rojo,
            "cuota_azul": p.cuota_azul,
            "acertada": p.acertada,
            "explicacion": p.explicacion,
        })
    return resultado
