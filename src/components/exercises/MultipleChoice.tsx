import { useMemo, useState } from 'react'
import type { Grade, VocabEntry } from '@/types'
import { getVocab } from '@/content'
import { distractors, shuffle, type SessionItem } from '@/lib/session'

/**
 * Elegir entre cuatro. Es el formato de entrada: se usa mientras la palabra
 * es nueva y se abandona en cuanto se asienta.
 */
export default function MultipleChoice({
  item,
  onGraded,
}: {
  item: SessionItem
  onGraded: (grade: Grade) => void
}) {
  const vocab = getVocab(item.card.sourceId)
  /** En «reconocer» se ve el griego y se eligen significados; al revés en «producir». */
  const showGreek = item.card.kind === 'vocab-reconocer'
  const [picked, setPicked] = useState<string | null>(null)

  const label = (v: VocabEntry) => (showGreek ? v.es[0]! : v.greek)

  const options = useMemo(() => {
    if (!vocab) return []
    const target = label(vocab)
    const pool = distractors(vocab, item.card.capsuleId, 8)
      // Descarta alternativas que dirían lo mismo que la respuesta correcta.
      .filter((v) => label(v) !== target)
      .slice(0, 3)
    return shuffle([vocab, ...pool])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.card.id])

  if (!vocab) return <p className="vacio">Falta el vocabulario de esta tarjeta.</p>

  const answered = picked !== null
  const correct = picked === vocab.id

  return (
    <>
      <div className="prompt">
        <div className="prompt__hint">
          {showGreek ? '¿Qué significa?' : '¿Cómo se dice en griego?'}
        </div>
        {showGreek ? (
          <>
            <div className="prompt__greek griego">{vocab.greek}</div>
            {vocab.info && <div className="prompt__sub griego">{vocab.info}</div>}
          </>
        ) : (
          <div className="prompt__es">{vocab.es[0]}</div>
        )}
      </div>

      <div className="options">
        {options.map((option) => {
          const isTarget = option.id === vocab.id
          const classes = ['option']
          if (!showGreek) classes.push('griego')
          if (answered) {
            if (isTarget) classes.push('option--correcta')
            else if (option.id === picked) classes.push('option--fallada')
            else classes.push('option--atenuada')
          }
          return (
            <button
              key={option.id}
              type="button"
              className={classes.join(' ')}
              disabled={answered}
              onClick={() => setPicked(option.id)}
            >
              {label(option)}
            </button>
          )
        })}

        {answered && (
          <>
            {!correct && (
              <div className="veredicto veredicto--mal">
                <strong className="griego">{vocab.greek}</strong>{' '}
                <span className="muted">— {vocab.es.join(', ')}</span>
              </div>
            )}
            <button
              type="button"
              className="btn btn--primary btn--wide"
              onClick={() => onGraded(correct ? 3 : 1)}
            >
              Continuar
            </button>
          </>
        )}
      </div>
    </>
  )
}
