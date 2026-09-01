import type { CardProgress, Settings, VocabEntry } from '@/types'
import { allVocab, cardsBySection, getNode, path } from '@/content'
import {
  computeStatuses,
  currentStatus,
  selectQueue,
  shuffle,
  type BuildOptions,
  type SectionEntry,
  type SectionStatus,
  type SessionItem,
} from '@/lib/progression'

/**
 * Puente entre el contenido cargado desde los JSON y las reglas del camino,
 * que viven en `progression.ts` y no conocen el contenido.
 */

export type { BuildOptions, SectionStatus, SessionItem }
export { pickMode } from '@/lib/progression'
export { shuffle }

const entries: SectionEntry[] = path.map(({ section, module }) => ({
  section,
  module,
  cards: cardsBySection.get(section.id) ?? [],
}))

export function sectionStatuses(
  progress: Map<string, CardProgress>,
  settings: Settings,
  now = Date.now(),
): SectionStatus[] {
  return computeStatuses(entries, progress, settings, now)
}

export function currentSection(statuses: SectionStatus[]): SectionStatus | undefined {
  return currentStatus(statuses)
}

export function buildSession(
  progress: Map<string, CardProgress>,
  settings: Settings,
  statuses: SectionStatus[],
  options: BuildOptions = {},
  now = Date.now(),
): SessionItem[] {
  return selectQueue(entries, statuses, progress, settings, options, now)
}

// ---------------------------------------------------------------------------
// Distractores para las preguntas de opción múltiple
// ---------------------------------------------------------------------------

/**
 * Elige alternativas plausibles: primero de la misma sección y categoría
 * gramatical, y se va abriendo la búsqueda si no hay suficientes.
 */
export function distractors(target: VocabEntry, sectionId: string, count = 3): VocabEntry[] {
  const node = getNode(sectionId)
  const local = node?.section.vocabulary ?? []
  const sameModule = node
    ? node.module.sections.flatMap((s) => s.vocabulary)
    : []

  const pools = [
    local.filter((v) => v.pos === target.pos),
    local,
    sameModule.filter((v) => v.pos === target.pos),
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
