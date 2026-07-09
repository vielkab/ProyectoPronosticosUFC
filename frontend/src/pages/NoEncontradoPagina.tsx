import { Link } from 'react-router-dom'

export function NoEncontradoPagina() {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-col items-center rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 text-center">
      <p className="text-sm uppercase tracking-[0.35em] text-red-300">404</p>
      <h2 className="mt-4 text-4xl font-black text-white">Página no encontrada</h2>
      <p className="mt-4 text-slate-300">La ruta que buscas no existe o todavía no forma parte del MVP.</p>
      <Link className="mt-6 rounded-full bg-red-500 px-5 py-3 font-semibold text-white transition hover:bg-red-400" to="/">
        Volver al inicio
      </Link>
    </section>
  )
}
