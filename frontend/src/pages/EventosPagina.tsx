import { useEffect, useState } from 'react'

import { TarjetaResumen } from '../components/ui/TarjetaResumen'
import { listarEventos, obtenerEvento, type EventoDetalle, type EventoResumen } from '../services/mvp'

export function EventosPagina() {
  const [eventos, setEventos] = useState<EventoResumen[]>([])
  const [detalles, setDetalles] = useState<Record<number, EventoDetalle>>({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    listarEventos()
      .then(async (items) => {
        setEventos(items)
        const primerosDetalles = await Promise.all(items.slice(0, 4).map((evento) => obtenerEvento(evento.id)))
        setDetalles(Object.fromEntries(primerosDetalles.map((evento) => [evento.id, evento])))
      })
      .catch(() => setError('No se pudieron cargar los eventos.'))
      .finally(() => setCargando(false))
  }, [])

  return (
    <div className="flex w-full flex-col gap-6">
      <header>
        <h2 className="m-0 text-3xl font-black text-white">Carteleras UFC</h2>
        <p className="mt-3 max-w-2xl text-slate-300">Eventos próximos y finalizados sincronizados desde el backend.</p>
      </header>

      {cargando && <p className="text-slate-300">Cargando eventos...</p>}
      {error && <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-red-100">{error}</p>}

      <section className="grid gap-6 lg:grid-cols-2">
        {eventos.map((evento) => (
          <TarjetaResumen
            key={evento.id}
            titulo={evento.nombre}
            descripcion={`${new Date(`${evento.fecha}T00:00:00`).toLocaleDateString()} · ${evento.sede || 'Sede por confirmar'} · ${evento.estado}`}
            contenido={
              <div className="space-y-3 text-slate-200">
                <p>{detalles[evento.id]?.peleas.length ?? 0} peleas registradas en la cartelera.</p>
                {detalles[evento.id]?.peleas.slice(0, 3).map((pelea) => (
                  <p key={pelea.id} className="rounded-lg bg-white/5 px-3 py-2 text-sm">
                    Pelea #{pelea.orden}: {pelea.division || 'División por confirmar'} · {pelea.estado}
                  </p>
                ))}
              </div>
            }
          />
        ))}
      </section>
    </div>
  )
}
