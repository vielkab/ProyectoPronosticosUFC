import { createBrowserRouter } from 'react-router-dom'

import { LayoutAdmin } from '../layouts/LayoutAdmin'
import { LayoutPrincipal } from '../layouts/LayoutPrincipal'
import { AdminApuestasPagina } from '../pages/AdminApuestasPagina'
import { AdminBilleteraPagina } from '../pages/AdminBilleteraPagina'
import { AdminPagina } from '../pages/AdminPagina'
import { AdminPeleasPagina } from '../pages/AdminPeleasPagina'
import { AdminPrediccionesPagina } from '../pages/AdminPrediccionesPagina'
import { AdminUsuariosPagina } from '../pages/AdminUsuariosPagina'
import { BilleteraPagina } from '../pages/BilleteraPagina'
import { EventosPagina } from '../pages/EventosPagina'
import { HistorialApuestasPagina } from '../pages/HistorialApuestasPagina'
import { HistoricoPagina } from '../pages/HistoricoPagina'
import { InicioPagina } from '../pages/InicioPagina'
import { IniciarSesionPagina } from '../pages/IniciarSesionPagina'
import { NoEncontradoPagina } from '../pages/NoEncontradoPagina'
import { PeleadoresPagina } from '../pages/PeleadoresPagina'
import { PerfilPagina } from '../pages/PerfilPagina'
import { PrediccionesPagina } from '../pages/PrediccionesPagina'
import { RankingsPagina } from '../pages/RankingsPagina'
import { RegistroPagina } from '../pages/RegistroPagina'
import { VerificarRegistroPagina } from '../pages/VerificarRegistroPagina'
import { RecuperarPasswordCodigoPagina } from '../pages/RecuperarPasswordCodigoPagina'
import { RecuperarPasswordCambioPagina } from '../pages/RecuperarPasswordCambioPagina'
import { RutaAdmin } from './RutaAdmin'
import { RutaProtegida } from './RutaProtegida'

export const proveedorRutas = createBrowserRouter([
  // ── Árbol de usuario ──────────────────────────────────────────────────────
  {
    path: '/',
    element: <LayoutPrincipal />,
    errorElement: <NoEncontradoPagina />,
    children: [
      // 🔑 SOLUCIÓN: La raíz carga la página de inicio para mostrar el hero principal
      { index: true, element: <InicioPagina /> },
      
      // 🔐 Rutas de autenticación restauradas a sus nombres originales correctos
      { path: 'iniciar-sesion', element: <IniciarSesionPagina /> },
      { path: 'registro', element: <RegistroPagina /> },
      { path: 'registro/verificar', element: <VerificarRegistroPagina /> },
      { path: 'recuperar-password/codigo', element: <RecuperarPasswordCodigoPagina /> },
      { path: 'recuperar-password/cambio', element: <RecuperarPasswordCambioPagina /> },
      
      // Rutas públicas de la aplicación
      { path: 'eventos', element: <EventosPagina /> },
      { path: 'peleadores', element: <PeleadoresPagina /> },
      { path: 'predicciones', element: <PrediccionesPagina /> },
      { path: 'rankings', element: <RankingsPagina /> },
      { path: 'historico', element: <HistoricoPagina /> },
      
      // Rutas protegidas para usuarios logueados
      {
        element: <RutaProtegida />,
        children: [
          { path: 'perfil', element: <PerfilPagina /> },
          { path: 'billetera', element: <BilleteraPagina /> },
          { path: 'apuestas/historial', element: <HistorialApuestasPagina /> },
        ],
      },
      { path: '*', element: <NoEncontradoPagina /> },
    ],
  },

  // ── Árbol de admin ────────────────────────────────────────────────────────
  {
    path: '/admin',
    element: <RutaAdmin />,
    children: [
      {
        element: <LayoutAdmin />,
        children: [
          { index: true, element: <AdminPagina /> },
          { path: 'peleas', element: <AdminPeleasPagina /> },
          { path: 'predicciones', element: <AdminPrediccionesPagina /> },
          { path: 'apuestas', element: <AdminApuestasPagina /> },
          { path: 'billetera', element: <AdminBilleteraPagina /> },
          { path: 'usuarios', element: <AdminUsuariosPagina /> },
        ],
      },
    ],
  },
])