import { strict as assert } from 'node:assert'
import { beforeEach, test } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App'
import { StoreProvider } from '../src/store'
import { allLetters } from '../src/content'
import { getAllReviews, loadProgress, resetAll } from '../src/lib/db'

/**
 * La sesión de extremo a extremo en dos fases: contador principal estable,
 * fase de refuerzo separada con su propio contador y como máximo tres
 * tarjetas, y cápsula completada tras el recorrido principal aunque haya
 * errores.
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

type Usuario = ReturnType<typeof userEvent.setup>

/** Responde la pregunta de letras en pantalla (bien si `correcta`) y espera el avance. */
async function responder(user: Usuario, correcta = true) {
  await screen.findByText(/¿Qué letra es\?|¿Cuál es la .* minúscula\?/)
  const hint = document.querySelector('.prompt__hint')?.textContent ?? ''
  const opciones = () =>
    [...document.querySelectorAll<HTMLButtonElement>('.options .option')]
  const elegirOtro = (distinto: string) => {
    const otro = opciones().find((b) => (b.textContent ?? '').trim() !== distinto)
    assert.ok(otro, `sin alternativas distintas de «${distinto}»`)
    return otro
  }

  if (hint.includes('¿Qué letra es?')) {
    const glyph = document.querySelector('.prompt__greek')?.textContent ?? ''
    const nombre = nombrePorForma.get(glyph)
    assert.ok(nombre, `no se reconoció la letra «${glyph}»`)
    const variante = mayusculas.has(glyph) ? 'mayúscula' : 'minúscula'
    const objetivo = `${nombre} ${variante}`
    if (correcta) {
      await user.click(screen.getByRole('button', { name: objetivo }))
    } else {
      await user.click(elegirOtro(objetivo))
    }
  } else {
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
  await waitFor(() => {
    if (screen.queryByRole('button', { name: 'Continuar' }) !== null) {
      throw new Error('la tarjeta anterior sigue en pantalla')
    }
  })
}

const contador = () => document.querySelector('.session__bar .small')?.textContent ?? ''

test('una sesión sin errores mantiene el contador estable y no tiene refuerzo', async () => {
  const user = userEvent.setup()
  render(
    <StoreProvider>
      <App />
    </StoreProvider>,
  )

  await user.click(await screen.findByRole('button', { name: 'Alfa, beta y gamma — Α Β Γ' }))
  await user.click(await screen.findByRole('button', { name: 'Comenzar práctica' }))

  for (let i = 1; i <= 6; i++) {
    await responder(user)
    assert.equal(screen.queryByText(/Refuerzo/), null)
    if (i < 6) {
      await waitFor(() => assert.equal(contador(), `${i}/6`))
    }
  }

  await screen.findByText('¡Excelente!')
  const progress = await loadProgress()
  assert.equal(progress.size, 6)
  assert.ok([...progress.values()].every((p) => p.reps === 1))
  assert.equal((await getAllReviews()).length, 6)
})

test('fallar dos tarjetas abre una fase de refuerzo de dos, sin reencolar', async () => {
  const user = userEvent.setup()
  render(
    <StoreProvider>
      <App />
    </StoreProvider>,
  )

  await user.click(await screen.findByRole('button', { name: 'Alfa, beta y gamma — Α Β Γ' }))
  await user.click(await screen.findByRole('button', { name: 'Comenzar práctica' }))

  // Falla las dos primeras y acierta el resto.
  await responder(user, false)
  await responder(user, false)
  for (let i = 0; i < 4; i++) await responder(user)

  // El contador principal ya no está; aparece la fase separada con el suyo.
  await waitFor(() => assert.equal(contador(), 'Refuerzo 1/2'))
  await responder(user, false) // vuelve a fallar: no se reencola
  await waitFor(() => assert.equal(contador(), 'Refuerzo 2/2'))
  await responder(user) // acierta el segundo refuerzo

  await screen.findByText('Terminaste la cápsula. 2 elementos volverán más adelante.')
  // 6 respuestas principales + 2 de refuerzo, todas persistidas.
  assert.equal((await getAllReviews()).length, 8)
})

test('fallarlo todo termina tras 6 + 3 y la cápsula queda completada igualmente', async () => {
  const user = userEvent.setup()
  render(
    <StoreProvider>
      <App />
    </StoreProvider>,
  )

  await user.click(await screen.findByRole('button', { name: 'Alfa, beta y gamma — Α Β Γ' }))
  await user.click(await screen.findByRole('button', { name: 'Comenzar práctica' }))

  // Seis fallos en la principal: el refuerzo toma tres y las demás quedan
  // para el SRS.
  for (let i = 0; i < 6; i++) await responder(user, false)

  await waitFor(() => assert.equal(contador(), 'Refuerzo 1/3'))
  await responder(user, false)
  await waitFor(() => assert.equal(contador(), 'Refuerzo 2/3'))
  await responder(user, false)
  await waitFor(() => assert.equal(contador(), 'Refuerzo 3/3'))
  await responder(user, false)

  // El mensaje cuenta tarjetas distintas falladas, no respuestas erróneas.
  await screen.findByText('Terminaste la cápsula. 6 elementos volverán más adelante.')
  assert.equal((await getAllReviews()).length, 9)

  // La cápsula queda completada tras el recorrido principal y la siguiente
  // queda abierta: los errores no bloquean el camino.
  await user.click(screen.getByRole('button', { name: 'Volver al camino' }))
  await screen.findByRole('button', { name: 'Alfa, beta y gamma — Α Β Γ (completada)' })
  const segunda = screen.getByRole('button', { name: 'Delta, épsilon y dseta — Δ Ε Ζ' })
  assert.equal(segunda.hasAttribute('disabled'), false)

  // Las tarjetas falladas quedaron programadas por el SRS para volver.
  const progress = await loadProgress()
  assert.equal(progress.size, 6)
  assert.ok([...progress.values()].every((p) => p.reps >= 1))
})
