import { useCallback, useEffect, useState } from 'react'

import { TarjetaResumen } from '../components/ui/TarjetaResumen'
import {
  listarPeleadores,
  type PeleadorResumen,
} from '../services/mvp'
import { obtenerMensajeError } from '../utils/errores'

const CATEGORIAS = [
  { valor: 'Flyweight', etiqueta: 'Peso mosca' },
  { valor: 'Bantamweight', etiqueta: 'Peso gallo' },
  { valor: 'Featherweight', etiqueta: 'Peso pluma' },
  { valor: 'Lightweight', etiqueta: 'Peso ligero' },
  { valor: 'Welterweight', etiqueta: 'Peso welter' },
  { valor: 'Middleweight', etiqueta: 'Peso medio' },
  { valor: 'Light Heavyweight', etiqueta: 'Peso semipesado' },
  { valor: 'Heavyweight', etiqueta: 'Peso pesado' },
  { valor: "Women's Strawweight", etiqueta: 'Paja femenino' },
  { valor: "Women's Flyweight", etiqueta: 'Mosca femenino' },
  { valor: "Women's Bantamweight", etiqueta: 'Gallo femenino' },
  { valor: "Women's Featherweight", etiqueta: 'Pluma femenino' },
]

export function PeleadoresPagina() {
  const [peleadores, setPeleadores] = useState<PeleadorResumen[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('Lightweight')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargarPeleadores = useCallback(async (termino: string, categoriaSeleccionada: string) => {
    setCargando(true)
    setError('')

    try {
      const data = await listarPeleadores(termino, categoriaSeleccionada)
      setPeleadores(data)
    } catch (error) {
      setPeleadores([])
      setError(obtenerMensajeError(error, 'No se pudieron cargar los peleadores desde API-SPORTS.'))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      cargarPeleadores(busqueda, categoria)
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [busqueda, cargarPeleadores, categoria])

  return (
    <div className="flex w-full flex-col gap-6">
      <header>
        <h2 className="m-0 text-3xl font-black text-white">Peleadores</h2>
        <p className="mt-3 max-w-2xl text-slate-300">Ficha base y estadisticas relevantes para alimentar el pronostico heuristico.</p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-red-400"
          value={categoria}
          onChange={(event) => setCategoria(event.target.value)}
        >
          {CATEGORIAS.map((opcion) => (
            <option className="bg-slate-950 text-white" key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))}
        </select>
        <input
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-red-400"
          placeholder="Buscar peleador"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
        />
      </div>

      {cargando && <p className="text-slate-300">Cargando peleadores...</p>}
      {error && <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-red-100">{error}</p>}

      <section className="grid gap-6 lg:grid-cols-3">
        {peleadores.map((peleador) => (
          <TarjetaResumen
            key={peleador.id}
            titulo={peleador.nombre}
            descripcion={`${peleador.division || 'Division por confirmar'} · ${peleador.pais || 'Pais por confirmar'}`}
            contenido={
              <dl className="grid grid-cols-2 gap-3 text-sm text-slate-200">
                <div><dt className="text-slate-400">Record</dt><dd>{peleador.record}</dd></div>
                <div><dt className="text-slate-400">Edad</dt><dd>{peleador.edad ?? 'N/D'}</dd></div>
                <div><dt className="text-slate-400">Altura</dt><dd>{peleador.altura_cm ? `${peleador.altura_cm} cm` : 'N/D'}</dd></div>
                <div><dt className="text-slate-400">Alcance</dt><dd>{peleador.alcance_cm ? `${peleador.alcance_cm} cm` : 'N/D'}</dd></div>
              </dl>
            }
          />
        ))}
      </section>
    </div>
  )
}
