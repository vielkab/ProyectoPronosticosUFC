import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { TarjetaResumen } from '../components/ui/TarjetaResumen'
import { useAutenticacion } from '../hooks/useAutenticacion'
import { eliminarMiCuenta, obtenerMiPerfil } from '../services/auth'
import { obtenerMisEstadisticas } from '../services/apuestas'
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

  // Consulta de aciertos y fallos de apuestas
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
          <div className="space-y-2 !text-slate-700">
            <p><strong className="!text-slate-900">Usuario:</strong> {perfil?.nombre ?? 'Sin datos'}</p>
            <p><strong className="!text-slate-900">Correo:</strong> {perfil?.correo ?? 'Sin datos'}</p>
            <p><strong className="!text-slate-900">Rol:</strong> {perfil?.rol ?? 'Sin datos'}</p>
          </div>
        }
      />

      {/* Tarjeta 2: PANEL DE ACIERTOS Y FALLOS */}
      <TarjetaResumen
        titulo="Panel de Pronósticos"
        descripcion="Rendimiento y estadísticas de tus apuestas virtuales de la UFC."
        contenido={
          consultaEstadisticas.isLoading ? (
            <p className="!text-slate-600">Cargando estadísticas...</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider !text-emerald-800">Aciertos</p>
                  <p className="text-2xl font-black !text-emerald-700">{stats?.aciertos ?? 0}</p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider !text-red-800">Fallos</p>
                  <p className="text-2xl font-black !text-red-700">{stats?.fallos ?? 0}</p>
                </div>
              </div>

              <div className="rounded-xl border border-red-100 bg-red-50/50 p-3 text-center">
                <p className="mb-1 text-xs font-bold uppercase tracking-wider !text-slate-600">Efectividad (Win Rate)</p>
                <p className="text-3xl font-extrabold !text-red-700">{stats?.efectividad ?? 0}%</p>
              </div>

              <div className="flex justify-between px-1 text-xs font-semibold !text-slate-500">
                <span>Pendientes: {stats?.pendientes ?? 0}</span>
                <span>Total Jugadas: {stats?.total_apuestas ?? 0}</span>
              </div>

              {/* BOTÓN: Redirección al historial */}
              <button
                onClick={() => navigate('/apuestas/historial')}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold !text-slate-800 shadow-sm transition hover:border-red-700 hover:!text-red-700"
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
            <p className="!text-slate-600">Aquí puedes cerrar definitivamente tu cuenta.</p>
            {mutacionEliminar.isError ? (
              <p className="text-sm font-medium !text-red-700">
                {obtenerMensajeError(mutacionEliminar.error, 'No se pudo eliminar la cuenta.')}
              </p>
            ) : null}
            <button
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold !text-red-700 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
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