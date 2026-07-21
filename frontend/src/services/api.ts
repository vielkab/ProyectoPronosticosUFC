import axios from 'axios'

// Garantizamos que la URL base siempre incluya el prefijo /api
const rawBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'
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