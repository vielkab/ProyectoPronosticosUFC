import { Link } from 'react-router-dom'

import { TarjetaResumen } from '../components/ui/TarjetaResumen'
import { useAutenticacion } from '../hooks/useAutenticacion'

export function PrediccionesPagina() {
  const { autenticado } = useAutenticacion()

  return (
    <div className="grid w-full gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <TarjetaResumen
        titulo="Hay pronóstico disponible"
        descripcion="El sistema ya detectó que existen peleas con análisis listo, pero el detalle se reserva para el flujo de apuesta."
        contenido={
          <div className="space-y-4 text-slate-200">
            <p>
              Los porcentajes exactos no se muestran todavía en esta pantalla. El usuario podrá desbloquearlos al agregar la pelea a su cupón de apuesta.
            </p>
            {autenticado ? (
              <p className="rounded-2xl bg-white/5 px-4 py-3">
                Próximamente podrás desbloquear el pronóstico desde el cupón de apuesta.
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                <Link className="inline-flex rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400" to="/registro">
                  Crear cuenta
                </Link>
                <Link className="inline-flex rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-red-400/60" to="/iniciar-sesion">
                  Iniciar sesión
                </Link>
              </div>
            )}
          </div>
        }
      />

      <TarjetaResumen
        titulo="Variables del modelo"
        descripcion="Factores definidos para el motor de reglas del MVP."
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
