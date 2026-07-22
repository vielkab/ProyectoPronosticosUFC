import { useId, useState } from 'react'

type CampoPasswordProps = {
  etiqueta: string
  error?: string
  registro: Record<string, unknown>
  placeholder?: string
}

export function CampoPassword({
  etiqueta,
  error,
  registro,
  placeholder,
}: CampoPasswordProps) {
  const [visible, setVisible] = useState(false)
  const id = useId()

  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold !text-slate-700">{etiqueta}</span>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm focus-within:border-red-700 focus-within:ring-1 focus-within:ring-red-700">
        <input
          className="w-full bg-transparent !text-slate-900 outline-none placeholder:text-slate-400"
          id={id}
          placeholder={placeholder}
          type={visible ? 'text' : 'password'}
          {...registro}
        />
        <button
          className="text-sm font-semibold !text-slate-500 transition hover:!text-red-700"
          onClick={() => setVisible((valor) => !valor)}
          type="button"
        >
          {visible ? 'Ocultar' : 'Ver'}
        </button>
      </div>
      {error ? <span className="text-sm font-medium !text-red-700">{error}</span> : null}
    </label>
  )
}