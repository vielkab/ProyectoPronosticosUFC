import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { TarjetaResumen } from '../components/ui/TarjetaResumen'
import { useAutenticacion } from '../hooks/useAutenticacion'
import { cobrarApuesta, listarHistorialApuestas, retirarApuesta, type ApuestaResumen } from '../services/mvp'
import { esErrorAutorizacion } from '../utils/errores'
import { formatearMoneda } from '../utils/formatos'

export function HistorialApuestasPagina() {
  const { autenticado, sesion, cerrarSesion } = useAutenticacion()
  const [apuestas, setApuestas] = useState<ApuestaResumen[]>([])
  const [cargando, setCargando] = useState(Boolean(sesion?.accessToken))
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [cobrandoId, setCobrandoId] = useState<number | null>(null)
  const [apuestaARetirar, setApuestaARetirar] = useState<ApuestaResumen | null>(null)
  const [retirandoId, setRetirandoId] = useState<number | null>(null)

  useEffect(() => {
    if (!sesion?.accessToken) return

    listarHistorialApuestas(sesion.accessToken)
      .then(setApuestas)
      .catch((causa) => {
        if (esErrorAutorizacion(causa)) {
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
    } catch (causa) {
      if (esErrorAutorizacion(causa)) {
        cerrarSesion()
        setError('Tu sesión expiró. Inicia sesión nuevamente.')
        return
      }
      setError('No se pudo cobrar la apuesta. Inténtalo nuevamente.')
    } finally {
      setCobrandoId(null)
    }
  }

  async function confirmarRetiro() {
    if (!sesion?.accessToken || !apuestaARetirar) return

    setRetirandoId(apuestaARetirar.id)
    setError('')
    setMensaje('')
    try {
      const resultado = await retirarApuesta(sesion.accessToken, apuestaARetirar.id)
      setApuestas((actuales) => actuales.map((apuesta) => (
        apuesta.id === resultado.apuesta.id ? resultado.apuesta : apuesta
      )))
      setMensaje(`Retiraste la apuesta y recibiste ${formatearMoneda(resultado.reembolso)} en créditos.`)
      setApuestaARetirar(null)
    } catch (causa) {
      if (esErrorAutorizacion(causa)) {
        cerrarSesion()
        setError('Tu sesión expiró. Inicia sesión nuevamente.')
        return
      }
      setError('No se pudo retirar la apuesta. Puede que ya haya sido procesada.')
    } finally {
      setRetirandoId(null)
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <header>
        <h2 className="m-0 text-3xl font-black text-white">Historial de apuestas</h2>
        <p className="mt-3 text-slate-300">Consulta tus apuestas acertadas, fallidas, pendientes y retiradas.</p>
      </header>

      {!autenticado && (
        <Link className="inline-flex w-fit rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400" to="/iniciar-sesion">
          Iniciar sesión
        </Link>
      )}
      {cargando && <p className="text-slate-300">Cargando historial...</p>}
      {error && <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-red-100">{error}</p>}
      {mensaje && <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4 text-emerald-100">{mensaje}</p>}

      {!cargando && !error && apuestas.length === 0 && (
        <TarjetaResumen titulo="Sin apuestas" descripcion="Todavía no has realizado ninguna apuesta." contenido={<p className="text-slate-300">Cuando realices tu primera apuesta aparecerá aquí.</p>} />
      )}

      <section className="grid gap-6">
        {apuestas.map((apuesta) => {
          const colorEstado = apuesta.estado === 'Ganada'
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
            : apuesta.estado === 'Perdida'
              ? 'border-red-500/40 bg-red-500/10 text-red-300'
              : apuesta.estado === 'Retirada'
                ? 'border-slate-500/40 bg-slate-500/10 text-slate-300'
                : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300'
          const textoEstado = apuesta.estado === 'Ganada'
            ? '✅ ACIERTO'
            : apuesta.estado === 'Perdida'
              ? '❌ FALLO'
              : apuesta.estado === 'Retirada'
                ? '↩ RETIRADA'
                : '⏳ PENDIENTE'

          return (
            <TarjetaResumen
              key={apuesta.id}
              titulo={`Apuesta #${apuesta.id}`}
              descripcion={`Pelea #${apuesta.pelea_id}`}
              contenido={
                <div className="space-y-4">
                  <div className={`inline-flex rounded-full border px-4 py-2 text-sm font-bold ${colorEstado}`}>{textoEstado}</div>
                  <div className="grid gap-3 text-slate-200 sm:grid-cols-2">
                    <p><strong className="text-white">Monto:</strong> {formatearMoneda(apuesta.monto)}</p>
                    <p><strong className="text-white">Cuota:</strong> {apuesta.cuota}</p>
                    <p><strong className="text-white">Método:</strong> {apuesta.metodo_victoria ?? 'Sin seleccionar'}</p>
                    <p><strong className="text-white">Round:</strong> {apuesta.round ?? '-'}</p>
                    <p><strong className="text-white">Estado:</strong> {apuesta.estado}</p>
                    <p><strong className="text-white">Pago:</strong> {apuesta.estado_pago}</p>
                    <p className="sm:col-span-2"><strong className="text-white">Fecha:</strong> {new Date(apuesta.creado_en).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  </div>

                  {apuesta.estado === 'Ganada' && apuesta.estado_pago === 'pendiente' && (
                    <button className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60" disabled={cobrandoId === apuesta.id} onClick={() => cobrar(apuesta.id)} type="button">
                      {cobrandoId === apuesta.id ? 'Cobrando...' : `Cobrar ${formatearMoneda(apuesta.monto * apuesta.cuota)}`}
                    </button>
                  )}
                  {apuesta.estado === 'Pendiente' && apuesta.estado_pago === 'pendiente' && (
                    <button className="rounded-full border border-amber-400/50 bg-amber-500/10 px-5 py-2 text-sm font-bold text-amber-200 transition hover:bg-amber-500/20" onClick={() => setApuestaARetirar(apuesta)} type="button">
                      Retirarse de la apuesta
                    </button>
                  )}
                </div>
              }
            />
          )
        })}
      </section>

      {apuestaARetirar && (
        <div aria-labelledby="titulo-retiro" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="dialog">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 id="titulo-retiro" className="m-0 text-xl font-black text-white">¿Retirarte de esta apuesta?</h3>
            <p className="mt-3 text-slate-300">
              {apuestaARetirar.monto_reembolso !== null && apuestaARetirar.porcentaje_retiro !== null
                ? <>Recibirás {formatearMoneda(apuestaARetirar.monto_reembolso)} ({apuestaARetirar.porcentaje_retiro * 100}% del monto apostado).</>
                : <>El reembolso será calculado al confirmar el retiro.</>}
            </p>
            <p className="mt-2 text-sm text-slate-400">Antes de iniciar la pelea se devuelve el 90%; una vez iniciada, el 70%.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button className="rounded-full px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10" disabled={retirandoId === apuestaARetirar.id} onClick={() => setApuestaARetirar(null)} type="button">Cancelar</button>
              <button className="rounded-full bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60" disabled={retirandoId === apuestaARetirar.id} onClick={confirmarRetiro} type="button">
                {retirandoId === apuestaARetirar.id ? 'Retirando...' : 'Confirmar retiro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
