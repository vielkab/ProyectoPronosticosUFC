import { createContext } from 'react'

import type { UsuarioAutenticado } from '../services/auth'

export type SesionAutenticada = {
  accessToken: string
  refreshToken: string
  usuario: UsuarioAutenticado
}

export type ValorAutenticacion = {
  sesion: SesionAutenticada | null
  autenticado: boolean
  cargando: boolean
  guardarSesion: (sesion: SesionAutenticada) => void
  cerrarSesion: () => Promise<void>
}

export const CLAVE_STORAGE = 'pronostats.sesion'

export const AutenticacionContexto = createContext<ValorAutenticacion | undefined>(undefined)
