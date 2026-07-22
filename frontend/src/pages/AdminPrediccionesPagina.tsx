import { useEffect, useState } from 'react'

import { useAutenticacion } from '../hooks/useAutenticacion'
import { listarPrediccionesAdmin, type PrediccionAdminResumen } from '../services/admin'

function badgeAcertada(acertada: boolean | null) {
  if (acertada === null) {
    return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">Sin resolver</span>
  }
  if (acertada) {
    return <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">✓ Acertó</span>
  }
  return <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">✗ Falló</span>
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
        <h2 className="m-0 text-3xl font-black !text-slate-900">Predicciones generadas</h2>
        <p className="mt-2 !text-slate-600">Pronósticos calculados automáticamente al crear cada pelea.</p>
      </header>

      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium !text-red-700">
          {error}
        </p>
      )}

      {cargando && (
        <div className="flex items-center gap-3 text-slate-500 py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-700 border-t-transparent"></div>
          <span>Cargando predicciones...</span>
        </div>
      )}

      {!cargando && predicciones.length === 0 && (
        <p className="!text-slate-500 text-center py-8">
          No hay predicciones generadas. Crea peleas para que se calculen automáticamente.
        </p>
      )}

      {!cargando && predicciones.length > 0 && (
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider !text-slate-500">
                  <th className="px-4 py-3.5">#</th>
                  <th className="px-4 py-3.5">Evento</th>
                  <th className="px-4 py-3.5">Combate</th>
                  <th className="px-4 py-3.5 text-right">Prob. Rojo</th>
                  <th className="px-4 py-3.5 text-right">Cuota Rojo</th>
                  <th className="px-4 py-3.5 text-right">Prob. Azul</th>
                  <th className="px-4 py-3.5 text-right">Cuota Azul</th>
                  <th className="px-4 py-3.5">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 !text-slate-700">
                {predicciones.map((p) => (
                  <tr key={p.prediccion_id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3.5 font-mono text-xs !text-slate-400">{p.prediccion_id}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold !text-slate-900">{p.evento}</p>
                      <p className="text-xs !text-slate-500">{p.fecha ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3.5 font-medium">
                      <p>
                        <span className="!text-red-700 font-semibold">{p.peleador_rojo}</span>{' '}
                        <span className="!text-slate-400 font-normal">vs</span>{' '}
                        <span className="!text-blue-700 font-semibold">{p.peleador_azul}</span>
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold !text-red-700">
                      {p.probabilidad_rojo}%
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold !text-slate-900">
                      {p.cuota_rojo ?? '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold !text-blue-700">
                      {p.probabilidad_azul}%
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold !text-slate-900">
                      {p.cuota_azul ?? '—'}
                    </td>
                    <td className="px-4 py-3.5">{badgeAcertada(p.acertada)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!cargando && predicciones.length > 0 && (
        <p className="text-xs !text-slate-500 leading-relaxed">
          Las cuotas se calculan como <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700 border border-slate-200">1 / probabilidad × (1 - 7%)</code>. 
          Si el usuario pide ver el pronóstico, su cuota se reduce un 10% adicional.
        </p>
      )}
    </div>
  )
}