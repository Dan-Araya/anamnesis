import { strict as assert } from 'node:assert'
import { test } from 'vitest'
import type { Card, CardProgress } from '../src/types'
import type { SessionItem } from '../src/lib/progression'
import { newProgress } from '../src/lib/srs'
import {
  MAX_REFUERZOS,
  advance,
  createRun,
  currentItem,
  failedCount,
  phaseOf,
} from '../src/lib/session-run'

/**
 * El recorrido en dos fases: la cola principal es fija, cada tarjeta aparece
 * una sola vez y, al terminar, como máximo tres tarjetas falladas distintas
 * reaparecen una única vez en el refuerzo.
 */

function card(id: string): Card {
  return {
    id,
    moduleId: 'm',
    sectionId: 's',
    capsuleId: 'c',
    kind: 'vocab-reconocer',
    sourceId: id,
  }
}

function item(id: string): SessionItem {
  return { card: card(id), progress: newProgress(card(id)), mode: 'opcion-multiple', isNew: true }
}

/** Avanza la sesión respondiendo el ítem actual con `grade`. */
function responder(run: ReturnType<typeof createRun>, grade: 1 | 3): ReturnType<typeof createRun> {
  const actual = currentItem(run)!
  return advance(run, grade, actual)
}

/** Cuántos pasos quedan hasta que la sesión termina. */
function pasos(run: ReturnType<typeof createRun>): number {
  let pasos = 0
  let r = run
  while (currentItem(r)) {
    r = responder(r, 3)
    pasos++
  }
  return pasos
}

test('responder correctamente no reencola: la cola principal nunca crece', () => {
  const run = createRun([item('a'), item('b'), item('c')])
  let r = run
  for (const id of ['a', 'b', 'c']) {
    assert.equal(phaseOf(r), 'principal')
    assert.equal(currentItem(r)!.card.id, id)
    r = responder(r, 3)
  }
  assert.equal(r.main.length, 3)
  assert.equal(r.reinforcement.length, 0)
  assert.equal(currentItem(r), undefined)
  assert.equal(failedCount(r), 0)
})

test('cada tarjeta correcta aparece una sola vez en la fase principal', () => {
  const run = createRun([item('a'), item('b'), item('a'), item('b')])
  // Aunque la cola repita ids (mezcla), cada aparición se consume una vez.
  assert.equal(pasos(run), 4)
})

test('fallar una tarjeta la lleva al refuerzo, una sola vez', () => {
  let r = createRun([item('a'), item('b'), item('c')])
  r = responder(r, 1) // falla a
  r = responder(r, 3) // b bien
  r = responder(r, 3) // c bien

  assert.equal(phaseOf(r), 'refuerzo')
  assert.equal(r.reinforcement.length, 1)
  assert.equal(currentItem(r)!.card.id, 'a')

  // Fallar de nuevo en el refuerzo no la reencola: la sesión termina.
  r = responder(r, 1)
  assert.equal(currentItem(r), undefined)
  assert.equal(r.reinforcement.length, 1)
  assert.equal(failedCount(r), 1)
})

test('una tarjeta fallada dos veces en la principal solo entra una vez al refuerzo', () => {
  let r = createRun([item('a'), item('b'), item('a')])
  r = responder(r, 1) // falla a
  r = responder(r, 3) // b bien
  r = responder(r, 1) // vuelve a fallar a

  assert.equal(phaseOf(r), 'refuerzo')
  assert.equal(r.reinforcement.length, 1)
  assert.equal(failedCount(r), 1)
  assert.equal(pasos(r), 1)
})

test('nunca hay más de tres refuerzos, aunque se falle todo', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f']
  let r = createRun(ids.map(item))
  for (let i = 0; i < 6; i++) r = responder(r, 1)

  assert.equal(r.reinforcement.length, MAX_REFUERZOS)
  assert.equal(failedCount(r), 6)
  // La fase de refuerzo consume exactamente las tres y termina.
  assert.equal(pasos(r), 3)
})

test('una sesión donde todo se falla termina tras base + min(3, distintas)', () => {
  const base = 4
  let r = createRun(['a', 'b', 'c', 'd'].map(item))
  let respuestas = 0
  while (currentItem(r)) {
    r = responder(r, 1)
    respuestas++
  }
  assert.equal(respuestas, base + Math.min(MAX_REFUERZOS, base))
})

test('el refuerzo arma su propia cola con las primeras falladas en orden', () => {
  let r = createRun(['a', 'b', 'c', 'd', 'e'].map(item))
  r = responder(r, 1) // falla a
  r = responder(r, 3) // b bien
  r = responder(r, 1) // falla c
  r = responder(r, 3) // d bien
  r = responder(r, 1) // falla e

  assert.deepEqual(r.reinforcement.map((i) => i.card.id), ['a', 'c', 'e'])
})

test('el denominador principal es fijo y el refuerzo tiene su propio índice', () => {
  let r = createRun(['a', 'b', 'c', 'd', 'e', 'f'].map(item))
  for (let i = 0; i < 6; i++) {
    assert.equal(r.main.length, 6, 'el total principal nunca cambia')
    assert.equal(r.mainIndex, i)
    r = responder(r, 1)
  }
  assert.equal(r.main.length, 6)
  assert.equal(r.reinforcementIndex, 0)
  r = responder(r, 3)
  assert.equal(r.reinforcementIndex, 1)
  r = responder(r, 3)
  assert.equal(r.reinforcementIndex, 2)
})

test('el ítem candidato del refuerzo conserva el progreso actualizado', () => {
  const a = item('a')
  const actualizado: CardProgress = {
    ...a.progress,
    reps: 1,
    state: 'aprendiendo',
    due: Date.now() + 600_000,
  }
  const siguiente: SessionItem = { ...a, progress: actualizado, isNew: false }
  let r = createRun([a, item('b')])
  r = advance(r, 1, siguiente)
  r = responder(r, 3)
  assert.equal(currentItem(r)!.progress, actualizado)
})
