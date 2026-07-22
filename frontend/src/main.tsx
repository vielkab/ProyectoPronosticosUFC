import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClerkProvider } from '@clerk/clerk-react'

import './index.css'
import App from './App.tsx'
import { ProveedorAutenticacion } from './contexts/AutenticacionContexto'

// Recuperamos la clave pública desde Vite
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Falta la variable VITE_CLERK_PUBLISHABLE_KEY en el archivo .env")
}

const clienteQuery = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={clienteQuery}>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/iniciar-sesion">
        <ProveedorAutenticacion>
          <App />
        </ProveedorAutenticacion>
      </ClerkProvider>
    </QueryClientProvider>
  </StrictMode>,
)