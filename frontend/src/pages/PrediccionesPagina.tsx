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

type FormularioApuesta = {
  peleadorId: number
  monto: string
  verPronostico: boolean
}

export function PrediccionesPagina() {
  const { autenticado, sesion } = useAutenticacion()
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

  // function cuotaParaPeleador(prediccion: PrediccionCombate, peleaId: number, peleadorId: number, pelea: PeleaCarteleraResumen): number {
  //   const verPronostico = formularios[peleaId]?.verPronostico ?? false
  //   const esRojo = peleadorId === -1 ? true : peleadorId === pelea.id // placeholder
  //   if (verPronostico) {
  //     return peleadorId === -1 ? 0 : (prediccion.cuota_rojo_con_pronostico)
  //   }
  //   return peleadorId === -1 ? 0 : prediccion.cuota_rojo
  // }

  function getCuota(pelea: PeleaCarteleraResumen, peleadorSeleccionadoId: number, verPronostico: boolean): number {
    const pred = predicciones[pelea.id]
    if (!pred) return 1.8
    // Necesitamos saber si el peleador seleccionado es rojo o azul
    // La información de IDs está en la predicción
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
    // const pred = predicciones[pelea.id]
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
      <header>
        <h2 className="m-0 text-3xl font-black text-white">Pronósticos y apuestas</h2>
        <p className="mt-3 max-w-2xl text-slate-300">
          Cada pelea tiene una predicción estadística. Puedes ver el pronóstico detallado antes de apostar,
          pero hacerlo reduce tu cuota un 10%.
        </p>
      </header>

      {!autenticado && (
        <div className="flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="w-full text-sm text-slate-300">Inicia sesión para poder apostar.</p>
          <Link className="inline-flex rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400" to="/iniciar-sesion">
            Iniciar sesión
          </Link>
          <Link className="inline-flex rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:border-red-400/60" to="/registro">
            Registrarse
          </Link>
        </div>
      )}

      {cargando && <p className="text-slate-300">Cargando peleas...</p>}
      {!cargando && peleas.length === 0 && <p className="text-slate-400">No hay peleas disponibles por el momento.</p>}

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
                      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-2">
                        <p className="font-semibold text-red-300">{pelea.peleador_rojo_nombre}</p>
                        <p className="text-xs text-slate-400">{pred.probabilidad_rojo}% prob.</p>
                        <p className="text-lg font-black text-white">×{pred.cuota_rojo}</p>
                      </div>
                      <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-2">
                        <p className="font-semibold text-blue-300">{pelea.peleador_azul_nombre}</p>
                        <p className="text-xs text-slate-400">{pred.probabilidad_azul}% prob.</p>
                        <p className="text-lg font-black text-white">×{pred.cuota_azul}</p>
                      </div>
                    </div>
                  )}

                  {/* Botón ver pronóstico */}
                  {pred && (
                    <button
                      className="rounded-xl border border-white/10 px-3 py-2 text-left text-xs text-slate-300 transition hover:border-white/30 hover:text-white"
                      type="button"
                      onClick={() => togglePronostico(pelea.id)}
                    >
                      {pronosticoVisible ? '▲ Ocultar pronóstico detallado' : '▼ Ver pronóstico detallado'}
                      <span className="ml-2 rounded-full bg-yellow-500/20 px-2 py-0.5 text-yellow-300">−10% cuota si apuestas</span>
                    </button>
                  )}

                  {/* Detalle pronóstico */}
                  {pred && pronosticoVisible && (
                    <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-xs text-slate-300">
                      <p className="mb-2 font-semibold text-white">{pred.explicacion}</p>
                      <ul className="flex flex-col gap-1">
                        {pred.factores.map(f => (
                          <li key={f.nombre} className="flex justify-between">
                            <span className="text-slate-400 capitalize">{f.nombre.replace(/_/g, ' ')}</span>
                            <span>
                              <span className="text-red-300">{f.peleador_rojo}</span>
                              <span className="mx-1 text-slate-500">vs</span>
                              <span className="text-blue-300">{f.peleador_azul}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Formulario apuesta */}
                  {autenticado && form && (
                    <div className="flex flex-col gap-3 border-t border-white/5 pt-3">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          className={`rounded-xl border px-3 py-2 text-sm transition ${form.peleadorId === pred?.peleador_rojo_id ? 'border-red-500 bg-red-500/20 font-semibold text-red-300' : 'border-white/10 text-slate-300 hover:border-white/30'}`}
                          type="button"
                          onClick={() => actualizarForm(pelea.id, { peleadorId: pred?.peleador_rojo_id ?? -1 })}
                        >
                          {pelea.peleador_rojo_nombre}
                        </button>
                        <button
                          className={`rounded-xl border px-3 py-2 text-sm transition ${form.peleadorId === pred?.peleador_azul_id ? 'border-blue-500 bg-blue-500/20 font-semibold text-blue-300' : 'border-white/10 text-slate-300 hover:border-white/30'}`}
                          type="button"
                          onClick={() => actualizarForm(pelea.id, { peleadorId: pred?.peleador_azul_id ?? -1 })}
                        >
                          {pelea.peleador_azul_nombre}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-400">Monto:</span>
                        <input
                          className="flex-1 rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-red-400"
                          min="1"
                          placeholder="10.00"
                          step="0.01"
                          type="number"
                          value={form.monto}
                          onChange={e => actualizarForm(pelea.id, { monto: e.target.value })}
                        />
                      </div>

                      {pred && (
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            checked={form.verPronostico}
                            className="accent-red-500"
                            type="checkbox"
                            onChange={e => actualizarForm(pelea.id, { verPronostico: e.target.checked })}
                          />
                          <span className="text-slate-300">
                            Usar pronóstico al apostar
                            <span className="ml-1 text-xs text-yellow-400">(cuota −10%)</span>
                          </span>
                        </label>
                      )}

                      {pred && form.peleadorId !== -1 && (
                        <div className="rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-xs text-slate-300">
                          Cuota: <span className="font-bold text-white">×{cuotaActual}</span>
                          {form.monto && Number(form.monto) > 0 && cuotaActual && (
                            <> · Ganancia potencial: <span className="font-bold text-emerald-300">{formatearMoneda(Number(form.monto) * cuotaActual)}</span></>
                          )}
                          {form.verPronostico && <span className="ml-2 text-yellow-400">Cuota reducida por ver pronóstico</span>}
                        </div>
                      )}

                      {mensajes[pelea.id] && (
                        <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-2 text-xs text-emerald-200">{mensajes[pelea.id]}</p>
                      )}
                      {errores[pelea.id] && (
                        <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-2 text-xs text-red-200">{errores[pelea.id]}</p>
                      )}

                      <button
                        className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
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
    </div>
  )
}
