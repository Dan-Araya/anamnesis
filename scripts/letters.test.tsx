import { strict as assert } from 'node:assert'
import { beforeEach, test } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Grade } from '../src/types'
import App from '../src/App'
import { StoreProvider } from '../src/store'
import { allCards, allLetters, allVocab, cardsByCapsule } from '../src/content'
import { recognitionLabelOf } from '../src/lib/distractors'
import {
  bumpDaily,
  getAllDaily,
  getAllReviews,
  loadProgress,
  logReview,
  resetAll,
  saveManyProgress,
  exportBackup,
  saveSettings,
  DEFAULT_SETTINGS,
} from '../src/lib/db'
import { newProgress, schedule } from '../src/lib/srs'
import LetterRecognition from '../src/components/exercises/LetterRecognition'
import LetterProduction from '../src/components/exercises/LetterProduction'

/**
 * La práctica de letras de extremo a extremo: material primero, y después la
 * sesión, siempre con preguntas objetivas de opción múltiple. Corre con una
 * IndexedDB limpia (los tests de este archivo comparten entorno, así que el
 * progreso se borra entre unos y otros).
 */

beforeEach(async () => {
  await resetAll()
})

const nombrePorForma = new Map<string, string>()
const mayusculas = new Set<string>()
for (const letter of allLetters) {
  nombrePorForma.set(letter.uppercase, letter.name)
  nombrePorForma.set(letter.lowercase, letter.name)
  mayusculas.add(letter.uppercase)
}

const etiquetaPorGriego = new Map(allVocab.map((v) => [v.greek, recognitionLabelOf(v)]))

type Usuario = ReturnType<typeof userEvent.setup>

/** Responde la pregunta en pantalla (bien si `correcta`) y espera a que se retire. */
async function responder(user: Usuario, correcta = true) {
  await screen.findByText(/¿Qué letra es\?|¿Cuál es la .* minúscula\?|¿Qué significa\?|transliteración/)
  const hint = document.querySelector('.prompt__hint')?.textContent ?? ''

  // Nada de Anki en todo el recorrido: no hay autoevaluación ni teclado.
  assert.equal(screen.queryByText('Mostrar respuesta'), null)
  assert.equal(screen.queryByRole('button', { name: 'Otra vez' }), null)
  assert.equal(screen.queryByRole('button', { name: 'Difícil' }), null)
  assert.equal(screen.queryByRole('button', { name: 'Bien' }), null)
  assert.equal(screen.queryByRole('button', { name: 'Fácil' }), null)
  assert.equal(screen.queryByLabelText('Tu respuesta en griego'), null)

  const opciones = () =>
    [...document.querySelectorAll<HTMLButtonElement>('.options .option')]
  const elegirOtro = (distinto: string) => {
    const otro = opciones().find((b) => (b.textContent ?? '').trim() !== distinto)
    assert.ok(otro, `sin alternativas distintas de «${distinto}»`)
    return otro
  }

  if (hint.includes('¿Qué letra es?')) {
    // Reconocer: la forma mostrada pide su nombre con su variante.
    const glyph = document.querySelector('.prompt__greek')?.textContent ?? ''
    const nombre = nombrePorForma.get(glyph.split(' · ')[0]!)
    assert.ok(nombre, `no se reconoció la letra «${glyph}»`)
    const variante = mayusculas.has(glyph) ? 'mayúscula' : 'minúscula'
    const objetivo = glyph.includes(' · ') ? nombre! : `${nombre} ${variante}`
    if (correcta) {
      await user.click(screen.getByRole('button', { name: objetivo }))
    } else {
      await user.click(elegirOtro(objetivo))
    }
  } else if (hint.includes('¿Qué significa?')) {
    // Vocabulario: respuesta semántica única entre textos españoles.
    const greek = document.querySelector('.prompt__greek')?.textContent ?? ''
    const objetivo = etiquetaPorGriego.get(greek)
    assert.ok(objetivo, `no se reconoció el vocabulario «${greek}»`)
    if (correcta) {
      await user.click(screen.getByRole('button', { name: objetivo! }))
    } else {
      await user.click(elegirOtro(objetivo!))
    }
  } else if (hint.includes('transliteración')) {
    // Transliterar: se elige la escritura latina, nunca se teclea.
    const greek = document.querySelector('.prompt__greek')?.textContent ?? ''
    const vocab = allVocab.find((v) => v.greek === greek)
    assert.ok(vocab, `no se reconoció el vocabulario «${greek}»`)
    const objetivo = vocab!.transliteration!
    if (correcta) {
      await user.click(screen.getByRole('button', { name: objetivo }))
    } else {
      await user.click(elegirOtro(objetivo))
    }
  } else {
    // Producir: el enunciado nombra la letra y pide su minúscula.
    const pregunta = document.querySelector('.prompt__es')?.textContent ?? ''
    const match = /¿Cuál es la (.+) minúscula\?/.exec(pregunta)
    assert.ok(match, `enunciado inesperado: «${pregunta}»`)
    const letter = allLetters.find((l) => l.name === match[1])
    assert.ok(letter, `no se reconoció el nombre «${match[1]}»`)
    if (correcta) {
      await user.click(screen.getByRole('button', { name: letter!.lowercase }))
    } else {
      await user.click(elegirOtro(letter!.lowercase))
    }
  }

  await user.click(await screen.findByRole('button', { name: 'Continuar' }))

  // La calificación pasa por IndexedDB: esperar a que la tarjeta se retire
  // antes de mirar la siguiente, para no leer una tarjeta ya respondida.
  await waitFor(() => {
    if (screen.queryByRole('button', { name: 'Continuar' }) !== null) {
      throw new Error('la tarjeta anterior sigue en pantalla')
    }
  })
}

test('la cápsula 1 se aprende y practica de extremo a extremo, sin nada tipo Anki', async () => {
  const user = userEvent.setup()
  render(
    <StoreProvider>
      <App />
    </StoreProvider>,
  )

  // Tocar la cápsula abre la lección, no una pregunta.
  await user.click(await screen.findByRole('button', { name: 'Alfa, beta y gamma — Α Β Γ' }))
  await screen.findByText(/alfa mayúscula/)
  assert.equal(screen.queryByText('¿Qué letra es?'), null)

  await user.click(screen.getByRole('button', { name: 'Comenzar práctica' }))

  // 6 tarjetas nuevas: cada una aparece una sola vez (la cola principal es
  // fija) y queda en aprendizaje; los pasos restantes ocurren en sesiones
  // posteriores. La primera aparición muestra la mayúscula.
  for (let i = 0; i < 6; i++) {
    await responder(user)
  }

  // La sesión termina con todo acertado y las seis tarjetas guardadas.
  await screen.findByText('¡Excelente!')
  const progress = await loadProgress()
  assert.equal(progress.size, 6)
  assert.ok([...progress.values()].every((p) => p.reps >= 1))

  // Al volver, la cápsula 1 queda completada y la 2 abierta.
  await user.click(screen.getByRole('button', { name: 'Volver al camino' }))
  assert.ok(await screen.findByRole('button', { name: 'Alfa, beta y gamma — Α Β Γ (completada)' }))
  const segunda = screen.getByRole('button', { name: 'Delta, épsilon y dseta — Δ Ε Ζ' })
  assert.equal(segunda.hasAttribute('disabled'), false)

  // Reabrir la cápsula completada muestra su material con «Repasar cápsula»,
  // y ese repaso voluntario abre una sesión con sus tarjetas, no una vacía.
  await user.click(screen.getByRole('button', { name: 'Alfa, beta y gamma — Α Β Γ (completada)' }))
  await screen.findByText(/alfa mayúscula/)
  await user.click(await screen.findByRole('button', { name: 'Repasar cápsula' }))
  await screen.findByText('¿Qué letra es?')
})

test('la cápsula 2 se completa entera el mismo día, sin que el cupo la parta', async () => {
  const user = userEvent.setup()
  render(
    <StoreProvider>
      <App />
    </StoreProvider>,
  )

  // Cápsula 1 completa: introduce sus 6 tarjetas nuevas.
  await user.click(await screen.findByRole('button', { name: 'Alfa, beta y gamma — Α Β Γ' }))
  await user.click(await screen.findByRole('button', { name: 'Comenzar práctica' }))
  for (let i = 0; i < 6; i++) await responder(user)
  await screen.findByText('¡Excelente!')
  await user.click(screen.getByRole('button', { name: 'Volver al camino' }))
  await screen.findByRole('button', { name: 'Alfa, beta y gamma — Α Β Γ (completada)' })

  // Cápsula 2 el mismo día: el cupo diario de nuevas (10) ya está casi agotado
  // con las 6 anteriores, pero la cápsula elegida entra entera.
  await user.click(screen.getByRole('button', { name: 'Delta, épsilon y dseta — Δ Ε Ζ' }))
  await screen.findByText(/delta mayúscula/)
  await user.click(screen.getByRole('button', { name: 'Comenzar práctica' }))

  // 8 tarjetas de la propia cápsula, una aparición cada una. Si el cupo hubiera recortado las nuevas, la sesión
  // terminaría antes y la cápsula no quedaría completada.
  for (let i = 0; i < 8; i++) await responder(user)

  await screen.findByText('¡Excelente!')
  await user.click(screen.getByRole('button', { name: 'Volver al camino' }))

  // Ambas cápsulas quedan completadas el mismo día.
  assert.equal(screen.getAllByRole('button', { name: /\(completada\)/ }).length, 2)

  // Y la cápsula 2, ya completada, ofrece repasarla.
  await user.click(screen.getByRole('button', { name: 'Delta, épsilon y dseta — Δ Ε Ζ (completada)' }))
  assert.ok(await screen.findByRole('button', { name: 'Repasar cápsula' }))
})

test('la primera aparición muestra la mayúscula y la siguiente la minúscula, con el mismo id', async () => {
  const card = allCards.find((c) => c.id === 'l:alpha:rec')!
  const primera = newProgress(card)
  const segunda = { ...newProgress(card), reps: 1 }

  const { unmount } = render(
    <LetterRecognition
      item={{ card, progress: primera, mode: 'opcion-multiple', isNew: false }}
      onGraded={() => {}}
    />,
  )
  assert.equal(document.querySelector('.prompt__greek')?.textContent, 'Α')
  assert.ok(screen.getByRole('button', { name: 'alfa mayúscula' }))
  assert.ok(screen.getByRole('button', { name: 'beta mayúscula' }))
  assert.ok(screen.getByRole('button', { name: 'gamma mayúscula' }))
  // Los distractores conservan la categoría: nadie mezcla minúsculas.
  assert.equal(screen.queryByRole('button', { name: 'alfa minúscula' }), null)
  unmount()

  render(
    <LetterRecognition
      item={{ card, progress: segunda, mode: 'opcion-multiple', isNew: false }}
      onGraded={() => {}}
    />,
  )
  assert.equal(document.querySelector('.prompt__greek')?.textContent, 'α')
  assert.ok(screen.getByRole('button', { name: 'alfa minúscula' }))
  assert.ok(screen.getByRole('button', { name: 'beta minúscula' }))
  assert.ok(screen.getByRole('button', { name: 'gamma minúscula' }))
  assert.equal(screen.queryByRole('button', { name: 'alfa mayúscula' }), null)
})

test('la sigma final se practica en la misma tarjeta: Σ, σ y ς de forma determinista', async () => {
  const user = userEvent.setup()
  const card = allCards.find((c) => c.id === 'l:sigma:rec')!

  const variantes: [number, string, string][] = [
    [0, 'Σ', 'sigma mayúscula'],
    [1, 'σ', 'sigma minúscula'],
    [2, 'ς', 'sigma'],
    [3, 'Σ', 'sigma mayúscula'],
  ]
  for (const [reps, glyph, objetivo] of variantes) {
    const { unmount } = render(
      <LetterRecognition
        item={{ card, progress: { ...newProgress(card), reps }, mode: 'opcion-multiple', isNew: false }}
        onGraded={() => {}}
      />,
    )
    assert.equal(document.querySelector('.prompt__greek')?.textContent, glyph)
    assert.ok(screen.getByRole('button', { name: objetivo }))
    if (glyph === 'ς') {
      // Ante la forma final la respuesta correcta es el nombre a secas
      // («sigma»): ningún calificador delata la opción. El feedback posterior
      // es quien nombra la variante.
      assert.ok(screen.getByRole('button', { name: 'sigma' }))
      assert.equal(screen.queryByRole('button', { name: 'sigma final' }), null)
      assert.equal(
        screen.queryByRole('button', { name: /final|mayúscula|minúscula/ }),
        null,
      )
      await user.click(screen.getByRole('button', { name: 'sigma' }))
      assert.ok(await screen.findByText(/es sigma final — \/s\//))
    }
    unmount()
  }
})

test('acertar una letra vale 3 y fallar vale 1', async () => {
  const user = userEvent.setup()
  const card = allCards.find((c) => c.id === 'l:beta:rec')!
  let recibido: Grade | null = null

  const { unmount } = render(
    <LetterRecognition
      item={{ card, progress: newProgress(card), mode: 'opcion-multiple', isNew: false }}
      onGraded={(grade) => {
        recibido = grade
      }}
    />
  )
  // Primera aparición: la beta mayúscula.
  assert.equal(document.querySelector('.prompt__greek')?.textContent, 'Β')
  await user.click(screen.getByRole('button', { name: 'alfa mayúscula' }))
  await user.click(await screen.findByRole('button', { name: 'Continuar' }))
  assert.equal(recibido, 1)
  unmount()

  recibido = null
  render(
    <LetterRecognition
      item={{ card, progress: newProgress(card), mode: 'opcion-multiple', isNew: false }}
      onGraded={(grade) => {
        recibido = grade
      }}
    />
  )
  await user.click(screen.getByRole('button', { name: 'beta mayúscula' }))
  await user.click(await screen.findByRole('button', { name: 'Continuar' }))
  assert.equal(recibido, 3)
})

test('la producción pregunta por la minúscula y elige entre glifos presentados', async () => {
  const user = userEvent.setup()
  const card = allCards.find((c) => c.id === 'l:gamma:pro')!
  let recibido: Grade | null = null

  render(
    <LetterProduction
      item={{ card, progress: newProgress(card), mode: 'opcion-multiple', isNew: false }}
      onGraded={(grade) => {
        recibido = grade
      }}
    />,
  )
  await screen.findByText('¿Cuál es la gamma minúscula?')
  await user.click(screen.getByRole('button', { name: 'γ' }))
  assert.ok(await screen.findByText(/es la gamma minúscula/, { selector: 'span' }))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  assert.equal(recibido, 3)
})

test('la práctica libre no persiste nada: progreso, historial y estadísticas intactos', async () => {
  // Prepara una cápsula completada: las seis tarjetas graduadas.
  const cards = cardsByCapsule.get('m01-s01-c01')!
  const NOW = Date.now()
  const progreso = new Map(
    cards.map((card) => {
      let p = schedule(newProgress(card, NOW), 3, NOW)
      p = schedule(p, 3, p.due)
      return [card.id, p] as const
    }),
  )
  await saveManyProgress([...progreso.values()])

  // Un repaso histórico y una estadística diaria para detectar cambios.
  await logReview({
    eventId: crypto.randomUUID(),
    cardId: 'l:alpha:rec',
    moduleId: 'module-01',
    sectionId: 'm01-s01',
    capsuleId: 'm01-s01-c01',
    kind: 'letra-reconocer',
    mode: 'opcion-multiple',
    grade: 3,
    ts: NOW - 86_400_000,
    durationMs: 1200,
    interval: 1,
  })
  await bumpDaily({ correct: true, isNew: false, durationMs: 1000 })

  const user = userEvent.setup()
  render(
    <StoreProvider>
      <App />
    </StoreProvider>,
  )

  // La cápsula está completada y su material ofrece repasarla.
  await user.click(await screen.findByRole('button', { name: 'Alfa, beta y gamma — Α Β Γ (completada)' }))
  await screen.findByText(/alfa mayúscula/)
  await user.click(screen.getByRole('button', { name: 'Repasar cápsula' }))

  // Seis preguntas: acierta las impares y falla las pares.
  for (let i = 0; i < 6; i++) await responder(user, i % 2 === 1)
  // Los tres fallos entran en la fase de refuerzo, una vez cada uno, acertando.
  for (let i = 0; i < 3; i++) await responder(user)

  await screen.findByRole('button', { name: 'Volver al camino' })

  // Nada se persistió: el progreso es idéntico campo por campo…
  const despues = await loadProgress()
  assert.equal(despues.size, progreso.size)
  for (const [id, antes] of progreso) {
    assert.deepEqual(despues.get(id), antes, `el progreso de ${id} cambió`)
  }

  // …no aparecieron registros de repaso nuevos…
  const historial = await getAllReviews()
  assert.equal(historial.length, 1)

  // …y las estadísticas diarias no se movieron.
  const diario = await getAllDaily()
  assert.equal(diario.length, 1)
  assert.equal(diario[0]!.reviews, 1)

  // La cápsula sigue completada y la siguiente sigue abierta.
  await user.click(screen.getByRole('button', { name: 'Volver al camino' }))
  assert.ok(await screen.findByRole('button', { name: 'Alfa, beta y gamma — Α Β Γ (completada)' }))
  const segunda = screen.getByRole('button', { name: 'Delta, épsilon y dseta — Δ Ε Ζ' })
  assert.equal(segunda.hasAttribute('disabled'), false)
})

test('las cápsulas 3 y 4 se completan el mismo día y abren la siguiente', async () => {
  // Cápsulas 1 y 2 ya dominadas: sus tarjetas se siembran graduadas.
  const completar = (capsuleId: string) => {
    const cards = cardsByCapsule.get(capsuleId)!
    const NOW = Date.now()
    return cards.map((card) => {
      let p = schedule(newProgress(card, NOW), 3, NOW)
      p = schedule(p, 3, p.due)
      return p
    })
  }
  await saveManyProgress([
    ...completar('m01-s01-c01'),
    ...completar('m01-s01-c02'),
  ])

  const user = userEvent.setup()
  render(
    <StoreProvider>
      <App />
    </StoreProvider>,
  )

  // La cápsula 3 queda desbloqueada y ofrece su material.
  await user.click(await screen.findByRole('button', { name: 'Eta, theta e iota — Η Θ Ι' }))
  await screen.findByText(/^eta mayúscula/)
  await user.click(screen.getByRole('button', { name: 'Comenzar práctica' }))

  // 8 tarjetas de la propia cápsula, una aparición cada una. Nada de la cápsula 4 se cuela en esta sesión.
  for (let i = 0; i < 8; i++) await responder(user)

  await screen.findByText('¡Excelente!')
  await user.click(screen.getByRole('button', { name: 'Volver al camino' }))
  assert.equal(screen.getAllByRole('button', { name: /\(completada\)/ }).length, 3)

  // La cápsula 4 queda desbloqueada y se completa el mismo día.
  const cuarta = screen.getByRole('button', { name: 'Kappa, lambda y mi — Κ Λ Μ' })
  assert.equal(cuarta.hasAttribute('disabled'), false)
  await user.click(cuarta)
  await screen.findByText(/^kappa mayúscula/)
  await user.click(screen.getByRole('button', { name: 'Comenzar práctica' }))

  for (let i = 0; i < 8; i++) await responder(user)

  await screen.findByText('¡Excelente!')
  await user.click(screen.getByRole('button', { name: 'Volver al camino' }))
  assert.equal(screen.getAllByRole('button', { name: /\(completada\)/ }).length, 4)

  // Las dos cápsulas nuevas ofrecen repasarlas.
  await user.click(screen.getByRole('button', { name: 'Eta, theta e iota — Η Θ Ι (completada)' }))
  assert.ok(await screen.findByRole('button', { name: 'Repasar cápsula' }))
  await user.click(screen.getByRole('button', { name: '← Volver' }))
  await user.click(screen.getByRole('button', { name: 'Kappa, lambda y mi — Κ Λ Μ (completada)' }))
  assert.ok(await screen.findByRole('button', { name: 'Repasar cápsula' }))
}, 60_000)


test('en el camino las formas de alfa y sigma son estables con cualquier progreso', async () => {
  const user = userEvent.setup()
  for (const [id, glyphs, name] of [
    ['l:alpha:rec', 'Α · α', 'alfa'],
    ['l:sigma:rec', 'Σ · σ · ς', 'sigma'],
  ]) {
    const card = allCards.find((c) => c.id === id)!
    for (const reps of [0, 1, 2, 99]) {
      const { unmount } = render(
        <LetterRecognition
          item={{ card, progress: { ...newProgress(card), reps, due: Date.now() - 14 * 86_400_000 },
            mode: 'opcion-multiple', isNew: reps === 0, fixedContent: true }}
          onGraded={() => {}}
        />,
      )
      assert.equal(document.querySelector('.prompt__greek')?.textContent, glyphs)
      const labels = [...document.querySelectorAll('.options .option')].map((b) => b.textContent)
      assert.equal(new Set(labels).size, labels.length)
      assert.ok(labels.every((label) => !/mayúscula|minúscula|final/.test(label ?? '')))
      await user.click(screen.getByRole('button', { name }))
      assert.ok(screen.getByText(/mayúscula · .* minúscula/))
      if (name === 'sigma') assert.ok(screen.getByText(/ς final, usada al final de palabra/))
      unmount()
    }
  }
})

test('volver a una parcial tras dos semanas conserva datos y ofrece toda la cápsula', async () => {
  const old = Date.now() - 14 * 86_400_000
  const first = cardsByCapsule.get('m01-s01-c01')!
  const second = cardsByCapsule.get('m01-s01-c02')!
  await saveManyProgress([
    ...first.map((card) => schedule(newProgress(card, old), 1, old)),
    schedule(newProgress(second[0]!, old), 3, old),
  ])
  await saveSettings({ ...DEFAULT_SETTINGS, dailyGoal: 5, newPerDay: 0, mixRatio: 0.8 })
  const before = await exportBackup()
  const user = userEvent.setup()
  render(<StoreProvider><App /></StoreProvider>)
  await user.click(await screen.findByRole('button', { name: 'Delta, épsilon y dseta — Δ Ε Ζ' }))
  await user.click(screen.getByRole('button', { name: 'Comenzar práctica' }))
  assert.equal(document.querySelector('.session__bar .small')?.textContent, '0/8')
  assert.equal(document.querySelector('.prompt__greek')?.textContent, 'Δ · δ')
  const atStart = await exportBackup()
  assert.deepEqual(atStart.progress, before.progress)
  assert.deepEqual(atStart.reviews, before.reviews)
  assert.deepEqual(atStart.daily, before.daily)
  assert.deepEqual(atStart.settings, before.settings)
  for (let i = 0; i < 8; i++) await responder(user)
  await screen.findByText('¡Excelente!')
  const after = await exportBackup()
  for (const card of first) {
    assert.deepEqual(after.progress.find((p) => p.cardId === card.id), before.progress.find((p) => p.cardId === card.id))
  }
  assert.equal(after.reviews.length, before.reviews.length + 8)
  assert.equal(after.daily[0]!.reviews, 8)
  assert.deepEqual(after.settings, before.settings)
  await user.click(screen.getByRole('button', { name: 'Volver al camino' }))
  await user.click(screen.getByRole('button', { name: 'Tarjetas' }))
  assert.ok(await screen.findByRole('button', { name: 'Repasar · 5 tarjetas' }))
  await user.click(screen.getByRole('button', { name: 'Repasar · 5 tarjetas' }))
  await screen.findByText('¿Qué letra es?')
  assert.equal(document.querySelector('.session__bar .small')?.textContent, '0/5')
  // El repaso separado conserva la variante SRS de alfa (reps = 1).
  assert.equal(document.querySelector('.prompt__greek')?.textContent, 'α')
  await responder(user)
  assert.equal((await getAllReviews()).length, after.reviews.length + 1)
})
