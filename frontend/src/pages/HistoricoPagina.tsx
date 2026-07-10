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
      <header><h2 className="m-0 text-3xl font-black text-white">Peleas históricas</h2></header>
      {cargando && <p className="text-slate-300">Cargando peleas...</p>}
      {error && <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-red-100">{error}</p>}
      {resultado && !error && (
        <>
          <TarjetaResumen titulo="Resultados recientes" descripcion={`${resultado.total} peleas registradas`} contenido={
            <div className="overflow-x-auto"><table className="min-w-full text-left text-slate-200">
              <thead className="border-b border-white/10 text-sm text-slate-400"><tr><th className="pb-3 pr-4">Fecha</th><th className="pb-3 pr-4">Peleador 1</th><th className="pb-3 pr-4">Peleador 2</th><th className="pb-3">Ganador</th></tr></thead>
              <tbody>{resultado.items.map((pelea, indice) => <tr className="border-b border-white/5" key={`${pelea.fecha}-${pelea.peleador_1}-${indice}`}><td className="py-3 pr-4">{pelea.fecha}</td><td className="py-3 pr-4">{pelea.peleador_1}</td><td className="py-3 pr-4">{pelea.peleador_2}</td><td className="py-3 font-semibold">{pelea.ganador}</td></tr>)}</tbody>
            </table></div>
          } />
          <div className="flex items-center gap-3"><button className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40" disabled={pagina === 1 || cargando} onClick={() => setPagina((actual) => actual - 1)} type="button">Anterior</button><span className="text-slate-300">Página {pagina}</span><button className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40" disabled={!haySiguiente || cargando} onClick={() => setPagina((actual) => actual + 1)} type="button">Siguiente</button></div>
        </>
      )}
    </div>
  )
}
