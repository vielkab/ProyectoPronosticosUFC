import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { useAutenticacion } from '../hooks/useAutenticacion'
import { verificarRegistro } from '../services/auth'
import { obtenerMensajeError } from '../utils/errores'

const esquema = z.object({
  correo: z.email('Ingresa un correo válido'),
  codigo: z.string().length(6, 'El código debe tener 6 dígitos').regex(/^\d{6}$/, 'El código debe contener solo números'),
})

type FormularioVerificacion = z.infer<typeof esquema>

export function VerificarRegistroPagina() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { guardarSesion } = useAutenticacion()
  const [mensajeExito] = useState(searchParams.get('mensaje') ?? '')

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

  const mutacionVerificacion = useMutation({
    mutationFn: verificarRegistro,
    onSuccess: (respuesta) => {
      guardarSesion({
        accessToken: respuesta.access_token,
        refreshToken: respuesta.refresh_token,
        usuario: respuesta.usuario,
      })
      navigate('/perfil')
    },
  })

  const enviarFormulario = (valores: FormularioVerificacion) => {
    mutacionVerificacion.mutate(valores)
  }

  return (
    <section className="mx-auto w-full max-w-xl rounded-[2rem] border border-white/10 bg-slate-950/70 p-8">
      <h2 className="m-0 text-3xl font-black text-white">Verificar correo</h2>
      <p className="mt-3 text-slate-300">Ingresa el código de 6 dígitos que enviamos al correo para terminar de crear tu cuenta.</p>

      {mensajeExito ? <p className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{mensajeExito}</p> : null}

      <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit(enviarFormulario)}>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-200">Correo</span>
          <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-red-400" type="email" {...register('correo')} />
          {errors.correo ? <span className="text-sm text-red-300">{errors.correo.message}</span> : null}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-200">Código</span>
          <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-red-400" inputMode="numeric" maxLength={6} {...register('codigo')} />
          {errors.codigo ? <span className="text-sm text-red-300">{errors.codigo.message}</span> : null}
        </label>

        {mutacionVerificacion.isError ? (
          <span className="text-sm text-red-300">
            {obtenerMensajeError(mutacionVerificacion.error, 'No se pudo verificar el código.')}
          </span>
        ) : null}

        <button className="rounded-2xl bg-red-500 px-5 py-3 font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-70" disabled={mutacionVerificacion.isPending} type="submit">
          {mutacionVerificacion.isPending ? 'Verificando...' : 'Verificar y entrar'}
        </button>
      </form>
    </section>
  )
}
