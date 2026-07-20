import { useSignUp, useAuth } from '@clerk/clerk-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { useAutenticacion } from '../hooks/useAutenticacion'
import { verificarEstadoSesion } from '../services/auth'

const esquema = z.object({
  correo: z.string().email('Ingresa un correo válido'),
  codigo: z.string().length(6, 'El código debe tener 6 dígitos').regex(/^\d{6}$/, 'El código debe contener solo números'),
})

type FormularioVerificacion = z.infer<typeof esquema>

export function VerificarRegistroPagina() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { isLoaded, signUp, setActive } = useSignUp()
  const { getToken } = useAuth()
  const { guardarSesion, cerrarSesion } = useAutenticacion()
  const [mensajeExito] = useState(searchParams.get('mensaje') ?? '')
  const [errorVerificacion, setErrorVerificacion] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormularioVerificacion>({
    resolver: zodResolver(esquema),
    defaultValues: {
      correo: searchParams.get('correo') ?? '',
      codigo: '',
    },
  })

  const enviarFormulario = async (valores: FormularioVerificacion) => {
    if (!isLoaded) return
    setErrorVerificacion(null)
    setCargando(true)

    try {
      // Intentar validar el código OTP en los servidores de Clerk
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: valores.codigo,
      })

      if (completeSignUp.status === 'complete') {
        // Activamos la sesión directamente en el cliente
        try {
          await setActive({ session: completeSignUp.createdSessionId })
        } catch (setActiveError: any) {
          if (setActiveError?.message?.includes('Session already exists')) {
            await cerrarSesion()
            await setActive({ session: completeSignUp.createdSessionId })
          } else {
            throw setActiveError
          }
        }

        const token = await getToken()
        if (!token) {
          throw new Error('No se pudo obtener el token de sesión de Clerk.')
        }

        const estado = await verificarEstadoSesion(token)
        guardarSesion({
          accessToken: token,
          refreshToken: '',
          usuario: estado.usuario,
        })

        // Redirigimos al perfil; el backend JIT creará el registro en PostgreSQL en el primer request
        navigate('/perfil')
      } else {
        console.warn('Estado de verificación incompleto:', completeSignUp)
        setErrorVerificacion('No se pudo completar la verificación de la cuenta.')
      }
    } catch (err: any) {
      console.error(err)
      setErrorVerificacion(err.errors?.[0]?.message || 'Código incorrecto o expirado.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-xl rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-2xl backdrop-blur-md">
      <h2 className="m-0 text-3xl font-black text-white">Verificar correo</h2>
      <p className="mt-3 text-slate-300">Ingresa el código de 6 dígitos que enviamos al correo para terminar de crear tu cuenta.</p>

      {mensajeExito ? <p className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{mensajeExito}</p> : null}

      <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit(enviarFormulario)}>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-200">Correo</span>
          <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-red-400 disabled:opacity-60" type="email" {...register('correo')} disabled />
          {errors.correo ? <span className="text-sm text-red-300">{errors.correo.message}</span> : null}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-200">Código</span>
          <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-red-400" inputMode="numeric" maxLength={6} {...register('codigo')} placeholder="000000" />
          {errors.codigo ? <span className="text-sm text-red-300">{errors.codigo.message}</span> : null}
        </label>

        {errorVerificacion ? (
          <span className="text-sm text-red-300">{errorVerificacion}</span>
        ) : null}

        <button className="rounded-2xl bg-red-500 px-5 py-3 font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-70" disabled={!isLoaded || cargando} type="submit">
          {cargando ? 'Verificando...' : 'Verificar y entrar'}
        </button>
      </form>
    </section>
  )
}