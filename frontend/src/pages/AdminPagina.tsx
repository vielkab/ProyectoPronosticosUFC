import { useEffect, useState } from 'react'

import { TarjetaResumen } from '../components/ui/TarjetaResumen'
import { obtenerResumenAdmin, sincronizarDatosAdmin, type ResumenAdmin } from '../services/mvp'
import { formatearMoneda } from '../utils/formatos'

export function AdminPagina() {
  const [resumen, setResumen] = useState<ResumenAdmin | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [sincronizando, setSincronizando] = useState(false)

  useEffect(() => {
    obtenerResumenAdmin()
      .then(setResumen)
      .catch(() => setError('No se pudo cargar el resumen administrativo.'))
  }, [])

  async function sincronizar() {
    try {
      setSincronizando(true)
      setError('')
      const resultado = await sincronizarDatosAdmin()
      const resumenActualizado = await obtenerResumenAdmin()
      setResumen(resumenActualizado)
      setMensaje(`Sincronización completada desde ${resultado.fuente}: ${resultado.eventos} eventos, ${resultado.peleas} peleas y ${resultado.peleadores} peleadores.`)
    } catch {
      setError('No se pudo sincronizar la información externa.')
    } finally {
      setSincronizando(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <header>
        <h2 className="m-0 text-3xl font-black text-white">Dashboard administrador</h2>
        <p className="mt-3 max-w-2xl text-slate-300">Métricas operativas del MVP y sincronización de información MMA.</p>
      </header>

      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={sincronizando}
          type="button"
          onClick={sincronizar}
        >
          {sincronizando ? 'Sincronizando...' : 'Sincronizar API MMA'}
        </button>
      </div>

      {mensaje && <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4 text-emerald-100">{mensaje}</p>}
      {error && <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-red-100">{error}</p>}

      {resumen && (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <TarjetaResumen titulo="Usuarios" descripcion="Cuentas registradas" contenido={<p className="text-4xl font-black text-white">{resumen.usuarios}</p>} />
          <TarjetaResumen titulo="Eventos" descripcion="Carteleras registradas" contenido={<p className="text-4xl font-black text-white">{resumen.eventos}</p>} />
          <TarjetaResumen titulo="Apuestas" descripcion="Apuestas totales" contenido={<p className="text-4xl font-black text-white">{resumen.apuestas}</p>} />
          <TarjetaResumen titulo="Ingresos" descripcion="Pagos confirmados" contenido={<p className="text-4xl font-black text-white">{formatearMoneda(resumen.ingresos)}</p>} />
          <TarjetaResumen titulo="Predicciones" descripcion="Cálculos generados" contenido={<p className="text-4xl font-black text-white">{resumen.predicciones}</p>} />
          <TarjetaResumen titulo="Precisión" descripcion={`${resumen.aciertos} aciertos · ${resumen.errores} errores`} contenido={<p className="text-4xl font-black text-white">{resumen.precision}%</p>} />
        </section>
      )}
    </div>
  )
}
