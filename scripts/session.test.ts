import { strict as assert } from 'node:assert'
import { test } from 'vitest'
import {
  allCards,
  allLetters,
  allVocab,
  cardsByCapsule,
  getLetter,
  getVocab,
  path,
  vocabUpTo,
} from '../src/content'
import {
  buildSession,
  capsuleStatuses,
  letterCaseForReps,
  letterDistractors,
  letterFormForReps,
  vocabDistractors,
} from '../src/lib/session'
import { DEFAULT_SETTINGS } from '../src/lib/db'
import { newProgress, schedule } from '../src/lib/srs'
import type { CardProgress } from '../src/types'

/**
 * Las alternativas de las preguntas de opción múltiple: de dónde salen y qué
 * categorías se respetan. También la cola de sesión sobre el contenido real.
 */

test('δέ presenta sus distractores editoriales y ninguna otra categoría', () => {
  const de = getVocab('de')!
  const opciones = vocabDistractors(de, 'm01-s01-c02', true, 3)
  const labels = opciones.map((o) => o.label)

  // Exactamente los tres distractores editoriales declarados.
  assert.deepEqual(new Set(labels), new Set(['sí', 'no', 'aquí']))

  // Todos son textos españoles, no glifos ni nombres de letras.
  const nombresDeLetras = new Set(allLetters.flatMap((l) => [l.name, l.lowercase, l.uppercase]))
  for (const label of labels) {
    assert.equal(nombresDeLetras.has(label), false, `«${label}» mezcla categorías`)
  }

  // Ningún distractor procede de vocabulario futuro ni repite etiquetas.
  const futuros = new Set(allVocab.map((v) => v.es[0]!))
  assert.equal(futuros.has('sí'), false)
  assert.equal(new Set(labels).size, labels.length)
})

test('el reconocimiento de δέ usa su recognitionLabel como respuesta correcta', () => {
  const de = getVocab('de')!
  assert.equal(de.recognitionLabel, 'y / pero / por otra parte')
  // Los distractores no chocan con la etiqueta de la respuesta correcta.
  const labels = vocabDistractors(de, 'm01-s01-c02', true, 3).map((o) => o.label)
  assert.equal(labels.includes(de.recognitionLabel!), false)
})

test('los distractores de vocabulario solo ven material presentado, nunca futuro', () => {
  // El vocabulario disponible hasta la cápsula 2 es únicamente δέ.
  assert.deepEqual(vocabUpTo('m01-s01-c02').map((v) => v.id), ['de'])
  assert.deepEqual(vocabUpTo('m01-s01-c01').map((v) => v.id), [])

  // Sin editoriales ni vocabulario anterior, no hay alternativa válida: la
  // función no inventa ni mezcla categorías.
  const de = getVocab('de')!
  const stripped = { ...de, distractors: undefined }
  assert.equal(vocabDistractors(stripped, 'm01-s01-c02', true, 3).length, 0)
})

test('los distractores de letras conservan la variante pedida', () => {
  const alpha = getLetter('alpha')!
  const nombresMayuscula = letterDistractors(alpha, 'm01-s01-c01', 'nombre-mayuscula', 3)
    .map((o) => o.label)
  assert.deepEqual(new Set(nombresMayuscula), new Set(['beta mayúscula', 'gamma mayúscula']))

  const nombresMinuscula = letterDistractors(alpha, 'm01-s01-c01', 'nombre-minuscula', 3)
    .map((o) => o.label)
  assert.deepEqual(new Set(nombresMinuscula), new Set(['beta minúscula', 'gamma minúscula']))

  const glifos = letterDistractors(alpha, 'm01-s01-c01', 'glifo', 3).map((o) => o.label)
  assert.deepEqual(new Set(glifos), new Set(['β', 'γ']))
})

test('los distractores de letras nunca usan material de cápsulas futuras', () => {
  // En la cápsula 1 solo hay tres letras presentadas.
  const beta = getLetter('beta')!
  const opciones = letterDistractors(beta, 'm01-s01-c01', 'nombre-mayuscula', 8)
  assert.equal(opciones.length, 2)
  assert.ok(!opciones.some((o) => o.label.includes('delta')))
  assert.ok(!opciones.some((o) => o.label.includes('épsilon')))
  assert.ok(!opciones.some((o) => o.label.includes('dseta')))
})

test('la variante de forma alterna de forma determinista según las repeticiones', () => {
  assert.equal(letterCaseForReps(0), 'mayuscula')
  assert.equal(letterCaseForReps(1), 'minuscula')
  assert.equal(letterCaseForReps(2), 'mayuscula')
  assert.equal(letterCaseForReps(3), 'minuscula')
  assert.equal(letterCaseForReps(12), 'mayuscula')
})

test('la sigma recorre mayúscula, minúscula y final de forma determinista', () => {
  const sigma = getLetter('sigma')!
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6].map((reps) => letterFormForReps(sigma, reps)),
    ['mayuscula', 'minuscula', 'final', 'mayuscula', 'minuscula', 'final', 'mayuscula'],
  )

  // Una letra sin forma final conserva la alternancia de siempre y nunca
  // llega a la variante final.
  const pi = getLetter('pi')!
  assert.deepEqual(
    [0, 1, 2, 3].map((reps) => letterFormForReps(pi, reps)),
    ['mayuscula', 'minuscula', 'mayuscula', 'minuscula'],
  )
})

test('la variante final pregunta el nombre a secas y sus distractores no llevan calificadores', () => {
  const sigma = getLetter('sigma')!
  const variante = letterFormForReps(sigma, 2)
  assert.equal(variante, 'final')
  assert.equal(sigma.finalForm, 'ς')
  // Los distractores de la variante final son nombres sin calificador de
  // caso: la respuesta correcta («sigma») no destaca entre las alternativas.
  const opciones = letterDistractors(sigma, 'm01-s01-c06', 'nombre', 3)
  assert.ok(!opciones.some((o) => o.label.includes('mayúscula') || o.label.includes('minúscula')))
  assert.ok(!opciones.some((o) => o.label === 'sigma'))
})

test('θεά muestra exactamente «diosa» y sus distractores editoriales', () => {
  const thea = getVocab('thea')!
  const opciones = vocabDistractors(thea, 'm01-s01-c03', true, 3)
  const labels = opciones.map((o) => o.label)

  // Exactamente los tres distractores editoriales declarados.
  assert.deepEqual(new Set(labels), new Set(['mujer', 'templo', 'ciudad']))
  assert.equal(labels.includes('diosa'), false)

  // Nada de nombres de letras ni de vocabulario futuro.
  const nombresDeLetras = new Set(allLetters.flatMap((l) => [l.name, l.lowercase, l.uppercase]))
  for (const label of labels) {
    assert.equal(nombresDeLetras.has(label), false, `«${label}» mezcla categorías`)
  }
})

test('κλῖμα muestra exactamente «inclinación / región» y sus distractores', () => {
  const klima = getVocab('klima')!
  const opciones = vocabDistractors(klima, 'm01-s01-c04', true, 3)
  const labels = opciones.map((o) => o.label)

  assert.deepEqual(new Set(labels), new Set(['ley', 'cuerpo', 'camino']))
  assert.equal(labels.includes('inclinación / región'), false)
})

test('ὄνομα muestra exactamente «nombre» y sus distractores editoriales', () => {
  const onoma = getVocab('onoma')!
  const opciones = vocabDistractors(onoma, 'm01-s01-c05', true, 3)
  const labels = opciones.map((o) => o.label)

  assert.deepEqual(new Set(labels), new Set(['memoria', 'número', 'imagen']))
  assert.equal(labels.includes('nombre'), false)

  const nombresDeLetras = new Set(allLetters.flatMap((l) => [l.name, l.lowercase, l.uppercase]))
  for (const label of labels) {
    assert.equal(nombresDeLetras.has(label), false, `«${label}» mezcla categorías`)
  }
})

test('ποίησις muestra exactamente «creación / producción» y sus distractores', () => {
  const poiesis = getVocab('poiesis')!
  const opciones = vocabDistractors(poiesis, 'm01-s01-c06', true, 3)
  const labels = opciones.map((o) => o.label)

  assert.deepEqual(new Set(labels), new Set(['destrucción', 'memoria', 'movimiento']))
  assert.equal(labels.includes('creación / producción'), false)

  const nombresDeLetras = new Set(allLetters.flatMap((l) => [l.name, l.lowercase, l.uppercase]))
  for (const label of labels) {
    assert.equal(nombresDeLetras.has(label), false, `«${label}» mezcla categorías`)
  }
})

test('μῦθος muestra exactamente «relato / mito» y sus distractores editoriales', () => {
  const mythos = getVocab('mythos')!
  const opciones = vocabDistractors(mythos, 'm01-s01-c07', true, 3)
  const labels = opciones.map((o) => o.label)

  assert.deepEqual(new Set(labels), new Set(['ley', 'cuerpo', 'camino']))
  assert.equal(labels.includes('relato / mito'), false)

  const nombresDeLetras = new Set(allLetters.flatMap((l) => [l.name, l.lowercase, l.uppercase]))
  for (const label of labels) {
    assert.equal(nombresDeLetras.has(label), false, `«${label}» mezcla categorías`)
  }
})

test('ψυχή muestra exactamente «alma / vida» y sus distractores editoriales', () => {
  const psyche = getVocab('psyche')!
  const opciones = vocabDistractors(psyche, 'm01-s01-c08', true, 3)
  const labels = opciones.map((o) => o.label)

  assert.deepEqual(new Set(labels), new Set(['cuerpo', 'ciudad', 'destino']))
  assert.equal(labels.includes('alma / vida'), false)

  const nombresDeLetras = new Set(allLetters.flatMap((l) => [l.name, l.lowercase, l.uppercase]))
  for (const label of labels) {
    assert.equal(nombresDeLetras.has(label), false, `«${label}» mezcla categorías`)
  }
})

test('los distractores de letras de la cápsula 3 no usan kappa, lambda ni mi', () => {
  const eta = getLetter('eta')!
  const opciones = letterDistractors(eta, 'm01-s01-c03', 'glifo', 8)
  assert.equal(opciones.length, 8)
  for (const o of opciones) {
    assert.ok(!['κ', 'λ', 'μ'].includes(o.label), `«${o.label}» es material futuro`)
  }

  const nombres = letterDistractors(eta, 'm01-s01-c03', 'nombre-mayuscula', 8)
  for (const o of nombres) {
    assert.ok(
      !/kappa|lambda|mi/.test(o.label),
      `«${o.label}» es material futuro`,
    )
  }
})

test('los distractores de letras de la cápsula 4 cubren todo lo presentado', () => {
  const kappa = getLetter('kappa')!
  const opciones = letterDistractors(kappa, 'm01-s01-c04', 'nombre-minuscula', 20)
  // Once letras presentadas además de la propia.
  assert.equal(opciones.length, 11)
})

// ---------------------------------------------------------------------------
// La cola de sesión sobre el contenido real
// ---------------------------------------------------------------------------

const NOW = Date.UTC(2026, 1, 1)

/** Todas las tarjetas de una cápsula respondidas una vez: queda completada. */
function completar(capsuleId: string, progress: Map<string, CardProgress>) {
  for (const card of cardsByCapsule.get(capsuleId) ?? []) {
    progress.set(card.id, schedule(newProgress(card, NOW), 3, NOW))
  }
}

test('completar la cápsula 2 desbloquea la 3, y completar la 3 desbloquea la 4', () => {
  const progress = new Map()
  completar('m01-s01-c01', progress)
  completar('m01-s01-c02', progress)

  let statuses = capsuleStatuses(progress, NOW)
  assert.equal(statuses[2]!.unlocked, true)
  assert.equal(statuses[3]!.unlocked, false)

  completar('m01-s01-c03', progress)
  statuses = capsuleStatuses(progress, NOW)
  assert.equal(statuses[3]!.unlocked, true)
  assert.equal(statuses[3]!.completed, false)
})

test('completar la cápsula 4 desbloquea la 5, y completar la 5 desbloquea la 6', () => {
  const progress = new Map()
  completar('m01-s01-c01', progress)
  completar('m01-s01-c02', progress)
  completar('m01-s01-c03', progress)
  completar('m01-s01-c04', progress)

  let statuses = capsuleStatuses(progress, NOW)
  assert.equal(statuses[4]!.unlocked, true)
  assert.equal(statuses[5]!.unlocked, false)

  completar('m01-s01-c05', progress)
  statuses = capsuleStatuses(progress, NOW)
  assert.equal(statuses[5]!.unlocked, true)
  assert.equal(statuses[5]!.completed, false)
})

test('completar la cápsula 6 desbloquea la 7, y completar la 7 desbloquea la 8', () => {
  const progress = new Map()
  for (const id of ['m01-s01-c01', 'm01-s01-c02', 'm01-s01-c03', 'm01-s01-c04', 'm01-s01-c05']) {
    completar(id, progress)
  }

  let statuses = capsuleStatuses(progress, NOW)
  assert.equal(statuses[5]!.unlocked, true)
  assert.equal(statuses[6]!.unlocked, false)
  assert.equal(statuses[7]!.unlocked, false)

  completar('m01-s01-c06', progress)
  statuses = capsuleStatuses(progress, NOW)
  assert.equal(statuses[6]!.unlocked, true)
  assert.equal(statuses[6]!.completed, false)
  assert.equal(statuses[7]!.unlocked, false)

  completar('m01-s01-c07', progress)
  statuses = capsuleStatuses(progress, NOW)
  assert.equal(statuses[7]!.unlocked, true)
  assert.equal(statuses[7]!.completed, false)
})

test('las cápsulas 3 y 4 entran completas aunque el cupo diario esté agotado', () => {
  const progress = new Map()
  completar('m01-s01-c01', progress)
  completar('m01-s01-c02', progress)

  let statuses = capsuleStatuses(progress, NOW)
  // El cupo de 10 tarjetas nuevas ya está cubierto con las 14 anteriores.
  let queue = buildSession(progress, DEFAULT_SETTINGS, statuses, {
    capsuleId: 'm01-s01-c03',
    newToday: 10,
  }, NOW)
  const nuevas3 = queue.filter((i) => i.isNew)
  assert.equal(nuevas3.length, 8)
  assert.ok(nuevas3.every((i) => i.card.capsuleId === 'm01-s01-c03'))

  completar('m01-s01-c03', progress)
  statuses = capsuleStatuses(progress, NOW)
  queue = buildSession(progress, DEFAULT_SETTINGS, statuses, {
    capsuleId: 'm01-s01-c04',
    newToday: 20,
  }, NOW)
  const nuevas4 = queue.filter((i) => i.isNew)
  assert.equal(nuevas4.length, 8)
  assert.ok(nuevas4.every((i) => i.card.capsuleId === 'm01-s01-c04'))
})

test('las cápsulas 5 y 6 entran completas aunque el cupo diario esté agotado', () => {
  const progress = new Map()
  for (const id of ['m01-s01-c01', 'm01-s01-c02', 'm01-s01-c03', 'm01-s01-c04']) {
    completar(id, progress)
  }

  let statuses = capsuleStatuses(progress, NOW)
  // El cupo de 10 tarjetas nuevas diarias quedó cubierto hace tiempo.
  let queue = buildSession(progress, DEFAULT_SETTINGS, statuses, {
    capsuleId: 'm01-s01-c05',
    newToday: 10,
  }, NOW)
  const nuevas5 = queue.filter((i) => i.isNew)
  assert.equal(nuevas5.length, 8)
  assert.ok(nuevas5.every((i) => i.card.capsuleId === 'm01-s01-c05'))

  completar('m01-s01-c05', progress)
  statuses = capsuleStatuses(progress, NOW)
  queue = buildSession(progress, DEFAULT_SETTINGS, statuses, {
    capsuleId: 'm01-s01-c06',
    newToday: 30,
  }, NOW)
  const nuevas6 = queue.filter((i) => i.isNew)
  assert.equal(nuevas6.length, 8)
  assert.ok(nuevas6.every((i) => i.card.capsuleId === 'm01-s01-c06'))
})

test('las cápsulas 7 y 8 entran completas aunque el cupo diario esté agotado', () => {
  const progress = new Map()
  for (const id of ['m01-s01-c01', 'm01-s01-c02', 'm01-s01-c03', 'm01-s01-c04', 'm01-s01-c05', 'm01-s01-c06']) {
    completar(id, progress)
  }

  let statuses = capsuleStatuses(progress, NOW)
  // El cupo de 10 tarjetas nuevas diarias quedó cubierto hace tiempo.
  let queue = buildSession(progress, DEFAULT_SETTINGS, statuses, {
    capsuleId: 'm01-s01-c07',
    newToday: 10,
  }, NOW)
  const nuevas7 = queue.filter((i) => i.isNew)
  assert.equal(nuevas7.length, 8)
  assert.ok(nuevas7.every((i) => i.card.capsuleId === 'm01-s01-c07'))

  completar('m01-s01-c07', progress)
  statuses = capsuleStatuses(progress, NOW)
  queue = buildSession(progress, DEFAULT_SETTINGS, statuses, {
    capsuleId: 'm01-s01-c08',
    newToday: 30,
  }, NOW)
  const nuevas8 = queue.filter((i) => i.isNew)
  assert.equal(nuevas8.length, 8)
  assert.ok(nuevas8.every((i) => i.card.capsuleId === 'm01-s01-c08'))
})

test('repetir la cápsula 3 con «Repasar cápsula» no altera el SRS', () => {
  const progress = new Map()
  completar('m01-s01-c01', progress)
  completar('m01-s01-c02', progress)
  completar('m01-s01-c03', progress)
  const antes = new Map([...progress].map(([id, p]) => [id, { ...p }]))

  const statuses = capsuleStatuses(progress, NOW)
  const queue = buildSession(progress, DEFAULT_SETTINGS, statuses, {
    capsuleId: 'm01-s01-c03',
    reviewCapsule: true,
  }, NOW)

  assert.ok(queue.length > 0)
  assert.ok(queue.every((i) => !i.isNew))
  assert.ok(queue.every((i) => i.card.capsuleId === 'm01-s01-c03'))

  // El progreso queda intacto y el desbloqueo no se mueve.
  const despues = capsuleStatuses(progress, NOW)
  assert.equal(despues[2]!.completed, true)
  assert.equal(despues[3]!.unlocked, true)
  for (const [id, p] of antes) {
    assert.deepEqual(progress.get(id), p)
  }
})

test('la sesión de la cápsula 3 contiene solo su contenido fijo', () => {
  const progress = new Map()
  completar('m01-s01-c01', progress)
  completar('m01-s01-c02', progress)

  const statuses = capsuleStatuses(progress, NOW)
  const queue = buildSession(progress, DEFAULT_SETTINGS, statuses, {
    capsuleId: 'm01-s01-c03',
  }, NOW)

  assert.deepEqual(queue.map((i) => i.card.id), cardsByCapsule.get('m01-s01-c03')!.map((c) => c.id))
  assert.ok(queue.every((i) => i.fixedContent))
  // Y ninguna tarjeta de la cápsula 4 se cuela en la sesión de la 3.
  assert.ok(!queue.some((i) => i.card.capsuleId === 'm01-s01-c04'))
  // Todo el contenido de la sesión existe entre las 20 tarjetas presentadas.
  const presentadas = new Set(
    ['m01-s01-c01', 'm01-s01-c02', 'm01-s01-c03']
      .flatMap((id) => cardsByCapsule.get(id) ?? []),
  )
  assert.ok(queue.every((i) => presentadas.has(i.card)))

  // Los ids únicos suman 62 en total: los 46 anteriores intactos más las 16
  // tarjetas nuevas de las cápsulas 7 y 8.
  assert.equal(allCards.length, 62)
  const c1c2 = ['m01-s01-c01', 'm01-s01-c02']
    .flatMap((id) => cardsByCapsule.get(id) ?? [])
  assert.equal(c1c2.length, 14)
  assert.deepEqual(new Set(c1c2.map((c) => c.id)), new Set([
    'l:alpha:rec', 'l:alpha:pro', 'l:beta:rec', 'l:beta:pro',
    'l:gamma:rec', 'l:gamma:pro',
    'l:delta:rec', 'l:delta:pro', 'l:epsilon:rec', 'l:epsilon:pro',
    'l:zeta:rec', 'l:zeta:pro',
    'v:de:rec', 'v:de:trl',
  ]))

  // Totales por cápsula: 6, 8, 8, 8, 8, 8, 8, 8.
  assert.deepEqual(
    path.map((n) => cardsByCapsule.get(n.capsule.id)!.length),
    [6, 8, 8, 8, 8, 8, 8, 8],
  )
})
