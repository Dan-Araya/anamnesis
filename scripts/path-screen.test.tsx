import { strict as assert } from 'node:assert'
import { beforeEach, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PathScreen from '../src/screens/PathScreen'
import { capsuleStatuses, type CapsuleStatus } from '../src/lib/session'
import { DEFAULT_SETTINGS } from '../src/lib/db'

const fixture = vi.hoisted(() => ({ statuses: [] as CapsuleStatus[] }))
vi.mock('../src/store', () => ({
  useStore: () => ({
    statuses: fixture.statuses, streak: 3,
  }),
}))

beforeEach(() => {
  fixture.statuses = capsuleStatuses(new Map(), DEFAULT_SETTINGS)
})

test('agrupa las cápsulas directamente bajo el módulo y conserva sus ids y bloqueos', async () => {
  const user = userEvent.setup()
  const first = fixture.statuses[0]!
  const second = fixture.statuses[1]!
  fixture.statuses = [
    { ...first, completed: true, mastery: 1, started: first.total },
    { ...second, unlocked: true },
    { ...second, section: { ...second.section, id: 'next-section', number: 2 }, capsule: { ...second.capsule, id: 'next-capsule', number: 1 } },
  ]
  const practice = vi.fn()
  render(<PathScreen onPractice={practice} />)
  assert.equal(screen.queryByText(/Sección/), null)
  assert.ok(screen.getByRole('button', { name: 'Cápsula 3 (bloqueada)' }).hasAttribute('disabled'))
  await user.click(screen.getByRole('button', { name: 'Cápsula 1' }))
  assert.equal(practice.mock.calls[0]![0], first.capsule.id)
  await user.click(screen.getByRole('button', { name: 'Cápsula 2' }))
  assert.equal(practice.mock.calls[1]![0], second.capsule.id)
  await user.click(screen.getByRole('button', { name: 'Cápsula 4 (próximamente)' }))
  assert.equal(practice.mock.calls.length, 2)
})

test('las cápsulas sin contenido se muestran como próximas sin ofrecer práctica', () => {
  fixture.statuses = fixture.statuses.map(s => ({ ...s, total: 0, completed: false }))
  render(<PathScreen onPractice={vi.fn()} />)
  for (const number of [1, 2, 3, 4]) {
    assert.ok(screen.getByRole('button', { name: `Cápsula ${number} (próximamente)` }).hasAttribute('disabled'))
  }
  assert.ok(screen.getByText('0 de 0 cápsulas completadas'))
})

test('el camino empieza directo en los módulos, sin tarjeta de práctica diaria', () => {
  render(<PathScreen onPractice={vi.fn()} />)
  assert.equal(screen.queryByText('Tu práctica de hoy'), null)
  assert.ok(screen.getByText('Tu camino'))
  assert.ok(screen.getByText('Tu siguiente paso'))
})

test('sin contenido el camino muestra el cierre y no rompe', () => {
  fixture.statuses = []
  render(<PathScreen onPractice={vi.fn()} />)
  assert.ok(screen.getByText('El camino estará disponible cuando haya contenido.'))
})
