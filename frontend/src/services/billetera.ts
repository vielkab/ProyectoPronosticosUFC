import { api } from './api'

export type RecargaHistorial = {
  monto: number
  estado: string
  creado_en: string
}

export type BilleteraResumen = {
  saldo: number
  moneda: string
  recientes: RecargaHistorial[]
}

export type RecargaRespuesta = {
  checkout_url: string
  session_id: string
}

export async function obtenerBilletera(token: string): Promise<BilleteraResumen> {
  const { data } = await api.get<BilleteraResumen>('/billetera', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return data
}

export async function iniciarRecarga(token: string, monto: number): Promise<RecargaRespuesta> {
  const { data } = await api.post<RecargaRespuesta>(
    '/billetera/recargar',
    { monto },
    { headers: { Authorization: `Bearer ${token}` } }
  )
  return data
}

export async function confirmarRecarga(token: string, sessionId: string): Promise<BilleteraResumen> {
  const { data } = await api.post<BilleteraResumen>(
    '/billetera/confirmar',
    { session_id: sessionId },
    { headers: { Authorization: `Bearer ${token}` } }
  )
  return data
}
