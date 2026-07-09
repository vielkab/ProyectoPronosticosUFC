import { TarjetaResumen } from '../components/ui/TarjetaResumen'

export function PrediccionesPagina() {
  return (
    <div className="grid w-full gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <TarjetaResumen
        titulo="Pronóstico del combate"
        descripcion="Ejemplo del formato esperado por el motor basado en reglas."
        contenido={
          <div className="flex flex-col gap-3 text-slate-200">
            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
              <span>Peleador A</span>
              <strong className="text-2xl text-white">64%</strong>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
              <span>Peleador B</span>
              <strong className="text-2xl text-white">36%</strong>
            </div>
          </div>
        }
      />

      <TarjetaResumen
        titulo="Variables del modelo"
        descripcion="Factores definidos en `AGENTS.md`."
        contenido={
          <ul className="m-0 flex list-none flex-col gap-3 p-0 text-slate-200">
            <li>Victorias recientes</li>
            <li>Derrotas recientes</li>
            <li>Porcentaje de finalizaciones</li>
            <li>Racha actual</li>
            <li>Ranking e historial</li>
          </ul>
        }
      />
    </div>
  )
}
