import type { CardProgress, Letter, Settings, VocabEntry } from '@/types'
import {
  cardsByCapsule,
  getNode,
  lettersUpTo,
  path,
  vocabUpTo,
} from '@/content'
import { recognitionLabelOf, vocabDistractorLabels } from '@/lib/distractors'
import {
  computeStatuses,
  currentStatus,
  selectQueue,
  shuffle,
  type BuildOptions,
  type CapsuleEntry,
  type CapsuleStatus,
  type SessionItem,
} from '@/lib/progression'

/**
 * Puente entre el contenido cargado desde los JSON y las reglas del camino,
 * que viven en `progression.ts` y no conocen el contenido.
 */

export type { BuildOptions, CapsuleStatus, SessionItem }
export { pickMode } from '@/lib/progression'
export { shuffle }

const entries: CapsuleEntry[] = path.map((node) => ({
  ...node,
  cards: cardsByCapsule.get(node.capsule.id) ?? [],
}))

export function capsuleStatuses(
  progress: Map<string, CardProgress>,
  now = Date.now(),
): CapsuleStatus[] {
  return computeStatuses(entries, progress, now)
}

export function currentCapsule(statuses: CapsuleStatus[]): CapsuleStatus | undefined {
  return currentStatus(statuses)
}

export function buildSession(
  progress: Map<string, CardProgress>,
  settings: Settings,
  statuses: CapsuleStatus[],
  options: BuildOptions = {},
  now = Date.now(),
): SessionItem[] {
  return selectQueue(entries, statuses, progress, settings, options, now)
}

// ---------------------------------------------------------------------------
// Distractores para las preguntas de opción múltiple
// ---------------------------------------------------------------------------

/** Una opción de una pregunta de opción múltiple, ya resuelta para pintar. */
export interface ChoiceOption {
  /** Identificador del ítem de contenido (o «editorial:*» para distractores declarados). */
  id: string
  /** Texto visible de la opción. */
  label: string
}

/** Elige alternativas sin repetir ids ni etiquetas, en orden de preferencia. */
function pickOptions<T extends { id: string }>(
  seen: Set<string>,
  seenLabels: Set<string>,
  pools: T[][],
  count: number,
  labelOf: (item: T) => string,
): ChoiceOption[] {
  const picked: ChoiceOption[] = []
  for (const pool of pools) {
    for (const item of shuffle(pool)) {
      if (picked.length >= count) break
      if (seen.has(item.id)) continue
      const label = labelOf(item)
      // Una alternativa que diría lo mismo que otra opción no sirve.
      if (!label || seenLabels.has(label)) continue
      seen.add(item.id)
      seenLabels.add(label)
      picked.push({ id: item.id, label })
    }
    if (picked.length >= count) break
  }
  return picked
}

/**
 * Distractores para una tarjeta de vocabulario. Primero los distractores
 * editoriales que declare la propia entrada; después, vocabulario de la misma
 * cápsula o de las anteriores, empezando por la misma categoría gramatical.
 * Nunca se mezclan categorías: no se recurre a letras ni a vocabulario de
 * cápsulas futuras, y no se producen etiquetas duplicadas. La selección de
 * etiquetas es `vocabDistractorLabels`, compartida con `check-content`.
 */
export function vocabDistractors(
  target: VocabEntry,
  capsuleId: string,
  showGreek: boolean,
  count = 3,
): ChoiceOption[] {
  const node = getNode(capsuleId)
  const local = node?.capsule.vocabulary ?? []
  const presented = vocabUpTo(capsuleId)

  if (!showGreek) {
    // Producir: se elige entre formas griegas; los distractores editoriales
    // (textos en español) romperían la categoría y no aplican.
    const labelOf = (v: VocabEntry) => v.greek
    return pickOptions(
      new Set([target.id]),
      new Set([labelOf(target)]),
      [local, presented],
      count,
      labelOf,
    )
  }

  // Reconocer: primero los editoriales y después el vocabulario presentado,
  // empezando por la misma categoría gramatical. El orden de esta lista solo
  // prioriza qué vocabulario se elige: las etiquetas válidas son las mismas
  // que valida check-content.
  const ordered = [
    ...local.filter((v) => v.pos === target.pos),
    ...presented.filter((v) => v.pos === target.pos),
    ...presented,
  ]

  return vocabDistractorLabels(target, ordered)
    .slice(0, count)
    .map((label, index) => {
      const owner = ordered.find(
        (v) => v.id !== target.id && recognitionLabelOf(v) === label,
      )
      return owner
        ? { id: owner.id, label }
        : { id: `editorial:${target.id}:${index}`, label }
    })
}

/**
 * Distractores para una tarjeta de letra: solo letras ya presentadas, primero
 * las de la propia cápsula. `variant` elige el formato de la etiqueta: nombre
 * con su forma («beta mayúscula», «beta minúscula»), el nombre a secas o el
 * glifo minúsculo.
 */
export type LetterOptionVariant = 'nombre-mayuscula' | 'nombre-minuscula' | 'nombre' | 'glifo'

export function letterDistractors(
  target: Letter,
  capsuleId: string,
  variant: LetterOptionVariant,
  count = 3,
): ChoiceOption[] {
  const node = getNode(capsuleId)
  const local = node?.capsule.letters ?? []
  const presented = lettersUpTo(capsuleId)
  const labelOf = (l: Letter) =>
    variant === 'nombre-mayuscula'
      ? `${l.name} mayúscula`
      : variant === 'nombre-minuscula'
        ? `${l.name} minúscula`
        : variant === 'nombre'
          ? l.name
          : l.lowercase
  return pickOptions(new Set([target.id]), new Set([labelOf(target)]), [local, presented], count, labelOf)
}

/**
 * Qué forma muestra una tarjeta de letra en una aparición dada. Alterna de
 * forma determinista según `reps` —primera aparición mayúscula, siguiente
 * minúscula, y así— para que el aprendizaje inicial enseñe ambas formas sin
 * depender del azar.
 */
export function letterCaseForReps(reps: number): 'mayuscula' | 'minuscula' {
  return reps % 2 === 0 ? 'mayuscula' : 'minuscula'
}

/** Variante de forma con la que se presenta una letra en una aparición. */
export type LetterFormVariant = 'mayuscula' | 'minuscula' | 'final'

/**
 * Como `letterCaseForReps`, pero consciente de la forma final. Para letras
 * normales se conserva la alternancia mayúscula/minúscula; si la letra tiene
 * forma final (sigma), el ciclo determinista añade una tercera parada:
 * mayúscula, minúscula medial y final. La forma final no genera tarjeta
 * propia: es presentación de la misma tarjeta.
 */
export function letterFormForReps(letter: Letter, reps: number): LetterFormVariant {
  if (letter.finalForm) {
    const phase = reps % 3
    return phase === 0 ? 'mayuscula' : phase === 1 ? 'minuscula' : 'final'
  }
  return letterCaseForReps(reps)
}
