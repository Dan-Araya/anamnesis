import { useMemo, useRef, useState } from 'react'
import type { Grade } from '@/types'
import { useStore } from '@/store'
import { buildSession, pickMode, type SessionItem } from '@/lib/session'
import MultipleChoice from '@/components/exercises/MultipleChoice'
import Flashcard from '@/components/exercises/Flashcard'
import TypeAnswer from '@/components/exercises/TypeAnswer'
import Translate from '@/components/exercises/Translate'
import TableDrill from '@/components/exercises/TableDrill'

/** Cuántas veces como mucho puede reaparecer una tarjeta en la misma sesión. */
const MAX_REPETICIONES = 4

/**
 * Una sesión de práctica: una cola de tarjetas que se va consumiendo.
 *
 * Una tarjeta vuelve a la cola mientras siga en aprendizaje, no solo cuando se
 * falla: así el material nuevo se ve un par de veces antes de terminar y llega
 * a graduarse, en lugar de darse por sabido a la primera.
 */
export default function SessionScreen({
  capsuleId,
  onlyReviews,
  onExit,
  onOpenMaterial,
}: {
  capsuleId?: string
  onlyReviews?: boolean
  onExit: () => void
  onOpenMaterial?: (capsuleId: string) => void
}) {
  const { settings, progress, statuses, today, review } = useStore()

  // La cola se fija al entrar: que no se reordene sola mientras respondes.
  const [queue, setQueue] = useState<SessionItem[]>(() =>
    buildSession(progress, settings, statuses, {
      capsuleId,
      onlyReviews,
      newToday: today.newCards,
    }),
  )
  const [index, setIndex] = useState(0)
  const [answered, setAnswered] = useState({ total: 0, correct: 0 })
  const repeticiones = useRef(new Map<string, number>())
  const startedAt = useRef(Date.now())
  const shownAt = useRef(Date.now())

  const item = queue[index]

  const handleGraded = async (grade: Grade) => {
    if (!item) return
    const durationMs = Date.now() - shownAt.current
    shownAt.current = Date.now()

    const next = await review({ card: item.card, grade, mode: item.mode, durationMs })
    setAnswered((a) => ({ total: a.total + 1, correct: a.correct + (grade > 1 ? 1 : 0) }))

    const vistas = repeticiones.current.get(item.card.id) ?? 1
    const sinAsentar = next.state === 'aprendiendo' || next.state === 'reaprendiendo'

    if (sinAsentar && vistas < MAX_REPETICIONES) {
      repeticiones.current.set(item.card.id, vistas + 1)
      setQueue((q) => [
        ...q,
        { card: item.card, progress: next, mode: pickMode(item.card, next), isNew: false },
      ])
    }

    setIndex((i) => i + 1)
  }

  if (!item) {
    return (
      <Resumen
        answered={answered}
        durationMs={Date.now() - startedAt.current}
        empty={queue.length === 0}
        capsuleId={capsuleId}
        onExit={onExit}
        onOpenMaterial={onOpenMaterial}
      />
    )
  }

  const done = Math.min(index, queue.length)
  const pct = Math.round((done / queue.length) * 100)

  return (
    <div className="session">
      <div className="session__bar">
        <button type="button" className="btn btn--ghost" onClick={onExit} aria-label="Salir">
          ✕
        </button>
        <div className="bar" style={{ flex: 1 }}>
          <div className="bar__fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="small muted">
          {done}/{queue.length}
        </span>
      </div>

      <div className="session__body">
        <Ejercicio key={`${item.card.id}:${index}`} item={item} onGraded={handleGraded} />
      </div>
    </div>
  )
}

function Ejercicio({
  item,
  onGraded,
}: {
  item: SessionItem
  onGraded: (grade: Grade) => void
}) {
  const { settings } = useStore()

  switch (item.mode) {
    case 'opcion-multiple':
      return <MultipleChoice item={item} onGraded={onGraded} />
    case 'escribir':
      return <TypeAnswer item={item} settings={settings} onGraded={onGraded} />
    case 'traducir':
      return <Translate item={item} onGraded={onGraded} />
    case 'flashcard':
      return <Flashcard item={item} onGraded={onGraded} />
    case 'huecos':
      return <TableDrill item={item} settings={settings} onGraded={onGraded} />
  }
}

function Resumen({
  answered,
  durationMs,
  empty,
  capsuleId,
  onExit,
  onOpenMaterial,
}: {
  answered: { total: number; correct: number }
  durationMs: number
  empty: boolean
  capsuleId?: string
  onExit: () => void
  onOpenMaterial?: (capsuleId: string) => void
}) {
  const accuracy = answered.total
    ? Math.round((answered.correct / answered.total) * 100)
    : 0
  const minutes = Math.max(1, Math.round(durationMs / 60000))

  const mensaje = useMemo(() => {
    if (empty) return 'No hay nada pendiente ahora mismo.'
    if (accuracy >= 90) return '¡Excelente!'
    if (accuracy >= 70) return 'Buen trabajo.'
    return 'Sesión terminada. Lo fallado vuelve pronto.'
  }, [accuracy, empty])

  return (
    <div className="screen screen--full">
      <div className="vacio">
        <div className="vacio__icono">{empty ? '🏛️' : '✓'}</div>
        <h2 style={{ color: 'var(--text)' }}>{mensaje}</h2>
      </div>

      {!empty && (
        <div className="metricas">
          <div className="card">
            <div className="metrica__valor">{answered.total}</div>
            <div className="metrica__label">respuestas</div>
          </div>
          <div className="card">
            <div className="metrica__valor">{accuracy}%</div>
            <div className="metrica__label">aciertos</div>
          </div>
          <div className="card">
            <div className="metrica__valor">{minutes}</div>
            <div className="metrica__label">minutos</div>
          </div>
          <div className="card">
            <div className="metrica__valor">{answered.correct}</div>
            <div className="metrica__label">correctas</div>
          </div>
        </div>
      )}

      <div className="stack" style={{ marginTop: 20 }}>
        <button type="button" className="btn btn--primary btn--wide" onClick={onExit}>
          Volver al camino
        </button>
        {capsuleId && onOpenMaterial && (
          <button
            type="button"
            className="btn btn--wide"
            onClick={() => onOpenMaterial(capsuleId)}
          >
            Ver el material de esta cápsula
          </button>
        )}
      </div>
    </div>
  )
}
