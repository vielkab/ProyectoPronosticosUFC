import { useCallback, useMemo, useState, type ReactNode } from 'react'

import {
  AutenticacionContexto,
  CLAVE_STORAGE,
  type SesionAutenticada,
} from './autenticacion'

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

  const guardarSesion = useCallback((nuevaSesion: SesionAutenticada) => {
    setSesion(nuevaSesion)
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(nuevaSesion))
  }, [])

  const cerrarSesion = useCallback(() => {
    setSesion(null)
    localStorage.removeItem(CLAVE_STORAGE)
  }, [])

  const valor = useMemo(
    () => ({
      sesion,
      autenticado: Boolean(sesion?.accessToken),
      guardarSesion,
      cerrarSesion,
    }),
    [cerrarSesion, guardarSesion, sesion],
  )

  return (
    <AutenticacionContexto.Provider value={valor}>
      {children}
    </AutenticacionContexto.Provider>
  )
}
