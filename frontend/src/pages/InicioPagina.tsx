import { Link } from 'react-router-dom'

import { SeccionHero } from '../components/ui/SeccionHero'
import { TarjetaResumen } from '../components/ui/TarjetaResumen'

const modulos = [
  {
    titulo: 'Carteleras UFC',
    descripcion: 'Consulta eventos, peleas programadas y contexto general de cada cartelera.',
    enlace: '/eventos',
    boton: 'Ver carteleras',
  },
  {
    titulo: 'Peleadores',
    descripcion: 'Explora la ficha pública de los peleadores y sus estadísticas visibles.',
    enlace: '/peleadores',
    boton: 'Ver peleadores',
  },
  {
    titulo: 'Pronósticos',
    descripcion: 'Descubre en qué peleas hay pronóstico disponible, aunque el detalle se desbloquea más adelante.',
    enlace: '/predicciones',
    boton: 'Ver disponibilidad',
  },
]

export function InicioPagina() {
  return (
    <div className="flex w-full flex-col gap-8">
      <SeccionHero
        etiqueta="Resumen público"
        titulo="Explora UFC sin registrarte y entra cuando quieras apostar"
        descripcion="Puedes recorrer carteleras, peleadores y saber dónde existe pronóstico disponible. Para apostar, gestionar tu saldo o ver funciones privadas, necesitarás una cuenta."
      />

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <TarjetaResumen
          titulo="Explora con cuenta"
          descripcion="La parte principal del producto es pública para que el usuario conozca la plataforma antes de registrarse."
          contenido={
            <div className="flex flex-wrap gap-3">
              <Link className="inline-flex rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400" to="/eventos">
                Ir a carteleras
              </Link>
              <Link className="inline-flex rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-red-400/60" to="/peleadores">
                Explorar peleadores
              </Link>
            </div>
          }
        />

        <TarjetaResumen
          titulo="Acceso privado"
          descripcion="El registro se activa por correo y permite apostar, revisar historial, administrar saldo y acceder al panel administrador si corresponde."
          contenido={
            <div className="flex flex-wrap gap-3">
              <Link className="inline-flex rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-red-400/60" to="/iniciar-sesion">
                Iniciar sesión
              </Link>
              <Link className="inline-flex rounded-full bg-black px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-red-100" to="/registro">
                Crear cuenta
              </Link>
            </div>
          }
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {modulos.map((modulo) => (
          <TarjetaResumen
            key={modulo.titulo}
            titulo={modulo.titulo}
            descripcion={modulo.descripcion}
            contenido={
              <Link className="inline-flex rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400" to={modulo.enlace}>
                {modulo.boton}
              </Link>
            }
          />
        ))}
      </section>
    </div>
  )
}
