import { useEffect, useRef, useState } from 'react'

import { useAutenticacion } from '../hooks/useAutenticacion'
import {
  cambiarEstadoPeleaAdmin,
  cancelarPeleaAdmin,
  crearPeleaAdmin,
  listarPeleadoresPorDivision,
  listarPeleasAdmin,
  registrarResultadoAdmin,
  type PeleaAdminResumen,
  type PeleadorBusquedaAdmin,
} from '../services/admin'

// Divisiones oficiales UFC
const DIVISIONES_UFC = [
  'Strawweight',
  'Flyweight',
  'Bantamweight',
  'Featherweight',
  'Lightweight',
  'Welterweight',
  'Middleweight',
  'Light Heavyweight',
  'Heavyweight',
  "Women's Strawweight",
  "Women's Flyweight",
  "Women's Bantamweight",
  "Women's Featherweight",
]

const ESTADOS_PELEA = ['programada', 'en_curso', 'finalizada', 'cancelada'] as const

function badgeEstado(estado: string) {
  const colores: Record<string, string> = {
    programada: 'bg-blue-100 text-blue-800',
    en_curso: 'bg-amber-100 text-amber-800',
    finalizada: 'bg-emerald-100 text-emerald-800',
    cancelada: 'bg-red-100 text-red-800',
  }
  return `inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${colores[estado] ?? 'bg-slate-100 text-slate-700'}`
}

// ── Selector de peleador con búsqueda ─────────────────────────────────────────

type SelectorPeleadorProps = {
  label: string
  peleadores: PeleadorBusquedaAdmin[]
  seleccionado: PeleadorBusquedaAdmin | null
  onSeleccionar: (p: PeleadorBusquedaAdmin | null) => void
  excluirId?: number
  deshabilitado?: boolean
}

function SelectorPeleador({ label, peleadores, seleccionado, onSeleccionar, excluirId, deshabilitado }: SelectorPeleadorProps) {
  const [query, setQuery] = useState('')
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtrados = peleadores.filter(
    p => p.id !== excluirId && p.nombre.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    function cerrar(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', cerrar)
    return () => document.removeEventListener('mousedown', cerrar)
  }, [])

  function limpiar() {
    onSeleccionar(null)
    setQuery('')
  }

  return (
    <div ref={ref} className="relative flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {seleccionado ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2">
          <span className="flex-1 text-sm font-semibold text-emerald-900">{seleccionado.nombre}</span>
          <span className="text-xs font-medium text-emerald-700">{seleccionado.record}</span>
          {!deshabilitado && (
            <button className="ml-1 font-bold text-emerald-700 hover:text-emerald-900" type="button" onClick={limpiar}>✕</button>
          )}
        </div>
      ) : (
        <>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 disabled:bg-slate-100 disabled:opacity-60"
            disabled={deshabilitado}
            placeholder={deshabilitado ? 'Selecciona la división primero' : 'Filtrar por nombre...'}
            type="text"
            value={query}
            onFocus={() => setAbierto(true)}
            onChange={e => { setQuery(e.target.value); setAbierto(true) }}
          />
          {abierto && !deshabilitado && (
            <ul className="absolute top-full z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
              {filtrados.length === 0 && (
                <li className="px-3 py-2 text-xs text-slate-500">
                  {peleadores.length === 0 ? 'Sin peleadores en BD para esta división. Sincroniza la API.' : 'Sin resultados.'}
                </li>
              )}
              {filtrados.map(p => (
                <li key={p.id}>
                  <button
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition"
                    type="button"
                    onClick={() => { onSeleccionar(p); setAbierto(false); setQuery('') }}
                  >
                    <span className="font-medium text-slate-900">{p.nombre}</span>{' '}
                    <span className="text-xs text-slate-500">· {p.record} · {p.pais}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

// ── Formulario crear pelea ────────────────────────────────────────────────────

type FormCrearPeleaProps = { token: string; onCreada: () => void; onCancelar: () => void }

function FormCrearPelea({ token, onCreada, onCancelar }: FormCrearPeleaProps) {
  const [evento, setEvento] = useState('')
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [sede, setSede] = useState('')
  const [division, setDivision] = useState('')
  const [orden, setOrden] = useState('1')
  const [peleadores, setPeleadores] = useState<PeleadorBusquedaAdmin[]>([])
  const [cargandoPeleadores, setCargandoPeleadores] = useState(false)
  const [rojo, setRojo] = useState<PeleadorBusquedaAdmin | null>(null)
  const [azul, setAzul] = useState<PeleadorBusquedaAdmin | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!division) { setPeleadores([]); setRojo(null); setAzul(null); return }
    setCargandoPeleadores(true)
    listarPeleadoresPorDivision(token, division)
      .then(res => { setPeleadores(res); setRojo(null); setAzul(null) })
      .catch(() => setPeleadores([]))
      .finally(() => setCargandoPeleadores(false))
  }, [division, token])

  async function guardar() {
    if (!division) { setError('Selecciona una división.'); return }
    if (!rojo || !azul) { setError('Debes seleccionar ambos peleadores.'); return }
    if (!evento.trim() || !fecha) { setError('El nombre del evento y la fecha son obligatorios.'); return }
    try {
      setGuardando(true); setError('')
      await crearPeleaAdmin(token, {
        evento: evento.trim(),
        fecha,
        hora: hora || null,
        sede: sede.trim(),
        categoria: division,
        peleador_rojo_id: rojo.id,
        peleador_azul_id: azul.id,
        estado: 'programada',
        orden: Number(orden) || 1,
      })
      onCreada()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? 'No se pudo crear la pelea.')
    } finally { setGuardando(false) }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-slate-900">Nueva pelea</h3>
      {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Nombre del evento *</label>
          <input className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" placeholder="UFC 310" value={evento} onChange={e => setEvento(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Fecha *</label>
          <input className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Hora del evento</label>
          <input className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" type="time" value={hora} onChange={e => setHora(e.target.value)} placeholder="20:00" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Sede</label>
          <input className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" placeholder="Las Vegas" value={sede} onChange={e => setSede(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">División *</label>
          <select
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            value={division}
            onChange={e => setDivision(e.target.value)}
          >
            <option value="">Selecciona una división...</option>
            {DIVISIONES_UFC.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Orden en cartelera</label>
          <input className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" type="number" min={1} value={orden} onChange={e => setOrden(e.target.value)} />
        </div>
      </div>

      {division && (
        <div className="mt-5">
          {cargandoPeleadores ? (
            <p className="text-sm text-slate-500">Cargando peleadores de {division}...</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectorPeleador label="Peleador rojo *" peleadores={peleadores} seleccionado={rojo} onSeleccionar={setRojo} excluirId={azul?.id} />
              <SelectorPeleador label="Peleador azul *" peleadores={peleadores} seleccionado={azul} onSeleccionar={setAzul} excluirId={rojo?.id} />
            </div>
          )}
          {!cargandoPeleadores && peleadores.length > 0 && (
            <p className="mt-2 text-xs font-medium text-slate-500">{peleadores.length} peleador(es) disponibles en la división {division}</p>
          )}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" type="button" onClick={onCancelar}>Cancelar</button>
        <button className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50" disabled={guardando} type="button" onClick={guardar}>
          {guardando ? 'Creando...' : 'Crear pelea'}
        </button>
      </div>
    </div>
  )
}

// ── Modal resultado ────────────────────────────────────────────────────────────

type ModalProps = { pelea: PeleaAdminResumen; token: string; onCerrar: () => void; onGuardado: () => void }

function ModalResultado({ pelea, token, onCerrar, onGuardado }: ModalProps) {
  const [ganadorId, setGanadorId] = useState<number>(pelea.peleador_rojo_id)
  const [metodo, setMetodo] = useState('KO/TKO')
  const [round, setRound] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function guardar() {
    try {
      setGuardando(true); setError('')
      await registrarResultadoAdmin(token, pelea.id, { ganador_id: ganadorId, metodo, round: round ? Number(round) : null })
      onGuardado()
    } catch { setError('No se pudo registrar el resultado.') }
    finally { setGuardando(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onCerrar}>
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="mb-4 text-xl font-bold text-slate-900">Registrar resultado — Pelea #{pelea.id}</h3>
        {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ganador</label>
            <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" value={ganadorId} onChange={e => setGanadorId(Number(e.target.value))}>
              <option value={pelea.peleador_rojo_id}>{pelea.peleador_rojo.nombre} (Rojo)</option>
              <option value={pelea.peleador_azul_id}>{pelea.peleador_azul.nombre} (Azul)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Método</label>
            <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" value={metodo} onChange={e => setMetodo(e.target.value)}>
              {['KO/TKO', 'Submission', 'Decision Unanimous', 'Decision Split', 'Decision Majority', 'No Contest', 'DQ'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Round (opcional)</label>
            <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" max={5} min={1} placeholder="1–5" type="number" value={round} onChange={e => setRound(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-3">
            <button className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50" type="button" onClick={onCerrar}>Cancelar</button>
            <button className="flex-1 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50" disabled={guardando} type="button" onClick={guardar}>
              {guardando ? 'Guardando...' : 'Confirmar resultado'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export function AdminPeleasPagina() {
  const { sesion } = useAutenticacion()
  const token = sesion!.accessToken
  const [peleas, setPeleas] = useState<PeleaAdminResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [modalPelea, setModalPelea] = useState<PeleaAdminResumen | null>(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  function cargar() {
    setCargando(true)
    listarPeleasAdmin(token)
      .then(setPeleas)
      .catch(() => setError('No se pudo cargar las peleas.'))
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargar() }, [token])

  async function cambiarEstado(pelea: PeleaAdminResumen, estado: typeof ESTADOS_PELEA[number]) {
    try {
      setMensaje(''); setError('')
      await cambiarEstadoPeleaAdmin(token, pelea.id, { estado })
      setMensaje(`Pelea #${pelea.id} → "${estado}"`)
      cargar()
    } catch { setError('No se pudo cambiar el estado.') }
  }

  async function cancelar(pelea: PeleaAdminResumen) {
    if (!confirm(`¿Cancelar la Pelea #${pelea.id}? Se cancelarán las apuestas pendientes.`)) return
    try {
      setMensaje(''); setError('')
      const res = await cancelarPeleaAdmin(token, pelea.id)
      setMensaje(res.mensaje)
      cargar()
    } catch { setError('No se pudo cancelar la pelea.') }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0 text-3xl font-black text-slate-900">Gestión de peleas</h2>
          <p className="mt-1 text-slate-600">Crea, cambia estados, registra resultados y cancela peleas.</p>
        </div>
        <button
          className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition"
          type="button"
          onClick={() => setMostrarFormulario(v => !v)}
        >
          {mostrarFormulario ? 'Cerrar formulario' : '+ Nueva pelea'}
        </button>
      </header>

      {mostrarFormulario && (
        <FormCrearPelea
          token={token}
          onCancelar={() => setMostrarFormulario(false)}
          onCreada={() => { setMostrarFormulario(false); setMensaje('Pelea creada correctamente.'); cargar() }}
        />
      )}

      {mensaje && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">{mensaje}</p>}
      {error && <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">{error}</p>}
      {cargando && <p className="text-slate-500">Cargando peleas...</p>}
      {!cargando && peleas.length === 0 && (
        <p className="text-slate-500 py-8 text-center">No hay peleas registradas. Crea una o sincroniza la API desde Resumen.</p>
      )}

      <div className="flex flex-col gap-4">
        {peleas.map(pelea => (
          <div key={pelea.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-bold text-slate-900">
                  #{pelea.id} · <span className="text-red-700">{pelea.peleador_rojo.nombre}</span> <span className="font-normal text-slate-400">vs</span> <span className="text-blue-700">{pelea.peleador_azul.nombre}</span>
                </p>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {pelea.evento} · {pelea.fecha_hora ?? '—'}{pelea.hora ? ` ${pelea.hora}` : ''} · {pelea.categoria || 'Sin categoría'}
                </p>
              </div>
              <span className={badgeEstado(pelea.estado)}>{pelea.estado}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              {ESTADOS_PELEA.filter(e => e !== pelea.estado && e !== 'cancelada' && e !== 'finalizada').map(estado => (
                <button key={estado} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition" type="button" onClick={() => cambiarEstado(pelea, estado)}>
                  → {estado}
                </button>
              ))}
              {pelea.estado !== 'finalizada' && pelea.estado !== 'cancelada' && (
                <button className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition" type="button" onClick={() => setModalPelea(pelea)}>
                  Registrar resultado
                </button>
              )}
              {pelea.estado !== 'cancelada' && pelea.estado !== 'finalizada' && (
                <button className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 border border-red-200 hover:bg-red-100 transition" type="button" onClick={() => cancelar(pelea)}>
                  Cancelar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {modalPelea && (
        <ModalResultado
          pelea={modalPelea}
          token={token}
          onCerrar={() => setModalPelea(null)}
          onGuardado={() => { setModalPelea(null); setMensaje('Resultado registrado. Apuestas resueltas.'); cargar() }}
        />
      )}
    </div>
  )
}