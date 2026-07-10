import { useEffect, useState } from 'react'

import { useAutenticacion } from '../hooks/useAutenticacion'
import { cambiarEstadoApuestaAdmin, listarApuestasAdmin, type ApuestaAdminResumen } from '../services/admin'
import { formatearMoneda } from '../utils/formatos'

const ESTADOS_APUESTA = ['Pendiente', 'Ganada', 'Perdida', 'Cancelada'] as const

function badgeEstado(estado: string) {
  const colores: Record<string, string> = {
    Pendiente: 'bg-yellow-500/20 text-yellow-300',
    Ganada: 'bg-emerald-500/20 text-emerald-300',
    Perdida: 'bg-red-500/20 text-red-300',
    Cancelada: 'bg-slate-500/20 text-slate-400',
  }
  return `inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${colores[estado] ?? 'bg-white/10 text-slate-300'}`
}

export function AdminApuestasPagina() {
  const { sesion } = useAutenticacion()
  const token = sesion!.accessToken
  const [apuestas, setApuestas] = useState<ApuestaAdminResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  function cargar(estado?: string) {
    setCargando(true)
    listarApuestasAdmin(token, estado || undefined)
      .then(setApuestas)
      .catch(() => setError('No se pudo cargar las apuestas.'))
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargar() }, [token])

  function aplicarFiltro(estado: string) {
    setFiltroEstado(estado)
    cargar(estado)
  }

  async function cambiarEstado(apuesta: ApuestaAdminResumen, estado: typeof ESTADOS_APUESTA[number]) {
    try {
      setMensaje('')
      await cambiarEstadoApuestaAdmin(token, apuesta.id, { estado })
      setMensaje(`Apuesta #${apuesta.id} → "${estado}"`)
      cargar(filtroEstado)
    } catch { setError('No se pudo cambiar el estado.') }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <header>
        <h2 className="m-0 text-3xl font-black text-white">Gestión de apuestas</h2>
        <p className="mt-2 text-slate-400">Consulta y ajusta manualmente el estado de las apuestas.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {['', ...ESTADOS_APUESTA].map((estado) => (
          <button
            key={estado || 'todas'}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filtroEstado === estado ? 'bg-red-500 text-white' : 'border border-white/10 text-slate-300 hover:border-white/30'}`}
            type="button"
            onClick={() => aplicarFiltro(estado)}
          >
            {estado || 'Todas'}
          </button>
        ))}
      </div>

      {mensaje && <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{mensaje}</p>}
      {error && <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}
      {cargando && <p className="text-slate-400">Cargando apuestas...</p>}
      {!cargando && apuestas.length === 0 && (
        <p className="text-slate-400">No hay apuestas{filtroEstado ? ` con estado "${filtroEstado}"` : ''}.</p>
      )}

      <div className="flex flex-col gap-4">
        {apuestas.map((apuesta) => (
          <div key={apuesta.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bold text-white">Apuesta #{apuesta.id}</p>
                <p className="mt-1 text-sm text-slate-400">
                  Usuario #{apuesta.usuario_id} · Pelea #{apuesta.pelea_id} · {formatearMoneda(apuesta.monto)} · cuota {apuesta.cuota}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{new Date(apuesta.creado_en).toLocaleString('es-EC')}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={badgeEstado(apuesta.estado)}>{apuesta.estado}</span>
                <span className="text-xs text-slate-500">{apuesta.estado_pago}</span>
              </div>
            </div>
            {apuesta.estado === 'Pendiente' && (
              <div className="mt-3 flex flex-wrap gap-2">
                {ESTADOS_APUESTA.filter((e) => e !== apuesta.estado).map((estado) => (
                  <button
                    key={estado}
                    className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 hover:border-white/30 hover:text-white"
                    type="button"
                    onClick={() => cambiarEstado(apuesta, estado)}
                  >
                    → {estado}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
