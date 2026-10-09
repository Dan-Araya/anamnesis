import type { Capsule } from '@/types'
import { lettersSummary } from '@/content'

/**
 * Segunda línea del título de una cápsula: sus letras nuevas en mayúscula,
 * separadas por puntos medios («Α · Β · Γ»). Se deriva de `capsule.letters` y
 * se oculta del lector de pantalla: el nombre accesible completo lo aporta el
 * botón o el encabezado que la acompaña. Una cápsula sin letras no pinta nada.
 */
export default function CapsuleGreekLine({ capsule }: { capsule: Capsule }) {
  const summary = lettersSummary(capsule)
  if (!summary) return null
  return (
    <span className="capsule-greek-line griego" aria-hidden="true">
      {summary}
    </span>
  )
}
