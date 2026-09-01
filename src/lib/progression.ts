import type {
  Card,
  CardProgress,
  ExerciseMode,
  ModuleContent,
  Settings,
} from '@/types'
import { isDue, mastery, newProgress } from '@/lib/srs'

/**
 * Reglas de progresión y armado de la cola diaria.
 *
 * Este archivo no importa el contenido: recibe los módulos ya resueltos. Así
 * las reglas se pueden probar sin arrastrar el cargador de JSON.
 */

export interface ModuleEntry {
  module: ModuleContent
  cards: Card[]
}

/** Un ítem listo para practicar: la tarjeta, su estado y cómo se presenta. */
export interface SessionItem {
  card: Card
  progress: CardProgress
  mode: ExerciseMode
  isNew: boolean
}

export interface ModuleStatus {
  module: ModuleContent
  unlocked: boolean
  /** Nulo cuando el módulo aún no tiene contenido. */
  mastery: number | null
  total: number
  started: number
  due: number
  fresh: number
}

export interface BuildOptions {
  /** Practicar solo este módulo (desde el mapa de módulos). */
  moduleId?: string
  /** Ignorar el objetivo diario y los límites de tarjetas nuevas. */
  unlimited?: boolean
  /** Tarjetas nuevas ya introducidas hoy. */
  newToday?: number
}

// ---------------------------------------------------------------------------
// Estado y desbloqueo de módulos
// ---------------------------------------------------------------------------

/**
 * Progresión lineal: el primer módulo siempre está abierto y cada uno se abre
 * cuando el anterior alcanza el umbral de dominio. Un módulo todavía sin
 * contenido no bloquea al siguiente.
 */
export function computeStatuses(
  entries: ModuleEntry[],
  progress: Map<string, CardProgress>,
  settings: Settings,
  now = Date.now(),
): ModuleStatus[] {
  const result: ModuleStatus[] = []
  let previousCleared = true

  for (const { module, cards } of entries) {
    let sum = 0
    let started = 0
    let due = 0
    let fresh = 0

    for (const card of cards) {
      const p = progress.get(card.id)
      if (!p) {
        fresh++
        continue
      }
      started++
      sum += mastery(p)
      if (isDue(p, now)) due++
    }

    // La anotación es necesaria: sin ella TypeScript ve una dependencia
    // circular entre `unlocked` y la asignación del final del bucle.
    const unlocked: boolean = previousCleared
    const score = cards.length === 0 ? null : sum / cards.length

    result.push({
      module,
      unlocked,
      mastery: score,
      total: cards.length,
      started,
      due,
      fresh,
    })

    previousCleared = unlocked && (score === null || score >= settings.unlockThreshold)
  }

  return result
}

/** Módulo abierto más avanzado: el que la pantalla de inicio destaca. */
export function currentStatus(statuses: ModuleStatus[]): ModuleStatus | undefined {
  const open = statuses.filter((s) => s.unlocked && s.total > 0)
  return open.find((s) => s.fresh > 0 || s.due > 0) ?? open.at(-1)
}

// ---------------------------------------------------------------------------
// Modo de presentación
// ---------------------------------------------------------------------------

/**
 * Cómo se pregunta una tarjeta según lo asentada que esté. Las primeras veces
 * se reconoce entre opciones; con el tiempo hay que producir la forma.
 */
export function pickMode(card: Card, p: CardProgress): ExerciseMode {
  switch (card.kind) {
    case 'vocab-reconocer':
      return p.state === 'nueva' || p.streak < 2 ? 'opcion-multiple' : 'flashcard'
    case 'vocab-producir':
      return p.state === 'nueva' ? 'opcion-multiple' : 'escribir'
    case 'morfologia':
      // La primera vez se muestra la forma; después hay que escribirla.
      return p.state === 'nueva' ? 'flashcard' : 'escribir'
    case 'traduccion':
      return 'traducir'
  }
}

// ---------------------------------------------------------------------------
// Cola de la sesión
// ---------------------------------------------------------------------------

/** Intercala las tarjetas nuevas entre los repasos en vez de amontonarlas. */
function interleave(reviews: SessionItem[], fresh: SessionItem[]): SessionItem[] {
  if (fresh.length === 0) return reviews
  if (reviews.length === 0) return fresh

  const out: SessionItem[] = []
  const gap = Math.max(1, Math.floor(reviews.length / fresh.length))
  let f = 0

  reviews.forEach((item, i) => {
    out.push(item)
    if (f < fresh.length && (i + 1) % gap === 0) out.push(fresh[f++]!)
  })
  while (f < fresh.length) out.push(fresh[f++]!)

  return out
}

export function selectQueue(
  entries: ModuleEntry[],
  statuses: ModuleStatus[],
  progress: Map<string, CardProgress>,
  settings: Settings,
  options: BuildOptions = {},
  now = Date.now(),
): SessionItem[] {
  const open = new Set(
    statuses
      .filter((s) => s.unlocked && (!options.moduleId || s.module.id === options.moduleId))
      .map((s) => s.module.id),
  )

  const reviews: SessionItem[] = []
  const fresh: Card[] = []

  for (const { module, cards } of entries) {
    if (!open.has(module.id)) continue
    for (const card of cards) {
      const p = progress.get(card.id)
      if (!p) {
        fresh.push(card)
      } else if (isDue(p, now)) {
        reviews.push({ card, progress: p, mode: pickMode(card, p), isNew: false })
      }
    }
  }

  reviews.sort((a, b) => a.progress.due - b.progress.due)

  const newBudget = options.unlimited
    ? fresh.length
    : Math.max(0, settings.newPerDay - (options.newToday ?? 0))

  const freshItems: SessionItem[] = fresh.slice(0, newBudget).map((card) => {
    const p = newProgress(card, now)
    return { card, progress: p, mode: pickMode(card, p), isNew: true }
  })

  const queue = interleave(reviews, freshItems)
  return options.unlimited ? queue : queue.slice(0, settings.dailyGoal)
}

export function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}
