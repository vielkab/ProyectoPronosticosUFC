import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { TarjetaResumen } from '../components/ui/TarjetaResumen'
import { useAutenticacion } from '../hooks/useAutenticacion'
import { cobrarApuesta, listarHistorialApuestas, type ApuestaResumen } from '../services/mvp'
import { esErrorAutorizacion } from '../utils/errores'
import { formatearMoneda } from '../utils/formatos'

export function HistorialApuestasPagina() {
  const { autenticado, sesion, cerrarSesion } = useAutenticacion()
  const [apuestas, setApuestas] = useState<ApuestaResumen[]>([])
  const [cargando, setCargando] = useState(Boolean(sesion?.accessToken))
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [cobrandoId, setCobrandoId] = useState<number | null>(null)

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

  async function cobrar(apuestaId: number) {
    if (!sesion?.accessToken) return

    setCobrandoId(apuestaId)
    setError('')
    setMensaje('')
    try {
      const apuestaCobrada = await cobrarApuesta(sesion.accessToken, apuestaId)
      setApuestas((actuales) => actuales.map((apuesta) => (
        apuesta.id === apuestaId ? apuestaCobrada : apuesta
      )))
      setMensaje(`Cobraste ${formatearMoneda(apuestaCobrada.monto * apuestaCobrada.cuota)} en créditos.`)
    } catch (error) {
      if (esErrorAutorizacion(error)) {
        cerrarSesion()
        setError('Tu sesión expiró. Inicia sesión nuevamente.')
        return
      }
      setError('No se pudo cobrar la apuesta. Inténtalo nuevamente.')
    } finally {
      setCobrandoId(null)
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <header>
        <h2 className="m-0 text-3xl font-black text-white">
          Historial de apuestas
        </h2>
        <p className="mt-3 text-slate-300">
          Consulta todas tus apuestas y revisa cuáles fueron acertadas,
          fallidas o siguen pendientes.
        </p>
      </header>

      {!autenticado && (
        <Link
          className="inline-flex w-fit rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400"
          to="/iniciar-sesion"
        >
          Iniciar sesión
        </Link>
      )}

      {cargando && (
        <p className="text-slate-300">Cargando historial...</p>
      )}

      {error && (
        <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-red-100">
          {error}
        </p>
      )}

      {mensaje && (
        <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4 text-emerald-100">
          {mensaje}
        </p>
      )}

      {!cargando && !error && apuestas.length === 0 && (
        <TarjetaResumen
          titulo="Sin apuestas"
          descripcion="Todavía no has realizado ninguna apuesta."
          contenido={
            <p className="text-slate-300">
              Cuando realices tu primera apuesta aparecerá aquí.
            </p>
          }
        />
      )}

      <section className="grid gap-6">
        {apuestas.map((apuesta) => {
          const colorEstado =
            apuesta.estado === 'Ganada'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : apuesta.estado === 'Perdida'
                ? 'border-red-500/40 bg-red-500/10 text-red-300'
                : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300'

          const textoEstado =
            apuesta.estado === 'Ganada'
              ? '✅ ACIERTO'
              : apuesta.estado === 'Perdida'
                ? '❌ FALLO'
                : '⏳ PENDIENTE'

          return (
            <TarjetaResumen
              key={apuesta.id}
              titulo={`Apuesta #${apuesta.id}`}
              descripcion={`Pelea #${apuesta.pelea_id}`}
              contenido={
                <div className="space-y-4">
                  <div
                    className={`inline-flex rounded-full border px-4 py-2 text-sm font-bold ${colorEstado}`}
                  >
                    {textoEstado}
                  </div>

                  <div className="grid gap-3 text-slate-200 sm:grid-cols-2">
                    <p>
                      <strong className="text-white">Monto:</strong>{' '}
                      {formatearMoneda(apuesta.monto)}
                    </p>

                    <p>
                      <strong className="text-white">Cuota:</strong>{' '}
                      {apuesta.cuota}
                    </p>

                    <p>
                      <strong className="text-white">Método:</strong>{' '}
                      {apuesta.metodo_victoria ?? 'Sin seleccionar'}
                    </p>

                    <p>
                      <strong className="text-white">Round:</strong>{' '}
                      {apuesta.round ?? '-'}
                    </p>

                    <p>
                      <strong className="text-white">Estado:</strong>{' '}
                      {apuesta.estado}
                    </p>

                    <p>
                      <strong className="text-white">Pago:</strong>{' '}
                      {apuesta.estado_pago}
                    </p>

                    <p className="sm:col-span-2">
                      <strong className="text-white">Fecha:</strong>{' '}
                      {new Date(apuesta.creado_en).toLocaleString('es-EC', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>

                  {apuesta.estado === 'Ganada' && apuesta.estado_pago === 'pendiente' && (
                    <button
                      className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={cobrandoId === apuesta.id}
                      onClick={() => cobrar(apuesta.id)}
                      type="button"
                    >
                      {cobrandoId === apuesta.id
                        ? 'Cobrando...'
                        : `Cobrar ${formatearMoneda(apuesta.monto * apuesta.cuota)}`}
                    </button>
                  )}
                </div>
              }
            />
          )
        })}
      </section>
    </div>
  )
}
