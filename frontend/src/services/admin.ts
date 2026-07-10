import { api } from './api'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type ResumenAdmin = {
  usuarios: number
  apuestas: number
  eventos: number
  ingresos: number
  predicciones: number
  aciertos: number
  errores: number
  precision: number
}

export type SincronizacionAdminRespuesta = {
  eventos: number
  peleas: number
  peleadores: number
  fuente: string
}

export type PeleadorBasicoAdmin = {
  id: number
  nombre: string
}

export type ResultadoAdmin = {
  ganador_id: number
  ganador_nombre: string
  metodo: string
  round: number | null
}

export type PeleaAdminResumen = {
  id: number
  evento: string
  categoria: string
  estado: string
  fecha_hora: string | null
  peleador_rojo_id: number
  peleador_azul_id: number
  peleador_rojo: PeleadorBasicoAdmin
  peleador_azul: PeleadorBasicoAdmin
}

export type PeleaAdminDetalle = PeleaAdminResumen & {
  resultado: ResultadoAdmin | null
}

export type CrearPeleaAdminPayload = {
  evento: string
  categoria: string
  fecha: string
  sede?: string
  peleador_rojo_id: number
  peleador_azul_id: number
  estado: string
  orden?: number
}

export type EditarPeleaAdminPayload = Partial<CrearPeleaAdminPayload>

export type CambiarEstadoPeleaPayload = {
  estado: 'programada' | 'en_curso' | 'finalizada' | 'cancelada'
}

export type RegistrarResultadoPayload = {
  ganador_id: number
  metodo: string
  round?: number | null
}

export type ApuestaAdminResumen = {
  id: number
  usuario_id: number
  pelea_id: number
  peleador_seleccionado_id: number
  monto: number
  cuota: number
  estado: string
  estado_pago: string
  creado_en: string
}

export type CambiarEstadoApuestaPayload = {
  estado: 'Pendiente' | 'Ganada' | 'Perdida' | 'Cancelada'
}

export type UsuarioAdminResumen = {
  id: number
  nombre: string
  correo: string
  rol: string
  activo: boolean
}

export type MensajeAdmin = {
  mensaje: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function cabeceras(token: string) {
  return { Authorization: `Bearer ${token}` }
}

// ── Resumen y sincronización ──────────────────────────────────────────────────

export async function obtenerResumenAdmin(token: string): Promise<ResumenAdmin> {
  const { data } = await api.get<ResumenAdmin>('/admin/resumen', { headers: cabeceras(token) })
  return data
}

export async function sincronizarDatosAdmin(token: string): Promise<SincronizacionAdminRespuesta> {
  const { data } = await api.post<SincronizacionAdminRespuesta>('/admin/sincronizar', undefined, {
    headers: cabeceras(token),
    timeout: 30000,
  })
  return data
}

// ── Peleas ────────────────────────────────────────────────────────────────────

export async function listarPeleasAdmin(token: string): Promise<PeleaAdminResumen[]> {
  const { data } = await api.get<PeleaAdminResumen[]>('/admin/peleas', { headers: cabeceras(token) })
  return data
}

export async function obtenerPeleaAdmin(token: string, peleaId: number): Promise<PeleaAdminDetalle> {
  const { data } = await api.get<PeleaAdminDetalle>(`/admin/peleas/${peleaId}`, { headers: cabeceras(token) })
  return data
}

export async function crearPeleaAdmin(token: string, payload: CrearPeleaAdminPayload): Promise<PeleaAdminDetalle> {
  const { data } = await api.post<PeleaAdminDetalle>('/admin/peleas', payload, { headers: cabeceras(token) })
  return data
}

export async function editarPeleaAdmin(token: string, peleaId: number, payload: EditarPeleaAdminPayload): Promise<PeleaAdminDetalle> {
  const { data } = await api.put<PeleaAdminDetalle>(`/admin/peleas/${peleaId}`, payload, { headers: cabeceras(token) })
  return data
}

export async function cambiarEstadoPeleaAdmin(token: string, peleaId: number, payload: CambiarEstadoPeleaPayload): Promise<PeleaAdminDetalle> {
  const { data } = await api.patch<PeleaAdminDetalle>(`/admin/peleas/${peleaId}/estado`, payload, { headers: cabeceras(token) })
  return data
}

export async function registrarResultadoAdmin(token: string, peleaId: number, payload: RegistrarResultadoPayload): Promise<PeleaAdminDetalle> {
  const { data } = await api.patch<PeleaAdminDetalle>(`/admin/peleas/${peleaId}/resultado`, payload, { headers: cabeceras(token) })
  return data
}

export async function cancelarPeleaAdmin(token: string, peleaId: number): Promise<MensajeAdmin> {
  const { data } = await api.delete<MensajeAdmin>(`/admin/peleas/${peleaId}`, { headers: cabeceras(token) })
  return data
}

// ── Apuestas ──────────────────────────────────────────────────────────────────

export async function listarApuestasAdmin(token: string, estado?: string): Promise<ApuestaAdminResumen[]> {
  const { data } = await api.get<ApuestaAdminResumen[]>('/admin/apuestas', {
    headers: cabeceras(token),
    params: estado ? { estado } : undefined,
  })
  return data
}

export async function cambiarEstadoApuestaAdmin(token: string, apuestaId: number, payload: CambiarEstadoApuestaPayload): Promise<ApuestaAdminResumen> {
  const { data } = await api.patch<ApuestaAdminResumen>(`/admin/apuestas/${apuestaId}/estado`, payload, { headers: cabeceras(token) })
  return data
}

// ── Usuarios ──────────────────────────────────────────────────────────────────

export async function listarUsuariosAdmin(token: string): Promise<UsuarioAdminResumen[]> {
  const { data } = await api.get<UsuarioAdminResumen[]>('/admin/usuarios', { headers: cabeceras(token) })
  return data
}

export async function bloquearUsuarioAdmin(token: string, usuarioId: number): Promise<MensajeAdmin> {
  const { data } = await api.patch<MensajeAdmin>(`/admin/usuarios/${usuarioId}/bloquear`, undefined, { headers: cabeceras(token) })
  return data
}

export async function reactivarUsuarioAdmin(token: string, usuarioId: number): Promise<MensajeAdmin> {
  const { data } = await api.patch<MensajeAdmin>(`/admin/usuarios/${usuarioId}/reactivar`, undefined, { headers: cabeceras(token) })
  return data
}

// ── Búsqueda de peleadores en BD ─────────────────────────────────────────────

export type PeleadorBusquedaAdmin = {
  id: number
  nombre: string
  division: string
  record: string
  pais: string
}

export async function buscarPeleadoresAdmin(token: string, q: string): Promise<PeleadorBusquedaAdmin[]> {
  if (!q.trim()) return []
  const { data } = await api.get<PeleadorBusquedaAdmin[]>('/admin/peleadores/buscar', {
    headers: cabeceras(token),
    params: { q },
  })
  return data
}

// ── Billetera admin ───────────────────────────────────────────────────────────

export type TransaccionAdminResumen = {
  id: number
  usuario_id: number
  monto: number
  estado: string
  creado_en: string
}

export type ResumenBilletera = {
  total_recargas: number
  total_apostado: number
  ganancias_casa: number
  pagos_ganadores: number
  utilidad_neta: number
  transacciones_recientes: TransaccionAdminResumen[]
}

export async function obtenerResumenBilletera(token: string): Promise<ResumenBilletera> {
  const { data } = await api.get<ResumenBilletera>('/admin/billetera/resumen', { headers: cabeceras(token) })
  return data
}
