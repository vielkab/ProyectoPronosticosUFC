import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, useSignIn } from '@clerk/clerk-react'
import { z } from 'zod'

import { TarjetaResumen } from '../components/ui/TarjetaResumen'
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

      // 1. Autenticar con Clerk
      const resultado = await signIn.create({
        identifier: valores.correo,
        password: valores.password,
      })

      if (resultado.status === 'complete') {
        // 2. Activar la sesión en Clerk
        try {
          await setActive({ session: resultado.createdSessionId })
        } catch (setActiveError: any) {
          if (setActiveError?.message?.includes('Session already exists')) {
            await signOut()
            await setActive({ session: resultado.createdSessionId })
          } else {
            throw setActiveError
          }
        }

        // 3. Obtener JWT Token
        const token = await getToken()
        if (!token) {
          throw new Error('No se pudo obtener el token de sesión de Clerk.')
        }

        // 4. Validar token con el Backend y obtener usuario real de PostgreSQL
        const estado = await verificarEstadoSesion(token)

        if (!estado?.usuario) {
          throw new Error('No se pudo verificar la información del usuario en el servidor.')
        }

        // 5. Guardar sesión legítima en el estado global
        guardarSesion({
          accessToken: token,
          refreshToken: '',
          usuario: estado.usuario,
        })

        const destino = estado.usuario.rol === 'administrador' ? '/admin' : '/perfil'
        navigate(destino)
      } else {
        setErrorClerk(
          'No se pudo completar el inicio de sesión. Verifica tu correo y contraseña.',
        )
      }
    } catch (err: any) {
      console.error('❌ Error en inicio de sesión:', err)
      const mensajeError =
        err.response?.data?.detail || err.errors?.[0]?.message || err.message || 'Usuario o contraseña incorrecta.'

      if (mensajeError.includes('Session already exists')) {
        try {
          await cerrarSesion()
          setErrorClerk('Cerré la sesión inactiva de Clerk. Vuelve a intentarlo.')
        } catch {
          setErrorClerk('Ya hay una sesión activa en este navegador.')
        }
      } else {
        setErrorClerk(mensajeError)
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 pt-4">
      {/* Botón de regresar perfectamente alineado a la izquierda del contenedor del formulario */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-red-700 hover:text-red-700"
      >
        ← Regresar
      </button>

      <TarjetaResumen
        titulo="Iniciar sesión"
        descripcion="Accede a tu cuenta para consultar tus apuestas, revisar tu historial y utilizar todas las funciones privadas de la plataforma."
        contenido={
          <form className="mt-2 flex flex-col gap-6" onSubmit={handleSubmit(enviarFormulario)}>
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

            <CampoPassword
              etiqueta="Contraseña"
              error={errors.password?.message}
              registro={register('password')}
            />

            <div className="flex flex-col gap-3 text-sm md:flex-row md:items-center md:justify-between">
              <span className="text-slate-500">
                Tu correo debe estar verificado para iniciar sesión.
              </span>

              <Link
                to={
                  correoActual.trim()
                    ? `/recuperar-password/codigo?correo=${encodeURIComponent(
                        correoActual.trim(),
                      )}&auto=1`
                    : '/recuperar-password/codigo'
                }
                className="font-medium text-red-700 transition hover:text-red-800 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {errorClerk && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorClerk}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando || !isLoaded || !authLoaded}
              className="rounded-full bg-red-700 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cargando ? 'Ingresando...' : 'Iniciar sesión'}
            </button>

            <div className="border-t border-slate-200 pt-5 text-center text-sm text-slate-500">
              ¿Todavía no tienes una cuenta?{' '}
              <Link
                to="/registro"
                className="font-semibold text-red-700 transition hover:text-red-800 hover:underline"
              >
                Crear una cuenta
              </Link>
            </div>
          </form>
        }
      />
    </div>
  )
}