import { useMutation } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { CampoPassword } from '../components/forms/CampoPassword'
import { useAutenticacion } from '../hooks/useAutenticacion'
import { iniciarSesion, solicitarRecuperacionPassword } from '../services/auth'
import { obtenerMensajeError } from '../utils/errores'

const esquema = z.object({
  usuario: z.string().min(3, 'Ingresa tu usuario'),
  password: z.string().min(8, 'Ingresa tu contraseña'),
})

type FormularioInicioSesion = z.infer<typeof esquema>

export function IniciarSesionPagina() {
  const navigate = useNavigate()
  const { guardarSesion } = useAutenticacion()
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormularioInicioSesion>({
    resolver: zodResolver(esquema),
    defaultValues: {
      usuario: '',
      password: '',
    },
  })

  const mutacionLogin = useMutation({
    mutationFn: iniciarSesion,
    onSuccess: (respuesta) => {
      guardarSesion({
        accessToken: respuesta.access_token,
        refreshToken: respuesta.refresh_token,
        usuario: respuesta.usuario,
      })
      if (respuesta.usuario.rol === 'administrador') {
        navigate('/admin')
      } else {
        navigate('/')
      }
    },
  })

  const mutacionRecuperacion = useMutation({
    mutationFn: solicitarRecuperacionPassword,
    onSuccess: (_, variables) => {
      navigate(
        `/recuperar-password/codigo?usuario=${encodeURIComponent(variables.usuario)}&auto=1`,
      )
    },
  })

  const enviarFormulario = (valores: FormularioInicioSesion) => {
    mutacionLogin.mutate(valores)
  }

  const irARecuperarPassword = () => {
    const usuario = getValues('usuario').trim()

    if (!usuario) {
      navigate('/recuperar-password/codigo')
      return
    }

    mutacionRecuperacion.mutate({ usuario })
  }

  return (
    <section className="mx-auto w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="m-0 text-3xl font-black !text-slate-900">Iniciar sesión</h2>
      <p className="mt-3 !text-slate-600">Accede con tu usuario y la contraseña de tu cuenta verificada.</p>

      <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit(enviarFormulario)}>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold !text-slate-700">Usuario</span>
          <input
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 !text-slate-900 shadow-sm outline-none transition focus:border-red-700 focus:ring-1 focus:ring-red-700"
            {...register('usuario')}
          />
          {errors.usuario ? <span className="text-sm font-medium !text-red-700">{errors.usuario.message}</span> : null}
        </label>

        <CampoPassword etiqueta="Contraseña" error={errors.password?.message} registro={register('password')} />

        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="!text-slate-500">Tu correo debe estar verificado para poder entrar.</span>
          <button
            className="self-start font-semibold !text-red-700 transition hover:underline sm:self-auto"
            onClick={irARecuperarPassword}
            type="button"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        {mutacionLogin.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <span className="text-sm font-medium !text-red-700">
              {obtenerMensajeError(
                mutacionLogin.error,
                'Usuario o contraseña incorrecta.',
              )}
            </span>
          </div>
        ) : null}

        <button
          className="rounded-2xl bg-red-700 px-5 py-3 font-semibold !text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={mutacionLogin.isPending || mutacionRecuperacion.isPending}
          type="submit"
        >
          {mutacionLogin.isPending ? 'Ingresando...' : 'Entrar'}
        </button>
      </form>
    </section>
  )
}