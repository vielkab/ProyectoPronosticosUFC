import { NavLink, Outlet } from 'react-router-dom'

import { useAutenticacion } from '../hooks/useAutenticacion'

const enlacesPublicos = [
  { to: '/', etiqueta: 'Inicio' },
  { to: '/eventos', etiqueta: 'Carteleras' },
  { to: '/peleadores', etiqueta: 'Peleadores' },
  { to: '/predicciones', etiqueta: 'Pronósticos' },
  { to: '/rankings', etiqueta: 'Rankings' },
  { to: '/historico', etiqueta: 'Histórico' },
]

function obtenerClasesEnlace(activo: boolean): string {
  return activo
    ? 'rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-500/30'
    : 'rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-red-400/60 hover:text-white'
}

export function LayoutPrincipal() {
  const { autenticado, cerrarSesion, sesion } = useAutenticacion()

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-6 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-red-300">PronoStats UFC</p>
              <h1 className="m-0 text-3xl font-black tracking-tight text-white">
                Estadísticas, carteleras y apuestas virtuales de UFC
              </h1>
            </div>

            <div className="flex flex-wrap gap-3">
              {autenticado && sesion ? (
                <>
                  <NavLink className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white transition hover:border-red-400/60" to="/perfil">
                    {sesion.usuario.nombre}
                  </NavLink>
                  <button
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-red-100"
                    onClick={cerrarSesion}
                    type="button"
                  >
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <>
                  <NavLink className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white transition hover:border-red-400/60" to="/iniciar-sesion">
                    Iniciar sesión
                  </NavLink>
                  <NavLink className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-red-100" to="/registro">
                    Registrarse
                  </NavLink>
                </>
              )}
            </div>
          </div>

          <nav className="flex flex-wrap gap-3">
            {enlacesPublicos.map((enlace) => (
              <NavLink key={enlace.to} className={({ isActive }) => obtenerClasesEnlace(isActive)} end={enlace.to === '/'} to={enlace.to}>
                {enlace.etiqueta}
              </NavLink>
            ))}
            {autenticado && (
              <>
                <NavLink className={({ isActive }) => obtenerClasesEnlace(isActive)} to="/billetera">
                  Billetera
                </NavLink>
                <NavLink className={({ isActive }) => obtenerClasesEnlace(isActive)} to="/apuestas/historial">
                  Historial
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 px-5 py-8 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
