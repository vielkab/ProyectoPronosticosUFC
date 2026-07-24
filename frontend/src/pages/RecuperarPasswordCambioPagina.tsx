import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSignIn, useAuth } from '@clerk/clerk-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { TarjetaResumen } from '../components/ui/TarjetaResumen'
import { CampoPassword } from '../components/forms/CampoPassword'
import { useAutenticacion } from '../hooks/useAutenticacion'
import { verificarEstadoSesion } from '../services/auth'

const esquema = z
  .object({
    correo: z.string().email('Ingresa un correo válido'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Incluye al menos una mayúscula')
      .regex(/[a-z]/, 'Incluye al menos una minúscula')
      .regex(/[0-9]/, 'Incluye al menos un número'),
    confirmarPassword: z.string().min(8, 'Confirma la contraseña'),
  })
  .refine((valores) => valores.password === valores.confirmarPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmarPassword'],
  })

type FormularioCambio = z.infer<typeof esquema>

export function RecuperarPasswordCambioPagina() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isLoaded, signIn, setActive } = useSignIn()
  const { getToken } = useAuth()
  const { guardarSesion, cerrarSesion } = useAutenticacion()

  const [errorClerk, setErrorClerk] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  const correoInicial = searchParams.get('correo') ?? ''
  const codigo = searchParams.get('codigo') ?? ''

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormularioCambio>({
    resolver: zodResolver(esquema),
    defaultValues: {
      correo: correoInicial,
      password: '',
      confirmarPassword: '',
    },
  })

  const enviarFormulario = async (valores: FormularioCambio) => {
    if (!isLoaded) return
    setCargando(true)
    setErrorClerk(null)

    try {
      // Intentar validar el código de reseteo e inyectar la nueva clave en Clerk simultáneamente
      const resultado = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: codigo,
        password: valores.password,
      })

      if (resultado.status === 'complete') {
        try {
          // Inicializar y sincronizar de forma nativa la sesión activa en el frontend
          await setActive({ session: resultado.createdSessionId })
        } catch (setActiveError: any) {
          if (setActiveError?.message?.includes('Session already exists')) {
            await cerrarSesion()
            await setActive({ session: resultado.createdSessionId })
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

        navigate('/perfil')
      } else {
        setErrorClerk('El proceso no se completó correctamente. Revisa los datos o solicita un nuevo código.')
      }
    } catch (err: any) {
      const mensaje = err.errors?.[0]?.message || err.message || 'No se pudo cambiar la contraseña. El código podría ser inválido o haber expirado.'
      setErrorClerk(mensaje)
    } finally {
      setCargando(false)
    }
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
        titulo="Cambiar contraseña"
        descripcion="El código ya fue validado. Define una nueva contraseña y entra con tu cuenta."
        contenido={
          <form className="mt-2 flex flex-col gap-6" onSubmit={handleSubmit(enviarFormulario)}>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                Correo electrónico
              </span>
              <input
                className="rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-500 outline-none transition cursor-not-allowed"
                type="email"
                {...register('correo')}
                readOnly
              />
              {errors.correo && (
                <span className="text-sm text-red-600">
                  {errors.correo.message}
                </span>
              )}
            </label>

            <CampoPassword
              etiqueta="Contraseña nueva"
              error={errors.password?.message}
              registro={register('password')}
              placeholder="Ejemplo: Maria123"
            />

            <CampoPassword
              etiqueta="Confirmar contraseña"
              error={errors.confirmarPassword?.message}
              registro={register('confirmarPassword')}
            />

            {errorClerk && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorClerk}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando || !isLoaded}
              className="rounded-full bg-red-700 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cargando ? 'Procesando...' : 'Cambiar contraseña'}
            </button>
          </form>
        }
      />
    </div>
  )
}