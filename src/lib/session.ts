import type { CardProgress, Settings, VocabEntry } from '@/types'
import { allVocab, cardsByModule, modules } from '@/content'
import {
  computeStatuses,
  currentStatus,
  selectQueue,
  shuffle,
  type BuildOptions,
  type ModuleEntry,
  type ModuleStatus,
  type SessionItem,
} from '@/lib/progression'

/**
 * Puente entre el contenido cargado desde los JSON y las reglas de
 * progresión, que viven en `progression.ts` y no conocen el contenido.
 */

export type { BuildOptions, ModuleStatus, SessionItem }
export { pickMode } from '@/lib/progression'
export { shuffle }

const entries: ModuleEntry[] = modules.map((module) => ({
  module,
  cards: cardsByModule.get(module.id) ?? [],
}))

export function moduleStatuses(
  progress: Map<string, CardProgress>,
  settings: Settings,
  now = Date.now(),
): ModuleStatus[] {
  return computeStatuses(entries, progress, settings, now)
}

export function currentModule(statuses: ModuleStatus[]): ModuleStatus | undefined {
  return currentStatus(statuses)
}

export function buildSession(
  progress: Map<string, CardProgress>,
  settings: Settings,
  statuses: ModuleStatus[],
  options: BuildOptions = {},
  now = Date.now(),
): SessionItem[] {
  return selectQueue(entries, statuses, progress, settings, options, now)
}

// ---------------------------------------------------------------------------
// Distractores para las preguntas de opción múltiple
// ---------------------------------------------------------------------------

/**
 * Elige alternativas plausibles: primero del mismo módulo y categoría
 * gramatical, y se va abriendo la búsqueda si no hay suficientes.
 */
export function distractors(target: VocabEntry, moduleId: string, count = 3): VocabEntry[] {
  const module = modules.find((m) => m.id === moduleId)
  const pools = [
    (module?.vocabulary ?? []).filter((v) => v.pos === target.pos),
    module?.vocabulary ?? [],
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
