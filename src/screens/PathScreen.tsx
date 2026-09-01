import { useEffect, useMemo, useRef } from 'react'
import type { SectionStatus } from '@/lib/session'
import { useStore } from '@/store'
import { currentSection } from '@/lib/session'
import { moduleLabel, sectionLabel } from '@/content'

/**
 * El camino: un scroll continuo de nodos. Cada nodo es una sección y al
 * pulsarlo se practica; los módulos solo aparecen como rótulos que separan
 * tramos. No se entra en un módulo, se atraviesa.
 */
export default function PathScreen({
  onPractice,
}: {
  onPractice: (sectionId: string) => void
}) {
  const { statuses } = useStore()
  const actual = currentSection(statuses)
  const actualRef = useRef<HTMLDivElement>(null)

  // Al abrir la app, deja a la vista el nodo en el que se quedó.
  useEffect(() => {
    actualRef.current?.scrollIntoView({ block: 'center' })
  }, [])

  /** Los nodos van agrupados bajo el rótulo de su módulo. */
  const grupos = useMemo(() => {
    const out: { moduleId: string; label: string; summary?: string; items: SectionStatus[] }[] =
      []
    for (const status of statuses) {
      const last = out.at(-1)
      if (last?.moduleId === status.module.id) {
        last.items.push(status)
      } else {
        out.push({
          moduleId: status.module.id,
          label: moduleLabel(status.module),
          summary: status.module.summary,
          items: [status],
        })
      }
    }
    return out
  }, [statuses])

  if (statuses.length === 0) {
    return (
      <div className="screen">
        <div className="vacio">
          <div className="vacio__icono">🏛️</div>
          <p>
            Aún no hay contenido. Añade un módulo en <code>src/content/modules/</code>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="screen camino">
      {grupos.map((grupo) => (
        <section key={grupo.moduleId}>
          <header className="camino__rotulo">
            <span className="camino__rotulo-texto">{grupo.label}</span>
            {grupo.summary && <p className="camino__rotulo-sub">{grupo.summary}</p>}
          </header>

          {grupo.items.map((status, i) => (
            <Nodo
              key={status.section.id}
              status={status}
              posicion={i}
              esActual={status.section.id === actual?.section.id}
              ref={status.section.id === actual?.section.id ? actualRef : undefined}
              onPractice={onPractice}
            />
          ))}
        </section>
      ))}

      <div className="camino__fin">
        <span>Fin del camino por ahora</span>
      </div>
    </div>
  )
}

/** Zigzag: centro, derecha, centro, izquierda. */
const OFFSETS = [0, 58, 0, -58]

function Nodo({
  status,
  posicion,
  esActual,
  onPractice,
  ref,
}: {
  status: SectionStatus
  posicion: number
  esActual: boolean
  onPractice: (sectionId: string) => void
  ref?: React.Ref<HTMLDivElement>
}) {
  const vacia = status.total === 0
  const disponible = status.unlocked && !vacia
  const pct = Math.round((status.mastery ?? 0) * 100)

  const clases = ['nodo']
  if (status.completed) clases.push('nodo--completado')
  else if (esActual && disponible) clases.push('nodo--actual')
  if (!status.unlocked) clases.push('nodo--bloqueado')
  if (vacia) clases.push('nodo--vacio')

  return (
    <div
      className="camino__parada"
      style={{ transform: `translateX(${OFFSETS[posicion % OFFSETS.length]}px)` }}
      ref={ref}
    >
      {esActual && disponible && !status.completed && (
        <span className="nodo__banderin">Empezar</span>
      )}

      <button
        type="button"
        className={clases.join(' ')}
        disabled={!disponible}
        // El anillo exterior muestra lo dominado de la sección.
        style={{ ['--pct' as string]: pct }}
        aria-label={`${sectionLabel(status.section)}${
          status.unlocked ? '' : ' (bloqueada)'
        }`}
        onClick={() => onPractice(status.section.id)}
      >
        <span className="nodo__cara">
          {!status.unlocked ? '🔒' : status.completed ? '✓' : vacia ? '·' : status.section.number}
        </span>
      </button>

      <span className="nodo__etiqueta">{sectionLabel(status.section)}</span>
      {disponible && status.due > 0 && (
        <span className="nodo__aviso">{status.due} por repasar</span>
      )}
    </div>
  )
}
