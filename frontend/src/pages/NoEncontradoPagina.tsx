import { Link } from 'react-router-dom'

export function NoEncontradoPagina() {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-col items-center rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.35em] text-red-700">404</p>
      <h2 className="mt-2 text-3xl font-black !text-slate-900">Página no encontrada</h2>
      <p className="mt-3 !text-slate-600">
        La ruta que buscas no existe o todavía no forma parte del MVP.
      </p>
      <Link
        className="mt-6 rounded-full bg-red-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800"
        to="/"
      >
        Volver al inicio
      </Link>
    </section>
  )
}