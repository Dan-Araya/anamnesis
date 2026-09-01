import { strict as assert } from 'node:assert'
import { test } from 'vitest'
import {
  applyDiacritic,
  backspace,
  canApplyDiacritic,
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

test('los acentos no caen sobre consonantes', () => {
  // El caso que producía δ́έ: el acento pulsado con la delta al final.
  assert.equal(applyDiacritic('δ', 'agudo'), 'δ')
  assert.equal(canApplyDiacritic('δ', 'agudo'), false)
  assert.equal(applyDiacritic('ἄνθρωπ', 'agudo'), 'ἄνθρωπ')
})

test('ε y ο no admiten circunflejo, por breves', () => {
  assert.equal(applyDiacritic('ε', 'circunflejo'), 'ε')
  assert.equal(applyDiacritic('ο', 'circunflejo'), 'ο')
  assert.equal(applyDiacritic('ω', 'circunflejo'), 'ῶ')
})

test('la iota suscrita solo cabe bajo α, η y ω', () => {
  assert.equal(applyDiacritic('ω', 'iota'), 'ῳ')
  assert.equal(applyDiacritic('ε', 'iota'), 'ε')
  assert.equal(applyDiacritic('ι', 'iota'), 'ι')
})

test('la diéresis solo va sobre ι y υ', () => {
  assert.equal(applyDiacritic('ι', 'dieresis'), 'ϊ')
  assert.equal(applyDiacritic('α', 'dieresis'), 'α')
})

test('la ρ admite espíritu aunque sea consonante', () => {
  assert.equal(applyDiacritic('ῥ'.normalize('NFD').replace(/[̀-ͯ]/g, ''), 'aspero'), 'ῥ')
  assert.equal(applyDiacritic('ρ', 'agudo'), 'ρ')
})

test('un acento sustituye al anterior en vez de acumularse', () => {
  const conAgudo = applyDiacritic('α', 'agudo')
  const conGrave = applyDiacritic(conAgudo, 'grave')
  assert.equal(conGrave, 'ὰ')

  // El espíritu es de otro grupo: convive con el acento.
  const conEspiritu = applyDiacritic(conGrave, 'suave')
  assert.equal(conEspiritu, 'ἂ')
})

test('el orden en que se pulsan los diacríticos no cambia el resultado', () => {
  // Espíritu y acento comparten clase combinante: si no se ordenan a mano, una
  // de las dos secuencias no compone el carácter precompuesto.
  const suaveAgudo = applyDiacritic(applyDiacritic('α', 'suave'), 'agudo')
  const agudoSuave = applyDiacritic(applyDiacritic('α', 'agudo'), 'suave')
  assert.equal(suaveAgudo, 'ἄ')
  assert.equal(agudoSuave, 'ἄ')

  const conIota = applyDiacritic(applyDiacritic('ω', 'iota'), 'aspero')
  assert.equal(conIota, applyDiacritic(applyDiacritic('ω', 'aspero'), 'iota'))
})
