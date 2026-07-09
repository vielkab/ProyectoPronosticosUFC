import type { ReactNode } from 'react'

type TarjetaResumenProps = {
  titulo: string
  descripcion: string
  contenido: ReactNode
}

export function TarjetaResumen({ titulo, descripcion, contenido }: TarjetaResumenProps) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur">
      <div className="mb-4">
        <h2 className="m-0 text-xl font-bold text-white">{titulo}</h2>
        <p className="mt-2 text-sm text-slate-300">{descripcion}</p>
      </div>
      <div>{contenido}</div>
    </article>
  )
}
