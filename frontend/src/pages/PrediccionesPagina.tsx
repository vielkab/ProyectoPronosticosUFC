import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { TarjetaResumen } from '../components/ui/TarjetaResumen'
import { useAutenticacion } from '../hooks/useAutenticacion'
import {
  listarEventos,
  listarPeleadores,
  obtenerEvento,
  obtenerPrediccion,
  registrarApuesta,
  type PeleaResumen,
  type PeleadorResumen,
  type PrediccionCombate,
} from '../services/mvp'
import { formatearMoneda } from '../utils/formatos'

type FormularioApuesta = {
  peleadorId: number
  monto: string
  metodo: string
  round: string
}

export function PrediccionesPagina() {
  const { autenticado, sesion } = useAutenticacion()
  const [peleas, setPeleas] = useState<PeleaResumen[]>([])
  const [peleadores, setPeleadores] = useState<PeleadorResumen[]>([])
  const [predicciones, setPredicciones] = useState<Record<number, PrediccionCombate>>({})
  const [formularios, setFormularios] = useState<Record<number, FormularioApuesta>>({})
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function cargar() {
      try {
        const [eventos, peleadoresData] = await Promise.all([listarEventos(), listarPeleadores()])
        const detalles = await Promise.all(eventos.slice(0, 3).map((evento) => obtenerEvento(evento.id)))
        const peleasData = detalles.flatMap((evento) => evento.peleas)
        const prediccionesData = await Promise.all(peleasData.map((pelea) => obtenerPrediccion(pelea.id)))
        setPeleadores(peleadoresData)
        setPeleas(peleasData)
        setPredicciones(Object.fromEntries(prediccionesData.map((prediccion) => [prediccion.pelea_id, prediccion])))
        setFormularios(
          Object.fromEntries(
            peleasData.map((pelea) => [
              pelea.id,
              { peleadorId: pelea.peleador_rojo_id, monto: '10', metodo: 'Decision', round: '' },
            ]),
          ),
        )
      } catch {
        setError('No se pudieron cargar las predicciones.')
      } finally {
        setCargando(false)
      }
    }

    cargar()
  }, [])

  const nombres = useMemo(
    () => Object.fromEntries(peleadores.map((peleador) => [peleador.id, peleador.nombre])),
    [peleadores],
  )

  async function apostar(pelea: PeleaResumen) {
    if (!sesion?.accessToken) {
      setError('Inicia sesión para registrar una apuesta.')
      return
    }

    const formulario = formularios[pelea.id]
    const monto = Number(formulario?.monto ?? 0)
    if (!formulario || monto <= 0) {
      setError('Ingresa un monto válido.')
      return
    }

    try {
      setError('')
      setMensaje('Registrando apuesta en tu billetera virtual...')
      
      // 1. Envía la apuesta al backend (esta petición ejecutará tu lógica que resta saldo)
      await registrarApuesta(sesion.accessToken, {
        pelea_id: pelea.id,
        peleador_seleccionado_id: formulario.peleadorId,
        monto,
        metodo_victoria: formulario.metodo || null,
        round: formulario.round ? Number(formulario.round) : null,
      })

      // 2. ÉXITO LOCAL: Flujo simulado con el crédito virtual sin pasar por Stripe
      setMensaje('¡Apuesta registrada con éxito usando tu saldo virtual!')
      
      // Limpia el mensaje de éxito tras 4 segundos
      setTimeout(() => setMensaje(''), 4000)

    } catch (err: any) {
      setMensaje('')
      // Captura el mensaje detallado del backend (como "Saldo insuficiente") si rebota
      const msgError = err?.response?.data?.detail ?? 'No se pudo registrar la apuesta.'
      setError(msgError)
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <header>
        <h2 className="m-0 text-3xl font-black text-white">Predicciones</h2>
        <p className="mt-3 max-w-2xl text-slate-300">Probabilidades heurísticas explicables basadas en estadísticas históricas.</p>
      </header>

      {!autenticado && (
        <div className="flex flex-wrap gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
          <Link className="inline-flex rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400" to="/registro">
            Crear cuenta
          </Link>
          <Link className="inline-flex rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-red-400/60" to="/iniciar-sesion">
            Iniciar sesión
          </Link>
        </div>
      )}

      {cargando && <p className="text-slate-300">Calculando predicciones...</p>}
      {mensaje && <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4 text-emerald-100">{mensaje}</p>}
      {error && <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-red-100">{error}</p>}

      <section className="grid gap-6 xl:grid-cols-2">
        {peleas.map((pelea) => {
          const prediccion = predicciones[pelea.id]
          const formulario = formularios[pelea.id]
          return (
            <TarjetaResumen
              key={pelea.id}
              titulo={`${nombres[pelea.peleador_rojo_id] ?? 'Rojo'} vs ${nombres[pelea.peleador_azul_id] ?? 'Azul'}`}
              descripcion={`${pelea.division || 'División por confirmar'} · ${pelea.estado}`}
              contenido={
                <div className="space-y-4 text-slate-200">
                  {prediccion && (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <strong className="rounded-lg bg-white/5 p-3">{nombres[pelea.peleador_rojo_id]}: {prediccion.probabilidad_rojo}%</strong>
                        <strong className="rounded-lg bg-white/5 p-3">{nombres[pelea.peleador_azul_id]}: {prediccion.probabilidad_azul}%</strong>
                      </div>
                      <p className="text-sm text-slate-300">{prediccion.explicacion}</p>
                      <div className="grid gap-3 sm:grid-cols-2 text-sm">
                        <div className="rounded-lg bg-white/5 p-3">
                          <p className="mb-2 font-bold">Método de victoria</p>
                          {prediccion.method_disponible
                            ? Object.entries(prediccion.method).map(([metodo, valor]) => (
                              <p key={metodo}>{metodo}: {(valor.probability * 100).toFixed(1)}% · cuota {valor.odds ?? '-'}</p>
                            ))
                            : <p className="text-slate-400">Modelo no disponible</p>}
                        </div>
                        <div className="rounded-lg bg-white/5 p-3">
                          <p className="mb-2 font-bold">Round de finalización</p>
                          {prediccion.round_disponible
                            ? Object.entries(prediccion.round).map(([round, valor]) => (
                              <p key={round}>Round {round}: {(valor.probability * 100).toFixed(1)}% · cuota {valor.odds ?? '-'}</p>
                            ))
                            : <p className="text-slate-400">Modelo no disponible</p>}
                        </div>
                      </div>
                      <ul className="m-0 grid list-none gap-2 p-0 text-sm">
                        {prediccion.factores.map((factor) => (
                          <li key={factor.nombre} className="rounded-lg bg-white/5 px-3 py-2">
                            {factor.nombre} : {factor.peleador_rojo} vs {factor.peleador_azul} · peso {factor.peso}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {formulario && (
                    <div className="grid gap-3">
                      <select
                        className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
                        value={formulario.peleadorId}
                        onChange={(event) => setFormularios((actual) => ({
                          ...actual,
                          [pelea.id]: { ...formulario, peleadorId: Number(event.target.value) },
                        }))}
                      >
                        <option value={pelea.peleador_rojo_id}>{nombres[pelea.peleador_rojo_id]}</option>
                        <option value={pelea.peleador_azul_id}>{nombres[pelea.peleador_azul_id]}</option>
                      </select>
                      <input
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                        min="1"
                        step="0.01"
                        type="number"
                        value={formulario.monto}
                        onChange={(event) => setFormularios((actual) => ({
                          ...actual,
                          [pelea.id]: { ...formulario, monto: event.target.value },
                        }))}
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <select
                          className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
                          value={formulario.metodo}
                          onChange={(event) => setFormularios((actual) => ({
                            ...actual,
                            [pelea.id]: { ...formulario, metodo: event.target.value },
                          }))}
                        >
                          <option>Decision</option>
                          <option>KO/TKO</option>
                          <option>Submission</option>
                        </select>
                        <select
                          className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
                          value={formulario.round}
                          onChange={(event) => setFormularios((actual) => ({
                            ...actual,
                            [pelea.id]: { ...formulario, round: event.target.value },
                          }))}
                        >
                          <option value="">Round</option>
                          {[1, 2, 3, 4, 5].map((round) => <option key={round} value={round}>{round}</option>)}
                        </select>
                      </div>
                      <button
                        className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!autenticado}
                        type="button"
                        onClick={() => apostar(pelea)}
                      >
                        Apostar {formatearMoneda(Number(formulario.monto || 0))}
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
