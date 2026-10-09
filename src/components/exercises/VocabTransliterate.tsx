import { useMemo, useState } from 'react'
import type { Grade } from '@/types'
import { getVocab } from '@/content'
import { shuffle, type SessionItem } from '@/lib/session'

/**
 * Transliterar: se muestra la palabra griega y se elige cómo se escribe con
 * el alfabeto latino. Es una operación distinta del significado y de la
 * pronunciación, y por ahora es básica: no representa acentos ni espíritus.
 * La respuesta es objetiva, siempre de opción múltiple —nunca teclado ni
 * autoevaluación—: acertar vale 3 y fallar vale 1.
 */
export default function VocabTransliterate({
  item,
  onGraded,
}: {
  item: SessionItem
  onGraded: (grade: Grade) => void
}) {
  const vocab = getVocab(item.card.sourceId)
  const correcta = vocab?.transliteration ?? ''
  const [picked, setPicked] = useState<string | null>(null)

  const options = useMemo(() => {
    // Sin vocabulario o sin transliteración la ruta defensiva se encarga de
    // avisar: aquí no debe tocarse vocab.id antes de comprobarlo.
    if (!vocab || !correcta) return []
    const distractors = (vocab.transliterationDistractors ?? []).map(
      (label, index) => ({ id: `editorial:${vocab.id}:trl:${index}`, label }),
    )
    return shuffle([{ id: vocab.id, label: correcta }, ...distractors])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vocab?.id, correcta])

  if (!vocab || !correcta) {
    return <p className="vacio">Falta la transliteración de esta tarjeta.</p>
  }

  const answered = picked !== null
  const correct = picked === vocab.id

  return (
    <>
      <div className="prompt">
        <div className="prompt__hint">¿Qué transliteración le corresponde?</div>
        <div className="prompt__greek griego">{vocab.greek}</div>
      </div>

      <div className="options">
        {options.map((option) => {
          const isTarget = option.id === vocab.id
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
              <strong className="griego">{vocab.greek}</strong>{' '}
              <span>se translitera {correcta}</span>
              <div className="small muted">
                La transliteración no representa necesariamente la pronunciación exacta.
              </div>
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
