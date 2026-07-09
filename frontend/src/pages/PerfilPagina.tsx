import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { TarjetaResumen } from '../components/ui/TarjetaResumen'
import { useAutenticacion } from '../hooks/useAutenticacion'
import { eliminarMiCuenta, obtenerMiPerfil } from '../services/auth'
import { obtenerMensajeError } from '../utils/errores'

export function PerfilPagina() {
  const navigate = useNavigate()
  const { sesion, cerrarSesion } = useAutenticacion()

  const consultaPerfil = useQuery({
    queryKey: ['perfil-actual'],
    queryFn: () => obtenerMiPerfil(sesion!.accessToken),
    enabled: Boolean(sesion?.accessToken),
  })

  const perfil = consultaPerfil.data ?? sesion?.usuario

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
      <TarjetaResumen
        titulo="Estado de sesión"
        descripcion="Base lista para trabajar con JWT y refresh token."
        contenido={
          <p className="text-slate-200">
            {consultaPerfil.isLoading ? 'Cargando perfil...' : 'Sesión activa y lista para proteger rutas privadas.'}
          </p>
        }
      />
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
