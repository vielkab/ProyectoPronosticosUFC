import { api } from './api'

export interface EstadisticasApuestas {
  aciertos: number
  fallos: number
  pendientes: number
  efectividad: number
  total_apuestas: number
}

export async function obtenerMisEstadisticas(token: string): Promise<EstadisticasApuestas> {
  const { data } = await api.get<EstadisticasApuestas>('/apuestas/panel-estadisticas', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return data
}