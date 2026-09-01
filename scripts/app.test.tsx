import { strict as assert } from 'node:assert'
import { test } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Grade, Settings } from '../src/types'
import App from '../src/App'
import { StoreProvider } from '../src/store'
import { allVocab, getVocab } from '../src/content'
import { DEFAULT_SETTINGS, loadProgress } from '../src/lib/db'
import { newProgress } from '../src/lib/srs'
import TypeAnswer from '../src/components/exercises/TypeAnswer'

test('de la pantalla de inicio a responder una tarjeta, con el progreso guardado', async () => {
  const user = userEvent.setup()
  render(
    <StoreProvider>
      <App />
    </StoreProvider>,
  )

  // La app arranca leyendo IndexedDB, así que la primera pantalla tarda un tick.
  const practicar = await screen.findByRole('button', { name: /^Practicar/ })
  await user.click(practicar)

  // La primera tarjeta de un usuario nuevo es vocabulario en opción múltiple.
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
    assert.equal(saved!.reps, 1)
  })
})

test('el teclado en pantalla compone la forma acentuada y la da por buena', async () => {
  const user = userEvent.setup()
  const vocab = getVocab('m01-theos')
  assert.ok(vocab)

  const card = {
    id: 'v:m01-theos:pro',
    moduleId: 'module-01',
    kind: 'vocab-producir' as const,
    sourceId: 'm01-theos',
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

  // θεός se compone letra a letra: la tilde se aplica sobre la ómicron.
  for (const letra of ['θ', 'ε', 'ο']) {
    await user.click(screen.getByRole('button', { name: letra }))
  }
  await user.click(screen.getByRole('button', { name: 'Agudo' }))
  await user.click(screen.getByRole('button', { name: 'ς' }))

  const input = screen.getByLabelText('Tu respuesta en griego') as HTMLInputElement
  assert.equal(input.value, 'θεός')

  await user.click(screen.getByRole('button', { name: 'Comprobar' }))
  await screen.findByText('Correcto')

  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  assert.equal(recibido, 3)
})
