import axios from 'axios'

const mapaMensajes: Record<string, string> = {
  'Usuario o contrasena incorrectos.': 'Usuario o contraseña incorrectos.',
  'Usuario o contrasena incorrecta.': 'Usuario o contraseña incorrecta.',
  'La contrasena debe tener al menos 8 caracteres.': 'La contraseña debe tener al menos 8 caracteres.',
  'La contrasena debe incluir al menos una mayuscula.': 'La contraseña debe incluir al menos una mayúscula.',
  'La contrasena debe incluir al menos una minuscula.': 'La contraseña debe incluir al menos una minúscula.',
  'La contrasena debe incluir al menos un numero.': 'La contraseña debe incluir al menos un número.',
  'El codigo es invalido o ya expiro.': 'El código es inválido o ya expiró.',
  'Tu contrasena fue actualizada correctamente.': 'Tu contraseña fue actualizada correctamente.',
  'No se pudo refrescar la sesion.': 'No se pudo refrescar la sesión.',
  'No existe una cuenta activa asociada a ese usuario.': 'No existe una cuenta activa asociada a ese usuario.',
}

export function obtenerMensajeError(error: unknown, mensajePorDefecto: string): string {
  if (axios.isAxiosError(error)) {
    const detalle = error.response?.data?.detail

    if (typeof detalle === 'string' && detalle.trim()) {
      return mapaMensajes[detalle] ?? detalle
    }

    if (error.code === 'ECONNABORTED') {
      return 'La solicitud tardó demasiado. Verifica que el backend y PostgreSQL estén activos.'
    }

    if (!error.response) {
      return 'No fue posible conectar con el backend. Verifica que la API esté ejecutándose en http://localhost:8000.'
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return mapaMensajes[error.message] ?? error.message
  }

  return mensajePorDefecto
}

export function esErrorAutorizacion(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401
}
