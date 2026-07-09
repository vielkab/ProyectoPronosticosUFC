import { TarjetaResumen } from '../components/ui/TarjetaResumen'

const historialDemo = [
  { pelea: 'Topuria vs Holloway', estado: 'Pendiente', monto: '$10.00' },
  { pelea: 'Pereira vs Ankalaev', estado: 'Ganada', monto: '$18.00' },
]

export function HistorialApuestasPagina() {
  return (
    <div className="flex w-full flex-col gap-6">
      <header>
        <h2 className="m-0 text-3xl font-black text-white">Historial de apuestas</h2>
        <p className="mt-3 text-slate-300">La interfaz ya está lista para conectarse a `GET /apuestas/historial`.</p>
      </header>

      <section className="grid gap-6">
        {historialDemo.map((apuesta) => (
          <TarjetaResumen
            key={`${apuesta.pelea}-${apuesta.estado}`}
            titulo={apuesta.pelea}
            descripcion={`Estado: ${apuesta.estado}`}
            contenido={<p className="text-slate-200">Monto registrado: {apuesta.monto}</p>}
          />
        ))}
      </section>
    </div>
  )
}
