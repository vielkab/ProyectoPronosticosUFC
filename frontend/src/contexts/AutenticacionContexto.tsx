import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@clerk/clerk-react'

import {
  AutenticacionContexto,
  CLAVE_STORAGE,
  type SesionAutenticada,
} from './autenticacion'
import { verificarEstadoSesion } from '../services/auth'

type ProveedorAutenticacionProps = {
  children: ReactNode
}

function obtenerSesionInicial(): SesionAutenticada | null {
  const sesionGuardada = localStorage.getItem(CLAVE_STORAGE)

  if (!sesionGuardada) {
    return null
  }

  try {
    return JSON.parse(sesionGuardada) as SesionAutenticada
  } catch {
    localStorage.removeItem(CLAVE_STORAGE)
    return null
  }
}

export function ProveedorAutenticacion({ children }: ProveedorAutenticacionProps) {
  const [sesion, setSesion] = useState<SesionAutenticada | null>(() => obtenerSesionInicial())
  const [cargando, setCargando] = useState(true)
  const { isLoaded: authLoaded, isSignedIn, getToken, signOut } = useAuth()

  const guardarSesion = useCallback((nuevaSesion: SesionAutenticada) => {
    setSesion(nuevaSesion)
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(nuevaSesion))
  }, [])

  const cerrarSesion = useCallback(async () => {
    setSesion(null)
    localStorage.removeItem(CLAVE_STORAGE)

    try {
      if (authLoaded && isSignedIn) {
        await signOut()
      }
    } catch {
      // Ignoramos errores al cerrar sesión desde Clerk, porque el estado local ya se limpió.
    }
  }, [authLoaded, isSignedIn, signOut])

  useEffect(() => {
    if (!authLoaded) return

    const sincronizarSesion = async () => {
      try {
        if (isSignedIn) {
          const token = await getToken()
          if (!token) {
            if (sesion) {
              await cerrarSesion()
            }
            return
          }

          const necesitaActualizarSesion = !sesion || sesion.accessToken !== token
          if (necesitaActualizarSesion) {
            const estado = await verificarEstadoSesion(token)
            guardarSesion({
              accessToken: token,
              refreshToken: '',
              usuario: estado.usuario,
            })
          }
        } else if (sesion) {
          await cerrarSesion()
        }
      } catch {
        await cerrarSesion()
      } finally {
        setCargando(false)
      }
    }

    void sincronizarSesion()
  }, [authLoaded, cerrarSesion, getToken, guardarSesion, isSignedIn, sesion])

  const valor = useMemo(
    () => ({
      sesion,
      autenticado: Boolean(sesion?.accessToken),
      cargando,
      guardarSesion,
      cerrarSesion,
    }),
    [cargando, cerrarSesion, guardarSesion, sesion],
  )

  return (
    <AutenticacionContexto.Provider value={valor}>
      {children}
    </AutenticacionContexto.Provider>
  )
}
