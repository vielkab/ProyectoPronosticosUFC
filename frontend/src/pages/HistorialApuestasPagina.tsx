import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { TarjetaResumen } from '../components/ui/TarjetaResumen'
import { useAutenticacion } from '../hooks/useAutenticacion'
import { listarHistorialApuestas, type ApuestaResumen } from '../services/mvp'
import { esErrorAutorizacion } from '../utils/errores'
import { formatearMoneda } from '../utils/formatos'

export function HistorialApuestasPagina() {
  const { autenticado, sesion, cerrarSesion } = useAutenticacion()
  const [apuestas, setApuestas] = useState<ApuestaResumen[]>([])
  const [cargando, setCargando] = useState(Boolean(sesion?.accessToken))
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sesion?.accessToken) {
      return
    }

    listarHistorialApuestas(sesion.accessToken)
      .then(setApuestas)
      .catch((error) => {
        if (esErrorAutorizacion(error)) {
          cerrarSesion()
          setError('Tu sesión expiró. Inicia sesión nuevamente.')
          return
        }

        setError('No se pudo cargar el historial.')
      })
      .finally(() => setCargando(false))
  }, [cerrarSesion, sesion?.accessToken])

  return (
    <div className="flex w-full flex-col gap-6">
      <header>
        <h2 className="m-0 text-3xl font-black text-white">Historial de apuestas</h2>
        <p className="mt-3 text-slate-300">Apuestas activas y finalizadas registradas en tu cuenta.</p>
      </header>

      {!autenticado && (
        <Link className="inline-flex w-fit rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400" to="/iniciar-sesion">
          Iniciar sesión
        </Link>
      )}
      {cargando && <p className="text-slate-300">Cargando historial...</p>}
      {error && <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-red-100">{error}</p>}

      <section className="grid gap-6">
        {apuestas.map((apuesta) => (
          <TarjetaResumen
            key={apuesta.id}
            titulo={`Apuesta #${apuesta.id}`}
            descripcion={`Pelea #${apuesta.pelea_id} · Estado: ${apuesta.estado} · Pago: ${apuesta.estado_pago}`}
            contenido={
              <div className="grid gap-2 text-slate-200 sm:grid-cols-2">
                <p>Monto registrado: {formatearMoneda(apuesta.monto)}</p>
                <p>Cuota fija: {apuesta.cuota}</p>
                <p>Método: {apuesta.metodo_victoria ?? 'Sin seleccionar'}</p>
                <p>Round: {apuesta.round ?? 'Sin seleccionar'}</p>
              </div>
            }
          />
        ))}
      </section>
    </div>
  )
}
