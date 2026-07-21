import axios from 'axios'

const API_URL_PRODUCCION = 'https://proyectopronosticosufc.onrender.com'
const API_URL_DESARROLLO = 'http://localhost:8000'

function resolverBaseUrl(): string {
  const configurada = import.meta.env.VITE_API_URL?.trim()
  if (configurada) {
    return configurada
  }

  return import.meta.env.PROD ? API_URL_PRODUCCION : API_URL_DESARROLLO
}

const rawBaseUrl = resolverBaseUrl()
const baseURL = rawBaseUrl.endsWith('/api')
  ? rawBaseUrl
  : `${rawBaseUrl.replace(/\/$/, '')}/api`

export const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const apiBaseUrl = baseURL
