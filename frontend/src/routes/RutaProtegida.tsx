import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAutenticacion } from '../hooks/useAutenticacion'

type RutaProtegidaProps = {
  requiereAdmin?: boolean
}

export function RutaProtegida({ requiereAdmin = false }: RutaProtegidaProps) {
  const { autenticado, sesion, cargando } = useAutenticacion()
  const ubicacion = useLocation()

  if (cargando) {
    return null
  }

  if (!autenticado || !sesion) {
    return <Navigate replace state={{ desde: ubicacion.pathname }} to="/iniciar-sesion" />
  }

  if (requiereAdmin && sesion.usuario.rol !== 'administrador') {
    return <Navigate replace to="/" />
  }

  return <Outlet />
}
