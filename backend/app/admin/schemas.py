from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, model_validator


EstadoPelea = Literal["programada", "en_curso", "finalizada", "cancelada"]
EstadoApuesta = Literal["Pendiente", "Ganada", "Perdida", "Cancelada"]


class ResumenAdmin(BaseModel):
    usuarios: int
    apuestas: int
    eventos: int
    ingresos: float
    predicciones: int
    aciertos: int
    errores: int
    precision: float


class SincronizacionRespuesta(BaseModel):
    eventos: int
    peleas: int
    peleadores: int
    fuente: str


class CrearPeleaCarteleraEntrada(BaseModel):
    evento_nombre: str = Field(min_length=2, max_length=160)
    fecha: date
    sede: str = Field(default="", max_length=160)
    estado_evento: str = Field(default="programado", max_length=30)
    peleador_rojo_nombre: str = Field(min_length=2, max_length=140)
    peleador_azul_nombre: str = Field(min_length=2, max_length=140)
    division: str = Field(default="", max_length=80)
    orden: int = Field(default=1, ge=1)
    estado_pelea: str = Field(default="programada", max_length=30)


# ── Peleas admin ──────────────────────────────────────────────────────────────

class PeleadorBasicoSalida(BaseModel):
    id: int
    nombre: str


class ResultadoSalidaAdmin(BaseModel):
    ganador_id: int
    ganador_nombre: str
    metodo: str
    round: int | None


class PeleaAdminResumen(BaseModel):
    id: int
    evento: str
    categoria: str
    estado: str
    fecha_hora: str | None
    hora: str | None
    peleador_rojo_id: int
    peleador_azul_id: int
    peleador_rojo: PeleadorBasicoSalida
    peleador_azul: PeleadorBasicoSalida


class PeleaAdminDetalle(PeleaAdminResumen):
    resultado: ResultadoSalidaAdmin | None


class CrearPeleaAdminEntrada(BaseModel):
    evento: str = Field(min_length=2, max_length=160)
    categoria: str = Field(default="", max_length=80)
    fecha: date
    hora: str | None = Field(default=None, description="HH:MM en formato 24h, ej: 20:00")
    sede: str = Field(default="", max_length=160)
    peleador_rojo_id: int = Field(gt=0)
    peleador_azul_id: int = Field(gt=0)
    estado: EstadoPelea = "programada"
    orden: int = Field(default=1, ge=1)

    @model_validator(mode="after")
    def peleadores_distintos(self) -> "CrearPeleaAdminEntrada":
        if self.peleador_rojo_id == self.peleador_azul_id:
            raise ValueError("Los peleadores deben ser distintos.")
        return self


class EditarPeleaAdminEntrada(BaseModel):
    evento: str | None = Field(default=None, min_length=2, max_length=160)
    categoria: str | None = Field(default=None, max_length=80)
    fecha: date | None = None
    sede: str | None = Field(default=None, max_length=160)
    peleador_rojo_id: int | None = Field(default=None, gt=0)
    peleador_azul_id: int | None = Field(default=None, gt=0)
    orden: int | None = Field(default=None, ge=1)


class CambiarEstadoPeleaEntrada(BaseModel):
    estado: EstadoPelea


class RegistrarResultadoEntrada(BaseModel):
    ganador_id: int = Field(gt=0)
    metodo: str = Field(min_length=1, max_length=60)
    round: int | None = Field(default=None, ge=1, le=5)


# ── Apuestas admin ────────────────────────────────────────────────────────────

class ApuestaAdminResumen(BaseModel):
    id: int
    usuario_id: int
    pelea_id: int
    peleador_seleccionado_id: int
    monto: float
    cuota: float
    estado: str
    estado_pago: str
    creado_en: str


class CambiarEstadoApuestaEntrada(BaseModel):
    estado: EstadoApuesta


# ── Usuarios admin ────────────────────────────────────────────────────────────

class UsuarioAdminResumen(BaseModel):
    id: int
    nombre: str
    correo: str
    rol: str
    activo: bool


class MensajeRespuesta(BaseModel):
    mensaje: str


# ── Peleadores admin (búsqueda en BD) ─────────────────────────────────────────

class PeleadorBusquedaAdmin(BaseModel):
    id: int
    nombre: str
    division: str
    record: str
    pais: str


# ── Billetera admin ───────────────────────────────────────────────────────────

class TransaccionAdminResumen(BaseModel):
    id: int
    usuario_id: int
    monto: float
    estado: str
    creado_en: str


class ResumenBilletera(BaseModel):
    total_recargas: float
    total_apostado: float
    ganancias_casa: float
    pagos_ganadores: float
    utilidad_neta: float
    transacciones_recientes: list[TransaccionAdminResumen]


# ── Predicciones admin ────────────────────────────────────────────────────────

class PrediccionAdminResumen(BaseModel):
    prediccion_id: int
    pelea_id: int
    evento: str
    fecha: str | None
    peleador_rojo: str
    peleador_azul: str
    probabilidad_rojo: float
    probabilidad_azul: float
    cuota_rojo: float | None
    cuota_azul: float | None
    acertada: bool | None
    explicacion: str
