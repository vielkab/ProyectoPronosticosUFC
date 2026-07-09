import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { CampoPassword } from '../components/forms/CampoPassword'
import { registrarUsuario } from '../services/auth'
import { obtenerMensajeError } from '../utils/errores'

const esquema = z
  .object({
    usuario: z
      .string()
      .min(3, 'El usuario debe tener al menos 3 caracteres')
      .regex(/^[a-zA-Z0-9._-]+$/, 'Usa solo letras, numeros, puntos, guiones o guion bajo'),
    correo: z.email('Ingresa un correo válido'),
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

type FormularioRegistro = z.infer<typeof esquema>

export function RegistroPagina() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormularioRegistro>({
    resolver: zodResolver(esquema),
  })

  const mutacionRegistro = useMutation({
    mutationFn: registrarUsuario,
    onSuccess: (respuesta, variables) => {
      navigate(`/registro/verificar?correo=${encodeURIComponent(variables.correo)}&mensaje=${encodeURIComponent(respuesta.mensaje)}`)
    },
  })

  const enviarFormulario = (valores: FormularioRegistro) => {
    mutacionRegistro.mutate({
      usuario: valores.usuario,
      correo: valores.correo,
      password: valores.password,
    })
  }

  return (
    <section className="mx-auto w-full max-w-2xl rounded-[2rem] border border-white/10 bg-slate-950/70 p-8">
      <h2 className="m-0 text-3xl font-black text-white">Crear cuenta</h2>
      <p className="mt-3 text-slate-300">Primero crearás tu usuario y contraseña. La cuenta se activará cuando confirmes el código enviado al correo.</p>

      <form className="mt-8 grid gap-5 md:grid-cols-2" onSubmit={handleSubmit(enviarFormulario)}>
        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-200">Usuario</span>
          <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-red-400" {...register('usuario')} />
          {errors.usuario ? <span className="text-sm text-red-300">{errors.usuario.message}</span> : null}
        </label>

        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-200">Correo</span>
          <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-red-400" type="email" {...register('correo')} />
          {errors.correo ? <span className="text-sm text-red-300">{errors.correo.message}</span> : null}
        </label>

        <CampoPassword etiqueta="Contraseña" error={errors.password?.message} registro={register('password')} placeholder="Ejemplo: Maria123" />

        <CampoPassword etiqueta="Confirmar contraseña" error={errors.confirmarPassword?.message} registro={register('confirmarPassword')} />

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300 md:col-span-2">
          Requisitos de contraseña: mínimo 8 caracteres, una mayúscula, una minúscula y un número.
        </div>

        {mutacionRegistro.isError ? (
          <span className="text-sm text-red-300 md:col-span-2">
            {obtenerMensajeError(
              mutacionRegistro.error,
              'No se pudo completar el registro.',
            )}
          </span>
        ) : null}

        <button
          className="rounded-2xl bg-red-500 px-5 py-3 font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-70 md:col-span-2"
          disabled={mutacionRegistro.isPending}
          type="submit"
        >
          {mutacionRegistro.isPending ? 'Registrando...' : 'Registrarme'}
        </button>
      </form>
    </section>
  )
}
