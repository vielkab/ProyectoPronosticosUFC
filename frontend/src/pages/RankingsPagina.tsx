import { useEffect, useState } from 'react'

import { TarjetaResumen } from '../components/ui/TarjetaResumen'
import { obtenerRankings, type RankingHistorico } from '../services/mvp'
import { obtenerMensajeError } from '../utils/errores'

const DIVISIONES = [
  'Flyweight', 'Bantamweight', 'Featherweight', 'Lightweight', 'Welterweight',
  'Middleweight', 'Light Heavyweight', 'Heavyweight', "Women's Strawweight",
  "Women's Flyweight", "Women's Bantamweight",
]

export function RankingsPagina() {
  const [division, setDivision] = useState('Lightweight')
  const [rankings, setRankings] = useState<RankingHistorico[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setCargando(true)
    setError('')
    obtenerRankings(division)
      .then(setRankings)
      .catch((causa) => {
        setRankings([])
        setError(obtenerMensajeError(causa, 'No se pudieron cargar los rankings.'))
      })
      .finally(() => setCargando(false))
  }, [division])

  return (
    <div className="flex w-full flex-col gap-6">
      <header>
        <h2 className="m-0 text-3xl font-black !text-slate-900">Rankings históricos</h2>
        <p className="mt-2 text-sm !text-slate-600">
          Consulta la clasificación oficial de peleadores por división.
        </p>
      </header>

      {/* Selector de división */}
      <div className="max-w-sm">
        <select
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold !text-slate-900 shadow-sm outline-none transition focus:border-red-700 focus:ring-1 focus:ring-red-700 cursor-pointer"
          value={division}
          onChange={(event) => setDivision(event.target.value)}
        >
          {DIVISIONES.map((opcion) => (
            <option className="bg-white !text-slate-900 font-medium" key={opcion} value={opcion}>
              {opcion}
            </option>
          ))}
        </select>
      </div>

      {cargando && <p className="!text-slate-600 font-medium">Cargando ranking...</p>}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium !text-red-700">{error}</p>
        </div>
      )}

      {!cargando && !error && (
        <TarjetaResumen
          titulo={division}
          descripcion="Ranking más reciente disponible"
          contenido={
            <div className="overflow-x-auto">
              <table className="w-full text-left !text-slate-800">
                <thead className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider !text-slate-500">
                  <tr>
                    <th className="pb-3 w-20">Rank</th>
                    <th className="pb-3">Fighter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {rankings.map((item) => (
                    <tr className="transition hover:bg-slate-50/80" key={item.rank}>
                      <td className="py-3 font-bold !text-red-700">
                        {item.rank === 0 || item.rank === 'C' ? '👑 C' : `#${item.rank}`}
                      </td>
                      <td className="py-3 font-semibold !text-slate-900">{item.fighter}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        />
      )}
    </div>
  )
}