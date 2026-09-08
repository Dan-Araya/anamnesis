import { useEffect, useMemo, useRef } from 'react'
import type { ModuleContent, Section } from '@/types'
import type { CapsuleStatus } from '@/lib/session'
import { useStore } from '@/store'
import { currentCapsule } from '@/lib/session'
import { capsuleLabel, moduleLabel, sectionLabel } from '@/content'

/**
 * El camino: un scroll continuo de nodos. Cada nodo es una cápsula y al
 * pulsarlo se practica; módulos y secciones solo aparecen como rótulos que
 * separan tramos. No se entra en ellos, se atraviesan.
 */
export default function PathScreen({
  onPractice,
}: {
  onPractice: (capsuleId: string) => void
}) {
  const { statuses } = useStore()
  const actual = currentCapsule(statuses)
  const actualRef = useRef<HTMLDivElement>(null)

  // Al abrir la app, deja a la vista el nodo en el que se quedó.
  useEffect(() => {
    actualRef.current?.scrollIntoView({ block: 'center' })
  }, [])

  const grupos = useMemo(() => agrupar(statuses), [statuses])

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

  let posicion = 0

  return (
    <div className="screen camino">
      <header className="app-heading">
        <div>
          <div className="app-heading__kicker">ἀνάμνησις</div>
          <h1>Tu camino</h1>
        </div>
        <span className="app-heading__mark griego">α</span>
      </header>
      {grupos.map((grupo) => (
        <section key={grupo.module.id}>
          <header className="camino__rotulo">
            <span className="camino__rotulo-texto">{moduleLabel(grupo.module)}</span>
            {grupo.module.summary && (
              <p className="camino__rotulo-sub">{grupo.module.summary}</p>
            )}
          </header>

          {grupo.secciones.map((bloque) => (
            <div key={bloque.section.id}>
              {/* La sección solo se rotula si el módulo tiene más de una. */}
              {grupo.secciones.length > 1 && (
                <div className="camino__subrotulo">{sectionLabel(bloque.section)}</div>
              )}

              {bloque.items.map((status) => (
                <Nodo
                  key={status.capsule.id}
                  status={status}
                  posicion={posicion++}
                  esActual={status.capsule.id === actual?.capsule.id}
                  ref={status.capsule.id === actual?.capsule.id ? actualRef : undefined}
                  onPractice={onPractice}
                />
              ))}
            </div>
          ))}
        </section>
      ))}

      <div className="camino__fin">
        <span>Fin del camino por ahora</span>
      </div>
    </div>
  )
}

interface Grupo {
  module: ModuleContent
  secciones: { section: Section; items: CapsuleStatus[] }[]
}

/** Reagrupa la lista plana de cápsulas por módulo y sección. */
function agrupar(statuses: CapsuleStatus[]): Grupo[] {
  const grupos: Grupo[] = []

  for (const status of statuses) {
    let grupo = grupos.at(-1)
    if (grupo?.module.id !== status.module.id) {
      grupo = { module: status.module, secciones: [] }
      grupos.push(grupo)
    }

    const bloque = grupo.secciones.at(-1)
    if (bloque?.section.id === status.section.id) {
      bloque.items.push(status)
    } else {
      grupo.secciones.push({ section: status.section, items: [status] })
    }
  }

  return grupos
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
  status: CapsuleStatus
  posicion: number
  esActual: boolean
  onPractice: (capsuleId: string) => void
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
        // El anillo exterior muestra lo dominado de la cápsula.
        style={{ ['--pct' as string]: pct }}
        aria-label={`${capsuleLabel(status.capsule)}${
          status.unlocked ? '' : ' (bloqueada)'
        }`}
        onClick={() => onPractice(status.capsule.id)}
      >
        <span className="nodo__cara">
          {!status.unlocked ? '🔒' : status.completed ? '✓' : vacia ? '·' : status.capsule.number}
        </span>
      </button>

      <span className="nodo__etiqueta">{capsuleLabel(status.capsule)}</span>
      {disponible && status.due > 0 && (
        <span className="nodo__aviso">{status.due} por repasar</span>
      )}
    </div>
  )
}
