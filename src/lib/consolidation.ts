import type { ConsolidationQuestion, Letter, VocabEntry } from '../types'

/** Compartido por la interfaz y check-content; las fuentes pertenecen al material anterior. */
export function resolveQuestion(q: ConsolidationQuestion, letters: Letter[], vocab: VocabEntry[]) {
  if (q.task === 'transliterar') {
    const v = vocab.find(v => v.id === q.sourceId)
    if (!v?.transliteration || v.transliterationDistractors?.length !== 3) {
      throw new Error(`«${q.id}»: referencia de transliteración inválida «${q.sourceId}»`)
    }
    return {
      hint: '¿Qué transliteración le corresponde?', prompt: v.greek,
      answer: v.transliteration, distractors: v.transliterationDistractors,
      greekOptions: false, word: v.greek, transliteration: true,
    }
  }
  if (!['minuscula', 'nombre', 'final'].includes(q.task)) throw new Error(`«${q.id}»: tarea desconocida`)
  const l = letters.find(l => l.id === q.sourceId)
  if (!l) throw new Error(`«${q.id}»: referencia de letra inválida «${q.sourceId}»`)
  const label = (letter: Letter) => q.task === 'nombre' ? letter.name : letter.lowercase
  const distractors = q.distractorIds.map(id => {
    const d = letters.find(l => l.id === id)
    if (!d) throw new Error(`«${q.id}»: alternativa no presentada «${id}»`)
    return label(d)
  })
  let prompt = l.uppercase
  let answer = label(l)
  let hint = 'Elige la minúscula correspondiente.'
  let word: string | undefined
  if (q.task === 'nombre') {
    prompt = [l.uppercase, l.lowercase, l.finalForm].filter(Boolean).join(' ')
    hint = '¿Qué letra representan estas formas?'
  } else if (q.task === 'final') {
    const v = vocab.find(v => v.id === q.wordId)
    if (!l.finalForm || !v?.greek.endsWith(l.finalForm)) {
      throw new Error(`«${q.id}»: palabra o forma final inválida`)
    }
    answer = l.finalForm
    prompt = `${v.greek.slice(0, -l.finalForm.length)}_`
    word = v.greek
    hint = 'Completa la palabra con la forma final de sigma.'
  }
  return { hint, prompt, answer, distractors, greekOptions: q.task !== 'nombre', word, transliteration: false }
}
