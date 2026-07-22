import { useMutation } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { CampoPassword } from '../components/forms/CampoPassword'
import { useAutenticacion } from '../hooks/useAutenticacion'
import { iniciarSesion, restablecerPassword } from '../services/auth'
import { obtenerMensajeError } from '../utils/errores'

const esquema = z
  .object({
    usuario: z.string().min(3, 'Ingresa tu usuario'),
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
  const { guardarSesion } = useAutenticacion()
  const usuarioInicial = searchParams.get('usuario') ?? ''
  const codigo = searchParams.get('codigo') ?? ''

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormularioCambio>({
    resolver: zodResolver(esquema),
    defaultValues: {
      usuario: usuarioInicial,
      password: '',
      confirmarPassword: '',
    },
  })

  const mutacionCambio = useMutation({
    mutationFn: restablecerPassword,
  })

  const mutacionLogin = useMutation({
    mutationFn: iniciarSesion,
    onSuccess: (respuesta) => {
      guardarSesion({
        accessToken: respuesta.access_token,
        refreshToken: respuesta.refresh_token,
        usuario: respuesta.usuario,
      })
      navigate('/perfil')
    },
  })

  const enviarFormulario = async (valores: FormularioCambio) => {
    await mutacionCambio.mutateAsync({
      usuario: valores.usuario,
      codigo,
      password: valores.password,
    })

    mutacionLogin.mutate({
      usuario: valores.usuario,
      password: valores.password,
    })
  }

  return (
    <section className="mx-auto w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="m-0 text-3xl font-black !text-slate-900">Cambiar contraseña</h1>
      <p className="mt-3 !text-slate-600">
        El código ya fue validado. Define una nueva contraseña y entra con tu cuenta.
      </p>

      <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit(enviarFormulario)}>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold !text-slate-700">Usuario</span>
          <input
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 !text-slate-900 shadow-sm outline-none transition focus:border-red-700 focus:ring-1 focus:ring-red-700 placeholder:text-slate-400"
            {...register('usuario')}
          />
          {errors.usuario ? (
            <span className="text-sm font-medium text-red-600">{errors.usuario.message}</span>
          ) : null}
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

        {mutacionCambio.isError ? (
          <span className="text-sm font-medium text-red-600">
            {obtenerMensajeError(mutacionCambio.error, 'No se pudo cambiar la contraseña.')}
          </span>
        ) : null}

        {mutacionLogin.isError ? (
          <span className="text-sm font-medium text-red-600">
            {obtenerMensajeError(mutacionLogin.error, 'No se pudo iniciar sesión automáticamente.')}
          </span>
        ) : null}

        <button
          className="rounded-2xl bg-red-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={mutacionCambio.isPending || mutacionLogin.isPending}
          type="submit"
        >
          {mutacionCambio.isPending || mutacionLogin.isPending ? 'Procesando...' : 'Iniciar sesión'}
        </button>
      </form>
    </section>
  )
}