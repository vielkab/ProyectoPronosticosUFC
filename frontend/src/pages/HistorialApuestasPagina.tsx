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
        <h2 className="m-0 text-3xl font-black !text-slate-900">Historial de apuestas</h2>
        <p className="mt-3 !text-slate-600">Consulta tus apuestas acertadas, fallidas, pendientes y retiradas.</p>
      </header>

      {!autenticado && (
        <Link className="inline-flex w-fit rounded-full bg-red-700 px-4 py-2 text-sm font-semibold !text-white shadow-sm transition hover:bg-red-800" to="/iniciar-sesion">
          Iniciar sesión
        </Link>
      )}
      {cargando && <p className="!text-slate-600">Cargando historial...</p>}
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 font-medium !text-red-700">{error}</p>}
      {mensaje && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-medium !text-emerald-800">{mensaje}</p>}

      {!cargando && !error && apuestas.length === 0 && (
        <TarjetaResumen titulo="Sin apuestas" descripcion="Todavía no has realizado ninguna apuesta." contenido={<p className="!text-slate-600">Cuando realices tu primera apuesta aparecerá aquí.</p>} />
      )}

      <section className="grid gap-6">
        {apuestas.map((apuesta) => {
          const colorEstado = apuesta.estado === 'Ganada'
            ? 'border-emerald-200 bg-emerald-50 !text-emerald-800'
            : apuesta.estado === 'Perdida'
              ? 'border-red-200 bg-red-50 !text-red-700'
              : apuesta.estado === 'Retirada'
                ? 'border-slate-200 bg-slate-100 !text-slate-700'
                : 'border-amber-200 bg-amber-50 !text-amber-800'
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
                  <div className="grid gap-3 !text-slate-700 sm:grid-cols-2">
                    <p><strong className="!text-slate-900">Monto:</strong> {formatearMoneda(apuesta.monto)}</p>
                    <p><strong className="!text-slate-900">Cuota:</strong> {apuesta.cuota}</p>
                    <p><strong className="!text-slate-900">Método:</strong> {apuesta.metodo_victoria ?? 'Sin seleccionar'}</p>
                    <p><strong className="!text-slate-900">Round:</strong> {apuesta.round ?? '-'}</p>
                    <p><strong className="!text-slate-900">Estado:</strong> {apuesta.estado}</p>
                    <p><strong className="!text-slate-900">Pago:</strong> {apuesta.estado_pago}</p>
                    <p className="sm:col-span-2"><strong className="!text-slate-900">Fecha:</strong> {new Date(apuesta.creado_en).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  </div>

                  {apuesta.estado === 'Ganada' && apuesta.estado_pago === 'pendiente' && (
                    <button className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold !text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={cobrandoId === apuesta.id} onClick={() => cobrar(apuesta.id)} type="button">
                      {cobrandoId === apuesta.id ? 'Cobrando...' : `Cobrar ${formatearMoneda(apuesta.monto * apuesta.cuota)}`}
                    </button>
                  )}
                  {apuesta.estado === 'Pendiente' && apuesta.estado_pago === 'pendiente' && (
                    <button className="rounded-full border border-amber-300 bg-amber-50 px-5 py-2 text-sm font-bold !text-amber-800 shadow-sm transition hover:bg-amber-100" onClick={() => setApuestaARetirar(apuesta)} type="button">
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
        <div aria-labelledby="titulo-retiro" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4" role="dialog">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 id="titulo-retiro" className="m-0 text-xl font-black !text-slate-900">¿Retirarte de esta apuesta?</h3>
            <p className="mt-3 !text-slate-600">
              {apuestaARetirar.monto_reembolso !== null && apuestaARetirar.porcentaje_retiro !== null
                ? <>Recibirás {formatearMoneda(apuestaARetirar.monto_reembolso)} ({apuestaARetirar.porcentaje_retiro * 100}% del monto apostado).</>
                : <>El reembolso será calculado al confirmar el retiro.</>}
            </p>
            <p className="mt-2 text-sm !text-slate-500">Antes de iniciar la pelea se devuelve el 90%; una vez iniciada, el 70%.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button className="rounded-full px-4 py-2 text-sm font-semibold !text-slate-600 transition hover:bg-slate-100" disabled={retirandoId === apuestaARetirar.id} onClick={() => setApuestaARetirar(null)} type="button">Cancelar</button>
              <button className="rounded-full bg-amber-500 px-4 py-2 text-sm font-bold !text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60" disabled={retirandoId === apuestaARetirar.id} onClick={confirmarRetiro} type="button">
                {retirandoId === apuestaARetirar.id ? 'Retirando...' : 'Confirmar retiro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}