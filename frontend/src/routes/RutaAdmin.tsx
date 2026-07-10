import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAutenticacion } from '../hooks/useAutenticacion'

export function RutaAdmin() {
  const { autenticado, sesion } = useAutenticacion()
  const ubicacion = useLocation()

  if (!autenticado || !sesion) {
    return <Navigate replace state={{ desde: ubicacion.pathname }} to="/iniciar-sesion" />
  }

  if (sesion.usuario.rol !== 'administrador') {
    return <Navigate replace to="/" />
  }

  return <Outlet />
}
