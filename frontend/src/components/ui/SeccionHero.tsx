type SeccionHeroProps = {
  etiqueta: string
  titulo: string
  descripcion: string
}


export function SeccionHero({ etiqueta, titulo, descripcion }: SeccionHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
      <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-red-500/10 blur-2xl" />

      <div className="relative z-10 max-w-3xl">
        <span className="inline-block text-xs font-bold uppercase tracking-widest text-red-700 font-bold">
          {etiqueta}
        </span>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          {titulo}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
          {descripcion}
        </p>
      </div>
    </div>
  )
}