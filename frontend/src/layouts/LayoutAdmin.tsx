import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import { useAutenticacion } from '../hooks/useAutenticacion'

const enlacesAdmin = [
  { to: '/admin', etiqueta: 'Resumen' },
  { to: '/admin/peleas', etiqueta: 'Peleas' },
  { to: '/admin/apuestas', etiqueta: 'Apuestas' },
  { to: '/admin/billetera', etiqueta: 'Billetera' },
  { to: '/admin/usuarios', etiqueta: 'Usuarios' },
]

function claseEnlace(activo: boolean): string {
  return activo
    ? 'rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-500/30'
    : 'rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-red-400/60 hover:text-white'
}

export function LayoutAdmin() {
  const { sesion, cerrarSesion } = useAutenticacion()
  const navigate = useNavigate()

  function salir() {
    cerrarSesion()
    navigate('/iniciar-sesion')
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-6 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-red-300">PronoStats UFC · Admin</p>
              <h1 className="m-0 text-3xl font-black tracking-tight text-white">Panel de administración</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-300">
                {sesion?.usuario.nombre}
              </span>
              <button
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-red-100"
                type="button"
                onClick={salir}
              >
                Cerrar sesión
              </button>
            </div>
          </div>

          <nav className="flex flex-wrap gap-3">
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
