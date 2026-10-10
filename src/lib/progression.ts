import type {
  Capsule,
  Card,
  CardProgress,
  ExerciseMode,
  ModuleContent,
  Section,
  Settings,
} from '@/types'
import { isDue, mastery, newProgress } from '@/lib/srs'

/**
 * Reglas del camino: qué cápsulas están abiertas y qué entra en cada sesión.
 *
 * Este archivo no importa el contenido: recibe las cápsulas ya resueltas. Así
 * las reglas se pueden probar sin arrastrar el cargador de JSON.
 */

export interface CapsuleEntry {
  capsule: Capsule
  section: Section
  module: ModuleContent
  cards: Card[]
}

/** Un ítem listo para practicar: la tarjeta, su estado y cómo se presenta. */
export interface SessionItem {
  card: Card
  progress: CardProgress
  mode: ExerciseMode
  isNew: boolean
  /** Presentación fija del camino; ausente en el repaso SRS de Tarjetas. */
  fixedContent?: boolean
}

export interface CapsuleStatus {
  capsule: Capsule
  section: Section
  module: ModuleContent
  unlocked: boolean
  /** Nulo cuando la cápsula aún no tiene contenido. */
  mastery: number | null
  /**
   * Se completó cuando todas sus tarjetas activas se respondieron al menos
   * una vez. Es lo que pinta el nodo como superado; el SRS (mastery, due…)
   * queda oculto y nunca desmarca una cápsula ya completada.
   */
  completed: boolean
  total: number
  started: number
  due: number
  fresh: number
}

export interface BuildOptions {
  /** Practicar esta cápsula (al pulsar su nodo en el camino). */
  capsuleId?: string
  /** No introducir material nuevo: solo repasar lo ya visto. */
  onlyReviews?: boolean
  /** Ignorar el límite de sesión del repaso en Tarjetas. */
  unlimited?: boolean
  /** Campo heredado: no limita las cápsulas. */
  newToday?: number
  /**
   * Campo compatible con los consumidores: la cápsula siempre entra completa.
   * Lo usa «Repasar cápsula» sobre una cápsula completada: sus tarjetas entran
   * en la cola aunque no toquen. Es práctica libre: la neutralidad frente al
   * SRS no sale de `schedule` —que sí modificaría el estado de la tarjeta—
   * sino de que quien consume la cola (SessionScreen) no persista nada: ni
   * CardProgress, ni ReviewLog, ni DailyStat.
   */
  reviewCapsule?: boolean
}

// ---------------------------------------------------------------------------
// Estado y desbloqueo
// ---------------------------------------------------------------------------

/**
 * El camino es lineal y atraviesa secciones y módulos: la primera cápsula
 * siempre está abierta y cada una se abre cuando se completa la anterior.
 * Una cápsula queda completada cuando todas sus tarjetas activas se han
 * respondido al menos una vez, sin importar si la primera respuesta fue
 * correcta. El repaso SRS se ofrece por separado en Tarjetas.
 * Una cápsula todavía sin contenido no bloquea a la siguiente.
 */
export function computeStatuses(
  entries: CapsuleEntry[],
  progress: Map<string, CardProgress>,
  now = Date.now(),
): CapsuleStatus[] {
  const result: CapsuleStatus[] = []
  let previousCleared = true

  for (const { capsule, section, module, cards } of entries) {
    let sum = 0
    let started = 0
    let answered = 0
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
      if (p.reps >= 1) answered++
      if (isDue(p, now)) due++
    }

    // La anotación es necesaria: sin ella TypeScript ve una dependencia
    // circular entre `unlocked` y la asignación del final del bucle.
    const unlocked: boolean = previousCleared
    const score = cards.length === 0 ? null : sum / cards.length
    // Completada = todas las tarjetas activas respondidas al menos una vez.
    const completed: boolean = unlocked && cards.length > 0 && answered === cards.length

    result.push({
      capsule,
      section,
      module,
      unlocked,
      mastery: score,
      completed,
      total: cards.length,
      started,
      due,
      fresh,
    })

    previousCleared = unlocked && (cards.length === 0 || completed)
  }

  return result
}

/** El nodo en el que está el usuario: el primero abierto sin terminar. */
export function currentStatus(statuses: CapsuleStatus[]): CapsuleStatus | undefined {
  const open = statuses.filter((s) => s.unlocked && s.total > 0)
  return open.find((s) => !s.completed) ?? open.at(-1)
}

// ---------------------------------------------------------------------------
// Modo de presentación
// ---------------------------------------------------------------------------

/**
 * Presentación heredada del repaso SRS en Tarjetas según su estado. El curso actual
 * (alfabeto) solo usa preguntas objetivas de opción múltiple: reconocer y
 * producir nunca se convierten en flashcard ni en escritura por más asentada
 * que esté la tarjeta. Los modos más exigentes quedan para material futuro.
 */
export function pickMode(card: Card, p: CardProgress): ExerciseMode {
  switch (card.kind) {
    case 'consolidacion':
    case 'vocab-reconocer':
      // Siempre entre opciones: la respuesta es objetiva, nunca autoevaluada.
      return 'opcion-multiple'
    case 'vocab-transliterar':
      // Elegir la transliteración entre opciones: nunca se teclea ni se
      // autoevalúa, por asentada que esté la tarjeta.
      return 'opcion-multiple'
    case 'vocab-producir':
      return p.state === 'nueva' ? 'opcion-multiple' : 'escribir'
    case 'letra-reconocer':
      // La letra se muestra en mayúscula o minúscula: es la misma tarjeta.
      return 'opcion-multiple'
    case 'letra-producir':
      // Se elige la forma entre opciones, sin teclado ni autoevaluación.
      return 'opcion-multiple'
    case 'morfologia':
      // La primera vez se muestra la forma; después hay que escribirla.
      return p.state === 'nueva' ? 'flashcard' : 'escribir'
    case 'traduccion':
      return 'traducir'
    case 'tabla':
      return 'huecos'
  }
}

// ---------------------------------------------------------------------------
// Cola de la sesión
// ---------------------------------------------------------------------------

/** Reglas del camino por tipo, independientes de la programación SRS. */
export function pickCapsuleMode(card: Card): ExerciseMode {
  switch (card.kind) {
    case 'consolidacion':
    case 'vocab-reconocer':
    case 'vocab-transliterar':
    case 'letra-reconocer':
    case 'letra-producir':
      return 'opcion-multiple'
    case 'vocab-producir':
    case 'morfologia':
      return 'escribir'
    case 'traduccion':
      return 'traducir'
    case 'tabla':
      return 'huecos'
  }
}

/**
 * El camino presenta todas las tarjetas de una sola cápsula abierta en orden
 * de contenido, tanto al empezar como al repetirla o volver a una parcial.
 * Tarjetas conserva el repaso SRS: solo vistas y vencidas, por vencimiento,
 * limitado por el objetivo diario salvo petición de repaso ilimitado.
 */
export function selectQueue(
  entries: CapsuleEntry[],
  statuses: CapsuleStatus[],
  progress: Map<string, CardProgress>,
  settings: Settings,
  options: BuildOptions = {},
  now = Date.now(),
): SessionItem[] {
  const unlocked = new Set(statuses.filter((s) => s.unlocked).map((s) => s.capsule.id))
  if (options.onlyReviews) {
    const reviews = entries
      .filter((entry) => unlocked.has(entry.capsule.id))
      .flatMap((entry) => entry.cards.flatMap((card): SessionItem[] => {
        const p = progress.get(card.id)
        return p && isDue(p, now)
          ? [{ card, progress: p, mode: pickMode(card, p), isNew: false }]
          : []
      }))
      .sort((a, b) => a.progress.due - b.progress.due)
    return options.unlimited ? reviews : reviews.slice(0, settings.dailyGoal)
  }

  const capsuleId = options.capsuleId ?? currentStatus(statuses)?.capsule.id
  const target = entries.find((entry) => entry.capsule.id === capsuleId)
  if (!target || !unlocked.has(target.capsule.id)) return []
  return target.cards.map((card) => {
    const p = progress.get(card.id)
    return {
      card,
      progress: p ?? newProgress(card, now),
      mode: pickCapsuleMode(card),
      isNew: !p,
      fixedContent: true,
    }
  })
}

export function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}
