import { useEffect, useState } from 'react'

import { useAutenticacion } from '../hooks/useAutenticacion'
import { cambiarEstadoApuestaAdmin, listarApuestasAdmin, type ApuestaAdminResumen } from '../services/admin'
import { formatearMoneda } from '../utils/formatos'

const ESTADOS_APUESTA = ['Pendiente', 'Ganada', 'Perdida', 'Cancelada'] as const

function badgeEstado(estado: string) {
  const colores: Record<string, string> = {
    Pendiente: 'bg-amber-100 text-amber-800 border-amber-200',
    Ganada: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Perdida: 'bg-red-100 text-red-800 border-red-200',
    Cancelada: 'bg-slate-100 text-slate-700 border-slate-200',
  }
  return `inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colores[estado] ?? 'bg-slate-100 text-slate-700 border-slate-200'}`
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
        <h2 className="m-0 text-3xl font-black text-slate-900">Gestión de apuestas</h2>
        <p className="mt-2 text-slate-600">Consulta y ajusta manualmente el estado de las apuestas.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {['', ...ESTADOS_APUESTA].map((estado) => (
          <button
            key={estado || 'todas'}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              filtroEstado === estado
                ? 'bg-red-600 text-white shadow-sm'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            type="button"
            onClick={() => aplicarFiltro(estado)}
          >
            {estado || 'Todas'}
          </button>
        ))}
      </div>

      {mensaje && (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
          {mensaje}
        </p>
      )}

      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
          {error}
        </p>
      )}

      {cargando && <p className="text-slate-500">Cargando apuestas...</p>}

      {!cargando && apuestas.length === 0 && (
        <p className="text-slate-500 py-4">No hay apuestas{filtroEstado ? ` con estado "${filtroEstado}"` : ''}.</p>
      )}

      <div className="flex flex-col gap-4">
        {apuestas.map((apuesta) => (
          <div key={apuesta.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bold text-slate-900">Apuesta #{apuesta.id}</p>
                <p className="mt-1 text-sm font-medium text-slate-600">
                  Usuario #{apuesta.usuario_id} · Pelea #{apuesta.pelea_id} · <span className="font-bold text-slate-900">{formatearMoneda(apuesta.monto)}</span> · cuota {apuesta.cuota}
                </p>
                <p className="mt-0.5 text-xs font-medium text-slate-400">{new Date(apuesta.creado_en).toLocaleString('es-EC')}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={badgeEstado(apuesta.estado)}>{apuesta.estado}</span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
                  {apuesta.estado_pago}
                </span>
              </div>
            </div>

            {apuesta.estado === 'Pendiente' && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                {ESTADOS_APUESTA.filter((e) => e !== apuesta.estado).map((estado) => (
                  <button
                    key={estado}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
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