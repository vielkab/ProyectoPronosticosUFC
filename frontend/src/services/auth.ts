import { api } from './api'

export type UsuarioAutenticado = {
  id: number
  nombre: string
  correo: string
  rol: string
}

export type RespuestaAutenticacion = {
  access_token: string
  refresh_token: string
  token_type: string
  usuario: UsuarioAutenticado
}

export type MensajeAuth = {
  mensaje: string
}

type RegistroPayload = {
  usuario: string
  correo: string
  password: string
  cedula: string
  fecha_nacimiento: string
  acepta_terminos: boolean
}

type LoginPayload = {
  usuario: string
  password: string
}

type VerificarRegistroPayload = {
  correo: string
  codigo: string
}

type SolicitarRecuperacionPayload = {
  usuario: string
}

type VerificarRecuperacionPayload = {
  usuario: string
  codigo: string
}

type RestablecerPasswordPayload = {
  usuario: string
  codigo: string
  password: string
}

export async function registrarUsuario(payload: RegistroPayload): Promise<MensajeAuth> {
  const { data } = await api.post<MensajeAuth>('/auth/register', payload)
  return data
}

export async function verificarRegistro(payload: VerificarRegistroPayload): Promise<RespuestaAutenticacion> {
  const { data } = await api.post<RespuestaAutenticacion>('/auth/register/verify', payload)
  return data
}

export async function iniciarSesion(payload: LoginPayload): Promise<RespuestaAutenticacion> {
  const { data } = await api.post<RespuestaAutenticacion>('/auth/login', payload)
  return data
}

export type EstadoSesion = {
  autenticado: boolean
  usuario: PerfilUsuario
}

export async function verificarEstadoSesion(token: string): Promise<EstadoSesion> {
  const { data } = await api.get<EstadoSesion>('/auth/estado-sesion', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return data
}

export async function solicitarRecuperacionPassword(
  payload: SolicitarRecuperacionPayload,
): Promise<MensajeAuth> {
  const { data } = await api.post<MensajeAuth>('/auth/password/forgot', payload)
  return data
}

export async function verificarCodigoRecuperacion(
  payload: VerificarRecuperacionPayload,
): Promise<MensajeAuth> {
  const { data } = await api.post<MensajeAuth>('/auth/password/verify-code', payload)
  return data
}

export async function restablecerPassword(
  payload: RestablecerPasswordPayload,
): Promise<MensajeAuth> {
  const { data } = await api.post<MensajeAuth>('/auth/password/reset', payload)
  return data
}

export type PerfilUsuario = UsuarioAutenticado & {
  activo: boolean
  cedula: string | null
  fecha_nacimiento: string | null
  acepta_terminos: boolean
}

export async function obtenerMiPerfil(token: string): Promise<PerfilUsuario> {
  const { data } = await api.get<PerfilUsuario>('/usuarios/yo', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return data
}

export async function eliminarMiCuenta(token: string): Promise<MensajeAuth> {
  const { data } = await api.delete<MensajeAuth>('/usuarios/yo', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return data
}
