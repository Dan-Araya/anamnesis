import { useEffect, useMemo, useRef } from 'react'
import type { ModuleContent } from '@/types'
import type { CapsuleStatus } from '@/lib/session'
import { useStore } from '@/store'
import { currentCapsule } from '@/lib/session'
import { Column, Laurel, LockIcon } from '@/components/GreekOrnament'

/** Dos niveles visibles: módulos y cápsulas. Los ids de práctica se conservan. */
export default function PathScreen({ onPractice }: {
  onPractice: (capsuleId: string) => void
}) {
  const { statuses, streak } = useStore()
  const actual = currentCapsule(statuses)
  const grupos = useMemo(() => agrupar(statuses), [statuses])
  const refScreen = useRef<HTMLDivElement>(null)
  const refActual = useRef<HTMLElement>(null)

  // El camino arranca donde está el usuario: si su módulo queda fuera de la
  // vista, la pantalla salta a él en vez de obligar a deslizar cada día.
  useEffect(() => {
    const screen = refScreen.current
    const el = refActual.current
    if (!screen || !el) return
    const s = screen.getBoundingClientRect()
    const e = el.getBoundingClientRect()
    if (e.top < s.top || e.top >= s.bottom) {
      screen.scrollTop += e.top - s.top - 12
    }
  }, [])

  return (
    <div className="screen camino" ref={refScreen}>
      <header className="marble-heading">
        <div className="marble-heading__top">
          <span className="eyebrow">ἀνάμνησις</span>
          <span className="streak" aria-label={`Racha de ${streak} ${streak === 1 ? 'día' : 'días'}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2c1 6-6 6-4 11 2-1 3-3 3-5 5 4 8 7 5 11-4 5-12 2-12-4 0-5 5-7 8-13Z" /></svg>
            {streak} {streak === 1 ? 'día' : 'días'}
          </span>
        </div>
        <div className="marble-heading__brand">
          <Laurel className="brand-laurel" />
          <h1>Anamnesis</h1>
          <Column className="brand-column" />
        </div>
        <p>Un poco de griego, cada día</p>
        <div className="greek-divider" aria-hidden="true"><span>✦</span></div>
      </header>

      <div className="path-intro"><span className="eyebrow">Tu camino</span><span>Cápsula a cápsula</span></div>
      {grupos.map((grupo) => {
        const completed = grupo.items.filter(s => s.completed).length
        const total = grupo.items.filter(s => s.total > 0).length
        return (
          <section className="learning-module" key={grupo.module.id} aria-labelledby={`module-${grupo.module.id}`}
            ref={actual?.module.id === grupo.module.id ? refActual : undefined}>
            <header className="module-heading">
              <div>
                <h2 id={`module-${grupo.module.id}`}>Módulo {grupo.module.number}</h2>
                {grupo.module.title && <p className="module-heading__title">{grupo.module.title}</p>}
                {grupo.module.summary && <p className="module-heading__summary">{grupo.module.summary}</p>}
                <span className="module-heading__meta">{completed} de {total} cápsulas completadas</span>
              </div>
              <Laurel className={`module-heading__laurel ${completed === total && total > 0 ? 'is-complete' : ''}`} />
            </header>
            <CapsulePath moduleId={grupo.module.id} items={grupo.items} currentId={actual?.capsule.id} onPractice={onPractice} />
          </section>
        )
      })}
      <div className="camino__fin"><Laurel /><p>{statuses.length ? 'Cada paso deja huella.' : 'El camino estará disponible cuando haya contenido.'}</p><span>{statuses.length > 0 && 'Vuelve mañana y sigue construyendo lo aprendido.'}</span></div>
    </div>
  )
}

interface Grupo {
  module: ModuleContent
  items: CapsuleStatus[]
}

function agrupar(statuses: CapsuleStatus[]): Grupo[] {
  const grupos: Grupo[] = []
  for (const status of statuses) {
    let grupo = grupos.at(-1)
    if (grupo?.module.id !== status.module.id) {
      grupo = { module: status.module, items: [] }
      grupos.push(grupo)
    }
    grupo.items.push(status)
  }
  return grupos
}

// Las coordenadas del sendero y de los botones comparten la misma geometría.
const PATH_X = [30, 68, 60, 30]
const STEP_HEIGHT = 192
const NODE_CENTER = 64

function CapsulePath({ moduleId, items, currentId, onPractice }: {
  moduleId: string;
  items: CapsuleStatus[]; currentId?: string; onPractice: (id: string) => void
}) {
  // Solo presentación: estos huecos no generan tarjetas ni entran en el SRS.
  const slots = Array.from({ length: Math.max(4, items.length) }, (_, i) => items[i])
  const points = slots.map((_, i) => ({ x: PATH_X[i % PATH_X.length]! * 3.6, y: NODE_CENTER + i * STEP_HEIGHT }))
  const curve = points.map((point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`
    const prev = points[i - 1]!
    const middle = (prev.y + point.y) / 2
    return `C ${prev.x} ${middle}, ${point.x} ${middle}, ${point.x} ${point.y}`
  }).join(' ')

  return (
    <div className="capsule-path">
      <svg className="capsule-path__curve" viewBox={`0 0 360 ${slots.length * STEP_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
        <path className="capsule-path__edge" d={curve} />
        <path className="capsule-path__stone" d={curve} />
        <path className="capsule-path__inlay" d={curve} />
      </svg>
      <ol className="capsule-path__stops">
        {slots.map((status, index) => {
          const placeholder = !status || status.total === 0
          const available = !placeholder && status.unlocked
          const current = available && status.capsule.id === currentId && !status.completed
          const label = status?.capsule.title ?? `Cápsula ${index + 1}`
          const pct = Math.round((status?.mastery ?? 0) * 100)
          return (
            <li className="capsule-stop" key={status?.capsule.id ?? `preview-${moduleId}-${index}`}>
              <div className="capsule-stop__position" style={{ left: `${PATH_X[index % PATH_X.length]}%` }}>
                {current && <span className="capsule-stop__flag">Tu siguiente paso</span>}
                <button type="button"
                  className={`capsule-medallion ${!available ? 'capsule-medallion--locked' : ''} ${placeholder ? 'capsule-medallion--placeholder' : ''}`}
                  disabled={!available}
                  aria-label={`${label}${placeholder ? ' (próximamente)' : !available ? ' (bloqueada)' : ''}`}
                  aria-describedby={`capsule-state-${status?.capsule.id ?? `preview-${moduleId}-${index}`}`}
                  style={{ ['--pct' as string]: pct }}
                  onClick={() => available && onPractice(status.capsule.id)}>
                  <span className="capsule-medallion__face">
                    <span className="capsule-medallion__number">{index + 1}</span>
                    {placeholder ? <span className="capsule-medallion__glyph" aria-hidden="true">···</span> : !available ? <LockIcon /> : status.completed ? <span className="capsule-medallion__check">✓</span> : <span className="capsule-medallion__glyph" aria-hidden="true">{['α', 'β', 'γ', 'δ'][index % 4]}</span>}
                  </span>
                </button>
                <div className="capsule-stop__label">
                  <h3>{label}</h3>
                  <span id={`capsule-state-${status?.capsule.id ?? `preview-${moduleId}-${index}`}`}>
                    {placeholder ? 'Próximamente' : !available ? 'Por desbloquear' : status.due > 0 ? `${status.due} por repasar` : status.completed ? 'Completada · repasar' : status.started > 0 ? 'Continuar' : 'Empezar'}
                  </span>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
