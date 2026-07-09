import { Link } from 'react-router-dom'

import { SeccionHero } from '../components/ui/SeccionHero'
import { TarjetaResumen } from '../components/ui/TarjetaResumen'

const modulos = [
  {
    titulo: 'Carteleras UFC',
    descripcion: 'Consulta próximos eventos, peleas programadas y detalles clave de la cartelera.',
    enlace: '/eventos',
  },
  {
    titulo: 'Pronósticos',
    descripcion: 'Visualiza probabilidades generadas por reglas simples sobre el combate.',
    enlace: '/predicciones',
  },
  {
    titulo: 'Billetera',
    descripcion: 'Gestiona recargas con Stripe Sandbox y apuesta con saldo virtual.',
    enlace: '/billetera',
  },
]

export function InicioPagina() {
  return (
    <div className="flex w-full flex-col gap-8">
      <SeccionHero
        etiqueta="MVP"
        titulo="Decisiones simples, datos deportivos y apuestas virtuales bien controladas"
        descripcion="Esta primera versión está pensada para validar el flujo completo: autenticación, consulta deportiva, pronóstico, recarga de saldo, apuesta e historial."
      />

      <section className="grid gap-6 lg:grid-cols-3">
        {modulos.map((modulo) => (
          <TarjetaResumen
            key={modulo.titulo}
            titulo={modulo.titulo}
            descripcion={modulo.descripcion}
            contenido={
              <Link className="inline-flex rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400" to={modulo.enlace}>
                Ir al módulo
              </Link>
            }
          />
        ))}
      </section>
    </div>
  )
}
