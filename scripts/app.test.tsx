import { strict as assert } from 'node:assert'
import { test } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Grade, Settings } from '../src/types'
import App from '../src/App'
import { StoreProvider } from '../src/store'
import { allCards, allVocab, getVocab, path } from '../src/content'
import { DEFAULT_SETTINGS, loadProgress } from '../src/lib/db'
import { newProgress } from '../src/lib/srs'
import TypeAnswer from '../src/components/exercises/TypeAnswer'

test('el camino arranca con la primera cápsula abierta y las demás bloqueadas', async () => {
  render(
    <StoreProvider>
      <App />
    </StoreProvider>,
  )

  const primera = await screen.findByRole('button', { name: 'Cápsula 1' })
  assert.equal(primera.hasAttribute('disabled'), false)

  // Cualquier nodo posterior nace bloqueado.
  for (const { capsule } of path.slice(1)) {
    const nodo = screen.getByRole('button', { name: `Cápsula ${capsule.number} (bloqueada)` })
    assert.ok(nodo.hasAttribute('disabled'))
  }
})

test('pulsar el nodo entra directo a practicar y guarda el progreso', async () => {
  const user = userEvent.setup()
  render(
    <StoreProvider>
      <App />
    </StoreProvider>,
  )

  // Sin pantalla intermedia: del camino a la primera pregunta.
  await user.click(await screen.findByRole('button', { name: 'Cápsula 1' }))

  await screen.findByText('¿Qué significa?')
  const griego = document.querySelector('.prompt__greek')?.textContent ?? ''
  const vocab = allVocab.find((v) => v.greek === griego)
  assert.ok(vocab, `no se encontró el vocabulario para «${griego}»`)

  await user.click(screen.getByRole('button', { name: vocab.es[0]! }))
  await user.click(await screen.findByRole('button', { name: 'Continuar' }))

  await waitFor(async () => {
    const progress = await loadProgress()
    assert.equal(progress.size, 1)
    const [saved] = [...progress.values()]
    assert.equal(saved!.state, 'aprendiendo')
    assert.equal(saved!.cardId.startsWith('v:m01-s01-'), true)
  })
})

test('las expresiones marcadas solo para reconocer no piden escritura', () => {
  const expresion = getVocab('m01-s01-te-kai')
  assert.ok(expresion)
  assert.deepEqual(expresion.cards, ['reconocer'])

  // De esa entrada sale la tarjeta de reconocer, pero no la de producir.
  const ids = new Set(allCards.map((c) => c.id))
  assert.equal(ids.has(`v:${expresion.id}:rec`), true)
  assert.equal(ids.has(`v:${expresion.id}:pro`), false)

  // Una palabra normal sí genera las dos.
  assert.equal(ids.has('v:m01-s01-kai:rec'), true)
  assert.equal(ids.has('v:m01-s01-kai:pro'), true)
})

test('el teclado en pantalla compone la forma acentuada y la da por buena', async () => {
  const user = userEvent.setup()
  const vocab = getVocab('m01-s01-epeita')
  assert.ok(vocab)

  const card = {
    id: 'v:m01-s01-epeita:pro',
    moduleId: 'module-01',
    sectionId: 'm01-s01',
    capsuleId: 'm01-s01-c01',
    kind: 'vocab-producir' as const,
    sourceId: 'm01-s01-epeita',
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

  // ἔπειτα: la épsilon inicial lleva espíritu suave y acento agudo.
  await user.click(screen.getByRole('button', { name: 'ε' }))
  await user.click(screen.getByRole('button', { name: 'Espíritu suave' }))
  await user.click(screen.getByRole('button', { name: 'Agudo' }))
  for (const letra of ['π', 'ε', 'ι', 'τ', 'α']) {
    await user.click(screen.getByRole('button', { name: letra }))
  }

  const input = screen.getByLabelText('Tu respuesta en griego') as HTMLInputElement
  assert.equal(input.value, 'ἔπειτα')

  await user.click(screen.getByRole('button', { name: 'Comprobar' }))
  await screen.findByText('Correcto')

  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  assert.equal(recibido, 3)
})

test('el acento pulsado antes de la vocal espera y cae donde debe', async () => {
  const user = userEvent.setup()

  const card = {
    id: 'v:m01-s01-de:pro',
    moduleId: 'module-01',
    sectionId: 'm01-s01',
    capsuleId: 'm01-s01-c01',
    kind: 'vocab-producir' as const,
    sourceId: 'm01-s01-de',
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
    id: 'v:m01-s01-de:pro',
    moduleId: 'module-01',
    sectionId: 'm01-s01',
    capsuleId: 'm01-s01-c01',
    kind: 'vocab-producir' as const,
    sourceId: 'm01-s01-de',
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
