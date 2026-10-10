import { strict as assert } from 'node:assert'
import { test } from 'vitest'
import {
  allCards,
  allLetters,
  capsuleAccessibleName,
  cardsByCapsule,
  getLetter,
  getVocab,
  lettersSummary,
  lettersUpTo,
  path,
  vocabUpTo,
} from '../src/content'
import { recognitionLabelOf } from '../src/lib/distractors'

test('el camino muestra exclusivamente el módulo 1 con sus nueve cápsulas', () => {
  assert.equal(path.length, 9)
  const [c1, c2, c3, c4, c5, c6, c7, c8] = path
  assert.equal(c1!.module.title, 'Leer el alfabeto')
  assert.equal(c1!.section.title, 'El alfabeto')
  assert.equal(c1!.capsule.title, 'Alfa, beta y gamma')
  assert.equal(c2!.capsule.title, 'Delta, épsilon y dseta')
  assert.equal(c3!.capsule.title, 'Eta, theta e iota')
  assert.equal(c4!.capsule.title, 'Kappa, lambda y mi')
  assert.equal(c5!.capsule.title, 'Ni, xi y ómicron')
  assert.equal(c6!.capsule.title, 'Pi, rho y sigma')
  assert.equal(c7!.capsule.title, 'Tau, upsilon y phi')
  assert.equal(c8!.capsule.title, 'Chi, psi y omega')
  // Ningún nodo del boilerplate ni cápsulas vacías en el recorrido.
  assert.ok(path.every((n) => (cardsByCapsule.get(n.capsule.id)?.length ?? 0) > 0))
})

test('la cápsula 1 genera exactamente seis tarjetas con los ids previstos', () => {
  const ids = cardsByCapsule.get('m01-s01-c01')!.map((c) => c.id)
  assert.deepEqual(new Set(ids), new Set([
    'l:alpha:rec',
    'l:alpha:pro',
    'l:beta:rec',
    'l:beta:pro',
    'l:gamma:rec',
    'l:gamma:pro',
  ]))
})

test('la cápsula 2 genera exactamente ocho tarjetas con los ids previstos', () => {
  const ids = cardsByCapsule.get('m01-s01-c02')!.map((c) => c.id)
  assert.deepEqual(new Set(ids), new Set([
    'l:delta:rec',
    'l:delta:pro',
    'l:epsilon:rec',
    'l:epsilon:pro',
    'l:zeta:rec',
    'l:zeta:pro',
    'v:de:rec',
    'v:de:trl',
  ]))
})

test('la cápsula 3 genera exactamente ocho tarjetas con los ids previstos', () => {
  const ids = cardsByCapsule.get('m01-s01-c03')!.map((c) => c.id)
  assert.deepEqual(new Set(ids), new Set([
    'l:eta:rec',
    'l:eta:pro',
    'l:theta:rec',
    'l:theta:pro',
    'l:iota:rec',
    'l:iota:pro',
    'v:thea:rec',
    'v:thea:trl',
  ]))
})

test('la cápsula 4 genera exactamente ocho tarjetas con los ids previstos', () => {
  const ids = cardsByCapsule.get('m01-s01-c04')!.map((c) => c.id)
  assert.deepEqual(new Set(ids), new Set([
    'l:kappa:rec',
    'l:kappa:pro',
    'l:lambda:rec',
    'l:lambda:pro',
    'l:mu:rec',
    'l:mu:pro',
    'v:klima:rec',
    'v:klima:trl',
  ]))
})

test('la cápsula 5 genera exactamente ocho tarjetas con los ids previstos', () => {
  const ids = cardsByCapsule.get('m01-s01-c05')!.map((c) => c.id)
  assert.deepEqual(new Set(ids), new Set([
    'l:nu:rec',
    'l:nu:pro',
    'l:xi:rec',
    'l:xi:pro',
    'l:omicron:rec',
    'l:omicron:pro',
    'v:onoma:rec',
    'v:onoma:trl',
  ]))
})

test('la cápsula 6 genera exactamente ocho tarjetas con los ids previstos', () => {
  const ids = cardsByCapsule.get('m01-s01-c06')!.map((c) => c.id)
  assert.deepEqual(new Set(ids), new Set([
    'l:pi:rec',
    'l:pi:pro',
    'l:rho:rec',
    'l:rho:pro',
    'l:sigma:rec',
    'l:sigma:pro',
    'v:poiesis:rec',
    'v:poiesis:trl',
  ]))
})

test('la cápsula 7 genera exactamente ocho tarjetas con los ids previstos', () => {
  const ids = cardsByCapsule.get('m01-s01-c07')!.map((c) => c.id)
  assert.deepEqual(new Set(ids), new Set([
    'l:tau:rec',
    'l:tau:pro',
    'l:upsilon:rec',
    'l:upsilon:pro',
    'l:phi:rec',
    'l:phi:pro',
    'v:mythos:rec',
    'v:mythos:trl',
  ]))
})

test('la cápsula 8 genera exactamente ocho tarjetas con los ids previstos', () => {
  const ids = cardsByCapsule.get('m01-s01-c08')!.map((c) => c.id)
  assert.deepEqual(new Set(ids), new Set([
    'l:chi:rec',
    'l:chi:pro',
    'l:psi:rec',
    'l:psi:pro',
    'l:omega:rec',
    'l:omega:pro',
    'v:psyche:rec',
    'v:psyche:trl',
  ]))
})

test('no hay ids de tarjeta duplicados en todo el contenido', () => {
  const ids = allCards.map((c) => c.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.equal(ids.length, 69)
})

test('los 30 ids anteriores permanecen intactos tras añadir las cápsulas 5 y 6', () => {
  const ids = new Set(allCards.map((c) => c.id))
  const anteriores = [
    'l:alpha:rec', 'l:alpha:pro', 'l:beta:rec', 'l:beta:pro',
    'l:gamma:rec', 'l:gamma:pro',
    'l:delta:rec', 'l:delta:pro', 'l:epsilon:rec', 'l:epsilon:pro',
    'l:zeta:rec', 'l:zeta:pro',
    'v:de:rec', 'v:de:trl',
    'l:eta:rec', 'l:eta:pro', 'l:theta:rec', 'l:theta:pro',
    'l:iota:rec', 'l:iota:pro',
    'v:thea:rec', 'v:thea:trl',
    'l:kappa:rec', 'l:kappa:pro', 'l:lambda:rec', 'l:lambda:pro',
    'l:mu:rec', 'l:mu:pro',
    'v:klima:rec', 'v:klima:trl',
  ]
  assert.equal(anteriores.length, 30)
  for (const id of anteriores) {
    assert.equal(ids.has(id), true, `falta el id anterior «${id}»`)
  }
})

test('los 46 ids anteriores permanecen intactos tras añadir las cápsulas 7 y 8', () => {
  const ids = new Set(allCards.map((c) => c.id))
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
  for (const id of anteriores) {
    assert.equal(ids.has(id), true, `falta el id anterior «${id}»`)
  }
})

test('los ids de las tarjetas de letra no dependen de textos españoles', () => {
  assert.equal(allLetters.length, 24)
  for (const letter of allLetters) {
    assert.match(letter.id, /^[a-z]+$/)
    assert.match(`l:${letter.id}:rec`, /^l:[a-z]+:rec$/)
    assert.match(`l:${letter.id}:pro`, /^l:[a-z]+:pro$/)
  }
})

test('cada letra genera una sola tarjeta de reconocer: mayúscula y minúscula comparten progreso', () => {
  for (const letter of allLetters) {
    const rec = allCards.filter((c) => c.kind === 'letra-reconocer' && c.sourceId === letter.id)
    const pro = allCards.filter((c) => c.kind === 'letra-producir' && c.sourceId === letter.id)
    assert.equal(rec.length, 1, `la letra ${letter.id} debe tener una sola tarjeta de reconocer`)
    assert.equal(pro.length, 1, `la letra ${letter.id} debe tener una sola tarjeta de producir`)
  }
})

test('cada letra declara su transliteración básica', () => {
  const esperadas: Record<string, string> = {
    alpha: 'a',
    beta: 'b',
    gamma: 'g',
    delta: 'd',
    epsilon: 'e',
    zeta: 'z',
    eta: 'ē',
    theta: 'th',
    iota: 'i',
    kappa: 'k',
    lambda: 'l',
    mu: 'm',
    nu: 'n',
    xi: 'x',
    omicron: 'o',
    pi: 'p',
    rho: 'r',
    sigma: 's',
    tau: 't',
    upsilon: 'y',
    phi: 'ph',
    chi: 'ch',
    psi: 'ps',
    omega: 'ō',
  }
  for (const [id, transliteracion] of Object.entries(esperadas)) {
    assert.equal(getLetter(id)!.transliteration, transliteracion)
  }
})

test('las letras expresan sus tres aspectos: forma, nombre y valor fonético', () => {
  const alpha = getLetter('alpha')!
  assert.equal(alpha.uppercase, 'Α')
  assert.equal(alpha.lowercase, 'α')
  assert.equal(alpha.name, 'alfa')
  assert.equal(alpha.phonetic, '/a/')
  assert.ok(alpha.pronunciation.length > 0)
  assert.ok(alpha.note)

  assert.equal(getLetter('beta')!.phonetic, '/b/')
  assert.equal(getLetter('gamma')!.phonetic, '/g/')
  assert.equal(getLetter('delta')!.phonetic, '/d/')
  assert.equal(getLetter('epsilon')!.phonetic, '/e/')
  assert.equal(getLetter('zeta')!.name, 'dseta')
  assert.equal(getLetter('zeta')!.phonetic, '/dz/')
  assert.equal(getLetter('eta')!.phonetic, '/ɛː/')
  assert.equal(getLetter('theta')!.phonetic, '/tʰ/')
  assert.equal(getLetter('iota')!.phonetic, '/i/')
  assert.equal(getLetter('kappa')!.phonetic, '/k/')
  assert.equal(getLetter('lambda')!.phonetic, '/l/')
  assert.equal(getLetter('mu')!.name, 'mi')
  assert.equal(getLetter('mu')!.phonetic, '/m/')
  assert.equal(getLetter('nu')!.name, 'ni')
  assert.equal(getLetter('nu')!.phonetic, '/n/')
  assert.equal(getLetter('xi')!.phonetic, '/ks/')
  assert.equal(getLetter('omicron')!.phonetic, '/o/')
  assert.equal(getLetter('pi')!.phonetic, '/p/')
  assert.equal(getLetter('rho')!.phonetic, '/r/')
  assert.equal(getLetter('sigma')!.phonetic, '/s/')
  assert.equal(getLetter('tau')!.phonetic, '/t/')
  assert.equal(getLetter('upsilon')!.phonetic, '/y/')
  assert.equal(getLetter('phi')!.phonetic, '/pʰ/')
  assert.equal(getLetter('chi')!.phonetic, '/kʰ/')
  assert.equal(getLetter('psi')!.phonetic, '/ps/')
  assert.equal(getLetter('omega')!.phonetic, '/ɔː/')
})

test('los distractores de letras solo ven material ya presentado', () => {
  // En la cápsula 1 solo hay tres letras presentadas: la propia y sus dos
  // compañeras. Nada de delta en adelante.
  assert.deepEqual(
    lettersUpTo('m01-s01-c01').map((l) => l.id),
    ['alpha', 'beta', 'gamma'],
  )
  assert.deepEqual(
    lettersUpTo('m01-s01-c02').map((l) => l.id),
    ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta'],
  )
  assert.deepEqual(
    lettersUpTo('m01-s01-c03').map((l) => l.id),
    ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota'],
  )
  assert.deepEqual(
    lettersUpTo('m01-s01-c04').map((l) => l.id),
    [
      'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta',
      'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu',
    ],
  )
  assert.deepEqual(
    lettersUpTo('m01-s01-c05').map((l) => l.id),
    [
      'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta',
      'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu',
      'nu', 'xi', 'omicron',
    ],
  )
  assert.deepEqual(
    lettersUpTo('m01-s01-c06').map((l) => l.id),
    [
      'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta',
      'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu',
      'nu', 'xi', 'omicron', 'pi', 'rho', 'sigma',
    ],
  )
  assert.deepEqual(
    lettersUpTo('m01-s01-c07').map((l) => l.id),
    [
      'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta',
      'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu',
      'nu', 'xi', 'omicron', 'pi', 'rho', 'sigma',
      'tau', 'upsilon', 'phi',
    ],
  )
  assert.deepEqual(
    lettersUpTo('m01-s01-c08').map((l) => l.id),
    [
      'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta',
      'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu',
      'nu', 'xi', 'omicron', 'pi', 'rho', 'sigma',
      'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega',
    ],
  )
})

test('la explicación de dseta adopta /dz/ y reconoce la discusión histórica', () => {
  const zeta = getLetter('zeta')!
  assert.match(zeta.pronunciation, /africada sonora/)
  assert.match(zeta.pronunciation, /adoptamos \/dz\//)
  // Y mantiene la advertencia de que su reconstrucción histórica se discute.
  assert.match(zeta.pronunciation, /se discute/)
})

test('δέ aparece como vocabulario real, para reconocer y transliterar', () => {
  const de = getVocab('de')!
  assert.equal(de.greek, 'δέ')
  assert.equal(de.pos, 'particula')
  assert.deepEqual(de.es, ['y', 'pero', 'por otra parte'])
  assert.deepEqual(de.cards, ['reconocer', 'transliterar'])
  assert.equal(de.transliteration, 'de')
  assert.deepEqual(de.transliterationDistractors, ['dē', 'ze', 'da'])
  assert.ok(de.notes)
})

test('δέ declara su etiqueta de reconocimiento y distractores editoriales', () => {
  const de = getVocab('de')!
  assert.equal(de.recognitionLabel, 'y / pero / por otra parte')
  assert.deepEqual(de.distractors, ['sí', 'no', 'aquí'])
})

test('θεά se reconoce y translitera, y muestra «diosa» con sus distractores editoriales', () => {
  const thea = getVocab('thea')!
  assert.equal(thea.greek, 'θεά')
  assert.equal(thea.pos, 'sustantivo')
  assert.deepEqual(thea.es, ['diosa'])
  assert.deepEqual(thea.cards, ['reconocer', 'transliterar'])
  assert.equal(thea.recognitionLabel, 'diosa')
  assert.deepEqual(thea.distractors, ['mujer', 'templo', 'ciudad'])
  assert.equal(thea.transliteration, 'thea')
  assert.deepEqual(thea.transliterationDistractors, ['tea', 'thēa', 'zea'])
  assert.ok(thea.notes)

  const ids = new Set(allCards.map((c) => c.id))
  assert.equal(ids.has('v:thea:rec'), true)
  assert.equal(ids.has('v:thea:trl'), true)
  assert.equal(ids.has('v:thea:pro'), false)
})

test('κλῖμα se reconoce y translitera, y muestra «inclinación / región» con sus distractores', () => {
  const klima = getVocab('klima')!
  assert.equal(klima.greek, 'κλῖμα')
  assert.equal(klima.pos, 'sustantivo')
  assert.deepEqual(klima.es, ['inclinación', 'pendiente', 'región'])
  assert.deepEqual(klima.cards, ['reconocer', 'transliterar'])
  assert.equal(klima.recognitionLabel, 'inclinación / región')
  assert.deepEqual(klima.distractors, ['ley', 'cuerpo', 'camino'])
  assert.equal(klima.transliteration, 'klima')
  assert.deepEqual(klima.transliterationDistractors, ['clima', 'kilma', 'glima'])
  assert.ok(klima.notes)

  const ids = new Set(allCards.map((c) => c.id))
  assert.equal(ids.has('v:klima:rec'), true)
  assert.equal(ids.has('v:klima:trl'), true)
  assert.equal(ids.has('v:klima:pro'), false)
})

test('el resumen griego se deriva de las letras, sin campo guardado', () => {
  assert.equal(lettersSummary(path[0]!.capsule), 'Α · Β · Γ')
  assert.equal(lettersSummary(path[1]!.capsule), 'Δ · Ε · Ζ')
  assert.equal(lettersSummary(path[2]!.capsule), 'Η · Θ · Ι')
  assert.equal(lettersSummary(path[3]!.capsule), 'Κ · Λ · Μ')
  assert.equal(lettersSummary(path[4]!.capsule), 'Ν · Ξ · Ο')
  assert.equal(lettersSummary(path[5]!.capsule), 'Π · Ρ · Σ')
  assert.equal(lettersSummary(path[6]!.capsule), 'Τ · Υ · Φ')
  assert.equal(lettersSummary(path[7]!.capsule), 'Χ · Ψ · Ω')

  // Una cápsula sin letras no produce subtítulo griego.
  const sinLetras = { ...path[0]!.capsule, letters: [] }
  assert.equal(lettersSummary(sinLetras), '')
  // El título del JSON no lleva glifos: el resumen sale solo de las letras.
  assert.equal(path[0]!.capsule.title?.includes('Α'), false)
  assert.equal(path[3]!.capsule.title?.includes('Κ'), false)
  assert.equal(path[4]!.capsule.title?.includes('Ν'), false)
  assert.equal(path[5]!.capsule.title?.includes('Π'), false)
  assert.equal(path[6]!.capsule.title?.includes('Τ'), false)
  assert.equal(path[7]!.capsule.title?.includes('Χ'), false)
})

test('el nombre accesible junta el título con el resumen, o se queda en el título', () => {
  assert.equal(capsuleAccessibleName(path[0]!.capsule), 'Alfa, beta y gamma — Α Β Γ')
  assert.equal(capsuleAccessibleName(path[1]!.capsule), 'Delta, épsilon y dseta — Δ Ε Ζ')
  assert.equal(capsuleAccessibleName(path[2]!.capsule), 'Eta, theta e iota — Η Θ Ι')
  assert.equal(capsuleAccessibleName(path[3]!.capsule), 'Kappa, lambda y mi — Κ Λ Μ')
  assert.equal(capsuleAccessibleName(path[4]!.capsule), 'Ni, xi y ómicron — Ν Ξ Ο')
  assert.equal(capsuleAccessibleName(path[5]!.capsule), 'Pi, rho y sigma — Π Ρ Σ')
  assert.equal(capsuleAccessibleName(path[6]!.capsule), 'Tau, upsilon y phi — Τ Υ Φ')
  assert.equal(capsuleAccessibleName(path[7]!.capsule), 'Chi, psi y omega — Χ Ψ Ω')

  const sinLetras = { ...path[0]!.capsule, letters: [] }
  assert.equal(capsuleAccessibleName(sinLetras), 'Alfa, beta y gamma')
})

test('las palabras solo usan letras ya presentadas en su cápsula', () => {
  /** Base letters de una palabra: se quitan los diacríticos, no se evalúan. */
  const base = (greek: string) =>
    [...greek.normalize('NFD')].filter((ch) => /[\u0370-\u03ff]/.test(ch))

  for (const node of path) {
    // La forma final de una letra se presenta con la propia letra: ς vale por
    // σ a efectos de qué se ha enseñado.
    const formas = new Set(
      lettersUpTo(node.capsule.id).flatMap((l) => [
        l.uppercase,
        l.lowercase,
        ...(l.finalForm ? [l.finalForm] : []),
      ]),
    )
    for (const v of node.capsule.vocabulary) {
      for (const ch of base(v.greek)) {
        assert.ok(formas.has(ch), `«${v.greek}» usa la letra ${ch}, aún no presentada en ${node.capsule.id}`)
      }
    }
  }
})

test('los distractores de las cápsulas 3 y 4 solo usan letras ya presentadas', () => {
  const futurasEn3 = new Set(['κ', 'Κ', 'λ', 'Λ', 'μ', 'Μ'])
  const presentadas3 = new Set(
    lettersUpTo('m01-s01-c03').flatMap((l) => [l.uppercase, l.lowercase]),
  )
  for (const l of presentadas3) {
    assert.equal(futurasEn3.has(l), false)
  }

  // En la cápsula 4 ya está todo el alfabeto presentado hasta ahora.
  assert.equal(lettersUpTo('m01-s01-c04').length, 12)
  assert.equal(allLetters.length, 24)
})

test('el vocabulario hasta cada cápsula es solo lo presentado', () => {
  assert.deepEqual(vocabUpTo('m01-s01-c01').map((v) => v.id), [])
  assert.deepEqual(vocabUpTo('m01-s01-c02').map((v) => v.id), ['de'])
  assert.deepEqual(vocabUpTo('m01-s01-c03').map((v) => v.id), ['de', 'thea'])
  assert.deepEqual(vocabUpTo('m01-s01-c04').map((v) => v.id), ['de', 'thea', 'klima'])
  assert.deepEqual(vocabUpTo('m01-s01-c05').map((v) => v.id), ['de', 'thea', 'klima', 'onoma'])
  assert.deepEqual(
    vocabUpTo('m01-s01-c06').map((v) => v.id),
    ['de', 'thea', 'klima', 'onoma', 'poiesis'],
  )
  assert.deepEqual(
    vocabUpTo('m01-s01-c07').map((v) => v.id),
    ['de', 'thea', 'klima', 'onoma', 'poiesis', 'mythos'],
  )
  assert.deepEqual(
    vocabUpTo('m01-s01-c08').map((v) => v.id),
    ['de', 'thea', 'klima', 'onoma', 'poiesis', 'mythos', 'psyche'],
  )

  // Las etiquetas visibles son las declaradas, sin mezclar nombres de letras.
  assert.equal(recognitionLabelOf(getVocab('thea')!), 'diosa')
  assert.equal(recognitionLabelOf(getVocab('klima')!), 'inclinación / región')
  assert.equal(recognitionLabelOf(getVocab('onoma')!), 'nombre')
  assert.equal(recognitionLabelOf(getVocab('poiesis')!), 'creación / producción')
  assert.equal(recognitionLabelOf(getVocab('mythos')!), 'relato / mito')
  assert.equal(recognitionLabelOf(getVocab('psyche')!), 'alma / vida')
})

test('ὄνομα se reconoce y translitera, y no genera tarjeta de producir', () => {
  const onoma = getVocab('onoma')!
  assert.equal(onoma.greek, 'ὄνομα')
  assert.equal(onoma.pos, 'sustantivo')
  assert.deepEqual(onoma.es, ['nombre'])
  assert.deepEqual(onoma.cards, ['reconocer', 'transliterar'])
  assert.equal(onoma.recognitionLabel, 'nombre')
  assert.deepEqual(onoma.distractors, ['memoria', 'número', 'imagen'])
  assert.equal(onoma.transliteration, 'onoma')
  assert.deepEqual(onoma.transliterationDistractors, ['omona', 'onema', 'anoma'])
  assert.ok(onoma.notes)

  const ids = new Set(allCards.map((c) => c.id))
  assert.equal(ids.has('v:onoma:rec'), true)
  assert.equal(ids.has('v:onoma:trl'), true)
  assert.equal(ids.has('v:onoma:pro'), false)
})

test('ποίησις se reconoce y translitera, y no genera tarjeta de producir', () => {
  const poiesis = getVocab('poiesis')!
  assert.equal(poiesis.greek, 'ποίησις')
  assert.equal(poiesis.pos, 'sustantivo')
  assert.deepEqual(poiesis.es, ['creación', 'producción'])
  assert.deepEqual(poiesis.cards, ['reconocer', 'transliterar'])
  assert.equal(poiesis.recognitionLabel, 'creación / producción')
  assert.deepEqual(poiesis.distractors, ['destrucción', 'memoria', 'movimiento'])
  assert.equal(poiesis.transliteration, 'poiēsis')
  assert.deepEqual(poiesis.transliterationDistractors, ['poiesis', 'poiēzis', 'boiēsis'])
  assert.ok(poiesis.notes)

  const ids = new Set(allCards.map((c) => c.id))
  assert.equal(ids.has('v:poiesis:rec'), true)
  assert.equal(ids.has('v:poiesis:trl'), true)
  assert.equal(ids.has('v:poiesis:pro'), false)
})

test('μῦθος se reconoce y translitera, y no genera tarjeta de producir', () => {
  const mythos = getVocab('mythos')!
  assert.equal(mythos.greek, 'μῦθος')
  assert.equal(mythos.pos, 'sustantivo')
  assert.deepEqual(mythos.es, ['relato', 'narración', 'mito'])
  assert.deepEqual(mythos.cards, ['reconocer', 'transliterar'])
  assert.equal(mythos.recognitionLabel, 'relato / mito')
  assert.deepEqual(mythos.distractors, ['ley', 'cuerpo', 'camino'])
  assert.equal(mythos.transliteration, 'mythos')
  assert.deepEqual(mythos.transliterationDistractors, ['mithos', 'mytos', 'nythos'])
  assert.ok(mythos.notes)

  const ids = new Set(allCards.map((c) => c.id))
  assert.equal(ids.has('v:mythos:rec'), true)
  assert.equal(ids.has('v:mythos:trl'), true)
  assert.equal(ids.has('v:mythos:pro'), false)
})

test('ψυχή se reconoce y translitera, y no genera tarjeta de producir', () => {
  const psyche = getVocab('psyche')!
  assert.equal(psyche.greek, 'ψυχή')
  assert.equal(psyche.pos, 'sustantivo')
  assert.deepEqual(psyche.es, ['alma', 'vida', 'aliento vital'])
  assert.deepEqual(psyche.cards, ['reconocer', 'transliterar'])
  assert.equal(psyche.recognitionLabel, 'alma / vida')
  assert.deepEqual(psyche.distractors, ['cuerpo', 'ciudad', 'destino'])
  assert.equal(psyche.transliteration, 'psychē')
  assert.deepEqual(psyche.transliterationDistractors, ['psyche', 'psichē', 'pychē'])
  assert.ok(psyche.notes)

  const ids = new Set(allCards.map((c) => c.id))
  assert.equal(ids.has('v:psyche:rec'), true)
  assert.equal(ids.has('v:psyche:trl'), true)
  assert.equal(ids.has('v:psyche:pro'), false)
})

test('μῦθος y ψυχή solo usan letras presentadas hasta su cápsula', () => {
  // Diacríticos fuera, ς tratada como sigma: lo mismo que comprueba el
  // validador de contenido.
  const base = (greek: string) =>
    [...greek.normalize('NFD')].filter((ch) => /[\u0370-\u03ff]/.test(ch))

  for (const capsuleId of ['m01-s01-c07', 'm01-s01-c08']) {
    const node = path.find((n) => n.capsule.id === capsuleId)!
    const formas = new Set(
      lettersUpTo(capsuleId).flatMap((l) => [
        l.uppercase,
        l.lowercase,
        ...(l.finalForm ? [l.finalForm] : []),
      ]),
    )
    for (const v of node.capsule.vocabulary) {
      for (const ch of base(v.greek)) {
        assert.ok(
          formas.has(ch),
          `«${v.greek}» usa la letra ${ch}, aún no presentada en ${capsuleId}`,
        )
      }
    }
  }
})

test('la sigma final es una variante de sigma, no una letra ni una tarjeta nueva', () => {
  const sigma = getLetter('sigma')!
  assert.equal(sigma.uppercase, 'Σ')
  assert.equal(sigma.lowercase, 'σ')
  assert.equal(sigma.finalForm, 'ς')
  // Ninguna letra independiente para la forma final…
  assert.equal(getLetter('sigma-final'), undefined)
  assert.equal(getLetter('fin'), undefined)
  assert.equal(allLetters.filter((l) => l.finalForm).length, 1)
  // …y ninguna tarjeta: sigma sigue generando solo reconocer y producir.
  const sigmaCards = allCards.filter((c) => c.sourceId === 'sigma')
  assert.equal(sigmaCards.length, 2)
  assert.ok(sigmaCards.some((c) => c.id === 'l:sigma:rec'))
  assert.ok(sigmaCards.some((c) => c.id === 'l:sigma:pro'))
  assert.equal(allCards.some((c) => c.id === 'l:sigma:fin'), false)
  // La cápsula 6 tiene sus 8 tarjetas exactas, sin tarjeta extra de ς.
  assert.equal(cardsByCapsule.get('m01-s01-c06')!.length, 8)
})
