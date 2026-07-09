import { TarjetaResumen } from '../components/ui/TarjetaResumen'
import { formatearMoneda } from '../utils/formatos'

export function BilleteraPagina() {
  return (
    <div className="grid w-full gap-6 lg:grid-cols-2">
      <TarjetaResumen
        titulo="Saldo disponible"
        descripcion="El usuario podrá consultar su saldo y movimientos."
        contenido={<p className="text-4xl font-black text-white">{formatearMoneda(0)}</p>}
      />
      <TarjetaResumen
        titulo="Recarga con Stripe"
        descripcion="Preparado para Checkout Session o Payment Intent en Sandbox."
        contenido={<p className="text-slate-200">En la siguiente fase conectaremos la creación del pago y el webhook seguro.</p>}
      />
    </div>
  )
}
