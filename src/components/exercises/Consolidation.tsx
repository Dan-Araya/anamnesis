import { useMemo, useState } from 'react'
import type { Grade } from '@/types'
import { getQuestion, lettersUpTo, vocabUpTo } from '@/content'
import { resolveQuestion } from '@/lib/consolidation'
import { shuffle, type SessionItem } from '@/lib/session'
import GreekWordHelp from '@/components/GreekWordHelp'

export default function Consolidation({ item, onGraded }: {
  item: SessionItem; onGraded: (grade: Grade) => void
}) {
  const question = getQuestion(item.card.sourceId)
  const resolved = useMemo(() => question ? resolveQuestion(question,
    lettersUpTo(item.card.capsuleId), vocabUpTo(item.card.capsuleId)) : null,
  [question, item.card.capsuleId])
  const options = useMemo(() => resolved ? shuffle([resolved.answer, ...resolved.distractors]) : [], [resolved])
  const [picked, setPicked] = useState<string | null>(null)
  if (!resolved) return <p className="vacio">Falta la pregunta de esta tarjeta.</p>
  const answered = picked !== null
  const correct = picked === resolved.answer
  return <>
    <div className="prompt">
      <div className="prompt__hint">{resolved.hint}</div>
      <div className="prompt__greek griego">{resolved.word ? <GreekWordHelp exerciseId={item.card.id} capsuleId={item.card.capsuleId}
        word={resolved.word} label={resolved.prompt}
        answer={resolved.transliteration ? `Se escribe: ${resolved.answer}` : `Respuesta: ${resolved.answer}. Es la forma de sigma al final de una palabra (${resolved.word}).`} /> : resolved.prompt}</div>
    </div>
    <div className="options">
      {options.map(label => <button type="button" key={label} disabled={answered}
        className={['option', resolved.greekOptions ? 'griego' : '', answered ? label === resolved.answer ? 'option--correcta' : label === picked ? 'option--fallada' : 'option--atenuada' : ''].join(' ')}
        onClick={() => setPicked(label)}>{label}</button>)}
      {answered && <>
        <div className={`veredicto veredicto--${correct ? 'ok' : 'mal'}`}>Respuesta: <strong>{resolved.answer}</strong></div>
        <button type="button" className="btn btn--primary btn--wide" onClick={() => onGraded(correct ? 3 : 1)}>Continuar</button>
      </>}
    </div>
  </>
}
