import { createBrowserRouter } from 'react-router-dom'

import { LayoutPrincipal } from '../layouts/LayoutPrincipal'
import { AdminPagina } from '../pages/AdminPagina'
import { BilleteraPagina } from '../pages/BilleteraPagina'
import { EventosPagina } from '../pages/EventosPagina'
import { HistorialApuestasPagina } from '../pages/HistorialApuestasPagina'
import { InicioPagina } from '../pages/InicioPagina'
import { IniciarSesionPagina } from '../pages/IniciarSesionPagina'
import { NoEncontradoPagina } from '../pages/NoEncontradoPagina'
import { PeleadoresPagina } from '../pages/PeleadoresPagina'
import { PerfilPagina } from '../pages/PerfilPagina'
import { PrediccionesPagina } from '../pages/PrediccionesPagina'
import { RecuperarPasswordCambioPagina } from '../pages/RecuperarPasswordCambioPagina'
import { RecuperarPasswordCodigoPagina } from '../pages/RecuperarPasswordCodigoPagina'
import { RegistroPagina } from '../pages/RegistroPagina'
import { VerificarRegistroPagina } from '../pages/VerificarRegistroPagina'
import { RutaProtegida } from './RutaProtegida'

export const proveedorRutas = createBrowserRouter([
  {
    path: '/',
    element: <LayoutPrincipal />,
    errorElement: <NoEncontradoPagina />,
    children: [
      { index: true, element: <InicioPagina /> },
      { path: 'iniciar-sesion', element: <IniciarSesionPagina /> },
      { path: 'registro', element: <RegistroPagina /> },
      { path: 'registro/verificar', element: <VerificarRegistroPagina /> },
      { path: 'recuperar-password/codigo', element: <RecuperarPasswordCodigoPagina /> },
      { path: 'recuperar-password/cambiar', element: <RecuperarPasswordCambioPagina /> },
      { path: 'eventos', element: <EventosPagina /> },
      { path: 'peleadores', element: <PeleadoresPagina /> },
      { path: 'predicciones', element: <PrediccionesPagina /> },
      {
        element: <RutaProtegida />,
        children: [
          { path: 'perfil', element: <PerfilPagina /> },
          { path: 'billetera', element: <BilleteraPagina /> },
          { path: 'apuestas/historial', element: <HistorialApuestasPagina /> },
        ],
      },
      {
        element: <RutaProtegida requiereAdmin />,
        children: [{ path: 'admin', element: <AdminPagina /> }],
      },
      { path: '*', element: <NoEncontradoPagina /> },
    ],
  },
])
