import { TarjetaResumen } from '../components/ui/TarjetaResumen'

const peleadoresDemo = [
  { nombre: 'Ilia Topuria', division: 'Peso ligero', pais: 'España/Georgia' },
  { nombre: 'Merab Dvalishvili', division: 'Peso gallo', pais: 'Georgia' },
  { nombre: 'Alex Pereira', division: 'Peso semipesado', pais: 'Brasil' },
]

export function PeleadoresPagina() {
  return (
    <div className="flex w-full flex-col gap-6">
      <header>
        <h2 className="m-0 text-3xl font-black text-white">Peleadores</h2>
        <p className="mt-3 max-w-2xl text-slate-300">La vista ya está lista para listar, buscar y navegar al detalle de estadísticas del peleador.</p>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        {peleadoresDemo.map((peleador) => (
          <TarjetaResumen
            key={peleador.nombre}
            titulo={peleador.nombre}
            descripcion={`${peleador.division} · ${peleador.pais}`}
            contenido={<p className="text-slate-200">Pendiente conectar con `/peleadores` y búsqueda por nombre.</p>}
          />
        ))}
      </section>
    </div>
  )
}
