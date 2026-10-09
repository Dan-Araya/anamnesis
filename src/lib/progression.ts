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
  /** Ignorar el objetivo diario y los límites de tarjetas nuevas. */
  unlimited?: boolean
  /** Tarjetas nuevas ya introducidas hoy. */
  newToday?: number
  /**
   * Repasar a voluntad la cápsula elegida aunque no le quede nada vencido.
   * Lo usa «Repasar cápsula» sobre una cápsula completada: sus tarjetas entran
   * en la cola aunque no toquen. Es práctica libre: la neutralidad frente al
   * SRS no sale de `schedule` —que sí modificaría el estado de la tarjeta—
   * sino de que quien consume la cola (SessionScreen) no persista nada: ni
   * CardProgress, ni ReviewLog, ni DailyStat.
   */
  reviewCapsule?: boolean
}

/** Tope de la proporción de repaso: siempre queda sitio para lo nuevo. */
const MAX_MIX = 0.8

// ---------------------------------------------------------------------------
// Estado y desbloqueo
// ---------------------------------------------------------------------------

/**
 * El camino es lineal y atraviesa secciones y módulos: la primera cápsula
 * siempre está abierta y cada una se abre cuando se completa la anterior.
 * Una cápsula queda completada cuando todas sus tarjetas activas se han
 * respondido al menos una vez, sin importar si la primera respuesta fue
 * correcta: la programación SRS decide después cuándo vuelve cada tarjeta.
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
 * Cómo se pregunta una tarjeta según lo asentada que esté. El curso actual
 * (alfabeto) solo usa preguntas objetivas de opción múltiple: reconocer y
 * producir nunca se convierten en flashcard ni en escritura por más asentada
 * que esté la tarjeta. Los modos más exigentes quedan para material futuro.
 */
export function pickMode(card: Card, p: CardProgress): ExerciseMode {
  switch (card.kind) {
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

const toItem = (card: Card, progress: CardProgress): SessionItem => ({
  card,
  progress,
  mode: pickMode(card, progress),
  isNew: false,
})

/**
 * Arma la cola de una sesión.
 *
 * Practicar una cápsula no es repasar solo su vocabulario: se mezcla con
 * material de las cápsulas anteriores, para que lo aprendido siga volviendo en
 * vez de darse por sabido. Entran primero las tarjetas que ya han vencido y,
 * si no bastan para llenar la proporción de repaso, se adelantan las que están
 * más cerca de vencer, dando prioridad a lo de la misma sección.
 *
 * La cápsula es la unidad atómica: al elegirla explícitamente (`capsuleId`),
 * todas sus tarjetas nuevas entran aunque el cupo diario esté cubierto, y el
 * objetivo diario recorta primero los repasos añadidos de la mezcla antes que
 * lo imprescindible de la cápsula. Con `reviewCapsule`, las tarjetas de una
 * cápsula completada entran como repetición voluntaria aunque nada esté
 * vencido; la sesión resultante es práctica libre y no debe persistir
 * respuestas, para no alterar la programación SRS ni el estado visible.
 */
export function selectQueue(
  entries: CapsuleEntry[],
  statuses: CapsuleStatus[],
  progress: Map<string, CardProgress>,
  settings: Settings,
  options: BuildOptions = {},
  now = Date.now(),
): SessionItem[] {
  const unlocked = new Set(
    statuses.filter((s) => s.unlocked).map((s) => s.capsule.id),
  )
  const target = options.capsuleId
    ? entries.find((e) => e.capsule.id === options.capsuleId)
    : undefined

  const fresh: Card[] = []
  const dueCards: { card: Card; progress: CardProgress }[] = []
  const upcoming: { card: Card; progress: CardProgress; rank: number }[] = []

  for (const entry of entries) {
    if (!unlocked.has(entry.capsule.id)) continue

    // Cercanía respecto a la cápsula que se está practicando: lo de la misma
    // sección se recuerda antes que lo de un módulo lejano.
    const rank = !target
      ? 0
      : entry.section.id === target.section.id
        ? 0
        : entry.module.id === target.module.id
          ? 1
          : 2

    for (const card of entry.cards) {
      const p = progress.get(card.id)
      if (!p) {
        // Solo se introduce material nuevo de la cápsula elegida.
        if (!target || entry.capsule.id === target.capsule.id) fresh.push(card)
      } else if (isDue(p, now)) {
        dueCards.push({ card, progress: p })
      } else {
        upcoming.push({ card, progress: p, rank })
      }
    }
  }

  dueCards.sort((a, b) => a.progress.due - b.progress.due)
  upcoming.sort((a, b) => a.rank - b.rank || a.progress.due - b.progress.due)

  // --- Material nuevo ------------------------------------------------------
  // Una cápsula elegida explícitamente entra entera, aunque el cupo diario ya
  // esté cubierto: el límite de tarjetas nuevas sigue valiendo para las
  // sesiones globales, no para partir una cápsula por la mitad.
  const newBudget = options.onlyReviews
    ? 0
    : options.unlimited || options.capsuleId
      ? fresh.length
      : Math.max(0, settings.newPerDay - (options.newToday ?? 0))

  const freshItems: SessionItem[] = fresh.slice(0, newBudget).map((card) => ({
    card,
    progress: newProgress(card, now),
    mode: pickMode(card, newProgress(card, now)),
    isNew: true,
  }))

  // --- Repasos --------------------------------------------------------------
  const dueItems: SessionItem[] = dueCards.map((c) => toItem(c.card, c.progress))

  // Repasos añadidos por la mezcla: solo cuando entra material nuevo. Se
  // mantienen aparte para poder recortarlos sin tocar lo imprescindible.
  const extraItems: SessionItem[] = []
  if (!options.onlyReviews && freshItems.length > 0) {
    const mix = Math.min(MAX_MIX, Math.max(0, settings.mixRatio))
    // Cuántos repasos hacen falta para que supongan `mix` de la sesión.
    const wanted = Math.round((freshItems.length * mix) / (1 - mix))
    const missing = wanted - dueItems.length
    if (missing > 0) {
      // Se adelantan repasos que aún no tocaban: responderlos antes de tiempo
      // no alarga su intervalo (lo controla `schedule`), así que refrescan
      // sin falsear la programación.
      for (const c of upcoming.slice(0, missing)) {
        extraItems.push(toItem(c.card, c.progress))
      }
    }
  }

  // --- Repetición voluntaria ------------------------------------------------
  // «Repasar cápsula» de una cápsula completada: sus tarjetas entran aunque
  // nada esté vencido, siempre de la propia cápsula, sin material futuro. La
  // sesión es práctica libre y el consumidor no persistirá las respuestas.
  const voluntaryItems: SessionItem[] = []
  if (options.reviewCapsule && target) {
    for (const c of upcoming) {
      if (c.card.capsuleId !== target.capsule.id) continue
      voluntaryItems.push(toItem(c.card, c.progress))
    }
  }

  // Lo imprescindible (repasos vencidos y material nuevo) va mezclado; los
  // añadidos (mezcla adelantada y repetición voluntaria) van después.
  const core = interleave(dueItems, freshItems)
  const queue = [...core, ...extraItems, ...voluntaryItems]

  if (options.unlimited) return queue

  // Sesiones globales: el objetivo diario recorta la cola entera, como antes.
  if (!options.capsuleId) return queue.slice(0, settings.dailyGoal)

  // Sesiones de cápsula: la cápsula es la unidad atómica. Sus tarjetas nuevas
  // y los repasos vencidos entran completos aunque superen el objetivo; lo
  // que se recorta son solo los añadidos.
  if (queue.length <= settings.dailyGoal) return queue
  const room = Math.max(0, settings.dailyGoal - core.length)
  return [...core, ...queue.slice(core.length, core.length + room)]
}

export function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}
