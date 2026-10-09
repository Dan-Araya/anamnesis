/**
 * Selección de etiquetas alternativas para las preguntas de reconocer de
 * opción múltiple. Vive en un módulo sin dependencias de contenido para que
 * `check-content` importe las mismas reglas que usa el runtime y valide con
 * fidelidad lo que el usuario acabará viendo.
 */

/** La forma mínima de una entrada de vocabulario para elegir etiquetas. */
export interface VocabLike {
  id: string
  es: string[]
  recognitionLabel?: string
  distractors?: string[]
}

/** Etiqueta visible de una entrada en las preguntas de reconocer. */
export function recognitionLabelOf(v: VocabLike): string {
  return v.recognitionLabel ?? v.es[0] ?? ''
}

/**
 * Etiquetas alternativas válidas para reconocer `target`, en el orden exacto
 * que usa el runtime: primero los distractores editoriales declarados y
 * después el vocabulario presentado (cápsula actual y anteriores). Se saltan
 * la etiqueta de la respuesta correcta, las vacías y las repetidas.
 */
export function vocabDistractorLabels(
  target: VocabLike,
  presented: VocabLike[],
): string[] {
  const targetLabel = recognitionLabelOf(target)
  const seen = new Set<string>(targetLabel ? [targetLabel] : [])
  const picked: string[] = []

  for (const raw of target.distractors ?? []) {
    if (!raw || seen.has(raw)) continue
    seen.add(raw)
    picked.push(raw)
  }

  for (const v of presented) {
    if (v.id === target.id) continue
    const label = recognitionLabelOf(v)
    if (!label || seen.has(label)) continue
    seen.add(label)
    picked.push(label)
  }

  return picked
}
