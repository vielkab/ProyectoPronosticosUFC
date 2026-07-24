import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSignIn } from '@clerk/clerk-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { TarjetaResumen } from '../components/ui/TarjetaResumen'

const esquema = z.object({
  correo: z.string().email('Ingresa un correo válido'),
  codigo: z.string().length(6, 'El código debe tener 6 dígitos').regex(/^\d{6}$/, 'El código debe contener solo números'),
})

type FormularioCodigo = z.infer<typeof esquema>

export function RecuperarPasswordCodigoPagina() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isLoaded, signIn } = useSignIn()
  
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [errorClerk, setErrorClerk] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const autoEnviadoRef = useRef(false)

  const correoInicial = searchParams.get('correo') ?? ''
  const auto = searchParams.get('auto') === '1'

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormularioCodigo>({
    resolver: zodResolver(esquema),
    defaultValues: {
      correo: correoInicial,
      codigo: '',
    },
  })

  // Función dedicada a solicitar o reenviar el código OTP a través de Clerk
  const enviarCodigoClerk = async (correo: string) => {
    if (!isLoaded) return
    setCargando(true)
    setErrorClerk(null)
    setMensajeExito(null)

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: correo,
      })
      setMensajeExito('Se ha enviado un código de verificación al correo registrado a esta cuenta.')
    } catch (err: any) {
      setErrorClerk(err.errors?.[0]?.message || 'No se pudo enviar el código de recuperación.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    if (!auto || !correoInicial || !isLoaded || autoEnviadoRef.current) {
      return
    }

    autoEnviadoRef.current = true
    enviarCodigoClerk(correoInicial)
    setValue('correo', correoInicial)
  }, [auto, correoInicial, isLoaded, setValue])

  const validarCodigo = (valores: FormularioCodigo) => {
    navigate(
      `/recuperar-password/cambio?correo=${encodeURIComponent(valores.correo)}&codigo=${encodeURIComponent(valores.codigo)}`,
    )
  }

  const reenviarCodigo = () => {
    const correo = searchParams.get('correo') ?? correoInicial
    if (!correo) {
      setErrorClerk('Por favor introduce un correo válido para reenviar el código.')
      return
    }
    enviarCodigoClerk(correo)
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 pt-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-red-700 hover:text-red-700"
      >
        ← Regresar
      </button>

      <TarjetaResumen
        titulo="Recuperación de contraseña"
        descripcion="Se ha enviado un código de verificación a tu correo. Ingrésalo a continuación para continuar."
        contenido={
          <form className="mt-2 flex flex-col gap-6" onSubmit={handleSubmit(validarCodigo)}>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                Correo electrónico
              </span>
              <input
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-700 outline-none transition focus:border-red-600"
                type="email"
                placeholder="correo@ejemplo.com"
                {...register('correo')}
              />
              {errors.correo && (
                <span className="text-sm text-red-600">
                  {errors.correo.message}
                </span>
              )}
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                Código de verificación
              </span>
              <input
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 tracking-widest text-slate-700 outline-none transition focus:border-red-600"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                {...register('codigo')}
              />
              {errors.codigo && (
                <span className="text-sm text-red-600">
                  {errors.codigo.message}
                </span>
              )}
            </label>

            {mensajeExito && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {mensajeExito}
              </div>
            )}

            {errorClerk && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorClerk}
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2">
              <button
                type="submit"
                disabled={cargando || !isLoaded}
                className="rounded-full bg-red-700 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Validar código
              </button>

              <button
                type="button"
                disabled={cargando || !isLoaded}
                onClick={reenviarCodigo}
                className="rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 shadow-sm transition hover:border-red-700 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cargando ? 'Enviando...' : 'Reenviar código'}
              </button>
            </div>
          </form>
        }
      />
    </div>
  )
}