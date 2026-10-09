import { strict as assert } from 'node:assert'
import { beforeEach, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PathScreen, { STEP_HEIGHT } from '../src/screens/PathScreen'
import { capsuleStatuses, type CapsuleStatus } from '../src/lib/session'

const fixture = vi.hoisted(() => ({ statuses: [] as CapsuleStatus[] }))
vi.mock('../src/store', () => ({
  useStore: () => ({
    statuses: fixture.statuses, streak: 3,
  }),
}))

beforeEach(() => {
  fixture.statuses = capsuleStatuses(new Map())
})

test('agrupa las cápsulas directamente bajo el módulo y conserva sus ids y bloqueos', async () => {
  const user = userEvent.setup()
  const first = fixture.statuses[0]!
  const second = fixture.statuses[1]!
  fixture.statuses = [
    { ...first, completed: true, mastery: 1, started: first.total },
    { ...second, unlocked: true },
    { ...second, section: { ...second.section, id: 'next-section', number: 2 }, capsule: { ...second.capsule, id: 'next-capsule', number: 3, title: undefined, letters: [] } },
  ]
  const open = vi.fn()
  render(<PathScreen onOpen={open} />)
  assert.equal(screen.queryByText(/Sección/), null)
  // Una cápsula sin letras no muestra subtítulo griego ni lo exige en su nombre.
  assert.ok(screen.getByRole('button', { name: 'Cápsula 3 (bloqueada)' }).hasAttribute('disabled'))
  await user.click(screen.getByRole('button', { name: 'Alfa, beta y gamma — Α Β Γ (completada)' }))
  assert.equal(open.mock.calls[0]![0], first.capsule.id)
  await user.click(screen.getByRole('button', { name: 'Delta, épsilon y dseta — Δ Ε Ζ' }))
  assert.equal(open.mock.calls[1]![0], second.capsule.id)
  await user.click(screen.getByRole('button', { name: 'Cápsula 4 (próximamente)' }))
  assert.equal(open.mock.calls.length, 2)
})

test('los ocho nodos muestran su título español y su resumen griego derivado', () => {
  render(<PathScreen onOpen={vi.fn()} />)

  assert.ok(screen.getByRole('heading', { name: 'Alfa, beta y gamma' }))
  assert.ok(screen.getByRole('heading', { name: 'Delta, épsilon y dseta' }))
  assert.ok(screen.getByRole('heading', { name: 'Eta, theta e iota' }))
  assert.ok(screen.getByRole('heading', { name: 'Kappa, lambda y mi' }))
  assert.ok(screen.getByRole('heading', { name: 'Ni, xi y ómicron' }))
  assert.ok(screen.getByRole('heading', { name: 'Pi, rho y sigma' }))
  assert.ok(screen.getByRole('heading', { name: 'Tau, upsilon y phi' }))
  assert.ok(screen.getByRole('heading', { name: 'Chi, psi y omega' }))

  assert.ok(screen.getByText('Α · Β · Γ'))
  assert.ok(screen.getByText('Δ · Ε · Ζ'))
  assert.ok(screen.getByText('Η · Θ · Ι'))
  assert.ok(screen.getByText('Κ · Λ · Μ'))
  assert.ok(screen.getByText('Ν · Ξ · Ο'))
  assert.ok(screen.getByText('Π · Ρ · Σ'))
  assert.ok(screen.getByText('Τ · Υ · Φ'))
  assert.ok(screen.getByText('Χ · Ψ · Ω'))
})

test('el nombre accesible de cada botón incluye título y letras', () => {
  render(<PathScreen onOpen={vi.fn()} />)

  assert.ok(screen.getByRole('button', { name: 'Alfa, beta y gamma — Α Β Γ' }))
  assert.ok(screen.getByRole('button', { name: 'Delta, épsilon y dseta — Δ Ε Ζ (bloqueada)' }))
  assert.ok(screen.getByRole('button', { name: 'Eta, theta e iota — Η Θ Ι (bloqueada)' }))
  assert.ok(screen.getByRole('button', { name: 'Kappa, lambda y mi — Κ Λ Μ (bloqueada)' }))
  assert.ok(screen.getByRole('button', { name: 'Ni, xi y ómicron — Ν Ξ Ο (bloqueada)' }))
  assert.ok(screen.getByRole('button', { name: 'Pi, rho y sigma — Π Ρ Σ (bloqueada)' }))
  assert.ok(screen.getByRole('button', { name: 'Tau, upsilon y phi — Τ Υ Φ (bloqueada)' }))
  assert.ok(screen.getByRole('button', { name: 'Chi, psi y omega — Χ Ψ Ω (bloqueada)' }))
})

test('una cápsula completada se ve llena aunque le queden repasos pendientes', () => {
  const first = fixture.statuses[0]!
  const second = fixture.statuses[1]!
  fixture.statuses = [
    { ...first, completed: true, mastery: 0.4, due: 6 },
    { ...second, unlocked: true },
  ]
  render(<PathScreen onOpen={vi.fn()} />)

  // La palabra «Completada» no se pinta: el check y el anillo dorado ya la
  // comunican, y el nombre accesible del botón conserva el estado.
  assert.equal(screen.queryByText('Completada'), null)
  assert.equal(screen.queryByText(/por repasar/), null)
  const medallion = screen.getByRole('button', { name: 'Alfa, beta y gamma — Α Β Γ (completada)' })
  assert.match(medallion.getAttribute('style') ?? '', /--pct:\s*100/)
  // El check dentro del medallón sigue ahí.
  assert.ok(medallion.querySelector('.capsule-medallion__check'))
  // El dominio SRS no pinta un anillo parcial: ni siquiera se consulta.
  assert.equal(medallion.getAttribute('style')?.includes('40'), false)
})

test('una cápsula completada comunica su estado solo en el nombre accesible', () => {
  const first = fixture.statuses[0]!
  fixture.statuses = [{ ...first, completed: true, mastery: 1 }]
  render(<PathScreen onOpen={vi.fn()} />)

  // Visualmente no hay texto de estado; accesiblemente sí.
  assert.equal(screen.queryByText('Completada'), null)
  assert.ok(screen.getByRole('button', { name: 'Alfa, beta y gamma — Α Β Γ (completada)' }))
  assert.equal(screen.queryByText('Empezar'), null)
  assert.equal(screen.queryByText('Continuar'), null)
})

test('las cápsulas no completadas conservan sus estados visibles', () => {
  const statuses = fixture.statuses
  fixture.statuses = [
    { ...statuses[0]!, started: 2 },
    { ...statuses[1]!, unlocked: true },
    ...statuses.slice(2),
  ]
  render(<PathScreen onOpen={vi.fn()} />)

  assert.ok(screen.getByText('Continuar'))
  assert.ok(screen.getByText('Empezar'))
  // Las seis cápsulas bloqueadas conservan su estado visible.
  assert.equal(screen.getAllByText('Por desbloquear').length, 6)
  assert.equal(screen.queryByText('Completada'), null)
})

test('la altura de cada parada se define una sola vez y el CSS la consume', () => {
  render(<PathScreen onOpen={vi.fn()} />)

  const camino = document.querySelector('.capsule-path') as HTMLElement
  assert.equal(camino.style.getPropertyValue('--step-height'), `${STEP_HEIGHT}px`)

  // La curva y las paradas crecen con la misma constante: el centro de cada
  // nodo sigue estando donde pasa el sendero.
  const svg = document.querySelector('.capsule-path__curve') as SVGSVGElement
  const paradas = document.querySelectorAll('.capsule-stop').length
  assert.equal(svg.getAttribute('viewBox'), `0 0 360 ${paradas * STEP_HEIGHT}`)
})

test('una cápsula empezada sin terminar invita a continuar, sin anillo parcial', () => {
  const first = fixture.statuses[0]!
  fixture.statuses = [{ ...first, started: 3, mastery: 0.6 }]
  render(<PathScreen onOpen={vi.fn()} />)
  assert.ok(screen.getByText('Continuar'))
  const medallion = screen.getByRole('button', { name: 'Alfa, beta y gamma — Α Β Γ' })
  assert.match(medallion.getAttribute('style') ?? '', /--pct:\s*0/)
})

test('las cápsulas sin contenido se muestran como próximas sin ofrecer práctica', () => {
  fixture.statuses = fixture.statuses.map(s => ({ ...s, total: 0, completed: false }))
  render(<PathScreen onOpen={vi.fn()} />)
  assert.ok(screen.getByRole('button', { name: 'Alfa, beta y gamma — Α Β Γ (próximamente)' }).hasAttribute('disabled'))
  assert.ok(screen.getByRole('button', { name: 'Delta, épsilon y dseta — Δ Ε Ζ (próximamente)' }).hasAttribute('disabled'))
  assert.ok(screen.getByRole('button', { name: 'Eta, theta e iota — Η Θ Ι (próximamente)' }).hasAttribute('disabled'))
  assert.ok(screen.getByRole('button', { name: 'Kappa, lambda y mi — Κ Λ Μ (próximamente)' }).hasAttribute('disabled'))
  assert.ok(screen.getByText('0 de 0 cápsulas completadas'))
})

test('el camino empieza directo en los módulos, sin tarjeta de práctica diaria', () => {
  render(<PathScreen onOpen={vi.fn()} />)
  assert.equal(screen.queryByText('Tu práctica de hoy'), null)
  assert.ok(screen.getByText('Tu camino'))
  assert.ok(screen.getByText('Tu siguiente paso'))
})

test('sin contenido el camino muestra el cierre y no rompe', () => {
  fixture.statuses = []
  render(<PathScreen onOpen={vi.fn()} />)
  assert.ok(screen.getByText('El camino estará disponible cuando haya contenido.'))
})
