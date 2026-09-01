import { useState } from 'react'
import type { Grade } from '@/types'
import { getSentence } from '@/content'
import { matchSpanish, wordOverlap } from '@/lib/greek'
import { previewIntervals } from '@/lib/srs'
import type { SessionItem } from '@/lib/session'

const GRADES: { grade: Grade; label: string }[] = [
  { grade: 1, label: 'Otra vez' },
  { grade: 2, label: 'Difícil' },
  { grade: 3, label: 'Bien' },
  { grade: 4, label: 'Fácil' },
]

/**
 * Traducir una frase. Una traducción libre no se puede corregir a máquina, así
 * que la app compara con las versiones aceptadas, sugiere una nota según el
 * parecido y deja la decisión final en manos de quien practica.
 */
export default function Translate({
  item,
  onGraded,
}: {
  item: SessionItem
  onGraded: (grade: Grade) => void
}) {
  const [value, setValue] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [hintShown, setHintShown] = useState(false)

  const sentence = getSentence(item.card.sourceId)
  if (!sentence) return <p className="vacio">Falta la frase de esta tarjeta.</p>

  const intervals = previewIntervals(item.progress)
  const exact = matchSpanish(value, sentence.es)
  const overlap = Math.max(...sentence.es.map((e) => wordOverlap(value, e)), 0)
  const suggested: Grade = exact || overlap >= 0.8 ? 3 : overlap >= 0.5 ? 2 : 1

  return (
    <>
      <div className="prompt">
        <div className="prompt__hint">Traduce al español</div>
        <div className="prompt__greek prompt__greek--sentence griego">{sentence.greek}</div>
      </div>

      <textarea
        className="answer"
        rows={3}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        readOnly={revealed}
        placeholder="Tu traducción…"
        aria-label="Tu traducción"
      />

      {sentence.hint && !revealed && (
        <button
          type="button"
          className="btn btn--ghost btn--wide small"
          style={{ marginTop: 8, minHeight: 40 }}
          onClick={() => setHintShown(true)}
        >
          {hintShown ? sentence.hint : 'Ver pista'}
        </button>
      )}

      {revealed && (
        <div
          className={`veredicto veredicto--${
            suggested === 3 ? 'ok' : suggested === 2 ? 'casi' : 'mal'
          }`}
        >
          <div className="small muted">Traducción de referencia</div>
          {sentence.es.map((option) => (
            <div key={option}>{option}</div>
          ))}
          {sentence.notes && <div className="small muted">{sentence.notes}</div>}
        </div>
      )}

      <div className="options">
        {revealed ? (
          <>
            <div className="small muted" style={{ textAlign: 'center' }}>
              ¿Cómo de cerca estuviste?
            </div>
            <div className="grades">
              {GRADES.map(({ grade, label }) => (
                <button
                  key={grade}
                  type="button"
                  className={`grade grade--${grade}`}
                  style={
                    grade === suggested
                      ? { borderColor: 'var(--accent)', borderWidth: 2 }
                      : undefined
                  }
                  onClick={() => onGraded(grade)}
                >
                  <span>{label}</span>
                  <span className="grade__hint">{intervals[grade]}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <button
            type="button"
            className="btn btn--primary btn--wide"
            onClick={() => setRevealed(true)}
          >
            Comprobar
          </button>
        )}
      </div>
    </>
  )
}
