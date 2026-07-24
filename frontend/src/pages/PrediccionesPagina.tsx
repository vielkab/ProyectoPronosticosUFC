import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { TarjetaResumen } from '../components/ui/TarjetaResumen'
import { useAutenticacion } from '../hooks/useAutenticacion'
import {
  listarPeleasCartelera,
  obtenerPrediccion,
  registrarApuesta,
  type PeleaCarteleraResumen,
  type PrediccionCombate,
} from '../services/mvp'
import { formatearMoneda } from '../utils/formatos'
import { ApuestasCombinadasPagina } from './ApuestasCombinadasPagina'

type FormularioApuesta = {
  peleadorId: number
  monto: string
  verPronostico: boolean
}

export function PrediccionesPagina() {
  const { autenticado, sesion } = useAutenticacion()
  const [modo, setModo] = useState<'simples' | 'combinadas'>('simples')
  const [peleas, setPeleas] = useState<PeleaCarteleraResumen[]>([])
  const [predicciones, setPredicciones] = useState<Record<number, PrediccionCombate>>({})
  const [formularios, setFormularios] = useState<Record<number, FormularioApuesta>>({})
  const [pronosticosVisibles, setPronosticosVisibles] = useState<Record<number, boolean>>({})
  const [cargando, setCargando] = useState(true)
  const [mensajes, setMensajes] = useState<Record<number, string>>({})
  const [errores, setErrores] = useState<Record<number, string>>({})

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
        const forms: Record<number, FormularioApuesta> = {}
        peleasActivas.forEach((pelea, i) => {
          const resultado = prediccionesData[i]
          if (resultado.status === 'fulfilled') {
            mapa[pelea.id] = resultado.value
          }
          forms[pelea.id] = {
            peleadorId: -1, // sin selección inicial
            monto: '10',
            verPronostico: false,
          }
        })
        setPredicciones(mapa)
        setFormularios(forms)
      } catch {
        // silencioso — cada pelea muestra su propio error
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  function getCuota(pelea: PeleaCarteleraResumen, peleadorSeleccionadoId: number, verPronostico: boolean): number {
    const pred = predicciones[pelea.id]
    if (!pred) return 1.8
    const esRojo = peleadorSeleccionadoId === pred.peleador_rojo_id
    const cuotaBase = esRojo ? pred.cuota_rojo : pred.cuota_azul
    return verPronostico ? (esRojo ? pred.cuota_rojo_con_pronostico : pred.cuota_azul_con_pronostico) : cuotaBase
  }

  async function apostar(pelea: PeleaCarteleraResumen) {
    if (!sesion?.accessToken) {
      setErrores(prev => ({ ...prev, [pelea.id]: 'Inicia sesión para apostar.' }))
      return
    }
    const form = formularios[pelea.id]
    if (!form || form.peleadorId === -1) {
      setErrores(prev => ({ ...prev, [pelea.id]: 'Selecciona un peleador.' }))
      return
    }
    const monto = Number(form.monto)
    if (!monto || monto <= 0) {
      setErrores(prev => ({ ...prev, [pelea.id]: 'Ingresa un monto válido.' }))
      return
    }
    try {
      setErrores(prev => ({ ...prev, [pelea.id]: '' }))
      setMensajes(prev => ({ ...prev, [pelea.id]: 'Registrando apuesta...' }))
      await registrarApuesta(sesion.accessToken, {
        pelea_id: pelea.id,
        peleador_seleccionado_id: form.peleadorId,
        monto,
        ver_pronostico: form.verPronostico,
      })
      const cuota = getCuota(pelea, form.peleadorId, form.verPronostico)
      const ganancia = monto * cuota
      setMensajes(prev => ({
        ...prev,
        [pelea.id]: `¡Apuesta registrada! Cuota: ${cuota} · Ganancia potencial: ${formatearMoneda(ganancia)}`,
      }))
      setTimeout(() => setMensajes(prev => ({ ...prev, [pelea.id]: '' })), 5000)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setMensajes(prev => ({ ...prev, [pelea.id]: '' }))
      setErrores(prev => ({ ...prev, [pelea.id]: msg ?? 'No se pudo registrar la apuesta.' }))
    }
  }

  function togglePronostico(peleaId: number) {
    setPronosticosVisibles(prev => ({ ...prev, [peleaId]: !prev[peleaId] }))
  }

  function actualizarForm(peleaId: number, cambios: Partial<FormularioApuesta>) {
    setFormularios(prev => ({ ...prev, [peleaId]: { ...prev[peleaId], ...cambios } }))
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="m-0 text-3xl font-black !text-slate-900">Pronósticos y apuestas</h2>
          <p className="mt-2 max-w-2xl !text-slate-600">
            Cada pelea tiene una predicción estadística. Realiza apuestas individuales por combate o combina múltiples combates para multiplicar tus ganancias.
          </p>
        </div>

        {/* Pestanas de Seleccion de Modo */}
        <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1 self-start sm:self-auto">
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
              modo === 'simples'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setModo('simples')}
          >
            Apuestas Simples
          </button>
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
              modo === 'combinadas'
                ? 'bg-red-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setModo('combinadas')}
          >
            🔥 Apuestas Combinadas
          </button>
        </div>
      </header>

      {modo === 'combinadas' ? (
        <ApuestasCombinadasPagina />
      ) : (
        <>
          {!autenticado && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="w-full text-sm font-medium !text-slate-700 sm:w-auto sm:flex-1">Inicia sesión para poder apostar.</p>
              <div className="flex gap-2">
                <Link className="inline-flex rounded-full bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800" to="/iniciar-sesion">
                  Iniciar sesión
                </Link>
                <Link className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold !text-slate-700 transition hover:bg-slate-50" to="/registro">
                  Registrarse
                </Link>
              </div>
            </div>
          )}

          {cargando && <p className="!text-slate-600">Cargando peleas...</p>}
          {!cargando && peleas.length === 0 && <p className="!text-slate-500">No hay peleas disponibles por el momento.</p>}

          <section className="grid gap-6 xl:grid-cols-2">
            {peleas.map(pelea => {
              const pred = predicciones[pelea.id]
              const form = formularios[pelea.id]
              const pronosticoVisible = pronosticosVisibles[pelea.id] ?? false
              const cuotaActual = form && form.peleadorId !== -1 && pred
                ? getCuota(pelea, form.peleadorId, form.verPronostico)
                : null

              return (
                <TarjetaResumen
                  key={pelea.id}
                  titulo={`${pelea.peleador_rojo_nombre} vs ${pelea.peleador_azul_nombre}`}
                  descripcion={`${pelea.evento_nombre} · ${new Date(`${pelea.fecha}T00:00:00`).toLocaleDateString('es-EC')} · ${pelea.division || 'División por confirmar'}`}
                  contenido={
                    <div className="flex flex-col gap-4">
                      {/* Cuotas base */}
                      {pred && (
                        <div className="grid grid-cols-2 gap-2 text-center text-sm">
                          <div className="rounded-xl border border-red-200 bg-red-50/80 p-2.5">
                            <p className="font-bold !text-red-800">{pelea.peleador_rojo_nombre}</p>
                            <p className="text-xs font-medium !text-slate-500">{pred.probabilidad_rojo}% prob.</p>
                            <p className="mt-1 text-lg font-black !text-red-700">×{pred.cuota_rojo}</p>
                          </div>
                          <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-2.5">
                            <p className="font-bold !text-blue-800">{pelea.peleador_azul_nombre}</p>
                            <p className="text-xs font-medium !text-slate-500">{pred.probabilidad_azul}% prob.</p>
                            <p className="mt-1 text-lg font-black !text-blue-700">×{pred.cuota_azul}</p>
                          </div>
                        </div>
                      )}

                      {/* Botón ver pronóstico */}
                      {pred && (
                        <button
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold !text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                          type="button"
                          onClick={() => togglePronostico(pelea.id)}
                        >
                          <span>{pronosticoVisible ? '▲ Ocultar pronóstico detallado' : '▼ Ver pronóstico detallado'}</span>
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-800">−10% cuota si apuestas</span>
                        </button>
                      )}

                      {/* Detalle pronóstico */}
                      {pred && pronosticoVisible && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs !text-slate-700">
                          <p className="mb-2 font-bold !text-slate-900">{pred.explicacion}</p>
                          <ul className="flex flex-col gap-1.5">
                            {pred.factores.map(f => (
                              <li key={f.nombre} className="flex justify-between border-b border-slate-200/60 pb-1 last:border-0 last:pb-0">
                                <span className="font-medium !text-slate-500 capitalize">{f.nombre.replace(/_/g, ' ')}</span>
                                <span className="font-semibold">
                                  <span className="!text-red-700">{f.peleador_rojo}</span>
                                  <span className="mx-1 font-normal !text-slate-400">vs</span>
                                  <span className="!text-blue-700">{f.peleador_azul}</span>
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Formulario apuesta */}
                      {autenticado && form && (
                        <div className="flex flex-col gap-3 border-t border-slate-200 pt-3">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                                form.peleadorId === pred?.peleador_rojo_id
                                  ? 'border-red-600 bg-red-50 !text-red-700 ring-1 ring-red-600'
                                  : 'border-slate-300 bg-white !text-slate-700 hover:border-slate-400'
                              }`}
                              type="button"
                              onClick={() => actualizarForm(pelea.id, { peleadorId: pred?.peleador_rojo_id ?? -1 })}
                            >
                              {pelea.peleador_rojo_nombre}
                            </button>
                            <button
                              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                                form.peleadorId === pred?.peleador_azul_id
                                  ? 'border-blue-600 bg-blue-50 !text-blue-700 ring-1 ring-blue-600'
                                  : 'border-slate-300 bg-white !text-slate-700 hover:border-slate-400'
                              }`}
                              type="button"
                              onClick={() => actualizarForm(pelea.id, { peleadorId: pred?.peleador_azul_id ?? -1 })}
                            >
                              {pelea.peleador_azul_nombre}
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold !text-slate-600">Monto:</span>
                            <input
                              className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium !text-slate-900 shadow-sm outline-none transition focus:border-red-700 focus:ring-1 focus:ring-red-700"
                              min="1"
                              placeholder="10.00"
                              step="0.01"
                              type="number"
                              value={form.monto}
                              onChange={e => actualizarForm(pelea.id, { monto: e.target.value })}
                            />
                          </div>

                          {pred && (
                            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium !text-slate-700">
                              <input
                                checked={form.verPronostico}
                                className="h-4 w-4 rounded accent-red-700"
                                type="checkbox"
                                onChange={e => actualizarForm(pelea.id, { verPronostico: e.target.checked })}
                              />
                              <span>
                                Usar pronóstico al apostar
                                <span className="ml-1 text-xs font-bold text-amber-700">(cuota −10%)</span>
                              </span>
                            </label>
                          )}

                          {pred && form.peleadorId !== -1 && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium !text-slate-700">
                              Cuota: <span className="font-bold !text-slate-900">×{cuotaActual}</span>
                              {form.monto && Number(form.monto) > 0 && cuotaActual && (
                                <> · Ganancia potencial: <span className="font-extrabold !text-emerald-700">{formatearMoneda(Number(form.monto) * cuotaActual)}</span></>
                              )}
                              {form.verPronostico && <span className="ml-2 font-semibold text-amber-700">(Cuota reducida por pronóstico)</span>}
                            </div>
                          )}

                          {mensajes[pelea.id] && (
                            <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs font-semibold !text-emerald-800">{mensajes[pelea.id]}</p>
                          )}
                          {errores[pelea.id] && (
                            <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs font-semibold !text-red-700">{errores[pelea.id]}</p>
                          )}

                          <button
                            className="rounded-xl bg-red-700 py-2.5 text-sm font-bold text-white shadow transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={form.peleadorId === -1 || !form.monto || Number(form.monto) <= 0}
                            type="button"
                            onClick={() => apostar(pelea)}
                          >
                            Apostar {form.monto && Number(form.monto) > 0 ? formatearMoneda(Number(form.monto)) : ''}
                          </button>
                        </div>
                      )}
                    </div>
                  }
                />
              )
            })}
          </section>
        </>
      )}
    </div>
  )
}