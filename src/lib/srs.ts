import type { Card, CardProgress, Grade } from '@/types'

/**
 * Repetición espaciada, variante de SM-2 con pasos de aprendizaje (el mismo
 * esquema que usa Anki, simplificado).
 *
 * Las notas: 1 otra vez · 2 difícil · 3 bien · 4 fácil.
 */

const MINUTE = 60_000
const DAY = 86_400_000

export const SRS = {
  /** Minutos entre repasos mientras la tarjeta se está aprendiendo. */
  learningSteps: [1, 10],
  /** Minutos entre repasos tras un olvido. */
  relearningSteps: [10],
  /** Días de intervalo al graduar con «bien». */
  graduatingInterval: 1,
  /** Días de intervalo al graduar directamente con «fácil». */
  easyInterval: 4,
  startingEase: 2.5,
  minEase: 1.3,
  /** Al olvidar, el intervalo se reduce a esta fracción. */
  lapseMultiplier: 0.4,
  maxInterval: 365 * 5,
  /** Días a partir de los cuales consideramos una tarjeta consolidada. */
  matureInterval: 21,
} as const

export function newProgress(card: Card, now = Date.now()): CardProgress {
  return {
    cardId: card.id,
    moduleId: card.moduleId,
    sectionId: card.sectionId,
    kind: card.kind,
    state: 'nueva',
    due: now,
    interval: 0,
    ease: SRS.startingEase,
    step: 0,
    reps: 0,
    lapses: 0,
    lastReview: null,
    streak: 0,
  }
}

/** ±5 % de dispersión para que las tarjetas no se agolpen el mismo día. */
function fuzz(days: number): number {
  if (days < 2.5) return days
  const spread = days * 0.05
  return days + (Math.random() * 2 - 1) * spread
}

function clampInterval(days: number): number {
  return Math.min(SRS.maxInterval, Math.max(1, days))
}

/**
 * Calcula el nuevo estado de una tarjeta tras responderla.
 * Es una función pura: no toca la base de datos.
 */
export function schedule(prev: CardProgress, grade: Grade, now = Date.now()): CardProgress {
  const next: CardProgress = {
    ...prev,
    reps: prev.reps + 1,
    lastReview: now,
    streak: grade === 1 ? 0 : prev.streak + 1,
  }

  const learning = prev.state === 'nueva' || prev.state === 'aprendiendo'
  const relearning = prev.state === 'reaprendiendo'

  if (learning || relearning) {
    const steps = relearning ? SRS.relearningSteps : SRS.learningSteps

    if (grade === 1) {
      next.state = relearning ? 'reaprendiendo' : 'aprendiendo'
      next.step = 0
      next.due = now + steps[0]! * MINUTE
      return next
    }

    if (grade === 2) {
      // Repite el paso actual, un poco más tarde.
      next.state = relearning ? 'reaprendiendo' : 'aprendiendo'
      next.due = now + (steps[prev.step] ?? steps[0]!) * MINUTE
      return next
    }

    if (grade === 4) {
      next.state = 'repaso'
      next.step = 0
      next.interval = relearning ? clampInterval(prev.interval || 1) : SRS.easyInterval
      next.due = now + next.interval * DAY
      return next
    }

    // grade 3: avanza un paso; si se acaban, gradúa.
    const step = prev.step + 1
    if (step < steps.length) {
      next.state = relearning ? 'reaprendiendo' : 'aprendiendo'
      next.step = step
      next.due = now + steps[step]! * MINUTE
      return next
    }

    next.state = 'repaso'
    next.step = 0
    next.interval = relearning ? clampInterval(prev.interval || 1) : SRS.graduatingInterval
    next.due = now + next.interval * DAY
    return next
  }

  // Tarjeta en repaso.
  if (grade === 1) {
    next.state = 'reaprendiendo'
    next.step = 0
    next.lapses = prev.lapses + 1
    next.ease = Math.max(SRS.minEase, prev.ease - 0.2)
    next.interval = clampInterval(prev.interval * SRS.lapseMultiplier)
    next.due = now + SRS.relearningSteps[0]! * MINUTE
    return next
  }

  const base = Math.max(prev.interval, 1)
  if (grade === 2) {
    next.ease = Math.max(SRS.minEase, prev.ease - 0.15)
    next.interval = clampInterval(fuzz(base * 1.2))
  } else if (grade === 3) {
    next.interval = clampInterval(fuzz(base * prev.ease))
  } else {
    next.ease = prev.ease + 0.15
    next.interval = clampInterval(fuzz(base * prev.ease * 1.3))
  }

  next.state = 'repaso'
  next.step = 0
  next.due = now + next.interval * DAY
  return next
}

/** Previsualización de cuándo volvería cada opción, para pintarlo en los botones. */
export function previewIntervals(
  prev: CardProgress,
  now = Date.now(),
): Record<Grade, string> {
  const format = (p: CardProgress): string => {
    const ms = p.due - now
    if (ms < 60 * MINUTE) return `${Math.max(1, Math.round(ms / MINUTE))} min`
    if (ms < DAY) return `${Math.round(ms / (60 * MINUTE))} h`
    const days = Math.round(ms / DAY)
    if (days < 30) return `${days} d`
    if (days < 365) return `${Math.round(days / 30)} mes`
    return `${(days / 365).toFixed(1)} a`
  }
  return {
    1: format(schedule(prev, 1, now)),
    2: format(schedule(prev, 2, now)),
    3: format(schedule(prev, 3, now)),
    4: format(schedule(prev, 4, now)),
  }
}

/**
 * Grado de dominio de una tarjeta, de 0 a 1. Alimenta el porcentaje del módulo
 * que decide el desbloqueo del siguiente.
 */
export function mastery(p: CardProgress | undefined): number {
  if (!p) return 0
  switch (p.state) {
    case 'nueva':
      return 0
    case 'aprendiendo':
      return 0.3
    case 'reaprendiendo':
      return 0.4
    case 'repaso':
      return Math.min(1, 0.6 + 0.4 * Math.min(1, p.interval / SRS.matureInterval))
  }
}

/** ¿Está la tarjeta pendiente de repaso? */
export function isDue(p: CardProgress, now = Date.now()): boolean {
  return p.state !== 'nueva' && p.due <= now
}
