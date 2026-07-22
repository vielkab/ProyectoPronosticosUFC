import { useEffect, useState } from 'react'

import { useAutenticacion } from '../hooks/useAutenticacion'
import { bloquearUsuarioAdmin, listarUsuariosAdmin, reactivarUsuarioAdmin, type UsuarioAdminResumen } from '../services/admin'

export function AdminUsuariosPagina() {
  const { sesion } = useAutenticacion()
  const token = sesion!.accessToken
  const [usuarios, setUsuarios] = useState<UsuarioAdminResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  function cargar() {
    setCargando(true)
    listarUsuariosAdmin(token)
      .then(setUsuarios)
      .catch(() => setError('No se pudo cargar los usuarios.'))
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargar() }, [token])

  async function bloquear(usuario: UsuarioAdminResumen) {
    if (!confirm(`¿Bloquear a "${usuario.nombre}"?`)) return
    try {
      setMensaje('')
      const res = await bloquearUsuarioAdmin(token, usuario.id)
      setMensaje(res.mensaje)
      cargar()
    } catch { setError('No se pudo bloquear el usuario.') }
  }

  async function reactivar(usuario: UsuarioAdminResumen) {
    try {
      setMensaje('')
      const res = await reactivarUsuarioAdmin(token, usuario.id)
      setMensaje(res.mensaje)
      cargar()
    } catch { setError('No se pudo reactivar el usuario.') }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <header>
        <h2 className="m-0 text-3xl font-black !text-slate-900">Gestión de usuarios</h2>
        <p className="mt-2 !text-slate-600">Consulta y administra el acceso de los usuarios registrados.</p>
      </header>

      {mensaje && (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold !text-emerald-800">
          {mensaje}
        </p>
      )}

      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium !text-red-700">
          {error}
        </p>
      )}

      {cargando && (
        <div className="flex items-center gap-3 text-slate-500 py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-700 border-t-transparent"></div>
          <span>Cargando usuarios...</span>
        </div>
      )}

      {!cargando && usuarios.length === 0 && (
        <p className="!text-slate-500 text-center py-8">No hay usuarios registrados.</p>
      )}

      {!cargando && usuarios.length > 0 && (
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider !text-slate-500">
                  <th className="px-4 py-3.5">#</th>
                  <th className="px-4 py-3.5">Nombre</th>
                  <th className="px-4 py-3.5">Correo</th>
                  <th className="px-4 py-3.5">Rol</th>
                  <th className="px-4 py-3.5">Estado</th>
                  <th className="px-4 py-3.5">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 !text-slate-700">
                {usuarios.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3.5 font-mono text-xs !text-slate-400">{usuario.id}</td>
                    <td className="px-4 py-3.5 font-semibold !text-slate-900">{usuario.nombre}</td>
                    <td className="px-4 py-3.5 !text-slate-600">{usuario.correo}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          usuario.rol === 'administrador'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {usuario.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          usuario.activo
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {usuario.activo ? 'Activo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {usuario.rol !== 'administrador' && (
                        usuario.activo ? (
                          <button
                            className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                            type="button"
                            onClick={() => bloquear(usuario)}
                          >
                            Bloquear
                          </button>
                        ) : (
                          <button
                            className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                            type="button"
                            onClick={() => reactivar(usuario)}
                          >
                            Reactivar
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}