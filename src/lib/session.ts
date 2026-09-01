import type { CardProgress, Settings, VocabEntry } from '@/types'
import { allVocab, cardsByCapsule, getNode, path } from '@/content'
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
  settings: Settings,
  now = Date.now(),
): CapsuleStatus[] {
  return computeStatuses(entries, progress, settings, now)
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

/**
 * Elige alternativas plausibles: primero de la misma cápsula y categoría
 * gramatical, y se va abriendo la búsqueda si no hay suficientes.
 */
export function distractors(target: VocabEntry, capsuleId: string, count = 3): VocabEntry[] {
  const node = getNode(capsuleId)
  const local = node?.capsule.vocabulary ?? []
  const sameSection = node?.section.capsules.flatMap((c) => c.vocabulary) ?? []

  const pools = [
    local.filter((v) => v.pos === target.pos),
    sameSection.filter((v) => v.pos === target.pos),
    sameSection,
    allVocab.filter((v) => v.pos === target.pos),
    allVocab,
  ]

  const picked: VocabEntry[] = []
  const seen = new Set([target.id])

  for (const pool of pools) {
    for (const v of shuffle(pool)) {
      if (picked.length >= count) break
      if (seen.has(v.id)) continue
      seen.add(v.id)
      picked.push(v)
    }
    if (picked.length >= count) break
  }

  return picked
}
