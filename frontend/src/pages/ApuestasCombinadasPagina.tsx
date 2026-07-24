import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { TarjetaResumen } from '../components/ui/TarjetaResumen'
import { useAutenticacion } from '../hooks/useAutenticacion'
import {
  listarPeleasCartelera,
  obtenerPrediccion,
  registrarApuestaCombinada,
  type PeleaCarteleraResumen,
  type PrediccionCombate,
} from '../services/mvp'
import { formatearMoneda } from '../utils/formatos'

export type ItemSeleccionCombinada = {
  peleaId: number
  peleaNombre: string
  peleadorId: number
  peleadorNombre: string
  esRojo: boolean
  cuotaBase: number
  cuotaPronostico: number
  verPronostico: boolean
}

export function ApuestasCombinadasPagina() {
  const { autenticado, sesion } = useAutenticacion()
  const [peleas, setPeleas] = useState<PeleaCarteleraResumen[]>([])
  const [predicciones, setPredicciones] = useState<Record<number, PrediccionCombate>>({})
  const [selecciones, setSelecciones] = useState<ItemSeleccionCombinada[]>([])
  const [montoTotal, setMontoTotal] = useState('20')
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [mensajeExito, setMensajeExito] = useState('')
  const [errorGlobal, setErrorGlobal] = useState('')
  const [pronosticosVisibles, setPronosticosVisibles] = useState<Record<number, boolean>>({})

  useEffect(() => {
    async function cargar() {
      try {
        const peleasData = await listarPeleasCartelera()
        const peleasActivas = peleasData.filter(p => p.estado_evento !== 'finalizado' && p.estado_evento !== 'cancelado')
        setPeleas(peleasActivas)

        const prediccionesData = await Promise.allSettled(
          peleasActivas.map(p => obtenerPrediccion(p.id))
        )
        const mapa: Record<number, PrediccionCombate> = {}
        peleasActivas.forEach((pelea, i) => {
          const resultado = prediccionesData[i]
          if (resultado.status === 'fulfilled') {
            mapa[pelea.id] = resultado.value
          }
        })
        setPredicciones(mapa)
      } catch {
        // silencioso
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  function togglePronostico(peleaId: number) {
    setPronosticosVisibles(prev => ({ ...prev, [peleaId]: !prev[peleaId] }))
  }

  function getCuotasPeleador(pelea: PeleaCarteleraResumen, peleadorId: number) {
    const pred = predicciones[pelea.id]
    if (!pred) return { cuotaBase: 1.8, cuotaPronostico: 1.62 }
    const esRojo = peleadorId === pred.peleador_rojo_id
    return {
      cuotaBase: esRojo ? pred.cuota_rojo : pred.cuota_azul,
      cuotaPronostico: esRojo ? pred.cuota_rojo_con_pronostico : pred.cuota_azul_con_pronostico,
    }
  }

  function seleccionarPeleador(pelea: PeleaCarteleraResumen, peleadorId: number, esRojo: boolean) {
    setErrorGlobal('')
    setMensajeExito('')

    // Si ya estaba seleccionado ese mismo peleador, lo quitamos
    const actual = selecciones.find(s => s.peleaId === pelea.id)
    if (actual && actual.peleadorId === peleadorId) {
      setSelecciones(prev => prev.filter(s => s.peleaId !== pelea.id))
      return
    }

    const cuotas = getCuotasPeleador(pelea, peleadorId)
    const nombrePeleador = esRojo ? pelea.peleador_rojo_nombre : pelea.peleador_azul_nombre

    const nuevaSeleccion: ItemSeleccionCombinada = {
      peleaId: pelea.id,
      peleaNombre: `${pelea.peleador_rojo_nombre} vs ${pelea.peleador_azul_nombre}`,
      peleadorId,
      peleadorNombre: nombrePeleador,
      esRojo,
      cuotaBase: cuotas.cuotaBase,
      cuotaPronostico: cuotas.cuotaPronostico,
      verPronostico: actual?.verPronostico ?? false,
    }

    setSelecciones(prev => [...prev.filter(s => s.peleaId !== pelea.id), nuevaSeleccion])
  }

  function toggleVerPronosticoItem(peleaId: number) {
    setSelecciones(prev =>
      prev.map(item =>
        item.peleaId === peleaId ? { ...item, verPronostico: !item.verPronostico } : item
      )
    )
  }

  function removerSeleccion(peleaId: number) {
    setSelecciones(prev => prev.filter(s => s.peleaId !== peleaId))
  }

  // Cálculo cuota total combinada (multiplicación de las cuotas seleccionadas)
  const cuotaTotalCombinada = selecciones.reduce((acc, item) => {
    const cuotaAplicada = item.verPronostico ? item.cuotaPronostico : item.cuotaBase
    return acc * cuotaAplicada
  }, 1)

  const cuotaTotalFormateada = selecciones.length > 0 ? Number(cuotaTotalCombinada.toFixed(2)) : 0
  const montoNumerico = Number(montoTotal) || 0
  const gananciaPotencial = montoNumerico * cuotaTotalFormateada

  async function realizarApuestaCombinada() {
    if (!sesion?.accessToken) {
      setErrorGlobal('Debes iniciar sesión para realizar apuestas.')
      return
    }

    if (selecciones.length < 2) {
      setErrorGlobal('Para una apuesta combinada debes seleccionar al menos 2 peleas distintas.')
      return
    }

    if (!montoNumerico || montoNumerico <= 0) {
      setErrorGlobal('Ingresa un monto válido para la apuesta combinada.')
      return
    }

    try {
      setEnviando(true)
      setErrorGlobal('')
      setMensajeExito('')

      await registrarApuestaCombinada(sesion.accessToken, {
        monto_total: montoNumerico,
        selecciones: selecciones.map(s => ({
          pelea_id: s.peleaId,
          peleador_seleccionado_id: s.peleadorId,
          ver_pronostico: s.verPronostico,
        })),
      })

      setMensajeExito(
        `¡Apuesta combinada de ${selecciones.length} selecciones registrada con éxito! Cuota total: ×${cuotaTotalFormateada} · Ganancia potencial: ${formatearMoneda(gananciaPotencial)}`
      )
      setSelecciones([])
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setErrorGlobal(msg ?? 'No se pudo procesar la apuesta combinada. Verifica tu saldo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-800">
          🔥 Parlay UFC
        </div>
        <h2 className="mt-2 text-3xl font-black !text-slate-900">Apuestas Combinadas</h2>
        <p className="mt-2 max-w-3xl !text-slate-600">
          Combina tus predicciones de 2 o más peleas en un solo boleto. Las cuotas se multiplican entre sí para obtener ganancias exponenciales. ¡Todas tus selecciones deben resultar acertadas!
        </p>
      </header>

      {!autenticado && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="w-full text-sm font-medium !text-slate-700 sm:w-auto sm:flex-1">
            Inicia sesión para armar y realizar tu apuesta combinada.
          </p>
          <div className="flex gap-2">
            <Link
              className="inline-flex rounded-full bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
              to="/iniciar-sesion"
            >
              Iniciar sesión
            </Link>
            <Link
              className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold !text-slate-700 transition hover:bg-slate-50"
              to="/registro"
            >
              Registrarse
            </Link>
          </div>
        </div>
      )}

      {cargando && <p className="!text-slate-600">Cargando peleas para apuestas combinadas...</p>}

      {!cargando && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Columna izquierda/centro: Lista de combates */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            {peleas.length === 0 ? (
              <p className="!text-slate-500">No hay peleas disponibles para apuestas combinadas en este momento.</p>
            ) : (
              peleas.map(pelea => {
                const pred = predicciones[pelea.id]
                const seleccionActual = selecciones.find(s => s.peleaId === pelea.id)
                const pronosticoVisible = pronosticosVisibles[pelea.id] ?? false

                return (
                  <TarjetaResumen
                    key={pelea.id}
                    titulo={`${pelea.peleador_rojo_nombre} vs ${pelea.peleador_azul_nombre}`}
                    descripcion={`${pelea.evento_nombre} · ${new Date(`${pelea.fecha}T00:00:00`).toLocaleDateString('es-EC')} · ${pelea.division || 'División por confirmar'}`}
                    contenido={
                      <div className="flex flex-col gap-4">
                        {/* Selector de ganadores para la combinada */}
                        {pred && (
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              className={`flex flex-col items-center justify-center rounded-xl border p-3 transition ${
                                seleccionActual?.peleadorId === pred.peleador_rojo_id
                                  ? 'border-red-600 bg-red-50 text-red-800 ring-2 ring-red-600'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:bg-slate-50'
                              }`}
                              onClick={() => seleccionarPeleador(pelea, pred.peleador_rojo_id, true)}
                            >
                              <span className="text-xs font-semibold text-slate-500">Rincón Rojo</span>
                              <span className="font-bold text-slate-900">{pelea.peleador_rojo_nombre}</span>
                              <span className="mt-1 text-base font-black text-red-700">×{pred.cuota_rojo}</span>
                              {seleccionActual?.peleadorId === pred.peleador_rojo_id && (
                                <span className="mt-1 rounded-full bg-red-700 px-2 py-0.5 text-[10px] font-bold text-white">
                                  ✓ En Boleto
                                </span>
                              )}
                            </button>

                            <button
                              type="button"
                              className={`flex flex-col items-center justify-center rounded-xl border p-3 transition ${
                                seleccionActual?.peleadorId === pred.peleador_azul_id
                                  ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-600'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-slate-50'
                              }`}
                              onClick={() => seleccionarPeleador(pelea, pred.peleador_azul_id, false)}
                            >
                              <span className="text-xs font-semibold text-slate-500">Rincón Azul</span>
                              <span className="font-bold text-slate-900">{pelea.peleador_azul_nombre}</span>
                              <span className="mt-1 text-base font-black text-blue-700">×{pred.cuota_azul}</span>
                              {seleccionActual?.peleadorId === pred.peleador_azul_id && (
                                <span className="mt-1 rounded-full bg-blue-700 px-2 py-0.5 text-[10px] font-bold text-white">
                                  ✓ En Boleto
                                </span>
                              )}
                            </button>
                          </div>
                        )}

                        {/* Botón ver pronóstico estadístico */}
                        {pred && (
                          <button
                            type="button"
                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold !text-slate-700 transition hover:bg-slate-100"
                            onClick={() => togglePronostico(pelea.id)}
                          >
                            <span>{pronosticoVisible ? '▲ Ocultar análisis' : '▼ Ver análisis estadístico'}</span>
                            <span className="text-slate-500">Prob: Rojo {pred.probabilidad_rojo}% vs Azul {pred.probabilidad_azul}%</span>
                          </button>
                        )}

                        {/* Detalle pronóstico */}
                        {pred && pronosticoVisible && (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs !text-slate-700">
                            <p className="mb-2 font-bold !text-slate-900">{pred.explicacion}</p>
                            <ul className="flex flex-col gap-1">
                              {pred.factores.map(f => (
                                <li key={f.nombre} className="flex justify-between border-b border-slate-200/60 pb-1 last:border-0">
                                  <span className="capitalize text-slate-500">{f.nombre.replace(/_/g, ' ')}</span>
                                  <span className="font-semibold">
                                    <span className="text-red-700">{f.peleador_rojo}</span> vs <span className="text-blue-700">{f.peleador_azul}</span>
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    }
                  />
                )
              })
            )}
          </div>

          {/* Columna derecha: Boleto de Apuesta Combinada (Parlay Ticket) */}
          <div className="flex flex-col gap-4">
            <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="m-0 text-xl font-black text-slate-900">Boleto Combinado</h3>
                <span className="rounded-full bg-red-700 px-2.5 py-0.5 text-xs font-extrabold text-white">
                  {selecciones.length} {selecciones.length === 1 ? 'pelea' : 'peleas'}
                </span>
              </div>

              {mensajeExito && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
                  {mensajeExito}
                </div>
              )}

              {errorGlobal && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
                  {errorGlobal}
                </div>
              )}

              {selecciones.length === 0 ? (
                <div className="my-8 text-center text-slate-500">
                  <p className="text-sm font-medium">No has seleccionado ninguna pelea aún.</p>
                  <p className="mt-1 text-xs text-slate-400">Haz clic en un peleador de la lista para agregarlo a tu combinada.</p>
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                    {selecciones.map(item => {
                      const cuotaItem = item.verPronostico ? item.cuotaPronostico : item.cuotaBase
                      return (
                        <div key={item.peleaId} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs flex flex-col gap-1.5">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-bold text-slate-900">{item.peleadorNombre}</p>
                              <p className="text-[11px] text-slate-500">{item.peleaNombre}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-red-700 text-sm">×{cuotaItem}</span>
                              <button
                                type="button"
                                className="text-slate-400 hover:text-red-700 font-bold"
                                onClick={() => removerSeleccion(item.peleaId)}
                                title="Quitar selección"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          <label className="flex items-center gap-1.5 pt-1 text-[11px] font-medium text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.verPronostico}
                              onChange={() => toggleVerPronosticoItem(item.peleaId)}
                              className="rounded accent-red-700 h-3.5 w-3.5"
                            />
                            <span>Usar pronóstico (-10% cuota)</span>
                          </label>
                        </div>
                      )
                    })}
                  </div>

                  {selecciones.length < 2 && (
                    <p className="rounded-lg bg-amber-50 p-2 text-center text-xs font-semibold text-amber-800 border border-amber-200">
                      ⚠️ Selecciona al menos 2 peleas para activar la combinada.
                    </p>
                  )}

                  {/* Resumen de cuota total y ganancia */}
                  <div className="rounded-xl border border-slate-200 bg-slate-900 p-4 text-white">
                    <div className="flex justify-between items-center text-xs text-slate-300">
                      <span>Cuota Total Combinada:</span>
                      <span className="text-xl font-black text-amber-400">×{cuotaTotalFormateada}</span>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-300">Monto:</span>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-bold text-white outline-none focus:border-red-500"
                        value={montoTotal}
                        onChange={e => setMontoTotal(e.target.value)}
                        placeholder="20.00"
                      />
                    </div>

                    <div className="mt-3 border-t border-slate-800 pt-2 flex justify-between items-center text-xs">
                      <span className="text-slate-300">Ganancia Potencial:</span>
                      <span className="text-lg font-black text-emerald-400">
                        {formatearMoneda(gananciaPotencial)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!autenticado || selecciones.length < 2 || enviando || !montoNumerico || montoNumerico <= 0}
                    onClick={realizarApuestaCombinada}
                    className="w-full rounded-xl bg-red-700 py-3 text-sm font-bold text-white shadow-md transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {enviando ? 'Procesando combinada...' : `Apostar ${formatearMoneda(montoNumerico)} en Combinada`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}