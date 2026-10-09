import { useMemo, useState } from 'react'
import type { Grade } from '@/types'
import { getLetter } from '@/content'
import { letterDistractors, shuffle, type SessionItem } from '@/lib/session'

/**
 * Producir la letra: dado el nombre, se elige su forma entre glifos de letras
 * ya presentadas. Siempre opción múltiple y con enunciado explícito; la
 * respuesta es objetiva: acertar vale 3, fallar vale 1.
 */
export default function LetterProduction({
  item,
  onGraded,
}: {
  item: SessionItem
  onGraded: (grade: Grade) => void
}) {
  const letter = getLetter(item.card.sourceId)
  if (!letter) return <p className="vacio">Falta la letra de esta tarjeta.</p>

  const [picked, setPicked] = useState<string | null>(null)

  const options = useMemo(() => {
    const pool = letterDistractors(letter, item.card.capsuleId, 'glifo', 3)
    return shuffle([{ id: letter.id, label: letter.lowercase }, ...pool])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letter.id, item.card.capsuleId])

  const answered = picked !== null
  const correct = picked === letter.id

  return (
    <>
      <div className="prompt">
        <div className="prompt__hint">¿Cómo se escribe?</div>
        <div className="prompt__es">¿Cuál es la {letter.name} minúscula?</div>
      </div>

      <div className="options">
        {options.map((option) => {
          const isTarget = option.id === letter.id
          const classes = ['option', 'griego']
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
              <strong className="griego">{letter.lowercase}</strong>{' '}
              <span>es la {letter.name} minúscula</span>
              {letter.finalForm && (
                <div className="small muted">
                  Recuerda: {letter.finalForm} es su forma final, usada al final de palabra.
                </div>
              )}
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
