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
      <span className="text-sm font-medium text-slate-200">{etiqueta}</span>
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-red-400">
        <input
          className="w-full bg-transparent text-white outline-none"
          id={id}
          placeholder={placeholder}
          type={visible ? 'text' : 'password'}
          {...registro}
        />
        <button
          className="text-sm font-medium text-red-300 transition hover:text-red-200"
          onClick={() => setVisible((valor) => !valor)}
          type="button"
        >
          {visible ? 'Ocultar' : 'Ver'}
        </button>
      </div>
      {error ? <span className="text-sm text-red-300">{error}</span> : null}
    </label>
  )
}
