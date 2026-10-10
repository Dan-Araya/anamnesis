import { strict as assert } from 'node:assert'
import { test } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Card, Grade } from '../src/types'
import { allCards, getLetter, getVocab } from '../src/content'
import { pickMode } from '../src/lib/session'
import { newProgress, schedule } from '../src/lib/srs'
import VocabTransliterate from '../src/components/exercises/VocabTransliterate'
import type { SessionItem } from '../src/lib/progression'

/**
 * La transliteración básica: una operación distinta de la traducción y de la
 * pronunciación. Siempre opción múltiple, nunca teclado ni autoevaluación.
 */

const itemDe = (id: string): SessionItem => {
  const card = allCards.find((c) => c.id === id)!
  return { card, progress: newProgress(card), mode: 'opcion-multiple', isNew: true }
}

test('cada letra tiene la transliteración indicada', () => {
  const esperadas = new Map([
    ['alpha', 'a'], ['beta', 'b'], ['gamma', 'g'], ['delta', 'd'],
    ['epsilon', 'e'], ['zeta', 'z'], ['eta', 'ē'], ['theta', 'th'],
    ['iota', 'i'], ['kappa', 'k'], ['lambda', 'l'], ['mu', 'm'],
    ['nu', 'n'], ['xi', 'x'], ['omicron', 'o'], ['pi', 'p'],
    ['rho', 'r'], ['sigma', 's'], ['tau', 't'], ['upsilon', 'y'],
    ['phi', 'ph'], ['chi', 'ch'], ['psi', 'ps'], ['omega', 'ō'],
  ])
  for (const [id, transliteracion] of esperadas) {
    assert.equal(getLetter(id)!.transliteration, transliteracion)
  }
})

test('las siete palabras con transliteración generan sus tarjetas', () => {
  const ids = new Set(allCards.map((c) => c.id))
  assert.equal(ids.has('v:de:trl'), true)
  assert.equal(ids.has('v:thea:trl'), true)
  assert.equal(ids.has('v:klima:trl'), true)
  assert.equal(ids.has('v:onoma:trl'), true)
  assert.equal(ids.has('v:poiesis:trl'), true)
  assert.equal(ids.has('v:mythos:trl'), true)
  assert.equal(ids.has('v:psyche:trl'), true)

  const trl = allCards.filter((c) => c.kind === 'vocab-transliterar')
  assert.deepEqual(
    trl.map((c) => c.id).sort(),
    [
      'v:de:trl', 'v:klima:trl', 'v:mythos:trl', 'v:onoma:trl',
      'v:poiesis:trl', 'v:psyche:trl', 'v:thea:trl',
    ],
  )
})

test('hay exactamente 69 tarjetas, sin ids duplicados, y las 46 anteriores permanecen', () => {
  const ids = allCards.map((c) => c.id)
  assert.equal(ids.length, 69)
  assert.equal(new Set(ids).size, 69)

  const anteriores = [
    'l:alpha:rec', 'l:alpha:pro', 'l:beta:rec', 'l:beta:pro',
    'l:gamma:rec', 'l:gamma:pro',
    'l:delta:rec', 'l:delta:pro', 'l:epsilon:rec', 'l:epsilon:pro',
    'l:zeta:rec', 'l:zeta:pro', 'v:de:rec', 'v:de:trl',
    'l:eta:rec', 'l:eta:pro', 'l:theta:rec', 'l:theta:pro',
    'l:iota:rec', 'l:iota:pro', 'v:thea:rec', 'v:thea:trl',
    'l:kappa:rec', 'l:kappa:pro', 'l:lambda:rec', 'l:lambda:pro',
    'l:mu:rec', 'l:mu:pro', 'v:klima:rec', 'v:klima:trl',
    'l:nu:rec', 'l:nu:pro', 'l:xi:rec', 'l:xi:pro',
    'l:omicron:rec', 'l:omicron:pro', 'v:onoma:rec', 'v:onoma:trl',
    'l:pi:rec', 'l:pi:pro', 'l:rho:rec', 'l:rho:pro',
    'l:sigma:rec', 'l:sigma:pro', 'v:poiesis:rec', 'v:poiesis:trl',
  ]
  assert.equal(anteriores.length, 46)
  const conjunto = new Set(ids)
  for (const id of anteriores) {
    assert.equal(conjunto.has(id), true, `el id ${id} desapareció`)
  }
})

test('las tarjetas muestran exactamente su respuesta y sus distractores', () => {
  const casos: [string, string, string[]][] = [
    ['v:de:trl', 'de', ['dē', 'ze', 'da']],
    ['v:thea:trl', 'thea', ['tea', 'thēa', 'zea']],
    ['v:klima:trl', 'klima', ['clima', 'kilma', 'glima']],
    ['v:onoma:trl', 'onoma', ['omona', 'onema', 'anoma']],
    ['v:poiesis:trl', 'poiēsis', ['poiesis', 'poiēzis', 'boiēsis']],
    ['v:mythos:trl', 'mythos', ['mithos', 'mytos', 'nythos']],
    ['v:psyche:trl', 'psychē', ['psyche', 'psichē', 'pychē']],
  ]
  for (const [cardId, correcta, distractores] of casos) {
    const { unmount } = render(
      <VocabTransliterate item={itemDe(cardId)} onGraded={() => {}} />,
    )
    for (const label of [correcta, ...distractores]) {
      assert.ok(
        screen.getByRole('button', { name: label }),
        `falta la opción «${label}» en ${cardId}`,
      )
    }
    // Exactamente cuatro opciones: ni más ni menos.
    assert.equal(document.querySelectorAll('.options .option').length, 4)
    unmount()
  }
})

test('las opciones de transliteración son únicas y no vacías', () => {
  for (const id of ['de', 'thea', 'klima', 'onoma', 'poiesis', 'mythos', 'psyche']) {
    const v = getVocab(id)!
    const labels = [v.transliteration!, ...(v.transliterationDistractors ?? [])]
    assert.equal(labels.length, 4)
    assert.equal(new Set(labels).size, 4)
    assert.ok(labels.every((l) => l && l.trim()))
  }
})

test('acertar la transliteración vale 3 y fallar vale 1', async () => {
  const user = userEvent.setup()
  let recibido: Grade | null = null

  const { unmount } = render(
    <VocabTransliterate
      item={itemDe('v:de:trl')}
      onGraded={(grade) => {
        recibido = grade
      }}
    />,
  )
  await screen.findByText(/transliteración/)
  await user.click(screen.getByRole('button', { name: 'de' }))
  await user.click(await screen.findByRole('button', { name: 'Continuar' }))
  assert.equal(recibido, 3)
  unmount()

  recibido = null
  render(
    <VocabTransliterate
      item={itemDe('v:de:trl')}
      onGraded={(grade) => {
        recibido = grade
      }}
    />,
  )
  await user.click(screen.getByRole('button', { name: 'da' }))
  await user.click(await screen.findByRole('button', { name: 'Continuar' }))
  assert.equal(recibido, 1)
})

test('la transliteración nunca se teclea: siempre opción múltiple y sin campos de texto', () => {
  const card = allCards.find((c) => c.id === 'v:thea:trl')!

  let asentado = newProgress(card)
  for (let i = 0; i < 8; i++) asentado = schedule(asentado, 3, asentado.due || Date.now())
  assert.equal(pickMode(card, asentado), 'opcion-multiple')
  assert.equal(pickMode(card, newProgress(card)), 'opcion-multiple')

  render(<VocabTransliterate item={itemDe('v:thea:trl')} onGraded={() => {}} />)
  assert.equal(screen.queryByLabelText('Tu respuesta en griego'), null)
  assert.equal(screen.queryByText('Mostrar respuesta'), null)
})

test('la transliteración no se confunde con el significado', () => {
  const thea = getVocab('thea')!
  // La pregunta muestra la palabra griega y pide la forma latina, no «diosa».
  render(<VocabTransliterate item={itemDe('v:thea:trl')} onGraded={() => {}} />)
  assert.equal(document.querySelector('.prompt__greek')?.textContent, 'θεά')
  assert.equal(screen.queryByRole('button', { name: 'diosa' }), null)
  assert.ok(screen.getByRole('button', { name: 'thea' }))
  // La explicación del curso avisa de que los acentos y espíritus quedan fuera.
  assert.ok(thea.transliteration !== 'theá')
})

test('sin vocabulario ni transliteración la tarjeta avisa sin lanzar excepciones', () => {
  const card: Card = {
    id: 'v:fantasma:trl',
    moduleId: 'module-01',
    sectionId: 'm01-s01',
    capsuleId: 'm01-s01-c02',
    kind: 'vocab-transliterar',
    sourceId: 'fantasma',
  }
  const item: SessionItem = {
    card,
    progress: newProgress(card),
    mode: 'opcion-multiple',
    isNew: true,
  }
  // useMemo se ejecuta antes del guard defensivo: renderizar no debe lanzar.
  const { container } = render(
    <VocabTransliterate item={item} onGraded={() => {}} />,
  )
  assert.equal(container.textContent, 'Falta la transliteración de esta tarjeta.')
})
