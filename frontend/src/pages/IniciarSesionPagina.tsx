// IniciarSesionPagina.tsx
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth, useSignIn } from '@clerk/clerk-react'
import { z } from 'zod'

import { CampoPassword } from '../components/forms/CampoPassword'
import { useAutenticacion } from '../hooks/useAutenticacion'
import { verificarEstadoSesion } from '../services/auth'

const esquema = z.object({
  correo: z.string().email('Ingresa un correo válido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

type FormularioInicioSesion = z.infer<typeof esquema>

export function IniciarSesionPagina() {
  const navigate = useNavigate()
  const { isLoaded, signIn, setActive } = useSignIn()
  const { isLoaded: authLoaded, getToken, isSignedIn, signOut } = useAuth()
  const { autenticado, cargando: cargandoAuth, sesion, guardarSesion, cerrarSesion } = useAutenticacion()

  const [errorClerk, setErrorClerk] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormularioInicioSesion>({
    resolver: zodResolver(esquema),
    defaultValues: {
      correo: '',
      password: '',
    },
  })

  // Observamos el campo del correo para poder inyectarlo si eligen recuperar password
  const correoActual = watch('correo')

  useEffect(() => {
    if (cargandoAuth) return
    if (!autenticado) return

    const destino = sesion?.usuario.rol === 'administrador' ? '/admin' : '/perfil'
    navigate(destino)
  }, [autenticado, cargandoAuth, navigate, sesion?.usuario.rol])

  const enviarFormulario = async (valores: FormularioInicioSesion) => {
    if (!isLoaded) return
    setCargando(true)
    setErrorClerk(null)

    try {
      if (isSignedIn) {
        await signOut()
        await cerrarSesion()
      }

      // Autenticar de manera nativa empleando Clerk
      const resultado = await signIn.create({
        identifier: valores.correo,
        password: valores.password,
      })

      if (resultado.status === 'complete') {
        try {
          // Almacenar la sesión de Clerk de forma nativa en las cookies
          await setActive({ session: resultado.createdSessionId })
        } catch (setActiveError: any) {
          if (setActiveError?.message?.includes('Session already exists')) {
            await signOut()
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

        const destino = estado.usuario.rol === 'administrador' ? '/admin' : '/perfil'
        navigate(destino)
      } else {
        setErrorClerk(
          'No se pudo completar el inicio de sesión. Verifica tu correo y contraseña. Si tu cuenta ya está validada, usa el correo registrado y la contraseña correcta.',
        )
      }
    } catch (err: any) {
        const mensajeError = err.errors?.[0]?.message || err.message || 'Usuario o contraseña incorrecta.'

        if (mensajeError.includes('Session already exists')) {
          try {
            await cerrarSesion()
            setErrorClerk('Cerré la sesión inactiva de Clerk. Vuelve a intentarlo para ingresar con tu cuenta actual.')
          } catch {
            setErrorClerk('Ya hay una sesión activa en este navegador. Intenta cerrar sesión manualmente y vuelve a ingresar.')
          }
        } else {
          setErrorClerk(mensajeError)
        }
      } finally {
        setCargando(false)
      }
    }
  return (
    <section className="mx-auto w-full max-w-xl rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-2xl backdrop-blur-md">
      <h2 className="m-0 text-3xl font-black text-white">Iniciar sesión</h2>
      <p className="mt-3 text-slate-300">Accede con tu correo y la contraseña de tu cuenta verificada.</p>

      <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit(enviarFormulario)}>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-200">Correo</span>
          <input
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-red-400"
            type="email"
            {...register('correo')}
            placeholder="correo@ejemplo.com"
          />
          {errors.correo ? <span className="text-sm text-red-300">{errors.correo.message}</span> : null}
        </label>

        <CampoPassword etiqueta="Contraseña" error={errors.password?.message} registro={register('password')} />

        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-slate-400">Tu correo debe estar verificado para poder entrar.</span>
          
          {/* Reemplazamos la función manual por un Link directo que active el flujo OTP automático */}
          <Link
            to={correoActual.trim() ? `/recuperar-password/codigo?correo=${encodeURIComponent(correoActual.trim())}&auto=1` : '/recuperar-password/codigo'}
            className="font-medium text-red-300 transition hover:text-red-200 hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {errorClerk ? (
          <span className="text-sm text-red-300">{errorClerk}</span>
        ) : null}

        <button
          className="rounded-2xl bg-red-500 px-5 py-3 font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={cargando || !isLoaded || !authLoaded}
          type="submit"
        >
          {cargando ? 'Ingresando...' : 'Entrar'}
        </button>
      </form>
    </section>
  )
}