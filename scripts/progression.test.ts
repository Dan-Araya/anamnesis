import { strict as assert } from 'node:assert'
import { test } from 'vitest'
import type { Card, CardProgress, ModuleContent, Section, Settings } from '../src/types'
import {
  computeStatuses,
  pickMode,
  selectQueue,
  type SectionEntry,
} from '../src/lib/progression'
import { newProgress, schedule } from '../src/lib/srs'

const NOW = Date.UTC(2026, 0, 1)
const DAY = 86_400_000

const settings: Settings = {
  newPerDay: 10,
  dailyGoal: 40,
  strictDiacritics: false,
  unlockThreshold: 0.6,
  showKeyboard: true,
  theme: 'oscuro',
}

const modulo = (number: number): ModuleContent => ({
  id: `module-0${number}`,
  number,
  sections: [],
})

/** Una sección con `cardCount` tarjetas de vocabulario. */
function seccion(module: ModuleContent, number: number, cardCount: number): SectionEntry {
  const id = `${module.id}-s0${number}`
  const section: Section = {
    id,
    number,
    vocabulary: [],
    paradigms: [],
    sentences: [],
    grammar: [],
  }
  const cards: Card[] = Array.from({ length: cardCount }, (_, i) => ({
    id: `${id}:c${i}`,
    moduleId: module.id,
    sectionId: id,
    kind: 'vocab-reconocer',
    sourceId: `${id}-v${i}`,
  }))
  return { section, module, cards }
}

/** Un camino de un solo módulo con varias secciones. */
function camino(...tamanos: number[]): SectionEntry[] {
  const m = modulo(1)
  return tamanos.map((n, i) => seccion(m, i + 1, n))
}

/** Lleva todas las tarjetas de la sección a un estado dominado. */
function dominar(entry: SectionEntry, progress: Map<string, CardProgress>) {
  for (const card of entry.cards) {
    let p = schedule(newProgress(card, NOW), 4, NOW)
    for (let i = 0; i < 4; i++) p = schedule(p, 3, p.due)
    progress.set(card.id, p)
  }
}

test('solo la primera sección está abierta al empezar', () => {
  const entries = camino(4, 4, 4)
  const statuses = computeStatuses(entries, new Map(), settings, NOW)

  assert.deepEqual(
    statuses.map((s) => s.unlocked),
    [true, false, false],
  )
  assert.equal(statuses[0]!.fresh, 4)
  assert.equal(statuses[0]!.mastery, 0)
  assert.equal(statuses[0]!.completed, false)
})

test('dominar una sección abre la siguiente, pero no la de después', () => {
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

test('el camino continúa de un módulo al siguiente', () => {
  const m1 = modulo(1)
  const m2 = modulo(2)
  const entries = [seccion(m1, 1, 3), seccion(m2, 1, 3)]
  const progress = new Map<string, CardProgress>()
  dominar(entries[0]!, progress)

  const statuses = computeStatuses(entries, progress, settings, NOW)
  // La última sección de un módulo abre la primera del siguiente.
  assert.equal(statuses[1]!.unlocked, true)
  assert.equal(statuses[1]!.module.id, 'module-02')
})

test('una sección a medias no abre la siguiente', () => {
  const entries = camino(4, 4)
  const progress = new Map<string, CardProgress>()
  for (const card of entries[0]!.cards.slice(0, 2)) {
    progress.set(card.id, schedule(newProgress(card, NOW), 3, NOW))
  }

  const statuses = computeStatuses(entries, progress, settings, NOW)
  assert.equal(statuses[0]!.unlocked, true)
  assert.equal(statuses[1]!.unlocked, false)
  assert.ok(statuses[0]!.mastery! < settings.unlockThreshold)
})

test('una sección vacía no bloquea el camino', () => {
  const entries = camino(0, 3)
  const statuses = computeStatuses(entries, new Map(), settings, NOW)

  assert.equal(statuses[0]!.mastery, null)
  assert.equal(statuses[0]!.completed, false)
  assert.equal(statuses[1]!.unlocked, true)
})

test('la sesión respeta el límite diario de tarjetas nuevas', () => {
  const entries = camino(50)
  const statuses = computeStatuses(entries, new Map(), settings, NOW)
  const queue = selectQueue(entries, statuses, new Map(), settings, {}, NOW)

  assert.equal(queue.length, settings.newPerDay)
  assert.ok(queue.every((i) => i.isNew))
})

test('las nuevas ya vistas hoy descuentan del cupo', () => {
  const entries = camino(50)
  const statuses = computeStatuses(entries, new Map(), settings, NOW)
  const queue = selectQueue(entries, statuses, new Map(), settings, { newToday: 7 }, NOW)

  assert.equal(queue.length, 3)
})

test('la sesión no saca tarjetas de secciones bloqueadas', () => {
  const entries = camino(5, 5)
  const statuses = computeStatuses(entries, new Map(), settings, NOW)
  const queue = selectQueue(entries, statuses, new Map(), settings, {}, NOW)

  assert.ok(queue.every((i) => i.card.sectionId === entries[0]!.section.id))
})

test('el repaso global no introduce material nuevo', () => {
  const entries = camino(10)
  const progress = new Map<string, CardProgress>()
  // Una sola tarjeta vencida; el resto sin empezar.
  const card = entries[0]!.cards[0]!
  const p = schedule(newProgress(card, NOW), 4, NOW)
  progress.set(card.id, { ...p, due: NOW - DAY })

  const statuses = computeStatuses(entries, progress, settings, NOW)
  const queue = selectQueue(entries, statuses, progress, settings, { onlyReviews: true }, NOW)

  assert.equal(queue.length, 1)
  assert.equal(queue[0]!.isNew, false)
})

test('los repasos vencidos entran antes que las novedades y van ordenados', () => {
  const entries = camino(10)
  const progress = new Map<string, CardProgress>()
  const retrasos = [3, 1, 2]
  entries[0]!.cards.slice(0, 3).forEach((card, i) => {
    const p = schedule(newProgress(card, NOW), 4, NOW)
    progress.set(card.id, { ...p, due: NOW - retrasos[i]! * DAY })
  })

  const statuses = computeStatuses(entries, progress, settings, NOW)
  const queue = selectQueue(entries, statuses, progress, settings, {}, NOW)
  const vencidas = queue.filter((i) => !i.isNew)

  assert.equal(vencidas.length, 3)
  assert.deepEqual(
    vencidas.map((i) => i.progress.due),
    [NOW - 3 * DAY, NOW - 2 * DAY, NOW - 1 * DAY],
  )
  assert.equal(queue[0]!.isNew, false)
})

test('pulsar un nodo practica solo esa sección', () => {
  const entries = camino(5, 5)
  const progress = new Map<string, CardProgress>()
  dominar(entries[0]!, progress)

  const statuses = computeStatuses(entries, progress, settings, NOW)
  const segunda = entries[1]!.section.id
  const queue = selectQueue(
    entries,
    statuses,
    progress,
    settings,
    { sectionId: segunda },
    NOW,
  )

  assert.ok(queue.length > 0)
  assert.ok(queue.every((i) => i.card.sectionId === segunda))
})

test('el modo sin límite ignora el objetivo diario', () => {
  const entries = camino(200)
  const statuses = computeStatuses(entries, new Map(), settings, NOW)
  const queue = selectQueue(entries, statuses, new Map(), settings, { unlimited: true }, NOW)

  assert.equal(queue.length, 200)
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
})
