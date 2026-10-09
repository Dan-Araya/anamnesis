import { useMemo, useState } from 'react'
import type { Grade } from '@/types'
import { getLetter } from '@/content'
import {
  letterDistractors,
  letterFormForReps,
  shuffle,
  type LetterFormVariant,
  type LetterOptionVariant,
  type SessionItem,
} from '@/lib/session'

/**
 * Reconocer la letra: se muestra su forma —mayúscula, minúscula o, si la
 * letra tiene forma final, también esa variante; es la misma tarjeta— y hay
 * que elegir su nombre entre opciones. La variante alterna de forma
 * determinista según las repeticiones (primera aparición mayúscula), así que
 * a lo largo de los repasos sucesivos se acaban viendo todas las formas, no
 * necesariamente dentro de la primera sesión. La respuesta es objetiva:
 * acertar vale 3, fallar vale 1.
 */

/** Presentación resuelta de una variante: glifo, etiqueta y formato de distractores. */
function variantUi(letter: { uppercase: string; lowercase: string; finalForm?: string }, variante: LetterFormVariant): {
  glyph: string
  caseLabel: string
  distractVariant: LetterOptionVariant
} {
  if (variante === 'final') {
    return { glyph: letter.finalForm ?? letter.lowercase, caseLabel: 'final', distractVariant: 'nombre' }
  }
  if (variante === 'mayuscula') {
    return { glyph: letter.uppercase, caseLabel: 'mayúscula', distractVariant: 'nombre-mayuscula' }
  }
  return { glyph: letter.lowercase, caseLabel: 'minúscula', distractVariant: 'nombre-minuscula' }
}

export default function LetterRecognition({
  item,
  onGraded,
}: {
  item: SessionItem
  onGraded: (grade: Grade) => void
}) {
  const letter = getLetter(item.card.sourceId)
  if (!letter) return <p className="vacio">Falta la letra de esta tarjeta.</p>

  const variante = letterFormForReps(letter, item.progress.reps)
  const ui = variantUi(letter, variante)
  const [picked, setPicked] = useState<string | null>(null)

  const options = useMemo(() => {
    const pool = letterDistractors(letter, item.card.capsuleId, ui.distractVariant, 3)
    // Ante la variante final, la respuesta correcta es el nombre a secas
    // («sigma»): añadir «final» la delataría entre nombres sin calificadores.
    // El calificador aparece solo en el feedback posterior a la respuesta.
    const targetLabel =
      variante === 'final' ? letter.name : `${letter.name} ${ui.caseLabel}`
    return shuffle([{ id: letter.id, label: targetLabel }, ...pool])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letter.id, item.card.capsuleId, variante])

  const answered = picked !== null
  const correct = picked === letter.id

  return (
    <>
      <div className="prompt">
        <div className="prompt__hint">¿Qué letra es?</div>
        <div className="prompt__greek griego">{ui.glyph}</div>
      </div>

      <div className="options">
        {options.map((option) => {
          const isTarget = option.id === letter.id
          const classes = ['option']
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
            <div className={`veredicto veredicto--${correct ? 'ok' : 'mal'}`}>
              <strong className="griego">{ui.glyph}</strong>{' '}
              <span>
                es {letter.name} {ui.caseLabel} — {letter.phonetic}
              </span>
              <div className="small muted">{letter.pronunciation}</div>
            </div>
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
