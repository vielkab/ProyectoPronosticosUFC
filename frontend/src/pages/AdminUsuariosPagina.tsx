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
        <h2 className="m-0 text-3xl font-black text-white">Gestión de usuarios</h2>
        <p className="mt-2 text-slate-400">Consulta y administra el acceso de los usuarios registrados.</p>
      </header>

      {mensaje && <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{mensaje}</p>}
      {error && <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}
      {cargando && <p className="text-slate-400">Cargando usuarios...</p>}
      {!cargando && usuarios.length === 0 && <p className="text-slate-400">No hay usuarios registrados.</p>}

      {!cargando && usuarios.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Correo</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id} className="border-b border-white/5 text-slate-200 last:border-0">
                  <td className="px-4 py-3 text-slate-500">{usuario.id}</td>
                  <td className="px-4 py-3 font-medium text-white">{usuario.nombre}</td>
                  <td className="px-4 py-3 text-slate-400">{usuario.correo}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${usuario.rol === 'administrador' ? 'bg-red-500/20 text-red-300' : 'bg-white/10 text-slate-300'}`}>
                      {usuario.rol}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${usuario.activo ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                      {usuario.activo ? 'Activo' : 'Bloqueado'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {usuario.rol !== 'administrador' && (
                      usuario.activo
                        ? <button className="text-xs text-red-400 hover:text-red-300" type="button" onClick={() => bloquear(usuario)}>Bloquear</button>
                        : <button className="text-xs text-emerald-400 hover:text-emerald-300" type="button" onClick={() => reactivar(usuario)}>Reactivar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
