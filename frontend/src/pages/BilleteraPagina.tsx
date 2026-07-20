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
          await cerrarSesion()
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
  }, [searchParams, setSearchParams, sesion?.accessToken])

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
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-red-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!autenticado) {
    return (
      <div className="mx-auto max-w-lg rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 text-center shadow-xl backdrop-blur-md">
        <h2 className="text-2xl font-black text-white">Mi Billetera</h2>
        <p className="mt-4 text-slate-300">Debes iniciar sesión para poder gestionar tu saldo de créditos virtuales y realizar recargas.</p>
        <div className="mt-6">
          <Link className="inline-block rounded-2xl bg-red-500 px-6 py-3 font-semibold text-white transition hover:bg-red-400" to="/iniciar-sesion">
            Iniciar Sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">Mi Billetera Virtual</h1>
        <p className="text-sm text-slate-400">Gestiona tu saldo de créditos para realizar pronósticos de eventos UFC.</p>
      </div>

      {mensajeExito && (
        <div className="rounded-2xl border border-green-500/30 bg-green-950/30 p-4 text-sm font-medium text-green-300 animate-pulse">
          {mensajeExito}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-950/30 p-4 text-sm font-medium text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Columna Izquierda: Información de Saldo y Verificación */}
        <div className="space-y-6 lg:col-span-5">
          {/* Tarjeta de Saldo */}
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-8 shadow-xl">
            {/* Efecto de resplandor */}
            <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-red-600/10 blur-[50px]"></div>
            
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Saldo Disponible</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-5xl font-black tracking-tight text-white bg-gradient-to-r from-red-500 to-yellow-500 bg-clip-text text-transparent">
                {formatearMoneda(saldo)}
              </span>
              <span className="text-sm font-bold text-slate-400">{moneda}</span>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Créditos Recargados.
            </p>
          </div>

          {/* Tarjeta de Verificación de Identidad */}
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/40 p-6 shadow-lg backdrop-blur-sm">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20 text-green-400 text-xs">✓</span>
              Verificación de Identidad (18+)
            </h3>
            <p className="mt-2 text-xs text-slate-400">
              Datos registrados requeridos por regulaciones de juego responsable.
            </p>

            <div className="mt-4 space-y-3 rounded-2xl bg-white/5 p-4 text-sm text-slate-300">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Cédula / Identificación:</span>
                <span className="font-semibold text-white">{perfil?.cedula || 'No registrada'}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Fecha de Nacimiento:</span>
                <span className="font-semibold text-white">
                  {perfil?.fecha_nacimiento 
                    ? new Date(perfil.fecha_nacimiento).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      }) 
                    : 'No registrada'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Declaración Jurada Edad:</span>
                <span className="font-semibold text-green-400">Confirmada (18+)</span>
              </div>
            </div>
          </div>

        </div>

        {/* Columna Derecha: Recarga y Historial Reciente */}
        <div className="space-y-6 lg:col-span-7">
          {/* Panel de Recarga */}
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-xl backdrop-blur-md">
            <h2 className="text-xl font-bold text-white">Recargar Créditos</h2>
            <p className="text-sm text-slate-300 mt-1">Elige un monto para iniciar tu pago en Stripe Sandbox.</p>

            <form onSubmit={iniciarPagoStripe} className="mt-6 space-y-6">
              {/* Selección de Monto */}
              <div>
                <label className="text-sm font-medium text-slate-200">Monto de la recarga</label>
                <div className="mt-3 grid grid-cols-4 gap-3">
                  {[10, 20, 50, 100].map((valor) => (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => manejarMontoPredefinido(valor)}
                      className={`rounded-2xl py-3 font-bold transition ${
                        montoRecarga === valor && !customMonto
                          ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                          : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      ${valor}
                    </button>
                  ))}
                </div>

                <div className="mt-4">
                  <span className="text-xs text-slate-400 block mb-2">O ingresa un monto personalizado (USD)</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={customMonto}
                    onChange={manejarMontoCustomChange}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-red-400 focus:bg-white/10"
                    placeholder="Monto personalizado"
                  />
                </div>
              </div>

              {/* Botón de Envío */}
              <button
                type="submit"
                disabled={procesandoRecarga || procesandoConfirmacion}
                className="w-full rounded-2xl bg-red-500 py-4 font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-75 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
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
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/20 p-6 shadow-xl backdrop-blur-sm">
            <h3 className="text-lg font-bold text-white mb-4">Historial de Recargas Recientes</h3>
            
            {recientes.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No hay recargas registradas recientemente.</p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-950/40">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Monto</th>
                      <th className="px-4 py-3 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {recientes.map((recarga, index) => (
                      <tr key={index} className="hover:bg-white/5 transition">
                        <td className="px-4 py-3.5">
                          {new Date(recarga.creado_en).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-white">
                          {formatearMoneda(recarga.monto)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="inline-flex rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold leading-5 text-green-400">
                            {recarga.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-slate-500 text-[10px] mt-3 leading-normal">
              * Se almacenan las últimas 5 recargas más recientes de tu billetera.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
