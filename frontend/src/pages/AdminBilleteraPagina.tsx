import { useEffect, useState } from 'react'

import { TarjetaResumen } from '../components/ui/TarjetaResumen'
import { useAutenticacion } from '../hooks/useAutenticacion'
import { obtenerResumenBilletera, type ResumenBilletera } from '../services/admin'
import { formatearMoneda } from '../utils/formatos'

function badgeEstado(estado: string) {
  const colores: Record<string, string> = {
    pagado: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    pendiente: 'bg-amber-100 text-amber-800 border-amber-200',
    fallido: 'bg-red-100 text-red-800 border-red-200',
  }
  return `inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colores[estado] ?? 'bg-slate-100 text-slate-700 border-slate-200'}`
}

export function AdminBilleteraPagina() {
  const { sesion } = useAutenticacion()
  const token = sesion!.accessToken
  const [resumen, setResumen] = useState<ResumenBilletera | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    obtenerResumenBilletera(token)
      .then(setResumen)
      .catch(() => setError('No se pudo cargar el resumen de billetera.'))
      .finally(() => setCargando(false))
  }, [token])

  return (
    <div className="flex w-full flex-col gap-6">
      <header>
        <h2 className="m-0 text-3xl font-black text-slate-900">Billetera del sistema</h2>
        <p className="mt-2 text-slate-600">Ingresos, egresos y utilidad de la plataforma.</p>
      </header>

      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
          {error}
        </p>
      )}
      {cargando && <p className="text-slate-500">Cargando...</p>}

      {resumen && (
        <>
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <TarjetaResumen
              titulo="Total recargas"
              descripcion="Suma de todas las recargas completadas"
              contenido={<p className="text-3xl font-black text-slate-900">{formatearMoneda(resumen.total_recargas)}</p>}
            />
            <TarjetaResumen
              titulo="Total apostado"
              descripcion="Apuestas con pago confirmado"
              contenido={<p className="text-3xl font-black text-slate-900">{formatearMoneda(resumen.total_apostado)}</p>}
            />
            <TarjetaResumen
              titulo="Ganancias de la casa"
              descripcion="Montos de apuestas perdidas"
              contenido={<p className="text-3xl font-black text-emerald-600">{formatearMoneda(resumen.ganancias_casa)}</p>}
            />
            <TarjetaResumen
              titulo="Pagos a ganadores"
              descripcion="Monto × cuota de apuestas ganadas"
              contenido={<p className="text-3xl font-black text-red-600">{formatearMoneda(resumen.pagos_ganadores)}</p>}
            />
            <TarjetaResumen
              titulo="Utilidad neta"
              descripcion="Ganancias casa − pagos ganadores"
              contenido={
                <p className={`text-3xl font-black ${resumen.utilidad_neta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatearMoneda(resumen.utilidad_neta)}
                </p>
              }
            />
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-lg font-bold text-slate-900">Transacciones recientes</h3>
            {resumen.transacciones_recientes.length === 0 && (
              <p className="text-slate-500 py-4">No hay transacciones registradas.</p>
            )}
            {resumen.transacciones_recientes.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Usuario</th>
                      <th className="px-4 py-3">Monto</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resumen.transacciones_recientes.map(t => (
                      <tr key={t.id} className="text-slate-700 hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 font-medium text-slate-400">{t.id}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">Usuario #{t.usuario_id}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{formatearMoneda(t.monto)}</td>
                        <td className="px-4 py-3"><span className={badgeEstado(t.estado)}>{t.estado}</span></td>
                        <td className="px-4 py-3 text-slate-500">{new Date(t.creado_en).toLocaleString('es-EC')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}