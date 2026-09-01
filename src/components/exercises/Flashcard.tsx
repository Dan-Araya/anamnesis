import { useState } from 'react'
import type { Grade } from '@/types'
import { cellForms, cellLabel, getParadigm, getVocab } from '@/content'
import { previewIntervals } from '@/lib/srs'
import type { SessionItem } from '@/lib/session'

const GRADES: { grade: Grade; label: string }[] = [
  { grade: 1, label: 'Otra vez' },
  { grade: 2, label: 'Difícil' },
  { grade: 3, label: 'Bien' },
  { grade: 4, label: 'Fácil' },
]

/**
 * Tarjeta clásica con autoevaluación. Se usa cuando la palabra ya está
 * asentada (recordarla de cero vale más que reconocerla entre opciones) y
 * también como primera presentación de una forma del paradigma.
 */
export default function Flashcard({
  item,
  onGraded,
}: {
  item: SessionItem
  onGraded: (grade: Grade) => void
}) {
  const [revealed, setRevealed] = useState(false)
  const intervals = previewIntervals(item.progress)

  const face = buildFace(item)
  if (!face) return <p className="vacio">Falta el contenido de esta tarjeta.</p>

  return (
    <>
      <div className="prompt">
        <div className="prompt__hint">{face.hint}</div>
        <div className={face.frontIsGreek ? 'prompt__greek griego' : 'prompt__es'}>
          {face.front}
        </div>
        {face.frontSub && <div className="prompt__sub">{face.frontSub}</div>}
      </div>

      {revealed && (
        <div className="prompt">
          <div className={face.backIsGreek ? 'prompt__greek griego' : 'prompt__es'}>
            {face.back}
          </div>
          {face.backSub && <div className="prompt__sub">{face.backSub}</div>}
        </div>
      )}

      <div className="options">
        {revealed ? (
          <div className="grades">
            {GRADES.map(({ grade, label }) => (
              <button
                key={grade}
                type="button"
                className={`grade grade--${grade}`}
                onClick={() => onGraded(grade)}
              >
                <span>{label}</span>
                <span className="grade__hint">{intervals[grade]}</span>
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            className="btn btn--primary btn--wide"
            onClick={() => setRevealed(true)}
          >
            Mostrar respuesta
          </button>
        )}
      </div>
    </>
  )
}

interface Face {
  hint: string
  front: string
  frontSub?: string
  frontIsGreek: boolean
  back: string
  backSub?: string
  backIsGreek: boolean
}

function buildFace(item: SessionItem): Face | null {
  const { card } = item

  if (card.kind === 'morfologia') {
    const paradigm = getParadigm(card.sourceId)
    if (!paradigm || !card.cellKey) return null
    return {
      hint: paradigm.title,
      front: paradigm.lemma,
      frontSub: cellLabel(paradigm, card.cellKey),
      frontIsGreek: true,
      back: cellForms(paradigm, card.cellKey).join(' / '),
      backSub: paradigm.notes,
      backIsGreek: true,
    }
  }

  const vocab = getVocab(card.sourceId)
  if (!vocab) return null

  if (card.kind === 'vocab-producir') {
    return {
      hint: '¿Cómo se dice en griego?',
      front: vocab.es.join(', '),
      frontIsGreek: false,
      back: vocab.greek,
      backSub: vocab.info,
      backIsGreek: true,
    }
  }

  return {
    hint: '¿Qué significa?',
    front: vocab.greek,
    frontSub: vocab.info,
    frontIsGreek: true,
    back: vocab.es.join(', '),
    backSub: vocab.notes,
    backIsGreek: false,
  }
}
