import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { TarjetaResumen } from '../components/ui/TarjetaResumen'
import { useAutenticacion } from '../hooks/useAutenticacion'
import { listarHistorialApuestas, type ApuestaResumen } from '../services/mvp'
import { esErrorAutorizacion } from '../utils/errores'
import { formatearMoneda } from '../utils/formatos'

export function BilleteraPagina() {
  const { autenticado, sesion, cerrarSesion } = useAutenticacion()
  const [apuestas, setApuestas] = useState<ApuestaResumen[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sesion?.accessToken) {
      return
    }

    listarHistorialApuestas(sesion.accessToken)
      .then(setApuestas)
      .catch((error) => {
        if (esErrorAutorizacion(error)) {
          cerrarSesion()
          setError('Tu sesión expiró. Inicia sesión nuevamente.')
          return
        }

        setError('No se pudieron cargar los movimientos.')
      })
  }, [cerrarSesion, sesion?.accessToken])

  const pagado = useMemo(
    () => apuestas.filter((apuesta) => apuesta.estado_pago === 'pagado').reduce((total, apuesta) => total + apuesta.monto, 0),
    [apuestas],
  )
  const pendiente = useMemo(
    () => apuestas.filter((apuesta) => apuesta.estado_pago !== 'pagado').reduce((total, apuesta) => total + apuesta.monto, 0),
    [apuestas],
  )

  return (
    <div className="grid w-full gap-6 lg:grid-cols-2">
      <TarjetaResumen
        titulo="Pagos confirmados"
        descripcion="Total registrado por webhooks de Stripe Test Mode."
        contenido={<p className="text-4xl font-black text-white">{formatearMoneda(pagado)}</p>}
      />
      <TarjetaResumen
        titulo="Pagos pendientes"
        descripcion="Apuestas creadas que aún no tienen pago confirmado."
        contenido={<p className="text-4xl font-black text-white">{formatearMoneda(pendiente)}</p>}
      />
      <TarjetaResumen
        titulo="Stripe sandbox"
        descripcion="Checkout se inicia desde cada predicción apostable."
        contenido={
          <div className="space-y-3 text-slate-200">
            {!autenticado && (
              <Link className="inline-flex rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400" to="/iniciar-sesion">
                Iniciar sesión
              </Link>
            )}
            {error && <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-red-100">{error}</p>}
            <p>Usa tarjetas de prueba de Stripe; el sistema no procesa pagos reales.</p>
          </div>
        }
      />
    </div>
  )
}
