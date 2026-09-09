import { strict as assert } from 'node:assert'
import { beforeEach, test, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { usePracticeWidget, requestPracticeWidget } from '../src/lib/practice-widget'

const fixture = vi.hoisted(() => ({
  platform: 'android', ready: true, goal: 40, requested: false,
  daily: [{ date: '2026-09-08', reviews: 4, correct: 3 }],
  listener: undefined as undefined | (() => void),
  update: vi.fn(async (_snapshot: unknown) => {}),
  remove: vi.fn(async () => {}),
}))
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => fixture.platform },
  registerPlugin: () => ({
    update: fixture.update,
    consumePractice: async () => {
      const requested = fixture.requested
      fixture.requested = false
      return { requested }
    },
    addListener: async (_event: string, listener: () => void) => {
      fixture.listener = listener
      return { remove: fixture.remove }
    },
    requestPin: async () => ({ supported: false }),
  }),
}))
vi.mock('../src/store', () => ({
  useStore: () => ({ ready: fixture.ready, daily: fixture.daily, settings: { dailyGoal: fixture.goal } }),
}))
beforeEach(() => {
  fixture.platform = 'android'; fixture.ready = true; fixture.goal = 40
  fixture.requested = false; fixture.listener = undefined
  fixture.daily = [{ date: '2026-09-08', reviews: 4, correct: 3 }]
  fixture.update.mockClear(); fixture.remove.mockClear()
})

test('espera al progreso cargado y envía solo el resumen que necesita el widget', async () => {
  fixture.ready = false
  const view = renderHook(() => usePracticeWidget(vi.fn()))
  assert.equal(fixture.update.mock.calls.length, 0)
  fixture.ready = true
  view.rerender()
  await waitFor(() => assert.equal(fixture.update.mock.calls.length, 1))
  assert.deepEqual(fixture.update.mock.calls[0]![0], {
    daily: [{ date: '2026-09-08', reviews: 4 }], goal: 40,
  })
  fixture.daily = [] // Reset/import also replaces the widget display cache.
  fixture.goal = 20
  view.rerender()
  await waitFor(() => assert.deepEqual(fixture.update.mock.calls.at(-1)![0], { daily: [], goal: 20 }))
})

test('abre la práctica desde un arranque frío y desde la app ya abierta', async () => {
  fixture.requested = true
  const practice = vi.fn()
  const view = renderHook(() => usePracticeWidget(practice))
  await waitFor(() => assert.equal(practice.mock.calls.length, 1))
  fixture.requested = true
  fixture.listener!()
  await waitFor(() => assert.equal(practice.mock.calls.length, 2))
  fixture.listener!()
  await waitFor(() => assert.equal(fixture.requested, false))
  assert.equal(practice.mock.calls.length, 2)
  view.unmount()
  assert.equal(fixture.remove.mock.calls.length, 1)
})

test('la versión web no intenta acceder al widget nativo', () => {
  fixture.platform = 'web'
  renderHook(() => usePracticeWidget(vi.fn()))
  assert.equal(fixture.update.mock.calls.length, 0)
  assert.equal(fixture.listener, undefined)
})

test('explica cómo añadir el widget si el launcher no admite fijarlo desde la app', async () => {
  assert.match(await requestPracticeWidget(), /Widgets.*Anamnesis/)
})
