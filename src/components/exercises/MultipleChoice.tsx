import GreekWordHelp from '@/components/GreekWordHelp'
import { useMemo, useState } from 'react'
import type { Grade } from '@/types'
import { getVocab } from '@/content'
import { shuffle, vocabDistractors, type SessionItem } from '@/lib/session'

/**
 * Elegir entre cuatro. Pregunta objetiva: la respuesta no se autoevalúa, se
 * elige entre alternativas.
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

  const targetLabel = vocab
    ? showGreek
      ? (vocab.recognitionLabel ?? vocab.es[0]!)
      : vocab.greek
    : ''

  const options = useMemo(() => {
    if (!vocab) return []
    const pool = vocabDistractors(vocab, item.card.capsuleId, showGreek, 8).slice(0, 3)
    return shuffle([{ id: vocab.id, label: targetLabel }, ...pool])
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
            <div className="prompt__greek griego"><GreekWordHelp exerciseId={item.card.id} capsuleId={item.card.capsuleId} word={vocab.greek} answer={`Significa: ${targetLabel}`} /></div>
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
              {option.label}
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
