import { strict as assert } from 'node:assert'
import { test } from 'vitest'
import type { Card } from '../src/types'
import { SRS, isDue, mastery, newProgress, schedule } from '../src/lib/srs'

const card: Card = {
  id: 'v:test:rec',
  moduleId: 'module-01',
  kind: 'vocab-reconocer',
  sourceId: 'test',
}

const NOW = Date.UTC(2026, 0, 1)
const MIN = 60_000
const DAY = 86_400_000

test('una tarjeta nueva vence de inmediato pero no cuenta como repaso pendiente', () => {
  const p = newProgress(card, NOW)
  assert.equal(p.state, 'nueva')
  assert.equal(isDue(p, NOW), false)
})

test('acertar avanza por los pasos de aprendizaje antes de graduar', () => {
  let p = newProgress(card, NOW)

  p = schedule(p, 3, NOW)
  assert.equal(p.state, 'aprendiendo')
  assert.equal(p.due - NOW, SRS.learningSteps[1]! * MIN)

  p = schedule(p, 3, NOW)
  assert.equal(p.state, 'repaso')
  assert.equal(p.interval, SRS.graduatingInterval)
  assert.equal(p.due - NOW, DAY)
})

test('«fácil» gradúa de golpe', () => {
  const p = schedule(newProgress(card, NOW), 4, NOW)
  assert.equal(p.state, 'repaso')
  assert.equal(p.interval, SRS.easyInterval)
})

test('«otra vez» devuelve al primer paso', () => {
  let p = schedule(newProgress(card, NOW), 3, NOW)
  p = schedule(p, 1, NOW)
  assert.equal(p.state, 'aprendiendo')
  assert.equal(p.step, 0)
  assert.equal(p.due - NOW, SRS.learningSteps[0]! * MIN)
  assert.equal(p.streak, 0)
})

test('el intervalo crece según el factor de facilidad', () => {
  let p = schedule(newProgress(card, NOW), 4, NOW) // 4 días
  const antes = p.interval
  p = schedule(p, 3, NOW)
  // Con fuzz de ±5 %, el intervalo ronda antes * ease.
  const esperado = antes * SRS.startingEase
  assert.ok(p.interval > esperado * 0.9 && p.interval < esperado * 1.1, `fue ${p.interval}`)
})

test('olvidar una tarjeta madura la manda a reaprender y baja la facilidad', () => {
  let p = schedule(newProgress(card, NOW), 4, NOW)
  p = schedule(p, 3, NOW)
  const easeAntes = p.ease
  const intervaloAntes = p.interval

  p = schedule(p, 1, NOW)
  assert.equal(p.state, 'reaprendiendo')
  assert.equal(p.lapses, 1)
  assert.ok(p.ease < easeAntes)
  assert.ok(p.interval < intervaloAntes)
  assert.equal(p.due - NOW, SRS.relearningSteps[0]! * MIN)
})

test('la facilidad nunca baja del mínimo', () => {
  let p = schedule(newProgress(card, NOW), 4, NOW)
  for (let i = 0; i < 20; i++) p = schedule(p, 1, NOW)
  assert.ok(p.ease >= SRS.minEase)
})

test('el intervalo tiene tope', () => {
  let p = schedule(newProgress(card, NOW), 4, NOW)
  for (let i = 0; i < 60; i++) p = schedule(p, 4, p.due)
  assert.ok(p.interval <= SRS.maxInterval)
})

test('el dominio crece de nueva a consolidada', () => {
  const nueva = newProgress(card, NOW)
  assert.equal(mastery(nueva), 0)

  const aprendiendo = schedule(nueva, 3, NOW)
  assert.ok(mastery(aprendiendo) > 0 && mastery(aprendiendo) < 1)

  let madura = schedule(nueva, 4, NOW)
  for (let i = 0; i < 5; i++) madura = schedule(madura, 3, madura.due)
  assert.equal(mastery(madura), 1)
  assert.ok(mastery(madura) > mastery(aprendiendo))
})

test('isDue solo marca lo que ya venció', () => {
  const p = schedule(newProgress(card, NOW), 4, NOW)
  assert.equal(isDue(p, NOW), false)
  assert.equal(isDue(p, NOW + 5 * DAY), true)
})
