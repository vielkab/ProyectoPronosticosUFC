import { TarjetaResumen } from '../components/ui/TarjetaResumen'

const bloquesAdmin = [
  'Sincronizar API Sports',
  'Actualizar resultados',
  'Consultar usuarios',
  'Consultar apuestas',
]

export function AdminPagina() {
  return (
    <div className="flex w-full flex-col gap-6">
      <header>
        <h2 className="m-0 text-3xl font-black text-white">Dashboard administrador</h2>
        <p className="mt-3 max-w-2xl text-slate-300">Sección reservada para operaciones administrativas del MVP con control por rol.</p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        {bloquesAdmin.map((bloque) => (
          <TarjetaResumen
            key={bloque}
            titulo={bloque}
            descripcion="Acción administrativa del MVP"
            contenido={<p className="text-slate-200">Pendiente conectar permisos y endpoints del backend.</p>}
          />
        ))}
      </section>
    </div>
  )
}
