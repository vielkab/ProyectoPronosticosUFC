import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useAutenticacion } from '../hooks/useAutenticacion'
import { obtenerBilletera, iniciarRecarga, confirmarRecarga, type RecargaHistorial } from '../services/billetera'
import { obtenerMiPerfil, type PerfilUsuario } from '../services/auth'
import { esErrorAutorizacion } from '../utils/errores'
import { formatearMoneda } from '../utils/formatos'

export function BilleteraPagina() {
  const { autenticado, sesion, cerrarSesion } = useAutenticacion()
  const [searchParams, setSearchParams] = useSearchParams()

  // Estados de la billetera
  const [saldo, setSaldo] = useState<number>(0)
  const [moneda, setMoneda] = useState<string>('USD')
  const [recientes, setRecientes] = useState<RecargaHistorial[]>([])
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null)

  // Estados de carga y error
  const [cargando, setCargando] = useState(true)
  const [procesandoConfirmacion, setProcesandoConfirmacion] = useState(false)
  const [error, setError] = useState('')
  const [mensajeExito, setMensajeExito] = useState('')

  // Estados del formulario de recarga
  const [montoRecarga, setMontoRecarga] = useState<number>(20)
  const [customMonto, setCustomMonto] = useState<string>('')
  const [procesandoRecarga, setProcesandoRecarga] = useState(false)

  // Cargar datos iniciales de Billetera y Perfil
  useEffect(() => {
    if (!sesion?.accessToken) {
      setCargando(false)
      return
    }

    const cargarDatos = async () => {
      try {
        const datosBilletera = await obtenerBilletera(sesion.accessToken)
        setSaldo(datosBilletera.saldo)
        setMoneda(datosBilletera.moneda)
        setRecientes(datosBilletera.recientes || [])

        const datosPerfil = await obtenerMiPerfil(sesion.accessToken)
        setPerfil(datosPerfil)
      } catch (err) {
        if (esErrorAutorizacion(err)) {
          cerrarSesion()
          setError('Tu sesión expiró. Inicia sesión nuevamente.')
        } else {
          setError('No se pudo cargar la información de tu billetera.')
        }
      } finally {
        setCargando(false)
      }
    }

    cargarDatos()
  }, [cerrarSesion, sesion?.accessToken])

  // Confirmar sesión de Stripe Checkout automáticamente al retornar
  useEffect(() => {
    const status = searchParams.get('stripe')
    const sessionId = searchParams.get('session_id')

    if (!sesion?.accessToken || procesandoConfirmacion) {
      return
    }

    const confirmarPagoStripe = async () => {
      if (status === 'success' && sessionId) {
        setProcesandoConfirmacion(true)
        setError('')
        setMensajeExito('Confirmando recarga con Stripe...')

        try {
          // Llamar al backend para validar la sesión y acreditar créditos
          const datosActualizados = await confirmarRecarga(sesion.accessToken, sessionId)
          setSaldo(datosActualizados.saldo)
          setRecientes(datosActualizados.recientes || [])
          setMensajeExito('¡Recarga acreditada con éxito! Tus créditos virtuales ya están disponibles.')
        } catch (err: any) {
          setError(err.response?.data?.detail || 'Error al validar la transacción de Stripe. Contacta a soporte.')
          setMensajeExito('')
        } finally {
          setProcesandoConfirmacion(false)
          // Limpiar parámetros de búsqueda
          searchParams.delete('stripe')
          searchParams.delete('session_id')
          setSearchParams(searchParams)
        }
      } else if (status === 'cancel') {
        setError('El pago con Stripe fue cancelado.')
        searchParams.delete('stripe')
        setSearchParams(searchParams)
      }
    }

    confirmarPagoStripe()
  }, [searchParams, setSearchParams, sesion?.accessToken, procesandoConfirmacion])

  const manejarMontoPredefinido = (valor: number) => {
    setMontoRecarga(valor)
    setCustomMonto('')
  }

  const manejarMontoCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setCustomMonto(val)
    const num = parseFloat(val)
    if (!isNaN(num) && num > 0) {
      setMontoRecarga(num)
    }
  }

  const iniciarPagoStripe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sesion?.accessToken) {
      setError('Debes iniciar sesión para recargar créditos.')
      return
    }

    if (montoRecarga <= 0) {
      setError('El monto de recarga debe ser mayor a cero.')
      return
    }

    setError('')
    setMensajeExito('')
    setProcesandoRecarga(true)

    try {
      const respuesta = await iniciarRecarga(sesion.accessToken, montoRecarga)
      if (respuesta.checkout_url) {
        // Redirigir a Stripe Sandbox
        window.location.href = respuesta.checkout_url
      } else {
        setError('No se pudo inicializar la pasarela de Stripe Checkout.')
      }
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Ocurrió un error al procesar tu recarga. Revisa la consola o configuración de variables.'
      )
    } finally {
      setProcesandoRecarga(false)
    }
  }

  if (cargando) {
    return (
      <div className="flex min-h-[400px] w-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-red-700 border-t-transparent"></div>
      </div>
    )
  }

  if (!autenticado) {
    return (
      <div className="mx-auto max-w-lg rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-2xl font-black !text-slate-900">Mi Billetera</h2>
        <p className="mt-4 !text-slate-600">
          Debes iniciar sesión para poder gestionar tu saldo de créditos virtuales y realizar recargas.
        </p>
        <div className="mt-6">
          <Link
            className="inline-block rounded-2xl bg-red-700 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-red-800"
            to="/iniciar-sesion"
          >
            Iniciar Sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-black !text-slate-900">Mi Billetera Virtual</h1>
        <p className="text-sm !text-slate-600">Gestiona tu saldo de créditos para realizar pronósticos de eventos UFC.</p>
      </div>

      {mensajeExito && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold !text-emerald-800 animate-pulse">
          {mensajeExito}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium !text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Columna Izquierda: Información de Saldo y Verificación */}
        <div className="space-y-6 lg:col-span-5">
          {/* Tarjeta de Saldo */}
          <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-900 p-8 text-white shadow-md">
            {/* Efecto de resplandor */}
            <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-red-600/20 blur-[50px]"></div>

            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Saldo Disponible</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-5xl font-black tracking-tight text-white bg-gradient-to-r from-red-400 to-amber-400 bg-clip-text text-transparent">
                {formatearMoneda(saldo)}
              </span>
              <span className="text-sm font-bold text-slate-400">{moneda}</span>
            </div>
            <p className="mt-4 text-xs text-slate-400">Créditos Recargados.</p>
          </div>

          {/* Tarjeta de Verificación de Identidad */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold !text-slate-900 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                ✓
              </span>
              Verificación de Identidad (18+)
            </h3>
            <p className="mt-2 text-xs !text-slate-600">
              Datos registrados requeridos por regulaciones de juego responsable.
            </p>

            <div className="mt-4 space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm !text-slate-700">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="!text-slate-500">Cédula / Identificación:</span>
                <span className="font-semibold !text-slate-900">{perfil?.cedula || 'No registrada'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="!text-slate-500">Fecha de Nacimiento:</span>
                <span className="font-semibold !text-slate-900">
                  {perfil?.fecha_nacimiento
                    ? new Date(perfil.fecha_nacimiento).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'No registrada'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="!text-slate-500">Declaración Jurada Edad:</span>
                <span className="font-semibold !text-emerald-700">Confirmada (18+)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Recarga y Historial Reciente */}
        <div className="space-y-6 lg:col-span-7">
          {/* Panel de Recarga */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-bold !text-slate-900">Recargar Créditos</h2>
            <p className="text-sm !text-slate-600 mt-1">Elige un monto para iniciar tu pago en Stripe Sandbox.</p>

            <form onSubmit={iniciarPagoStripe} className="mt-6 space-y-6">
              {/* Selección de Monto */}
              <div>
                <label className="text-sm font-semibold !text-slate-700">Monto de la recarga</label>
                <div className="mt-3 grid grid-cols-4 gap-3">
                  {[10, 20, 50, 100].map((valor) => (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => manejarMontoPredefinido(valor)}
                      className={`rounded-2xl py-3 font-bold transition ${
                        montoRecarga === valor && !customMonto
                          ? 'bg-red-700 text-white shadow-md shadow-red-700/20'
                          : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      ${valor}
                    </button>
                  ))}
                </div>

                <div className="mt-4">
                  <span className="text-xs !text-slate-500 block mb-2">O ingresa un monto personalizado (USD)</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={customMonto}
                    onChange={manejarMontoCustomChange}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 !text-slate-900 shadow-sm outline-none transition focus:border-red-700 focus:ring-1 focus:ring-red-700 placeholder:text-slate-400"
                    placeholder="Monto personalizado"
                  />
                </div>
              </div>

              {/* Botón de Envío */}
              <button
                type="submit"
                disabled={procesandoRecarga || procesandoConfirmacion}
                className="w-full rounded-2xl bg-red-700 py-4 font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-75 flex items-center justify-center gap-2 shadow-sm"
              >
                {procesandoRecarga ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Cargando Pasarela...
                  </>
                ) : (
                  'Realizar recarga en Stripe Checkout por ' + formatearMoneda(montoRecarga)
                )}
              </button>
            </form>
          </div>

          {/* Historial de Recargas Recientes */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold !text-slate-900 mb-4">Historial de Recargas Recientes</h3>

            {recientes.length === 0 ? (
              <p className="text-sm !text-slate-500 py-4 text-center">No hay recargas registradas recientemente.</p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider !text-slate-500">
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Monto</th>
                      <th className="px-4 py-3 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 !text-slate-700">
                    {recientes.map((recarga, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3.5">
                          {new Date(recarga.creado_en).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3.5 font-bold !text-slate-900">
                          {formatearMoneda(recarga.monto)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold leading-5 !text-emerald-800">
                            {recarga.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="!text-slate-500 text-[10px] mt-3 leading-normal">
              * Se almacenan las últimas 5 recargas más recientes de tu billetera.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}