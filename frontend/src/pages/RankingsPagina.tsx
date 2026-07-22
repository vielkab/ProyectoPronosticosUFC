import { useEffect, useState } from 'react'

import { TarjetaResumen } from '../components/ui/TarjetaResumen'
import { obtenerRankings, type RankingHistorico } from '../services/mvp'
import { obtenerMensajeError } from '../utils/errores'

const DIVISIONES = [
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
]

export function RankingsPagina() {
  const [division, setDivision] = useState('Lightweight')
  const [rankings, setRankings] = useState<RankingHistorico[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignorarRespuesta = false

    setCargando(true)
    setError('')

    obtenerRankings(division)
      .then((datos) => {
        // Solo actualizamos el estado si el componente no ha cambiado de división
        if (!ignorarRespuesta) {
          setRankings(datos)
        }
      })
      .catch((causa) => {
        if (!ignorarRespuesta) {
          setRankings([])
          setError(obtenerMensajeError(causa, 'No se pudieron cargar los rankings.'))
        }
      })
      .finally(() => {
        if (!ignorarRespuesta) {
          setCargando(false)
        }
      })

    // Limpieza: si la división cambia antes de resolver la promesa, ignoramos la anterior
    return () => {
      ignorarRespuesta = true
    }
  }, [division])

  return (
    <div className="flex w-full flex-col gap-6">
      <header>
        <h2 className="m-0 text-3xl font-black text-white">Rankings históricos</h2>
      </header>

      <select
        className="max-w-sm rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-red-400"
        value={division}
        onChange={(event) => setDivision(event.target.value)}
      >
        {DIVISIONES.map((opcion) => (
          <option className="bg-slate-950" key={opcion} value={opcion}>
            {opcion}
          </option>
        ))}
      </select>

      {cargando && <p className="text-slate-300">Cargando ranking...</p>}

      {error && (
        <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-red-100">
          {error}
        </p>
      )}

      {!cargando && !error && rankings.length === 0 && (
        <p className="text-slate-400">No hay datos de ranking disponibles para esta división.</p>
      )}

      {!cargando && !error && rankings.length > 0 && (
        <TarjetaResumen
          titulo={division}
          descripcion="Ranking más reciente disponible"
          contenido={
            <table className="w-full text-left text-slate-200">
              <thead className="border-b border-white/10 text-sm text-slate-400">
                <tr>
                  <th className="pb-3">Rank</th>
                  <th className="pb-3">Fighter</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((item) => (
                  <tr className="border-b border-white/5" key={item.rank}>
                    <td className="py-3 font-bold">{item.rank}</td>
                    <td className="py-3">{item.fighter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        />
      )}
    </div>
  )
}