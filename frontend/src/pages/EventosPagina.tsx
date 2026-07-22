import { useEffect, useState } from 'react'

import { TarjetaResumen } from '../components/ui/TarjetaResumen'
import { listarPeleasCartelera, type PeleaCarteleraResumen } from '../services/mvp'
import { obtenerMensajeError } from '../utils/errores'

export function EventosPagina() {
  const [peleas, setPeleas] = useState<PeleaCarteleraResumen[]>([])
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setCargando(true)
    setError('')

    listarPeleasCartelera({ desde, hasta })
      .then(setPeleas)
      .catch((error) => {
        setPeleas([])
        setError(obtenerMensajeError(error, 'No se pudieron cargar las peleas desde la base de datos.'))
      })
      .finally(() => setCargando(false))
  }, [desde, hasta])

  return (
    <div className="flex w-full flex-col gap-6">
      <header>
        <h2 className="m-0 text-3xl font-black !text-slate-900">Carteleras UFC</h2>
        <p className="mt-3 max-w-2xl !text-slate-600">
          Solo se muestran peleas programadas o en curso. Las peleas con resultado están disponibles en el histórico.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-2 text-sm font-semibold !text-slate-700">
          Desde
          <input
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 !text-slate-900 shadow-sm outline-none transition focus:border-red-700 focus:ring-1 focus:ring-red-700"
            type="date"
            value={desde}
            onChange={(event) => setDesde(event.target.value)}
          />
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-2 text-sm font-semibold !text-slate-700">
          Hasta
          <input
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 !text-slate-900 shadow-sm outline-none transition focus:border-red-700 focus:ring-1 focus:ring-red-700"
            type="date"
            value={hasta}
            onChange={(event) => setHasta(event.target.value)}
          />
        </label>
        <button
          className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold !text-slate-700 shadow-sm transition hover:border-red-700 hover:!text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!desde && !hasta}
          type="button"
          onClick={() => {
            setDesde('')
            setHasta('')
          }}
        >
          Limpiar rango
        </button>
      </div>

      {cargando && <p className="!text-slate-600">Cargando peleas...</p>}
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 !text-red-700">{error}</p>}
      {!cargando && !error && peleas.length === 0 && (
        <p className="!text-slate-600">
          {desde || hasta ? 'No hay peleas para el rango seleccionado.' : 'No hay peleas próximas disponibles.'}
        </p>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        {peleas.map((pelea) => (
          <TarjetaResumen
            key={pelea.id}
            titulo={`${pelea.peleador_rojo_nombre} vs ${pelea.peleador_azul_nombre}`}
            descripcion={`${new Date(`${pelea.fecha}T00:00:00`).toLocaleDateString()} · ${pelea.evento_nombre}`}
            contenido={
              <div className="space-y-3">
                <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-medium !text-slate-800">
                  Pelea #{pelea.orden} · {pelea.division || 'División por confirmar'}
                </p>
                <p className="text-sm !text-slate-600">
                  {pelea.sede || 'Sede por confirmar'} · {pelea.estado_evento}
                </p>
              </div>
            }
          />
        ))}
      </section>
    </div>
  )
}