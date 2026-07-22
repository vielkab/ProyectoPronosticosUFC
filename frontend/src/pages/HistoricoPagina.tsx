import { useEffect, useState } from 'react'

import { TarjetaResumen } from '../components/ui/TarjetaResumen'
import { listarPeleasHistoricas, type PaginaPeleasHistoricas } from '../services/mvp'
import { obtenerMensajeError } from '../utils/errores'

export function HistoricoPagina() {
  const [pagina, setPagina] = useState(1)
  const [resultado, setResultado] = useState<PaginaPeleasHistoricas | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setCargando(true)
    setError('')
    listarPeleasHistoricas(pagina)
      .then(setResultado)
      .catch((causa) => {
        setResultado(null)
        setError(obtenerMensajeError(causa, 'No se pudieron cargar las peleas históricas.'))
      })
      .finally(() => setCargando(false))
  }, [pagina])

  const haySiguiente = resultado ? pagina * resultado.size < resultado.total : false
  return (
    <div className="flex w-full flex-col gap-6">
      <header>
        <h2 className="m-0 text-3xl font-black !text-slate-900">Peleas históricas</h2>
      </header>

      {cargando && <p className="!text-slate-600">Cargando peleas...</p>}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium !text-red-700">{error}</p>
        </div>
      )}

      {resultado && !error && (
        <>
          <TarjetaResumen
            titulo="Resultados recientes"
            descripcion={`${resultado.total} peleas registradas`}
            contenido={
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 !text-slate-500">
                    <tr>
                      <th className="pb-3 pr-4 font-semibold">Fecha</th>
                      <th className="pb-3 pr-4 font-semibold">Peleador 1</th>
                      <th className="pb-3 pr-4 font-semibold">Peleador 2</th>
                      <th className="pb-3 font-semibold">Ganador</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 !text-slate-800">
                    {resultado.items.map((pelea, indice) => (
                      <tr key={`${pelea.fecha}-${pelea.peleador_1}-${indice}`} className="transition hover:bg-slate-50/80">
                        <td className="py-3 pr-4 !text-slate-600">{pelea.fecha}</td>
                        <td className="py-3 pr-4">{pelea.peleador_1}</td>
                        <td className="py-3 pr-4">{pelea.peleador_2}</td>
                        <td className="py-3 font-semibold !text-red-700">{pelea.ganador}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            }
          />

          <div className="flex items-center gap-3">
            <button
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold !text-slate-700 shadow-sm transition hover:border-red-700 hover:!text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={pagina === 1 || cargando}
              onClick={() => setPagina((actual) => actual - 1)}
              type="button"
            >
              Anterior
            </button>
            <span className="text-sm font-medium !text-slate-600">Página {pagina}</span>
            <button
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold !text-slate-700 shadow-sm transition hover:border-red-700 hover:!text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!haySiguiente || cargando}
              onClick={() => setPagina((actual) => actual + 1)}
              type="button"
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </div>
  )
}