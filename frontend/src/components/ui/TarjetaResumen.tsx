import type { ReactNode } from 'react'

type TarjetaResumenProps = {
  titulo: string
  descripcion: string
  contenido: ReactNode
}

export function TarjetaResumen({ titulo, descripcion, contenido }: TarjetaResumenProps) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div>
        <h3 className="text-xl font-bold text-slate-900">{titulo}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{descripcion}</p>
      </div>
      {contenido && <div className="mt-6">{contenido}</div>}
    </div>
  )
}