import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSignIn } from '@clerk/clerk-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

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
    <section className="mx-auto w-full max-w-xl rounded-[2rem] border border-white/10 bg-slate-950/70 p-8">
      <h1 className="m-0 text-3xl font-black text-white">Recuperación de contraseña</h1>
      <p className="mt-3 text-slate-300">
        Se ha enviado un código de verificación al correo registrado a esta cuenta, ingrese el código para cambiar su contraseña.
      </p>

      <h2 className="mt-8 text-2xl font-bold text-white">Ingresar código</h2>

      <form className="mt-6 flex flex-col gap-5" onSubmit={handleSubmit(validarCodigo)}>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-200">Correo</span>
          <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-red-400" type="email" {...register('correo')} />
          {errors.correo ? <span className="text-sm text-red-300">{errors.correo.message}</span> : null}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-200">Código de verificación</span>
          <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-red-400" inputMode="numeric" maxLength={6} {...register('codigo')} />
          {errors.codigo ? <span className="text-sm text-red-300">{errors.codigo.message}</span> : null}
        </label>

        {mensajeExito ? (
          <span className="text-sm text-emerald-300">{mensajeExito}</span>
        ) : null}

        {errorClerk ? (
          <span className="text-sm text-red-300">{errorClerk}</span>
        ) : null}

        <button 
          className="rounded-2xl bg-red-500 px-5 py-3 font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-70" 
          disabled={cargando || !isLoaded} 
          type="submit"
        >
          Validar código
        </button>

        <button
          className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 font-semibold text-white transition hover:border-red-400/60 disabled:opacity-50"
          disabled={cargando || !isLoaded}
          onClick={reenviarCodigo}
          type="button"
        >
          {cargando ? 'Enviando...' : 'Reenviar código'}
        </button>
      </form>
    </section>
  )
}