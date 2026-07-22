import { useMutation } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import {
  solicitarRecuperacionPassword,
  verificarCodigoRecuperacion,
} from '../services/auth'
import { obtenerMensajeError } from '../utils/errores'

const esquema = z.object({
  usuario: z.string().min(3, 'Ingresa tu usuario'),
  codigo: z
    .string()
    .length(6, 'El código debe tener 6 dígitos')
    .regex(/^\d{6}$/, 'El código debe contener solo números'),
})

type FormularioCodigo = z.infer<typeof esquema>

export function RecuperarPasswordCodigoPagina() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const usuarioInicial = searchParams.get('usuario') ?? ''
  const auto = searchParams.get('auto') === '1'

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormularioCodigo>({
    resolver: zodResolver(esquema),
    defaultValues: {
      usuario: usuarioInicial,
      codigo: '',
    },
  })

  const mutacionEnviarCodigo = useMutation({
    mutationFn: solicitarRecuperacionPassword,
  })

  const mutacionVerificarCodigo = useMutation({
    mutationFn: verificarCodigoRecuperacion,
    onSuccess: (_, variables) => {
      navigate(
        `/recuperar-password/cambiar?usuario=${encodeURIComponent(variables.usuario)}&codigo=${encodeURIComponent(variables.codigo)}`,
      )
    },
  })

  useEffect(() => {
    if (!auto || !usuarioInicial) {
      return
    }

    mutacionEnviarCodigo.mutate({ usuario: usuarioInicial })
    setValue('usuario', usuarioInicial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, usuarioInicial, setValue])

  const validarCodigo = (valores: FormularioCodigo) => {
    mutacionVerificarCodigo.mutate(valores)
  }

  const reenviarCodigo = () => {
    const usuario = searchParams.get('usuario') ?? usuarioInicial
    if (!usuario) {
      return
    }

    mutacionEnviarCodigo.mutate({ usuario })
  }

  return (
    <section className="mx-auto w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="m-0 text-3xl font-black !text-slate-900">Recuperación de contraseña</h1>
      <p className="mt-3 !text-slate-600">
        Se ha enviado un código de verificación al correo registrado a esta cuenta, ingrese el código para cambiar su contraseña.
      </p>

      <h2 className="mt-8 text-2xl font-bold !text-slate-900">Ingresar código</h2>

      <form className="mt-6 flex flex-col gap-5" onSubmit={handleSubmit(validarCodigo)}>
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

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold !text-slate-700">Código de verificación</span>
          <input
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 !text-slate-900 shadow-sm outline-none transition focus:border-red-700 focus:ring-1 focus:ring-red-700 placeholder:text-slate-400 tracking-widest font-mono"
            inputMode="numeric"
            maxLength={6}
            {...register('codigo')}
          />
          {errors.codigo ? (
            <span className="text-sm font-medium text-red-600">{errors.codigo.message}</span>
          ) : null}
        </label>

        {mutacionEnviarCodigo.isSuccess ? (
          <span className="text-sm font-semibold text-emerald-700">
            {mutacionEnviarCodigo.data.mensaje}
          </span>
        ) : null}

        {mutacionEnviarCodigo.isError ? (
          <span className="text-sm font-medium text-red-600">
            {obtenerMensajeError(mutacionEnviarCodigo.error, 'No se pudo reenviar el código.')}
          </span>
        ) : null}

        {mutacionVerificarCodigo.isError ? (
          <span className="text-sm font-medium text-red-600">
            {obtenerMensajeError(mutacionVerificarCodigo.error, 'No se pudo validar el código.')}
          </span>
        ) : null}

        <button
          className="rounded-2xl bg-red-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={mutacionVerificarCodigo.isPending}
          type="submit"
        >
          {mutacionVerificarCodigo.isPending ? 'Validando...' : 'Validar código'}
        </button>

        <button
          className="rounded-2xl border border-slate-300 bg-slate-50 px-5 py-3 font-semibold !text-slate-700 transition hover:bg-slate-100 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={mutacionEnviarCodigo.isPending}
          onClick={reenviarCodigo}
          type="button"
        >
          {mutacionEnviarCodigo.isPending ? 'Reenviando...' : 'Reenviar código'}
        </button>
      </form>
    </section>
  )
}