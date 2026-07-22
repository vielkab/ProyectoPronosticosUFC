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
    <section className="mx-auto w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="m-0 text-3xl font-black !text-slate-900">Verificar correo</h2>
      <p className="mt-3 !text-slate-600">
        Ingresa el código de 6 dígitos que enviamos al correo para terminar de crear tu cuenta.
      </p>

      {mensajeExito ? (
        <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold !text-emerald-800">
          {mensajeExito}
        </p>
      ) : null}

      <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit(enviarFormulario)}>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold !text-slate-700">Correo</span>
          <input
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 !text-slate-900 shadow-sm outline-none transition focus:border-red-700 focus:ring-1 focus:ring-red-700 placeholder:text-slate-400"
            type="email"
            {...register('correo')}
          />
          {errors.correo ? <span className="text-sm font-medium !text-red-700">{errors.correo.message}</span> : null}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold !text-slate-700">Código</span>
          <input
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-center text-lg font-bold tracking-widest !text-slate-900 shadow-sm outline-none transition focus:border-red-700 focus:ring-1 focus:ring-red-700 placeholder:text-slate-400"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            {...register('codigo')}
          />
          {errors.codigo ? <span className="text-sm font-medium !text-red-700">{errors.codigo.message}</span> : null}
        </label>

        {mutacionVerificacion.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <span className="text-sm font-medium !text-red-700">
              {obtenerMensajeError(mutacionVerificacion.error, 'No se pudo verificar el código.')}
            </span>
          </div>
        ) : null}

        <button
          className="rounded-2xl bg-red-700 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={mutacionVerificacion.isPending}
          type="submit"
        >
          {mutacionVerificacion.isPending ? 'Verificando...' : 'Verificar y entrar'}
        </button>
      </form>
    </section>
  )
}