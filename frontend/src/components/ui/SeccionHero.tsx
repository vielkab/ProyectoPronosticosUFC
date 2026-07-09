type SeccionHeroProps = {
  etiqueta: string
  titulo: string
  descripcion: string
}

export function SeccionHero({ etiqueta, titulo, descripcion }: SeccionHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/60 p-8 shadow-2xl shadow-slate-950/40">
      <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,_rgba(239,68,68,0.22),_transparent_62%)]" />
      <div className="relative max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-red-300">{etiqueta}</p>
        <h2 className="mt-4 text-4xl font-black tracking-tight text-white">{titulo}</h2>
        <p className="mt-4 max-w-2xl text-base text-slate-300">{descripcion}</p>
      </div>
    </section>
  )
}
