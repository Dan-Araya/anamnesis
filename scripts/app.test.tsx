import { strict as assert } from 'node:assert'
import { test } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Grade, Settings } from '../src/types'
import App from '../src/App'
import { StoreProvider } from '../src/store'
import { allCards, getVocab } from '../src/content'
import { DEFAULT_SETTINGS, exportBackup, loadProgress } from '../src/lib/db'
import { newProgress } from '../src/lib/srs'
import TypeAnswer from '../src/components/exercises/TypeAnswer'

test('el módulo muestra directamente las cápsulas y conserva sus bloqueos', async () => {
  render(
    <StoreProvider>
      <App />
    </StoreProvider>,
  )

  const primera = await screen.findByRole('button', { name: 'Alfa, beta y gamma — Α Β Γ' })
  assert.ok(screen.getByRole('heading', { name: 'Módulo 1' }))
  assert.ok(screen.getByText('Leer el alfabeto'))
  assert.equal(screen.queryByRole('button', { name: 'Módulo 1' }), null)
  assert.equal(screen.queryByText(/Sección/), null)

  // La primera cápsula está abierta; la segunda nace bloqueada.
  assert.equal(primera.hasAttribute('disabled'), false)
  assert.ok(
    screen.getByRole('button', { name: 'Delta, épsilon y dseta — Δ Ε Ζ (bloqueada)' }).hasAttribute('disabled'),
  )

  // Las cápsulas 3 y 4 ya existen y nacen bloqueadas.
  assert.ok(
    screen.getByRole('button', { name: 'Eta, theta e iota — Η Θ Ι (bloqueada)' }).hasAttribute('disabled'),
  )
  assert.ok(
    screen.getByRole('button', { name: 'Kappa, lambda y mi — Κ Λ Μ (bloqueada)' }).hasAttribute('disabled'),
  )

  // Lo mismo con las cápsulas 5 y 6, cuyos títulos ya muestran sus letras.
  assert.ok(
    screen.getByRole('button', { name: 'Ni, xi y ómicron — Ν Ξ Ο (bloqueada)' }).hasAttribute('disabled'),
  )
  assert.ok(
    screen.getByRole('button', { name: 'Pi, rho y sigma — Π Ρ Σ (bloqueada)' }).hasAttribute('disabled'),
  )

  // Y con las cápsulas 7 y 8, que completan el alfabeto.
  assert.ok(
    screen.getByRole('button', { name: 'Tau, upsilon y phi — Τ Υ Φ (bloqueada)' }).hasAttribute('disabled'),
  )
  assert.ok(
    screen.getByRole('button', { name: 'Chi, psi y omega — Χ Ψ Ω (bloqueada)' }).hasAttribute('disabled'),
  )
})

test('tocar una cápsula abre primero su material, y su botón inicia la práctica', async () => {
  const user = userEvent.setup()
  render(
    <StoreProvider>
      <App />
    </StoreProvider>,
  )

  await user.click(await screen.findByRole('button', { name: 'Alfa, beta y gamma — Α Β Γ' }))

  // Primero la lección: enseña las formas y aún no pregunta nada.
  assert.ok(await screen.findByText(/alfa mayúscula/))
  assert.ok(screen.getByText(/alfa minúscula/))
  assert.ok(screen.getByText(/beta mayúscula/))
  assert.equal(screen.queryByText('¿Qué letra es?'), null)

  // El encabezado muestra el título español y el resumen griego derivado.
  assert.ok(screen.getByRole('heading', { name: 'Alfa, beta y gamma' }))
  assert.ok(screen.getByText('Α · Β · Γ'))

  // El botón de la lección inicia la práctica.
  await user.click(screen.getByRole('button', { name: 'Comenzar práctica' }))

  // La primera tarjeta reconoce juntas las formas de alfa.
  await screen.findByText('¿Qué letra es?')
  await user.click(screen.getByRole('button', { name: 'alfa' }))
  await user.click(await screen.findByRole('button', { name: 'Continuar' }))

  await waitFor(async () => {
    const progress = await loadProgress()
    assert.equal(progress.size, 1)
    const [saved] = [...progress.values()]
    assert.equal(saved!.state, 'aprendiendo')
    assert.equal(saved!.cardId, 'l:alpha:rec')
    const backup = await exportBackup()
    assert.match(backup.reviews[0]!.eventId, /^[0-9a-f-]{36}$/)
    // La respuesta objetiva se calificó internamente como «bien» (3).
    assert.equal(backup.reviews[0]!.grade, 3)
  })
})

test('δέ se reconoce y translitera; cada letra genera sus dos tarjetas', () => {
  const de = getVocab('de')
  assert.ok(de)
  assert.deepEqual(de.cards, ['reconocer', 'transliterar'])

  const ids = new Set(allCards.map((c) => c.id))
  assert.equal(ids.has('v:de:rec'), true)
  assert.equal(ids.has('v:de:trl'), true)
  assert.equal(ids.has('v:de:pro'), false)

  assert.equal(ids.has('l:alpha:rec'), true)
  assert.equal(ids.has('l:alpha:pro'), true)
})

test('la base de datos está en la versión 5, con la migración de transliterar', async () => {
  const backup = await exportBackup()
  assert.equal(backup.version, 5)
})

test('el teclado en pantalla compone la forma acentuada y la da por buena', async () => {
  const user = userEvent.setup()
  const vocab = getVocab('de')
  assert.ok(vocab)

  const card = {
    id: 'v:de:pro',
    moduleId: 'module-01',
    sectionId: 'm01-s01',
    capsuleId: 'm01-s01-c02',
    kind: 'vocab-producir' as const,
    sourceId: 'de',
  }
  const settings: Settings = { ...DEFAULT_SETTINGS, showKeyboard: true }
  let recibido: Grade | null = null

  render(
    <TypeAnswer
      item={{ card, progress: newProgress(card), mode: 'escribir', isNew: false }}
      settings={settings}
      onGraded={(grade) => {
        recibido = grade
      }}
    />,
  )

  // δέ: la delta, la épsilon y el acento agudo sobre la épsilon.
  await user.click(screen.getByRole('button', { name: 'δ' }))
  await user.click(screen.getByRole('button', { name: 'ε' }))
  await user.click(screen.getByRole('button', { name: 'Agudo' }))

  const input = screen.getByLabelText('Tu respuesta en griego') as HTMLInputElement
  assert.equal(input.value, 'δέ')

  await user.click(screen.getByRole('button', { name: 'Comprobar' }))
  await screen.findByText('Correcto')

  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  assert.equal(recibido, 3)
})

test('el acento pulsado antes de la vocal espera y cae donde debe', async () => {
  const user = userEvent.setup()

  const card = {
    id: 'v:de:pro',
    moduleId: 'module-01',
    sectionId: 'm01-s01',
    capsuleId: 'm01-s01-c02',
    kind: 'vocab-producir' as const,
    sourceId: 'de',
  }
  const settings: Settings = { ...DEFAULT_SETTINGS, showKeyboard: true }

  render(
    <TypeAnswer
      item={{ card, progress: newProgress(card), mode: 'escribir', isNew: false }}
      settings={settings}
      onGraded={() => {}}
    />,
  )

  const input = screen.getByLabelText('Tu respuesta en griego') as HTMLInputElement
  const agudo = screen.getByRole('button', { name: 'Agudo' })

  // La secuencia que antes producía δ́έ: el acento pulsado tras la delta.
  await user.click(screen.getByRole('button', { name: 'δ' }))
  await user.click(agudo)

  // La delta no admite acento, así que la marca queda en espera.
  assert.equal(input.value, 'δ')
  assert.equal(agudo.getAttribute('aria-pressed'), 'true')

  await user.click(screen.getByRole('button', { name: 'ε' }))
  assert.equal(input.value, 'δέ')
  assert.equal(agudo.getAttribute('aria-pressed'), 'false')

  await user.click(screen.getByRole('button', { name: 'Comprobar' }))
  await screen.findByText('Correcto')
})

/** Monta el ejercicio de escritura de δέ con el teclado en pantalla activo. */
function montarEscritura() {
  const card = {
    id: 'v:de:pro',
    moduleId: 'module-01',
    sectionId: 'm01-s01',
    capsuleId: 'm01-s01-c02',
    kind: 'vocab-producir' as const,
    sourceId: 'de',
  }
  render(
    <TypeAnswer
      item={{ card, progress: newProgress(card), mode: 'escribir', isNew: false }}
      settings={{ ...DEFAULT_SETTINGS, showKeyboard: true }}
      onGraded={() => {}}
    />,
  )
  return screen.getByLabelText('Tu respuesta en griego') as HTMLInputElement
}

test('el campo admite el teclado del sistema aunque esté el de pantalla', async () => {
  const user = userEvent.setup()
  const input = montarEscritura()

  // Editable: al tocarlo, Android abre su teclado.
  assert.equal(input.hasAttribute('readonly'), false)

  await user.click(input)
  await user.type(input, 'δε')
  assert.equal(input.value, 'δε')

  // Y el diacrítico se remata con el teclado en pantalla.
  await user.click(screen.getByRole('button', { name: 'Agudo' }))
  assert.equal(input.value, 'δέ')
})

test('las teclas escriben donde está el cursor, no siempre al final', async () => {
  const user = userEvent.setup()
  const input = montarEscritura()

  await user.click(input)
  await user.type(input, 'δε')
  // El cursor se lleva a mitad de palabra.
  input.setSelectionRange(1, 1)

  await user.click(screen.getByRole('button', { name: 'ι' }))
  assert.equal(input.value, 'διε')
})
