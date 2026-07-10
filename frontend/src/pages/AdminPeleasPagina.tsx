import { useEffect, useRef, useState } from 'react'

import { useAutenticacion } from '../hooks/useAutenticacion'
import {
  buscarPeleadoresAdmin,
  cambiarEstadoPeleaAdmin,
  cancelarPeleaAdmin,
  crearPeleaAdmin,
  listarPeleasAdmin,
  registrarResultadoAdmin,
  type PeleaAdminResumen,
  type PeleadorBusquedaAdmin,
} from '../services/admin'

const ESTADOS_PELEA = ['programada', 'en_curso', 'finalizada', 'cancelada'] as const

function badgeEstado(estado: string) {
  const colores: Record<string, string> = {
    programada: 'bg-blue-500/20 text-blue-300',
    en_curso: 'bg-yellow-500/20 text-yellow-300',
    finalizada: 'bg-emerald-500/20 text-emerald-300',
    cancelada: 'bg-red-500/20 text-red-300',
  }
  return `inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${colores[estado] ?? 'bg-white/10 text-slate-300'}`
}

// ── Buscador de peleador ───────────────────────────────────────────────────────

type BuscadorPeleadorProps = {
  label: string
  token: string
  seleccionado: PeleadorBusquedaAdmin | null
  onSeleccionar: (p: PeleadorBusquedaAdmin) => void
  excluirId?: number
}

function BuscadorPeleador({ label, token, seleccionado, onSeleccionar, excluirId }: BuscadorPeleadorProps) {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<PeleadorBusquedaAdmin[]>([])
  const [buscando, setBuscando] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function buscar(valor: string) {
    setQuery(valor)
    if (timer.current) clearTimeout(timer.current)
    if (!valor.trim()) { setResultados([]); return }
    timer.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const res = await buscarPeleadoresAdmin(token, valor)
        setResultados(res.filter(p => p.id !== excluirId))
      } finally { setBuscando(false) }
    }, 300)
  }

  function seleccionar(p: PeleadorBusquedaAdmin) {
    onSeleccionar(p)
    setQuery(p.nombre)
    setResultados([])
  }

  return (
    <div className="relative flex flex-col gap-1">
      <label className="text-sm text-slate-300">{label}</label>
      {seleccionado && (
        <p className="text-xs text-emerald-400">✓ {seleccionado.nombre} ({seleccionado.division})</p>
      )}
      <input
        className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-red-400"
        placeholder="Escribir nombre..."
        type="text"
        value={query}
        onChange={(e) => buscar(e.target.value)}
      />
      {buscando && <p className="text-xs text-slate-400">Buscando...</p>}
      {resultados.length > 0 && (
        <ul className="absolute top-full z-20 mt-1 w-full rounded-xl border border-white/10 bg-slate-900 shadow-xl">
          {resultados.map((p) => (
            <li key={p.id}>
              <button
                className="w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5"
                type="button"
                onClick={() => seleccionar(p)}
              >
                {p.nombre} <span className="text-xs text-slate-400">· {p.division} · {p.record}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {!buscando && query.trim() && resultados.length === 0 && (
        <p className="text-xs text-slate-500">Sin resultados. Sincroniza la API primero.</p>
      )}
    </div>
  )
}

// ── Formulario crear pelea ─────────────────────────────────────────────────────

type FormCrearPeleaProps = { token: string; onCreada: () => void; onCancelar: () => void }

function FormCrearPelea({ token, onCreada, onCancelar }: FormCrearPeleaProps) {
  const [evento, setEvento] = useState('')
  const [fecha, setFecha] = useState('')
  const [sede, setSede] = useState('')
  const [categoria, setCategoria] = useState('')
  const [orden, setOrden] = useState('1')
  const [rojo, setRojo] = useState<PeleadorBusquedaAdmin | null>(null)
  const [azul, setAzul] = useState<PeleadorBusquedaAdmin | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function guardar() {
    if (!rojo || !azul) { setError('Debes seleccionar ambos peleadores.'); return }
    if (!evento.trim() || !fecha) { setError('Evento y fecha son obligatorios.'); return }
    try {
      setGuardando(true)
      setError('')
      await crearPeleaAdmin(token, {
        evento: evento.trim(),
        fecha,
        sede: sede.trim(),
        categoria: categoria.trim(),
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
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
      <h3 className="mb-4 font-bold text-white">Nueva pelea</h3>
      {error && <p className="mb-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-300">Nombre del evento *</label>
          <input className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-red-400" value={evento} onChange={e => setEvento(e.target.value)} placeholder="UFC 310" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-300">Fecha *</label>
          <input className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-red-400" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-300">Sede</label>
          <input className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-red-400" value={sede} onChange={e => setSede(e.target.value)} placeholder="Las Vegas" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-300">División</label>
          <input className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-red-400" value={categoria} onChange={e => setCategoria(e.target.value)} placeholder="Lightweight" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-300">Orden en cartelera</label>
          <input className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-red-400" type="number" min={1} value={orden} onChange={e => setOrden(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <BuscadorPeleador label="Peleador rojo *" token={token} seleccionado={rojo} onSeleccionar={setRojo} excluirId={azul?.id} />
        <BuscadorPeleador label="Peleador azul *" token={token} seleccionado={azul} onSeleccionar={setAzul} excluirId={rojo?.id} />
      </div>
      <div className="mt-5 flex gap-3">
        <button className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 hover:border-white/30" type="button" onClick={onCancelar}>Cancelar</button>
        <button className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50" disabled={guardando} type="button" onClick={guardar}>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" onClick={onCerrar}>
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="mb-4 text-xl font-bold text-white">Registrar resultado — Pelea #{pelea.id}</h3>
        {error && <p className="mb-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-slate-300">Ganador</label>
            <select className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-white" value={ganadorId} onChange={e => setGanadorId(Number(e.target.value))}>
              <option value={pelea.peleador_rojo_id}>{pelea.peleador_rojo.nombre} (Rojo)</option>
              <option value={pelea.peleador_azul_id}>{pelea.peleador_azul.nombre} (Azul)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Método</label>
            <select className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-white" value={metodo} onChange={e => setMetodo(e.target.value)}>
              {['KO/TKO', 'Submission', 'Decision Unanimous', 'Decision Split', 'Decision Majority', 'No Contest', 'DQ'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Round (opcional)</label>
            <input className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-white" max={5} min={1} placeholder="1–5" type="number" value={round} onChange={e => setRound(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button className="flex-1 rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 hover:border-white/30" type="button" onClick={onCerrar}>Cancelar</button>
            <button className="flex-1 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-50" disabled={guardando} type="button" onClick={guardar}>
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
          <h2 className="m-0 text-3xl font-black text-white">Gestión de peleas</h2>
          <p className="mt-1 text-slate-400">Crea, cambia estados, registra resultados y cancela peleas.</p>
        </div>
        <button
          className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400"
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

      {mensaje && <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{mensaje}</p>}
      {error && <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}
      {cargando && <p className="text-slate-400">Cargando peleas...</p>}
      {!cargando && peleas.length === 0 && <p className="text-slate-400">No hay peleas registradas. Crea una o sincroniza la API.</p>}

      <div className="flex flex-col gap-4">
        {peleas.map(pelea => (
          <div key={pelea.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold text-white">
                  #{pelea.id} · {pelea.peleador_rojo.nombre} <span className="text-slate-400">vs</span> {pelea.peleador_azul.nombre}
                </p>
                <p className="mt-1 text-sm text-slate-400">{pelea.evento} · {pelea.fecha_hora ?? '—'} · {pelea.categoria || 'Sin categoría'}</p>
              </div>
              <span className={badgeEstado(pelea.estado)}>{pelea.estado}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {ESTADOS_PELEA.filter(e => e !== pelea.estado && e !== 'cancelada' && e !== 'finalizada').map(estado => (
                <button key={estado} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 hover:border-white/30 hover:text-white" type="button" onClick={() => cambiarEstado(pelea, estado)}>
                  → {estado}
                </button>
              ))}
              {pelea.estado !== 'finalizada' && pelea.estado !== 'cancelada' && (
                <button className="rounded-full bg-emerald-600/20 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/40" type="button" onClick={() => setModalPelea(pelea)}>
                  Registrar resultado
                </button>
              )}
              {pelea.estado !== 'cancelada' && pelea.estado !== 'finalizada' && (
                <button className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/20" type="button" onClick={() => cancelar(pelea)}>
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
