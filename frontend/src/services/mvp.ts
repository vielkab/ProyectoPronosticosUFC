import { api } from './api'

export type EventoResumen = {
  id: number
  nombre: string
  fecha: string
  sede: string
  estado: string
}

export type PeleaResumen = {
  id: number
  evento_id: number
  peleador_rojo_id: number
  peleador_azul_id: number
  division: string
  estado: string
  orden: number
}

export type PeleaCarteleraResumen = {
  id: number
  evento_nombre: string
  fecha: string
  sede: string
  estado_evento: string
  division: string
  orden: number
  peleador_rojo_nombre: string
  peleador_azul_nombre: string
}

export type CrearPeleaCarteleraPayload = {
  evento_nombre: string
  fecha: string
  sede?: string
  estado_evento?: string
  peleador_rojo_nombre: string
  peleador_azul_nombre: string
  division?: string
  orden?: number
  estado_pelea?: string
}

export type EventoDetalle = EventoResumen & {
  peleas: PeleaResumen[]
}

export type PeleadorResumen = {
  id: number
  nombre: string
  division: string
  pais: string
  record: string
  edad: number | null
  altura_cm: number | null
  alcance_cm: number | null
}

export type PeleadorDetalle = PeleadorResumen & {
  win_rate: number
  ultimas_cinco: string
  significant_strikes_pm: number
  takedown_accuracy: number
  takedown_defense: number
  estadisticas: Record<string, unknown> | null
}

export type FactorPrediccion = {
  nombre: string
  peleador_rojo: number
  peleador_azul: number
  peso: number
}

export type OpcionMercado = {
  probability: number
  odds: number | null
}

export type PrediccionCombate = {
  pelea_id: number
  peleador_rojo_id: number
  peleador_azul_id: number
  probabilidad_rojo: number
  probabilidad_azul: number
  cuota_rojo: number
  cuota_azul: number
  cuota_rojo_con_pronostico: number
  cuota_azul_con_pronostico: number
  method: Record<string, OpcionMercado>
  round: Record<string, OpcionMercado>
  method_disponible: boolean
  round_disponible: boolean
  factores: FactorPrediccion[]
  explicacion: string
}

export type PeleaHistorica = {
  fecha: string
  peleador_1: string
  peleador_2: string
  ganador: string
}

export type PaginaPeleasHistoricas = {
  page: number
  size: number
  total: number
  items: PeleaHistorica[]
}

export type RankingHistorico = {
  rank: number
  fighter: string
}

export type ApuestaResumen = {
  id: number
  estado: string
  estado_pago: string
  monto: number
  cuota: number
  ver_pronostico: boolean
  pelea_id: number
  peleador_seleccionado_id: number
  metodo_victoria: string | null
  round: number | null
  creado_en: string
}

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

export type SincronizacionRespuesta = {
  eventos: number
  peleas: number
  peleadores: number
  fuente: string
}

export async function listarEventos(): Promise<EventoResumen[]> {
  const { data } = await api.get<EventoResumen[]>('/eventos')
  return data
}

export async function obtenerEvento(id: number): Promise<EventoDetalle> {
  const { data } = await api.get<EventoDetalle>(`/eventos/${id}`)
  return data
}

export async function listarPeleasCartelera(filtros?: { desde?: string; hasta?: string }): Promise<PeleaCarteleraResumen[]> {
  const { data } = await api.get<PeleaCarteleraResumen[]>('/eventos/peleas/cartelera', {
    params: filtros
      ? {
          ...(filtros.desde ? { desde: filtros.desde } : {}),
          ...(filtros.hasta ? { hasta: filtros.hasta } : {}),
        }
      : undefined,
  })
  return data
}

export async function listarPeleadores(busqueda?: string, categoria = 'Lightweight'): Promise<PeleadorResumen[]> {
  const { data } = await api.get<PeleadorResumen[]>('/peleadores', {
    params: {
      categoria,
      ...(busqueda ? { busqueda } : {}),
    },
  })
  return data
}

export async function obtenerPeleador(id: number): Promise<PeleadorDetalle> {
  const { data } = await api.get<PeleadorDetalle>(`/peleadores/${id}`)
  return data
}

export async function obtenerPrediccion(peleaId: number): Promise<PrediccionCombate> {
  const { data } = await api.get<PrediccionCombate>(`/predicciones/${peleaId}`)
  return data
}

export async function listarPeleasHistoricas(page = 1, size = 20): Promise<PaginaPeleasHistoricas> {
  const { data } = await api.get<PaginaPeleasHistoricas>('/historico/peleas', { params: { page, size } })
  return data
}

export async function obtenerRankings(division = 'Lightweight'): Promise<RankingHistorico[]> {
  const { data } = await api.get<RankingHistorico[]>('/rankings', { params: { division } })
  return data
}

export async function listarHistorialApuestas(token: string): Promise<ApuestaResumen[]> {
  const { data } = await api.get<ApuestaResumen[]>('/apuestas/historial', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return data
}

export async function registrarApuesta(
  token: string,
  payload: {
    pelea_id: number
    peleador_seleccionado_id: number
    monto: number
    metodo_victoria?: string | null
    round?: number | null
    ver_pronostico?: boolean
  },
): Promise<ApuestaResumen> {
  const { data } = await api.post<ApuestaResumen>('/apuestas', payload, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return data
}

export async function crearCheckout(token: string, apuestaId: number): Promise<{ checkout_url: string; session_id: string }> {
  const { data } = await api.post<{ checkout_url: string; session_id: string }>(
    '/pagos/checkout',
    { apuesta_id: apuestaId },
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return data
}