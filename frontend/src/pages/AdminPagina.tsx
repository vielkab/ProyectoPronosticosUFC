import { useEffect, useState } from 'react'

import { TarjetaResumen } from '../components/ui/TarjetaResumen'
import { useAutenticacion } from '../hooks/useAutenticacion'
import { obtenerResumenAdmin, sincronizarDatosAdmin, type ResumenAdmin } from '../services/admin'
import { formatearMoneda } from '../utils/formatos'

export function AdminPagina() {
  const { sesion } = useAutenticacion()
  const token = sesion!.accessToken
  const [resumen, setResumen] = useState<ResumenAdmin | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [sincronizando, setSincronizando] = useState(false)

  useEffect(() => {
    obtenerResumenAdmin(token)
      .then(setResumen)
      .catch(() => setError('No se pudo cargar el resumen.'))
  }, [token])

  async function sincronizar() {
    try {
      setSincronizando(true)
      setError('')
      const resultado = await sincronizarDatosAdmin(token)
      const resumenActualizado = await obtenerResumenAdmin(token)
      setResumen(resumenActualizado)
      setMensaje(
        `Sincronización desde ${resultado.fuente}: ${resultado.eventos} eventos, ${resultado.peleas} peleas, ${resultado.peleadores} peleadores.`,
      )
    } catch {
      setError('No se pudo sincronizar la información externa.')
    } finally {
      setSincronizando(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <header>
        <h2 className="m-0 text-3xl font-black text-slate-900">Resumen operativo</h2>
        <p className="mt-2 text-slate-600">Métricas del MVP y sincronización de datos MMA.</p>
      </header>

      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={sincronizando}
          type="button"
          onClick={sincronizar}
        >
          {sincronizando ? 'Sincronizando...' : 'Sincronizar API MMA'}
        </button>
      </div>

      {mensaje && (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          {mensaje}
        </p>
      )}

      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
          {error}
        </p>
      )}

      {resumen && (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <TarjetaResumen
            titulo="Usuarios"
            descripcion="Cuentas registradas"
            contenido={<p className="text-4xl font-black text-slate-900">{resumen.usuarios}</p>}
          />
          <TarjetaResumen
            titulo="Eventos"
            descripcion="Carteleras registradas"
            contenido={<p className="text-4xl font-black text-slate-900">{resumen.eventos}</p>}
          />
          <TarjetaResumen
            titulo="Apuestas"
            descripcion="Apuestas totales"
            contenido={<p className="text-4xl font-black text-slate-900">{resumen.apuestas}</p>}
          />
          <TarjetaResumen
            titulo="Ingresos"
            descripcion="Pagos confirmados"
            contenido={<p className="text-4xl font-black text-slate-900">{formatearMoneda(resumen.ingresos)}</p>}
          />
          <TarjetaResumen
            titulo="Predicciones"
            descripcion="Cálculos generados"
            contenido={<p className="text-4xl font-black text-slate-900">{resumen.predicciones}</p>}
          />
          <TarjetaResumen
            titulo="Precisión"
            descripcion={`${resumen.aciertos} aciertos · ${resumen.errores} errores`}
            contenido={<p className="text-4xl font-black text-slate-900">{resumen.precision}%</p>}
          />
        </section>
      )}
    </div>
  )
}