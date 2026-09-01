import { useState } from 'react'
import type { Grade, Settings } from '@/types'
import { cellForms, cellLabel, getParadigm, getVocab } from '@/content'
import { isGreekCorrect, matchGreek, toNFC, type MatchLevel } from '@/lib/greek'
import GreekKeyboard from '@/components/GreekKeyboard'
import type { SessionItem } from '@/lib/session'

/**
 * Escribir la forma griega. Cubre tanto producir vocabulario desde el español
 * como rellenar una casilla del paradigma.
 */
export default function TypeAnswer({
  item,
  settings,
  onGraded,
}: {
  item: SessionItem
  settings: Settings
  onGraded: (grade: Grade) => void
}) {
  const [value, setValue] = useState('')
  const [level, setLevel] = useState<MatchLevel | null>(null)

  const question = buildQuestion(item)
  if (!question) return <p className="vacio">Falta el contenido de esta tarjeta.</p>

  const check = () => {
    if (!value.trim()) return
    setLevel(matchGreek(value, question.accepted))
  }

  const grade = ((): Grade => {
    if (level === 'exacto') return 3
    if (level === 'sin-acentos') return settings.strictDiacritics ? 1 : 2
    return 1
  })()

  const correct = level !== null && isGreekCorrect(level, settings.strictDiacritics)

  return (
    <>
      <div className="prompt">
        <div className="prompt__hint">{question.hint}</div>
        <div className={question.promptIsGreek ? 'prompt__greek griego' : 'prompt__es'}>
          {question.prompt}
        </div>
        {question.sub && <div className="prompt__sub">{question.sub}</div>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (level === null) check()
        }}
      >
        <input
          className="answer answer--griego griego"
          value={value}
          onChange={(e) => setValue(toNFC(e.target.value))}
          // Con el teclado en pantalla activo evitamos que se abra el del
          // sistema, que no trae politónico y taparía media pantalla.
          readOnly={settings.showKeyboard || level !== null}
          autoFocus={!settings.showKeyboard}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="…"
          aria-label="Tu respuesta en griego"
        />
      </form>

      {settings.showKeyboard && level === null && (
        <GreekKeyboard value={value} onChange={setValue} />
      )}

      {level !== null && (
        <div
          className={`veredicto veredicto--${
            level === 'exacto' ? 'ok' : level === 'sin-acentos' ? 'casi' : 'mal'
          }`}
        >
          {level === 'exacto' && <strong>Correcto</strong>}
          {level === 'sin-acentos' && (
            <>
              <strong>Casi: revisa los diacríticos</strong>
              <div className="griego">{question.accepted.join(' / ')}</div>
            </>
          )}
          {level === 'incorrecto' && (
            <>
              <strong>La respuesta era</strong>
              <div className="griego">{question.accepted.join(' / ')}</div>
            </>
          )}
        </div>
      )}

      <div className="options">
        {level === null ? (
          <button
            type="button"
            className="btn btn--primary btn--wide"
            disabled={!value.trim()}
            onClick={check}
          >
            Comprobar
          </button>
        ) : (
          <>
            {!correct && (
              <button
                type="button"
                className="btn btn--wide btn--ghost"
                onClick={() => {
                  setValue('')
                  setLevel(null)
                }}
              >
                Reintentar sin puntuar
              </button>
            )}
            <button
              type="button"
              className="btn btn--primary btn--wide"
              onClick={() => onGraded(grade)}
            >
              Continuar
            </button>
          </>
        )}
      </div>
    </>
  )
}

interface Question {
  hint: string
  prompt: string
  promptIsGreek: boolean
  sub?: string
  accepted: string[]
}

function buildQuestion(item: SessionItem): Question | null {
  const { card } = item

  if (card.kind === 'morfologia') {
    const paradigm = getParadigm(card.sourceId)
    if (!paradigm || !card.cellKey) return null
    return {
      hint: paradigm.title,
      prompt: paradigm.lemma,
      promptIsGreek: true,
      sub: cellLabel(paradigm, card.cellKey),
      accepted: cellForms(paradigm, card.cellKey),
    }
  }

  const vocab = getVocab(card.sourceId)
  if (!vocab) return null
  return {
    hint: 'Escríbelo en griego',
    prompt: vocab.es.join(', '),
    promptIsGreek: false,
    sub: vocab.pos,
    accepted: [vocab.greek],
  }
}
