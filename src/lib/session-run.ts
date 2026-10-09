import type { Grade } from '@/types'
import type { SessionItem } from '@/lib/progression'

/**
 * Recorrido de una sesión en dos fases.
 *
 * La cola principal queda fija al comenzar: cada tarjeta aparece una sola vez
 * y una respuesta correcta nunca la vuelve a encolar, aunque el SRS la deje en
 * aprendizaje. Las tarjetas falladas se registran como candidatas y, al
 * terminar la cola, las primeras MAX_REFUERZOS reaparecen una única vez en
 * una fase de refuerzo separada. Fallar de nuevo en el refuerzo no reencola:
 * la programación SRS decide cuándo vuelve cada tarjeta. Si no hay fallos no
 * existe fase de refuerzo.
 */

/** Máximo de tarjetas distintas que reaparecen en la fase de refuerzo. */
export const MAX_REFUERZOS = 3

export type Phase = 'principal' | 'refuerzo'

/** Estado completo de una sesión. Es un valor puro: avanzarlo no muta nada. */
export interface SessionRun {
  /** Cola principal, fija desde el inicio. */
  main: SessionItem[]
  /** Índice del siguiente ítem de la cola principal. */
  mainIndex: number
  /**
   * Tarjetas falladas distintas, en orden de primera aparición, con el ítem
   * ya actualizado para reaparecer en el refuerzo.
   */
  candidates: Map<string, SessionItem>
  /** Cola de refuerzo, armada una sola vez al terminar la principal. */
  reinforcement: SessionItem[]
  /** Índice del siguiente ítem de la fase de refuerzo. */
  reinforcementIndex: number
}

export function createRun(main: SessionItem[]): SessionRun {
  return {
    main,
    mainIndex: 0,
    candidates: new Map(),
    reinforcement: [],
    reinforcementIndex: 0,
  }
}

/** El ítem que toca responder ahora; indefinido si la sesión terminó. */
export function currentItem(run: SessionRun): SessionItem | undefined {
  if (run.mainIndex < run.main.length) return run.main[run.mainIndex]
  return run.reinforcement[run.reinforcementIndex]
}

/** Fase en la que está la sesión. */
export function phaseOf(run: SessionRun): Phase {
  return run.mainIndex < run.main.length ? 'principal' : 'refuerzo'
}

/** Tarjetas falladas distintas a lo largo de la sesión. */
export function failedCount(run: SessionRun): number {
  return run.candidates.size
}

/**
 * Registra la respuesta al ítem actual y devuelve el siguiente estado.
 *
 * `candidate` es el ítem con el progreso ya resultante de la respuesta, para
 * poder reencolarlo en el refuerzo (en práctica libre es el propio ítem, sin
 * persistir). La cola principal nunca crece y una tarjeta solo entra una vez
 * en el refuerzo.
 */
export function advance(
  run: SessionRun,
  grade: Grade,
  candidate?: SessionItem,
): SessionRun {
  const item = currentItem(run)
  if (!item) return run
  const correct = grade > 1

  const candidates = correct
    ? run.candidates
    : new Map(run.candidates).set(item.card.id, candidate ?? item)

  if (run.mainIndex < run.main.length) {
    const mainIndex = run.mainIndex + 1
    if (mainIndex < run.main.length) return { ...run, mainIndex, candidates }
    // Fin de la fase principal: el refuerzo se arma una sola vez, con las
    // primeras tarjetas distintas falladas.
    const reinforcement = [...candidates.values()].slice(0, MAX_REFUERZOS)
    return { ...run, mainIndex, candidates, reinforcement, reinforcementIndex: 0 }
  }

  // Fase de refuerzo: cada tarjeta aparece una sola vez; fallar no reencola.
  return { ...run, candidates, reinforcementIndex: run.reinforcementIndex + 1 }
}
