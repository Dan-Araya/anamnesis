import { strict as assert } from 'node:assert'
import { beforeEach, test, vi } from 'vitest'
import { openDB } from 'idb'
import type { CardProgress, DailyStat, ReviewLog } from '../src/types'
import { cardsByCapsule } from '../src/content'
import { newProgress, schedule } from '../src/lib/srs'

/**
 * La migración v4→v5 sobre una base real: abre una base de la versión 4,
 * siembra el progreso de un usuario antiguo y comprueba que al abrir con la
 * versión 5 las tarjetas de transliterar clonan la programación de sus
 * tarjetas de reconocer sin tocar nada más.
 */

const DB = 'griego-antiguo'
const NOW = Date.UTC(2026, 2, 1)
const DAY = 86_400_000

beforeEach(async () => {
  vi.resetModules()
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB)
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
    req.onblocked = () => resolve()
  })
})

test('la migración v4→v5 clona reconocer a transliterar y conserva todo lo demás', async () => {
  // --- Base v4 sembrada a mano, con el esquema que tenía la app en v4. -------
  const v4 = await openDB(DB, 4, {
    upgrade(database) {
      const progress = database.createObjectStore('progress', { keyPath: 'cardId' })
      progress.createIndex('due', 'due')
      const reviews = database.createObjectStore('reviews', {
        keyPath: 'id',
        autoIncrement: true,
      })
      reviews.createIndex('ts', 'ts')
      reviews.createIndex('cardId', 'cardId')
      database.createObjectStore('daily', { keyPath: 'date' })
      database.createObjectStore('meta')
    },
  })

  // Progreso v4: cápsulas 1 y 2 completadas (todas sus tarjetas respondidas).
  const progreso: CardProgress[] = []
  for (const capsuleId of ['m01-s01-c01', 'm01-s01-c02']) {
    for (const card of cardsByCapsule.get(capsuleId)!) {
      if (card.id.endsWith(':trl')) continue // en v4 estas tarjetas no existían
      progreso.push(schedule(newProgress(card, NOW), 3, NOW))
    }
  }
  // La fuente del clon con valores reconocibles campo por campo.
  const deRec: CardProgress = {
    cardId: 'v:de:rec',
    kind: 'vocab-reconocer',
    state: 'repaso',
    due: NOW + 3 * DAY,
    interval: 2.5,
    ease: 2.7,
    step: 1,
    reps: 4,
    lapses: 1,
    lastReview: NOW - DAY,
    streak: 2,
  }
  const sinDeRec = progreso.filter((p) => p.cardId !== 'v:de:rec')
  // La fuente de v:thea:trl también existe, con valores muy distintos: si la
  // migración no respetara el progreso de transliterar ya existente, lo
  // sobrescribiría con un clon de esta programación.
  const theaRec: CardProgress = {
    cardId: 'v:thea:rec',
    kind: 'vocab-reconocer',
    state: 'repaso',
    due: NOW + 40 * DAY,
    interval: 9,
    ease: 1.9,
    step: 3,
    reps: 12,
    lapses: 2,
    lastReview: NOW - 2 * DAY,
    streak: 5,
  }
  // Un progreso de transliterar preexistente: no debe sobrescribirse.
  const theaTrlExistente: CardProgress = {
    cardId: 'v:thea:trl',
    kind: 'vocab-transliterar',
    state: 'aprendiendo',
    due: NOW + 1234,
    interval: 0,
    ease: 2.5,
    step: 2,
    reps: 7,
    lapses: 3,
    lastReview: null,
    streak: 1,
  }
  // No hay v:klima:rec sembrado: no debe inventarse v:klima:trl.

  const reseña: ReviewLog = {
    eventId: 'evento-fijo',
    cardId: 'v:de:rec',
    moduleId: 'module-01',
    sectionId: 'm01-s01',
    capsuleId: 'm01-s01-c02',
    kind: 'vocab-reconocer',
    mode: 'opcion-multiple',
    grade: 3,
    ts: NOW - DAY,
    durationMs: 900,
    interval: 2,
  }
  const estadistica: DailyStat = {
    date: '2026-03-01',
    reviews: 7,
    correct: 5,
    newCards: 2,
    durationMs: 4200,
  }

  const tx = v4.transaction(['progress', 'reviews', 'daily'], 'readwrite')
  await Promise.all([
    ...sinDeRec.map((p) => tx.objectStore('progress').put(p)),
    tx.objectStore('progress').put(deRec),
    tx.objectStore('progress').put(theaRec),
    tx.objectStore('progress').put(theaTrlExistente),
    tx.objectStore('reviews').add(reseña),
    tx.objectStore('daily').put(estadistica),
    tx.done,
  ])
  v4.close()

  // --- Abrir con la versión actual dispara la migración v5. ------------------
  const db = await import('../src/lib/db')
  const { capsuleStatuses } = await import('../src/lib/session')

  const progress = await db.loadProgress()
  const reviews = await db.getAllReviews()
  const daily = await db.getAllDaily()

  // El clon existe con cardId y kind nuevos y el resto de campos intactos.
  const trl = progress.get('v:de:trl')
  assert.ok(trl, 'falta el progreso clonado de v:de:trl')
  assert.equal(trl!.cardId, 'v:de:trl')
  assert.equal(trl!.kind, 'vocab-transliterar')
  const clonados = [
    'state', 'due', 'interval', 'ease', 'step', 'reps', 'lapses', 'lastReview', 'streak',
  ] as const
  for (const campo of clonados) {
    assert.equal(trl![campo], deRec[campo], `el campo ${campo} del clon cambió`)
  }

  // El progreso de transliterar preexistente queda intacto aunque su fuente
  // (v:thea:rec) también exista con valores muy distintos: el clon no se
  // aplica sobre él, campo por campo.
  assert.deepEqual(progress.get('v:thea:trl'), theaTrlExistente)
  assert.equal(progress.get('v:thea:trl')!.reps, 7)
  assert.equal(progress.get('v:thea:trl')!.due, NOW + 1234)
  assert.equal(progress.get('v:thea:trl')!.streak, 1)
  // La fuente se conserva también, sin cambios.
  assert.deepEqual(progress.get('v:thea:rec'), theaRec)

  // Sin fuente no hay clon: v:klima:trl no se inventa.
  assert.equal(progress.has('v:klima:trl'), false)

  // El historial no se clona ni se altera.
  assert.equal(reviews.length, 1)
  assert.equal(reviews[0]!.eventId, 'evento-fijo')
  assert.equal(reviews[0]!.cardId, 'v:de:rec')
  assert.equal(reviews[0]!.grade, 3)

  // Las estadísticas diarias no se tocan.
  assert.deepEqual(daily, [estadistica])

  // La cápsula 2 sigue completada y la 3 sigue desbloqueada.
  const statuses = capsuleStatuses(progress)
  assert.equal(statuses[1]!.completed, true)
  assert.equal(statuses[2]!.unlocked, true)
})
