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
      .regex(/^[a-zA-Z0-9._-]+$/, 'Usa solo letras, números, puntos, guiones o guion bajo'),
    correo: z.email('Ingresa un correo válido'),
    cedula: z
      .string()
      .min(5, 'La cédula debe tener al menos 5 caracteres')
      .regex(/^[0-9-]+$/, 'La cédula solo debe contener números y guiones'),
    fechaNacimiento: z.string().refine((val) => {
      const date = new Date(val)
      if (isNaN(date.getTime())) return false
      const today = new Date()
      let age = today.getFullYear() - date.getFullYear()
      const monthDiff = today.getMonth() - date.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
        age--
      }
      return age >= 18
    }, 'Debes ser mayor de edad (18+ años) para apostar'),
    metodoVerificacion: z.string().min(1, 'Selecciona un método de verificación'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Incluye al menos una mayúscula')
      .regex(/[a-z]/, 'Incluye al menos una minúscula')
      .regex(/[0-9]/, 'Incluye al menos un número'),
    confirmarPassword: z.string().min(8, 'Confirma la contraseña'),
    aceptaTerminos: z.boolean().refine((val) => val === true, 'Debes declarar que eres mayor de edad y aceptar los términos'),
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
    defaultValues: {
      metodoVerificacion: 'cedula_digital',
      aceptaTerminos: false,
    }
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
      cedula: valores.cedula,
      fecha_nacimiento: new Date(valores.fechaNacimiento).toISOString(),
      acepta_terminos: valores.aceptaTerminos,
    })
  }

  return (
    <section className="mx-auto w-full max-w-2xl rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-2xl backdrop-blur-md">
      <h2 className="m-0 text-3xl font-black text-white">Crear cuenta</h2>
      <p className="mt-3 text-slate-300">
        Completa tus datos personales para verificar tu identidad y cumplir con las regulaciones de juego responsable (Juego 18+).
      </p>

      <form className="mt-8 grid gap-5 md:grid-cols-2" onSubmit={handleSubmit(enviarFormulario)}>
        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-200">Usuario</span>
          <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-red-400 focus:bg-white/10" {...register('usuario')} placeholder="Ej. ufc_fan" />
          {errors.usuario ? <span className="text-sm text-red-300">{errors.usuario.message}</span> : null}
        </label>

        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-200">Correo Electrónico</span>
          <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-red-400 focus:bg-white/10" type="email" {...register('correo')} placeholder="correo@ejemplo.com" />
          {errors.correo ? <span className="text-sm text-red-300">{errors.correo.message}</span> : null}
        </label>

        {/* Campos de Verificación de Edad e Identidad */}
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-200">Número de Cédula / DNI</span>
          <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-red-400 focus:bg-white/10" {...register('cedula')} placeholder="Ej. 1712345678" />
          {errors.cedula ? <span className="text-sm text-red-300">{errors.cedula.message}</span> : null}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-200">Fecha de Nacimiento</span>
          <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-red-400 focus:bg-white/10" type="date" {...register('fechaNacimiento')} />
          {errors.fechaNacimiento ? <span className="text-sm text-red-300">{errors.fechaNacimiento.message}</span> : null}
        </label>

        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-200">Método de Verificación Estudiantil (Simulado)</span>
          <select className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-red-400 focus:bg-white/10" {...register('metodoVerificacion')}>
            <option value="cedula_digital">Cédula Digital</option>
          </select>
          {errors.metodoVerificacion ? <span className="text-sm text-red-300">{errors.metodoVerificacion.message}</span> : null}
        </label>

        <CampoPassword etiqueta="Contraseña" error={errors.password?.message} registro={register('password')} placeholder="Ejemplo: Maria123" />

        <CampoPassword etiqueta="Confirmar contraseña" error={errors.confirmarPassword?.message} registro={register('confirmarPassword')} />

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300 md:col-span-2">
          Requisitos de contraseña: mínimo 8 caracteres, una mayúscula, una minúscula y un número.
        </div>

        {/* Declaraciones Juradas y Aceptación de Términos (Cumplimiento de Casas de Apuestas Reales) */}
        <label className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-950/20 p-4 md:col-span-2">
          <input className="mt-1 h-5 w-5 rounded border-white/10 bg-white/5 text-red-600 transition" type="checkbox" {...register('aceptaTerminos')} />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-200">Declaración de Responsabilidad de Juego</span>
            <span className="mt-1 text-xs leading-normal text-slate-400">
              Declaro bajo juramento que soy mayor de 18 años, que los datos ingresados coinciden con mi documento oficial,
              no tengo una autoexclusión de juego activa y no soy una Persona Expuesta Políticamente (PEP). Acepto los Términos y Condiciones.
            </span>
            {errors.aceptaTerminos ? <span className="mt-1 text-sm text-red-300">{errors.aceptaTerminos.message}</span> : null}
          </div>
        </label>

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
