import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { TarjetaResumen } from '../components/ui/TarjetaResumen'
import { useAutenticacion } from '../hooks/useAutenticacion'
import { eliminarMiCuenta, obtenerMiPerfil } from '../services/auth'
import { obtenerMisEstadisticas } from '../services/apuestas' // Importamos el nuevo servicio
import { obtenerMensajeError } from '../utils/errores'

export function PerfilPagina() {
  const navigate = useNavigate()
  const { sesion, cerrarSesion } = useAutenticacion()

  // Consulta del perfil
  const consultaPerfil = useQuery({
    queryKey: ['perfil-actual'],
    queryFn: () => obtenerMiPerfil(sesion!.accessToken),
    enabled: Boolean(sesion?.accessToken),
  })

  // NUEVA: Consulta de aciertos y fallos de apuestas
  const consultaEstadisticas = useQuery({
    queryKey: ['estadisticas-apuestas'],
    queryFn: () => obtenerMisEstadisticas(sesion!.accessToken),
    enabled: Boolean(sesion?.accessToken),
  })

  const perfil = consultaPerfil.data ?? sesion?.usuario
  const stats = consultaEstadisticas.data

  const mutacionEliminar = useMutation({
    mutationFn: () => eliminarMiCuenta(sesion!.accessToken),
    onSuccess: () => {
      cerrarSesion()
      navigate('/')
    },
  })

  const eliminarCuenta = () => {
    if (!window.confirm('¿Seguro que deseas eliminar tu cuenta? Esta acción no se puede deshacer.')) {
      return
    }
    mutacionEliminar.mutate()
  }

  return (
    <div className="grid w-full gap-6 lg:grid-cols-3">
      {/* Tarjeta 1: Perfil */}
      <TarjetaResumen
        titulo="Perfil del usuario"
        descripcion="Aquí mostraremos los datos del usuario autenticado y su rol."
        contenido={
          <div className="space-y-2 text-slate-200">
            <p><strong className="text-white">Usuario:</strong> {perfil?.nombre ?? 'Sin datos'}</p>
            <p><strong className="text-white">Correo:</strong> {perfil?.correo ?? 'Sin datos'}</p>
            <p><strong className="text-white">Rol:</strong> {perfil?.rol ?? 'Sin datos'}</p>
          </div>
        }
      />

      {/* Tarjeta 2: NUEVO PANEL DE ACIERTOS Y FALLOS */}
      <TarjetaResumen
        titulo="Panel de Pronósticos"
        descripcion="Rendimiento y estadísticas de tus apuestas virtuales de la UFC."
        contenido={
          consultaEstadisticas.isLoading ? (
            <p className="text-slate-200">Cargando estadísticas...</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                  <p className="text-xs text-emerald-400 font-medium uppercase tracking-wider">Aciertos</p>
                  <p className="text-2xl font-bold text-emerald-300">{stats?.aciertos ?? 0}</p>
                </div>
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3">
                  <p className="text-xs text-rose-400 font-medium uppercase tracking-wider">Fallos</p>
                  <p className="text-2xl font-bold text-rose-300">{stats?.fallos ?? 0}</p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-800/40 border border-slate-700/50 p-3 text-center">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Efectividad (Win Rate)</p>
                <p className="text-3xl font-extrabold text-indigo-400">{stats?.efectividad ?? 0}%</p>
              </div>

              <div className="flex justify-between text-xs text-slate-400 px-1">
                <span>Pendientes: {stats?.pendientes ?? 0}</span>
                <span>Total Jugadas: {stats?.total_apuestas ?? 0}</span>
              </div>

              {/* BOTÓN AGREGADO: Redirección al historial */}
              <button
                onClick={() => navigate('/apuestas/historial')}
                className="mt-2 w-full rounded-xl border border-indigo-500/40 bg-indigo-600/20 py-2.5 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-600/40"
                type="button"
              >
                Ver historial de apuestas
              </button>
            </div>
          )
        }
      />

      {/* Tarjeta 3: Configuración */}
      <TarjetaResumen
        titulo="Próximo paso"
        descripcion="Protección de rutas y carga del perfil al iniciar sesión."
        contenido={
          <div className="space-y-4">
            <p className="text-slate-200">Aquí puedes cerrar definitivamente tu cuenta.</p>
            {mutacionEliminar.isError ? (
              <p className="text-sm text-red-300">{obtenerMensajeError(mutacionEliminar.error, 'No se pudo eliminar la cuenta.')}</p>
            ) : null}
            <button
              className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20"
              disabled={mutacionEliminar.isPending}
              onClick={eliminarCuenta}
              type="button"
            >
              {mutacionEliminar.isPending ? 'Eliminando...' : 'Eliminar cuenta'}
            </button>
          </div>
        }
      />
    </div>
  )
}