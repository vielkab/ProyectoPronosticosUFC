import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import { useAutenticacion } from '../hooks/useAutenticacion'

const enlacesAdmin = [
  { to: '/admin', etiqueta: 'Resumen' },
  { to: '/admin/peleas', etiqueta: 'Peleas' },
  { to: '/admin/predicciones', etiqueta: 'Pronósticos' },
  { to: '/admin/apuestas', etiqueta: 'Apuestas' },
  { to: '/admin/billetera', etiqueta: 'Billetera' },
  { to: '/admin/usuarios', etiqueta: 'Usuarios' },
]

function claseEnlace(activo: boolean): string {
  return activo
    ? 'rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm'
    : 'rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900'
}

export function LayoutAdmin() {
  const { sesion, cerrarSesion } = useAutenticacion()
  const navigate = useNavigate()

  function salir() {
    cerrarSesion()
    navigate('/iniciar-sesion')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-6 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-600">PronoStats UFC · Admin</p>
              <h1 className="m-0 text-3xl font-black tracking-tight text-slate-900">Panel de administración</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                {sesion?.usuario.nombre}
              </span>
              <button
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600"
                type="button"
                onClick={salir}
              >
                Cerrar sesión
              </button>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2">
            {enlacesAdmin.map((enlace) => (
              <NavLink
                key={enlace.to}
                className={({ isActive }) => claseEnlace(isActive)}
                end={enlace.to === '/admin'}
                to={enlace.to}
              >
                {enlace.etiqueta}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 px-5 py-8 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}