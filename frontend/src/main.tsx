import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { ProveedorAutenticacion } from './contexts/AutenticacionContexto'
import './index.css'
import App from './App.tsx'

const clienteQuery = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={clienteQuery}>
      <ProveedorAutenticacion>
        <App />
      </ProveedorAutenticacion>
    </QueryClientProvider>
  </StrictMode>,
)
