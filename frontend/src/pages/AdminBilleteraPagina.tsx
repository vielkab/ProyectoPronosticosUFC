import { useEffect, useState } from 'react'

import { TarjetaResumen } from '../components/ui/TarjetaResumen'
import { useAutenticacion } from '../hooks/useAutenticacion'
import { obtenerResumenBilletera, type ResumenBilletera } from '../services/admin'
import { formatearMoneda } from '../utils/formatos'

function badgeEstado(estado: string) {
  const colores: Record<string, string> = {
    pagado: 'bg-emerald-500/20 text-emerald-300',
    pendiente: 'bg-yellow-500/20 text-yellow-300',
    fallido: 'bg-red-500/20 text-red-300',
  }
  return `inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${colores[estado] ?? 'bg-white/10 text-slate-300'}`
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
        <h2 className="m-0 text-3xl font-black text-white">Billetera del sistema</h2>
        <p className="mt-2 text-slate-400">Ingresos, egresos y utilidad de la plataforma.</p>
      </header>

      {error && <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-red-100">{error}</p>}
      {cargando && <p className="text-slate-400">Cargando...</p>}

      {resumen && (
        <>
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <TarjetaResumen
              titulo="Total recargas"
              descripcion="Suma de todas las recargas completadas"
              contenido={<p className="text-3xl font-black text-white">{formatearMoneda(resumen.total_recargas)}</p>}
            />
            <TarjetaResumen
              titulo="Total apostado"
              descripcion="Apuestas con pago confirmado"
              contenido={<p className="text-3xl font-black text-white">{formatearMoneda(resumen.total_apostado)}</p>}
            />
            <TarjetaResumen
              titulo="Ganancias de la casa"
              descripcion="Montos de apuestas perdidas"
              contenido={<p className="text-3xl font-black text-emerald-400">{formatearMoneda(resumen.ganancias_casa)}</p>}
            />
            <TarjetaResumen
              titulo="Pagos a ganadores"
              descripcion="Monto × cuota de apuestas ganadas"
              contenido={<p className="text-3xl font-black text-red-400">{formatearMoneda(resumen.pagos_ganadores)}</p>}
            />
            <TarjetaResumen
              titulo="Utilidad neta"
              descripcion="Ganancias casa − pagos ganadores"
              contenido={
                <p className={`text-3xl font-black ${resumen.utilidad_neta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatearMoneda(resumen.utilidad_neta)}
                </p>
              }
            />
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-lg font-bold text-white">Transacciones recientes</h3>
            {resumen.transacciones_recientes.length === 0 && (
              <p className="text-slate-400">No hay transacciones registradas.</p>
            )}
            {resumen.transacciones_recientes.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Usuario</th>
                      <th className="px-4 py-3">Monto</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.transacciones_recientes.map(t => (
                      <tr key={t.id} className="border-b border-white/5 text-slate-200 last:border-0">
                        <td className="px-4 py-3 text-slate-500">{t.id}</td>
                        <td className="px-4 py-3">Usuario #{t.usuario_id}</td>
                        <td className="px-4 py-3 font-medium text-white">{formatearMoneda(t.monto)}</td>
                        <td className="px-4 py-3"><span className={badgeEstado(t.estado)}>{t.estado}</span></td>
                        <td className="px-4 py-3 text-slate-400">{new Date(t.creado_en).toLocaleString('es-EC')}</td>
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
