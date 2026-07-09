import { TarjetaResumen } from '../components/ui/TarjetaResumen'

const eventosDemo = [
  { nombre: 'UFC Fight Night', fecha: '20 jul 2026', sede: 'Las Vegas' },
  { nombre: 'UFC 319', fecha: '02 ago 2026', sede: 'Abu Dhabi' },
]

export function EventosPagina() {
  return (
    <div className="flex w-full flex-col gap-6">
      <header>
        <h2 className="m-0 text-3xl font-black text-white">Carteleras UFC</h2>
        <p className="mt-3 max-w-2xl text-slate-300">Esta pantalla queda preparada para conectar con `GET /eventos` y luego cargar datos sincronizados desde API-Sports.</p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        {eventosDemo.map((evento) => (
          <TarjetaResumen
            key={`${evento.nombre}-${evento.fecha}`}
            titulo={evento.nombre}
            descripcion={`${evento.fecha} · ${evento.sede}`}
            contenido={<p className="text-slate-200">Próximamente mostraremos peleas, cuotas y pronósticos asociados.</p>}
          />
        ))}
      </section>
    </div>
  )
}
