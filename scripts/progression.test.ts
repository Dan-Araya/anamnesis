import { strict as assert } from 'node:assert'
import { test } from 'vitest'
import type { Card, CardProgress, ModuleContent, Settings } from '../src/types'
import { computeStatuses, pickMode, selectQueue, type ModuleEntry } from '../src/lib/progression'
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

function modulo(number: number, cardCount: number): ModuleEntry {
  const id = `module-0${number}`
  const module: ModuleContent = {
    id,
    number,
    title: `Módulo ${number}`,
    vocabulary: [],
    paradigms: [],
    sentences: [],
    grammar: [],
  }
  const cards: Card[] = Array.from({ length: cardCount }, (_, i) => ({
    id: `${id}:c${i}`,
    moduleId: id,
    kind: 'vocab-reconocer',
    sourceId: `${id}-v${i}`,
  }))
  return { module, cards }
}

/** Lleva todas las tarjetas del módulo a un estado dominado. */
function dominar(entry: ModuleEntry, progress: Map<string, CardProgress>) {
  for (const card of entry.cards) {
    let p = schedule(newProgress(card, NOW), 4, NOW)
    for (let i = 0; i < 4; i++) p = schedule(p, 3, p.due)
    progress.set(card.id, p)
  }
}

test('solo el primer módulo está abierto al empezar', () => {
  const entries = [modulo(1, 4), modulo(2, 4), modulo(3, 4)]
  const statuses = computeStatuses(entries, new Map(), settings, NOW)

  assert.deepEqual(
    statuses.map((s) => s.unlocked),
    [true, false, false],
  )
  assert.equal(statuses[0]!.fresh, 4)
  assert.equal(statuses[0]!.mastery, 0)
})

test('dominar un módulo abre el siguiente, pero no el de después', () => {
  const entries = [modulo(1, 4), modulo(2, 4), modulo(3, 4)]
  const progress = new Map<string, CardProgress>()
  dominar(entries[0]!, progress)

  const statuses = computeStatuses(entries, progress, settings, NOW)
  assert.deepEqual(
    statuses.map((s) => s.unlocked),
    [true, true, false],
  )
})

test('un módulo a medias no abre el siguiente', () => {
  const entries = [modulo(1, 4), modulo(2, 4)]
  const progress = new Map<string, CardProgress>()
  // Solo la mitad de las tarjetas, y apenas aprendidas.
  for (const card of entries[0]!.cards.slice(0, 2)) {
    progress.set(card.id, schedule(newProgress(card, NOW), 3, NOW))
  }

  const statuses = computeStatuses(entries, progress, settings, NOW)
  assert.equal(statuses[0]!.unlocked, true)
  assert.equal(statuses[1]!.unlocked, false)
  assert.ok(statuses[0]!.mastery! < settings.unlockThreshold)
})

test('un módulo vacío no bloquea la progresión', () => {
  const entries = [modulo(1, 0), modulo(2, 3)]
  const statuses = computeStatuses(entries, new Map(), settings, NOW)

  assert.equal(statuses[0]!.mastery, null)
  assert.equal(statuses[1]!.unlocked, true)
})

test('la sesión respeta el límite diario de tarjetas nuevas', () => {
  const entries = [modulo(1, 50)]
  const statuses = computeStatuses(entries, new Map(), settings, NOW)
  const queue = selectQueue(entries, statuses, new Map(), settings, {}, NOW)

  assert.equal(queue.length, settings.newPerDay)
  assert.ok(queue.every((i) => i.isNew))
})

test('las nuevas ya vistas hoy descuentan del cupo', () => {
  const entries = [modulo(1, 50)]
  const statuses = computeStatuses(entries, new Map(), settings, NOW)
  const queue = selectQueue(entries, statuses, new Map(), settings, { newToday: 7 }, NOW)

  assert.equal(queue.length, 3)
})

test('la sesión no saca tarjetas de módulos bloqueados', () => {
  const entries = [modulo(1, 5), modulo(2, 5)]
  const statuses = computeStatuses(entries, new Map(), settings, NOW)
  const queue = selectQueue(entries, statuses, new Map(), settings, {}, NOW)

  assert.ok(queue.every((i) => i.card.moduleId === 'module-01'))
})

test('los repasos vencidos entran antes que las novedades y van ordenados', () => {
  const entries = [modulo(1, 10)]
  const progress = new Map<string, CardProgress>()
  // Tres tarjetas vencidas hace 3, 1 y 2 días.
  const retrasos = [3, 1, 2]
  entries[0]!.cards.slice(0, 3).forEach((card, i) => {
    const p = schedule(newProgress(card, NOW), 4, NOW)
    progress.set(card.id, { ...p, due: NOW - retrasos[i]! * DAY })
  })

  const statuses = computeStatuses(entries, progress, settings, NOW)
  const queue = selectQueue(entries, statuses, progress, settings, {}, NOW)
  const vencidas = queue.filter((i) => !i.isNew)

  assert.equal(vencidas.length, 3)
  // La más atrasada primero.
  assert.deepEqual(
    vencidas.map((i) => i.progress.due),
    [NOW - 3 * DAY, NOW - 2 * DAY, NOW - 1 * DAY],
  )
  assert.equal(queue[0]!.isNew, false)
})

test('practicar un módulo concreto ignora los demás', () => {
  const entries = [modulo(1, 5), modulo(2, 5)]
  const progress = new Map<string, CardProgress>()
  dominar(entries[0]!, progress)

  const statuses = computeStatuses(entries, progress, settings, NOW)
  const queue = selectQueue(
    entries,
    statuses,
    progress,
    settings,
    { moduleId: 'module-02' },
    NOW,
  )

  assert.ok(queue.length > 0)
  assert.ok(queue.every((i) => i.card.moduleId === 'module-02'))
})

test('el modo sin límite ignora el objetivo diario', () => {
  const entries = [modulo(1, 200)]
  const statuses = computeStatuses(entries, new Map(), settings, NOW)
  const queue = selectQueue(entries, statuses, new Map(), settings, { unlimited: true }, NOW)

  assert.equal(queue.length, 200)
})

test('el formato de la pregunta se endurece según se asienta la tarjeta', () => {
  const card = modulo(1, 1).cards[0]!
  const nueva = newProgress(card, NOW)
  assert.equal(pickMode(card, nueva), 'opcion-multiple')

  let p = schedule(nueva, 3, NOW)
  p = schedule(p, 3, p.due)
  assert.equal(pickMode(card, p), 'flashcard')

  const morfologia: Card = { ...card, kind: 'morfologia', cellKey: 'sg|nom' }
  assert.equal(pickMode(morfologia, newProgress(morfologia, NOW)), 'flashcard')
  assert.equal(pickMode(morfologia, schedule(newProgress(morfologia, NOW), 3, NOW)), 'escribir')
})
