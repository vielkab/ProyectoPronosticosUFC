import { useEffect, useState } from 'react'

import { useAutenticacion } from '../hooks/useAutenticacion'
import { listarPrediccionesAdmin, type PrediccionAdminResumen } from '../services/admin'

function badgeAcertada(acertada: boolean | null) {
  if (acertada === null) return <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-xs text-slate-400">Sin resolver</span>
  if (acertada) return <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">✓ Acertó</span>
  return <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-300">✗ Falló</span>
}

export function AdminPrediccionesPagina() {
  const { sesion } = useAutenticacion()
  const token = sesion!.accessToken
  const [predicciones, setPredicciones] = useState<PrediccionAdminResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    listarPrediccionesAdmin(token)
      .then(setPredicciones)
      .catch(() => setError('No se pudieron cargar las predicciones.'))
      .finally(() => setCargando(false))
  }, [token])

  return (
    <div className="flex w-full flex-col gap-6">
      <header>
        <h2 className="m-0 text-3xl font-black text-white">Predicciones generadas</h2>
        <p className="mt-2 text-slate-400">Pronósticos calculados automáticamente al crear cada pelea.</p>
      </header>

      {error && <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-red-100">{error}</p>}
      {cargando && <p className="text-slate-400">Cargando predicciones...</p>}
      {!cargando && predicciones.length === 0 && (
        <p className="text-slate-400">No hay predicciones generadas. Crea peleas para que se calculen automáticamente.</p>
      )}

      {!cargando && predicciones.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">Combate</th>
                <th className="px-4 py-3 text-right">Prob. Rojo</th>
                <th className="px-4 py-3 text-right">Cuota Rojo</th>
                <th className="px-4 py-3 text-right">Prob. Azul</th>
                <th className="px-4 py-3 text-right">Cuota Azul</th>
                <th className="px-4 py-3">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {predicciones.map((p) => (
                <tr key={p.prediccion_id} className="border-b border-white/5 text-slate-200 last:border-0">
                  <td className="px-4 py-3 text-slate-500">{p.prediccion_id}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{p.evento}</p>
                    <p className="text-xs text-slate-500">{p.fecha ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p><span className="text-red-300">{p.peleador_rojo}</span> <span className="text-slate-500">vs</span> <span className="text-blue-300">{p.peleador_azul}</span></p>
                  </td>
                  <td className="px-4 py-3 text-right text-red-300 font-medium">{p.probabilidad_rojo}%</td>
                  <td className="px-4 py-3 text-right font-bold text-white">{p.cuota_rojo ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-blue-300 font-medium">{p.probabilidad_azul}%</td>
                  <td className="px-4 py-3 text-right font-bold text-white">{p.cuota_azul ?? '—'}</td>
                  <td className="px-4 py-3">{badgeAcertada(p.acertada)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!cargando && predicciones.length > 0 && (
        <p className="text-xs text-slate-500">
          Las cuotas se calculan como <code className="rounded bg-white/5 px-1">1 / probabilidad × (1 - 7%)</code>. 
          Si el usuario pide ver el pronóstico, su cuota se reduce un 10% adicional.
        </p>
      )}
    </div>
  )
}
