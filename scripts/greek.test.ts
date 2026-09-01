import { strict as assert } from 'node:assert'
import { test } from 'vitest'
import {
  applyDiacritic,
  backspace,
  matchGreek,
  matchSpanish,
  stripDiacritics,
  toNFC,
  wordOverlap,
} from '../src/lib/greek'

test('los diacríticos se combinan sobre la última letra', () => {
  assert.equal(applyDiacritic('α', 'agudo'), 'ά')
  assert.equal(applyDiacritic(applyDiacritic('α', 'suave'), 'agudo'), 'ἄ')
  assert.equal(applyDiacritic(applyDiacritic('ω', 'aspero'), 'circunflejo'), 'ὧ')
  assert.equal(applyDiacritic('α', 'iota'), 'ᾳ')
})

test('pulsar dos veces el mismo diacrítico lo retira', () => {
  const conAgudo = applyDiacritic('α', 'agudo')
  assert.equal(applyDiacritic(conAgudo, 'agudo'), 'α')
})

test('el diacrítico se aplica a la última letra de una palabra', () => {
  assert.equal(applyDiacritic('λογο', 'agudo'), 'λογό')
})

test('borrar elimina la letra con todas sus marcas', () => {
  assert.equal(backspace('ἄνθρωπος'), 'ἄνθρωπο')
  assert.equal(backspace('ἄ'), '')
})

test('stripDiacritics deja solo las letras base', () => {
  assert.equal(stripDiacritics('ἄνθρωπος'), 'ανθρωποσ')
  assert.equal(stripDiacritics('τῷ'), 'τω')
})

test('formas equivalentes en NFC y NFD se consideran iguales', () => {
  const precompuesta = 'ᾳ'
  const combinada = 'ᾳ'
  assert.notEqual(precompuesta, combinada)
  assert.equal(toNFC(combinada), precompuesta)
  assert.equal(matchGreek(combinada, [precompuesta]), 'exacto')
})

test('matchGreek distingue el fallo de diacríticos del fallo real', () => {
  assert.equal(matchGreek('ἄνθρωπος', ['ἄνθρωπος']), 'exacto')
  assert.equal(matchGreek('ανθρωπος', ['ἄνθρωπος']), 'sin-acentos')
  assert.equal(matchGreek('ἀνθρώπου', ['ἄνθρωπος']), 'incorrecto')
  assert.equal(matchGreek('', ['ἄνθρωπος']), 'incorrecto')
})

test('matchGreek acepta cualquiera de las formas válidas de una celda', () => {
  assert.equal(matchGreek('παύουσιν', ['παύουσι', 'παύουσιν']), 'exacto')
})

test('matchGreek ignora la puntuación y la sigma final', () => {
  assert.equal(matchGreek('ἄνθρωπος.', ['ἄνθρωπος']), 'exacto')
  assert.equal(matchGreek('ἄνθρωποσ', ['ἄνθρωπος']), 'exacto')
})

test('matchSpanish tolera tildes, artículos y mayúsculas', () => {
  assert.equal(matchSpanish('El hombre', ['hombre']), true)
  assert.equal(matchSpanish('razon', ['razón']), true)
  assert.equal(matchSpanish('¡Dios!', ['dios']), true)
  assert.equal(matchSpanish('barco', ['hombre']), false)
})

test('wordOverlap mide el parecido de una traducción libre', () => {
  assert.equal(wordOverlap('El hombre es bueno', 'El hombre es bueno'), 1)
  assert.ok(wordOverlap('el hombre es malo', 'el hombre es bueno') < 1)
  assert.equal(wordOverlap('nada que ver', 'el hombre es bueno'), 0)
})
