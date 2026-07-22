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
        <h2 className="m-0 text-3xl font-black !text-slate-900">Peleadores</h2>
        <p className="mt-3 max-w-2xl !text-slate-600">
          Ficha base y estadísticas relevantes para alimentar el pronóstico heurístico.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium !text-slate-900 shadow-sm outline-none transition focus:border-red-700 focus:ring-1 focus:ring-red-700"
          value={categoria}
          onChange={(event) => setCategoria(event.target.value)}
        >
          {CATEGORIAS.map((opcion) => (
            <option className="bg-white text-slate-900" key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))}
        </select>
        <input
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm !text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-red-700 focus:ring-1 focus:ring-red-700"
          placeholder="Buscar peleador"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
        />
      </div>

      {cargando && <p className="!text-slate-600">Cargando peleadores...</p>}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium !text-red-700">{error}</p>
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-3">
        {peleadores.map((peleador) => (
          <TarjetaResumen
            key={peleador.id}
            titulo={peleador.nombre}
            descripcion={`${peleador.division || 'División por confirmar'} · ${peleador.pais || 'País por confirmar'}`}
            contenido={
              <dl className="grid grid-cols-2 gap-3 text-sm !text-slate-800">
                <div>
                  <dt className="text-xs font-semibold !text-slate-500">Récord</dt>
                  <dd className="font-medium">{peleador.record}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold !text-slate-500">Edad</dt>
                  <dd className="font-medium">{peleador.edad ?? 'N/D'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold !text-slate-500">Altura</dt>
                  <dd className="font-medium">{peleador.altura_cm ? `${peleador.altura_cm} cm` : 'N/D'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold !text-slate-500">Alcance</dt>
                  <dd className="font-medium">{peleador.alcance_cm ? `${peleador.alcance_cm} cm` : 'N/D'}</dd>
                </div>
              </dl>
            }
          />
        ))}
      </section>
    </div>
  )
}