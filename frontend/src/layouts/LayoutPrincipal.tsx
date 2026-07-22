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
    ? 'rounded-full bg-red-700 px-4 py-2 text-sm font-semibold !text-white shadow-sm'
    : 'rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium !text-slate-600 transition hover:border-red-700 hover:!text-red-700 shadow-sm'
}

export function LayoutPrincipal() {
  const { autenticado, cerrarSesion, sesion } = useAutenticacion()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-6 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.35em] text-red-700">PronoStats UFC</p>
              <h1 className="m-0 text-3xl font-black tracking-tight text-slate-900">
                Estadísticas, carteleras y apuestas virtuales de UFC
              </h1>
            </div>

            <div className="flex flex-wrap gap-3">
              {autenticado && sesion ? (
                <>
                  <NavLink className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-red-700 hover:text-red-700" to="/perfil">
                    {sesion.usuario.nombre}
                  </NavLink>
                  <button
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                    onClick={cerrarSesion}
                    type="button"
                  >
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <>
                  <NavLink className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-red-700 hover:text-red-700" to="/iniciar-sesion">
                    Iniciar sesión
                  </NavLink>
                  <NavLink className="rounded-full bg-red-700 px-4 py-2 text-sm font-semibold !text-white shadow-sm transition hover:bg-red-800" to="/registro">
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