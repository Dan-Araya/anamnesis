import { strict as assert } from 'node:assert'
import { test } from 'vitest'
import type {
  Capsule,
  Card,
  CardProgress,
  ModuleContent,
  Section,
  Settings,
} from '../src/types'
import {
  computeStatuses,
  pickMode,
  selectQueue,
  type CapsuleEntry,
} from '../src/lib/progression'
import { newProgress, schedule } from '../src/lib/srs'

const NOW = Date.UTC(2026, 0, 1)
const DAY = 86_400_000

const settings: Settings = {
  newPerDay: 10,
  dailyGoal: 40,
  mixRatio: 0.4,
  strictDiacritics: false,
  unlockThreshold: 0.5,
  showKeyboard: true,
  theme: 'oscuro',
}

/** Un camino de una sección con varias cápsulas de N tarjetas cada una. */
function camino(...tamanos: number[]): CapsuleEntry[] {
  const module: ModuleContent = { id: 'module-01', number: 1, sections: [] }
  const section: Section = { id: 'm01-s01', number: 1, capsules: [] }

  return tamanos.map((n, i) => {
    const capsule: Capsule = {
      id: `m01-s01-c0${i + 1}`,
      number: i + 1,
      vocabulary: [],
      paradigms: [],
      sentences: [],
      grammar: [],
      drills: [],
    }
    const cards: Card[] = Array.from({ length: n }, (_, j) => ({
      id: `${capsule.id}:c${j}`,
      moduleId: module.id,
      sectionId: section.id,
      capsuleId: capsule.id,
      kind: 'vocab-reconocer',
      sourceId: `${capsule.id}-v${j}`,
    }))
    return { capsule, section, module, cards }
  })
}

/** Lleva todas las tarjetas de la cápsula a un estado dominado. */
function dominar(entry: CapsuleEntry, progress: Map<string, CardProgress>) {
  for (const card of entry.cards) {
    let p = schedule(newProgress(card, NOW), 4, NOW)
    for (let i = 0; i < 4; i++) p = schedule(p, 3, p.due)
    progress.set(card.id, p)
  }
}

test('solo la primera cápsula está abierta al empezar', () => {
  const entries = camino(4, 4, 4)
  const statuses = computeStatuses(entries, new Map(), settings, NOW)

  assert.deepEqual(
    statuses.map((s) => s.unlocked),
    [true, false, false],
  )
  assert.equal(statuses[0]!.fresh, 4)
  assert.equal(statuses[0]!.completed, false)
})

test('dominar una cápsula abre la siguiente, pero no la de después', () => {
  const entries = camino(4, 4, 4)
  const progress = new Map<string, CardProgress>()
  dominar(entries[0]!, progress)

  const statuses = computeStatuses(entries, progress, settings, NOW)
  assert.deepEqual(
    statuses.map((s) => s.unlocked),
    [true, true, false],
  )
  assert.equal(statuses[0]!.completed, true)
})

test('graduar las tarjetas de una cápsula basta para abrir la siguiente', () => {
  const entries = camino(4, 4)
  const progress = new Map<string, CardProgress>()
  // Dos pasos de aprendizaje acertados: justo lo que da una sesión.
  for (const card of entries[0]!.cards) {
    let p = schedule(newProgress(card, NOW), 3, NOW)
    p = schedule(p, 3, NOW)
    assert.equal(p.state, 'repaso')
    progress.set(card.id, p)
  }

  const statuses = computeStatuses(entries, progress, settings, NOW)
  assert.equal(statuses[1]!.unlocked, true)
})

test('una cápsula a medias no abre la siguiente', () => {
  const entries = camino(4, 4)
  const progress = new Map<string, CardProgress>()
  progress.set(entries[0]!.cards[0]!.id, schedule(newProgress(entries[0]!.cards[0]!, NOW), 3, NOW))

  const statuses = computeStatuses(entries, progress, settings, NOW)
  assert.equal(statuses[1]!.unlocked, false)
})

test('una cápsula vacía no bloquea el camino', () => {
  const entries = camino(0, 3)
  const statuses = computeStatuses(entries, new Map(), settings, NOW)

  assert.equal(statuses[0]!.mastery, null)
  assert.equal(statuses[1]!.unlocked, true)
})

test('el camino continúa de un módulo al siguiente', () => {
  const a = camino(3)[0]!
  const b = camino(3)[0]!
  const otroModulo: ModuleContent = { id: 'module-02', number: 2, sections: [] }
  const segunda: CapsuleEntry = {
    ...b,
    module: otroModulo,
    section: { id: 'm02-s01', number: 1, capsules: [] },
    capsule: { ...b.capsule, id: 'm02-s01-c01' },
    cards: b.cards.map((c) => ({
      ...c,
      id: `m02-${c.id}`,
      moduleId: 'module-02',
      sectionId: 'm02-s01',
      capsuleId: 'm02-s01-c01',
    })),
  }
  const progress = new Map<string, CardProgress>()
  dominar(a, progress)

  const statuses = computeStatuses([a, segunda], progress, settings, NOW)
  assert.equal(statuses[1]!.unlocked, true)
  assert.equal(statuses[1]!.module.id, 'module-02')
})

// ---------------------------------------------------------------------------
// La mezcla de material nuevo con el ya visto
// ---------------------------------------------------------------------------

test('practicar una cápsula nueva arrastra repaso de las anteriores', () => {
  const entries = camino(6, 6)
  const progress = new Map<string, CardProgress>()
  // La primera cápsula ya está hecha y sus tarjetas aún no han vencido.
  dominar(entries[0]!, progress)

  const statuses = computeStatuses(entries, progress, settings, NOW)
  const segunda = entries[1]!.capsule.id
  const queue = selectQueue(entries, statuses, progress, settings, { capsuleId: segunda }, NOW)

  const nuevas = queue.filter((i) => i.isNew)
  const repasos = queue.filter((i) => !i.isNew)

  // Lo nuevo sale solo de la cápsula elegida…
  assert.ok(nuevas.every((i) => i.card.capsuleId === segunda))
  // …y lo antiguo se cuela aunque todavía no tocase repasarlo.
  assert.ok(repasos.length > 0, 'la sesión debería mezclar material anterior')
  assert.ok(repasos.every((i) => i.card.capsuleId === entries[0]!.capsule.id))

  // La proporción se acerca al ajuste (0,4 → cuatro de cada diez).
  const ratio = repasos.length / queue.length
  assert.ok(ratio > 0.25 && ratio < 0.55, `proporción inesperada: ${ratio}`)
})

test('con la mezcla a cero la cápsula es estanca', () => {
  const entries = camino(6, 6)
  const progress = new Map<string, CardProgress>()
  dominar(entries[0]!, progress)

  const statuses = computeStatuses(entries, progress, settings, NOW)
  const queue = selectQueue(
    entries,
    statuses,
    progress,
    { ...settings, mixRatio: 0 },
    { capsuleId: entries[1]!.capsule.id },
    NOW,
  )

  assert.ok(queue.every((i) => i.isNew))
})

test('los repasos vencidos entran enteros, aunque superen la proporción', () => {
  const entries = camino(20, 4)
  const progress = new Map<string, CardProgress>()
  // Toda la primera cápsula vencida hace días.
  for (const card of entries[0]!.cards) {
    const p = schedule(newProgress(card, NOW), 4, NOW)
    progress.set(card.id, { ...p, due: NOW - 3 * DAY })
  }

  const statuses = computeStatuses(entries, progress, settings, NOW)
  const queue = selectQueue(
    entries,
    statuses,
    progress,
    settings,
    { capsuleId: entries[1]!.capsule.id },
    NOW,
  )

  assert.equal(queue.filter((i) => !i.isNew).length, 20)
})

test('el repaso global no introduce material nuevo', () => {
  const entries = camino(10)
  const progress = new Map<string, CardProgress>()
  const card = entries[0]!.cards[0]!
  const p = schedule(newProgress(card, NOW), 4, NOW)
  progress.set(card.id, { ...p, due: NOW - DAY })

  const statuses = computeStatuses(entries, progress, settings, NOW)
  const queue = selectQueue(entries, statuses, progress, settings, { onlyReviews: true }, NOW)

  assert.equal(queue.length, 1)
  assert.equal(queue[0]!.isNew, false)
})

test('la sesión respeta el límite diario de tarjetas nuevas', () => {
  const entries = camino(50)
  const statuses = computeStatuses(entries, new Map(), settings, NOW)
  const queue = selectQueue(entries, statuses, new Map(), settings, {}, NOW)

  assert.equal(queue.length, settings.newPerDay)
})

test('las nuevas ya vistas hoy descuentan del cupo', () => {
  const entries = camino(50)
  const statuses = computeStatuses(entries, new Map(), settings, NOW)
  const queue = selectQueue(entries, statuses, new Map(), settings, { newToday: 7 }, NOW)

  assert.equal(queue.length, 3)
})

test('no se introduce material de cápsulas bloqueadas', () => {
  const entries = camino(5, 5)
  const statuses = computeStatuses(entries, new Map(), settings, NOW)
  const queue = selectQueue(entries, statuses, new Map(), settings, {}, NOW)

  assert.ok(queue.every((i) => i.card.capsuleId === entries[0]!.capsule.id))
})

test('el formato de la pregunta se endurece según se asienta la tarjeta', () => {
  const card = camino(1)[0]!.cards[0]!
  const nueva = newProgress(card, NOW)
  assert.equal(pickMode(card, nueva), 'opcion-multiple')

  let p = schedule(nueva, 3, NOW)
  p = schedule(p, 3, p.due)
  assert.equal(pickMode(card, p), 'flashcard')

  const morfologia: Card = { ...card, kind: 'morfologia', cellKey: 'sg|nom' }
  assert.equal(pickMode(morfologia, newProgress(morfologia, NOW)), 'flashcard')
  assert.equal(pickMode(morfologia, schedule(newProgress(morfologia, NOW), 3, NOW)), 'escribir')

  // La tabla de repaso siempre se rellena entera, sin fase de reconocimiento.
  const tabla: Card = { ...card, kind: 'tabla' }
  assert.equal(pickMode(tabla, newProgress(tabla, NOW)), 'huecos')
  assert.equal(pickMode(tabla, schedule(newProgress(tabla, NOW), 3, NOW)), 'huecos')
})
