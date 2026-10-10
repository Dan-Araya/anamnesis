import { strict as assert } from 'node:assert'
import { test } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createHash } from 'node:crypto'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { allCards, getNode, getQuestion, lettersUpTo, vocabUpTo, modules } from '../src/content'
import { resolveQuestion } from '../src/lib/consolidation'
import { buildSession, capsuleStatuses } from '../src/lib/session'
import { newProgress } from '../src/lib/srs'
import { DEFAULT_SETTINGS, exportBackup, importBackup, resetAll } from '../src/lib/db'
import { createRun, advance, currentItem, phaseOf } from '../src/lib/session-run'
import SessionScreen from '../src/screens/SessionScreen'
import { StoreProvider, useStore } from '../src/store'
import Consolidation from '../src/components/exercises/Consolidation'
import DiacriticsNotice, { shouldShowDiacriticsNotice } from '../src/components/DiacriticsNotice'
import { validateModules } from './check-content'

const cid = 'm01-s01-c09'
const questions = allCards.filter(c => c.capsuleId === cid)
const oldCards = allCards.filter(c => c.capsuleId !== cid)
const resolved = (sourceId: string) => resolveQuestion(getQuestion(sourceId)!, lettersUpTo(cid), vocabUpTo(cid))
const previousProgress = () => new Map(oldCards.map(c => [c.id, { ...newProgress(c), reps: 1 }]))

test('cola fija de siete ejercicios: orden, siete respuestas derivadas y sin entradas duplicadas', () => {
  assert.deepEqual(questions.map(c => resolved(c.sourceId).answer), ['ρ', 'sigma', 'ς', 'thea', 'onoma', 'mythos', 'psychē'])
  assert.deepEqual(questions.map(c => resolved(c.sourceId).prompt), ['Ρ', 'Σ σ ς', 'ποίησι_', 'θεά', 'ὄνομα', 'μῦθος', 'ψυχή'])
  assert.equal(getNode(cid)!.capsule.vocabulary.length, 0)
  assert.equal(getNode(cid)!.capsule.letters.length, 0)
  assert.ok(questions.every(c => c.id.startsWith('q:')))
  for (const card of questions) assert.equal(new Set([resolved(card.sourceId).answer, ...resolved(card.sourceId).distractors]).size, 4)
})

test('cola completa con progreso nuevo, parcial, completado y vencimiento distante; refuerzo limitado', () => {
  const progress = previousProgress()
  for (let stage = 0; stage < 3; stage++) {
    if (stage === 1) progress.set(questions[0]!.id, { ...newProgress(questions[0]!), reps: 1, due: 1e15 })
    if (stage === 2) for (const c of questions) progress.set(c.id, { ...newProgress(c), reps: 9, due: 1e15 })
    const snapshot = structuredClone(progress)
    for (const now of [0, 1e14]) {
      const statuses = capsuleStatuses(progress, now)
      assert.equal(statuses.find(s => s.capsule.id === cid)!.completed, stage === 2)
      const queue = buildSession(progress, { ...DEFAULT_SETTINGS, dailyGoal: 1 }, statuses, { capsuleId: cid }, now)
      assert.deepEqual(queue.map(i => i.card.id), questions.map(c => c.id))
      assert.ok(queue.every(i => i.mode === 'opcion-multiple'))
      let run = createRun(queue)
      for (let i = 0; i < 7; i++) run = advance(run, 1, currentItem(run)!)
      assert.equal(phaseOf(run), 'refuerzo')
      for (let i = 0; i < 3; i++) run = advance(run, 1, currentItem(run)!)
      assert.equal(currentItem(run), undefined)
    }
    assert.deepEqual(progress, snapshot)
  }
})

test('todos los ids y material de las ocho cápsulas coinciden con el commit inicial', () => {
  // SHA-256 del contenido de las cápsulas 1–8 en 1f3fe35 (JSON compacto).
  const actual = JSON.stringify(modules[0]!.sections[0]!.capsules.slice(0, 8))
  assert.equal(createHash('sha256').update(actual).digest('hex'), '02d2e0ee1bab01b0c6f5fc4afa4220a634e62a23693fe3061cb0f66727bd3871')
  assert.equal(oldCards.length, 62)
  const sourceIds = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'omicron', 'pi', 'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega']
  const expected = new Set([
    ...sourceIds.flatMap(id => [`l:${id}:rec`, `l:${id}:pro`]),
    ...['de', 'thea', 'klima', 'onoma', 'poiesis', 'mythos', 'psyche'].flatMap(id => [`v:${id}:rec`, `v:${id}:trl`]),
  ])
  assert.deepEqual(new Set(oldCards.map(c => c.id)), expected)
})

test('check-content rechaza referencias futuras, alternativas repetidas y palabra final inválida', () => {
  const dir = mkdtempSync(join(tmpdir(), 'consolidation-'))
  try {
    for (const mutation of ['future', 'duplicate', 'word']) {
      const content = structuredClone(modules[0]!)
      const qs = content.sections[0]!.capsules[8]!.consolidation!
      if (mutation === 'future') qs[0]!.sourceId = 'not-presented'
      if (mutation === 'duplicate' && qs[0]!.task === 'minuscula') qs[0]!.distractorIds = ['rho', 'rho', 'rho']
      if (mutation === 'word' && qs[2]!.task === 'final') qs[2]!.wordId = 'onoma'
      writeFileSync(join(dir, 'module-01.json'), JSON.stringify(content))
      assert.ok(validateModules(dir).errors.length > 0, mutation)
    }
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('aviso visible con ejemplos, etiquetas y distinción de macrones, solo en palabras con marcas', () => {
  assert.equal(shouldShowDiacriticsNotice('m01-s01-c01', 'δέ'), false)
  assert.equal(shouldShowDiacriticsNotice('m01-s01-c02', 'Δ δ'), false)
  assert.equal(shouldShowDiacriticsNotice('m01-s01-c02', 'δε'), false)
  render(<DiacriticsNotice capsuleId={cid} word="ὄνομα" transliteration />)
  const notice = screen.getByRole('complementary', { name: 'Sobre los diacríticos' })
  assert.ok(notice.textContent?.includes('Las rayas de ē/ō'))
  assert.ok(notice.textContent?.includes('marca curva a la izquierda'))
  assert.ok(notice.textContent?.includes('rayita a la derecha'))
  assert.equal(notice.querySelectorAll('.diacritics-example').length, 2)
  assert.equal(notice.querySelectorAll('button, input').length, 0)
})

test('cada pregunta muestra cuatro opciones y califica objetivamente', async () => {
  const user = userEvent.setup()
  for (const card of questions) {
    let grade = 0
    const { unmount } = render(<Consolidation item={{ card, progress: newProgress(card), mode: 'opcion-multiple', isNew: true }} onGraded={g => { grade = g }} />)
    assert.equal(document.querySelectorAll('.option').length, 4)
    assert.equal(Boolean(screen.queryByRole('complementary')), Boolean(resolved(card.sourceId).word))
    await user.click(screen.getByRole('button', { name: resolved(card.sourceId).answer }))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    assert.equal(grade, 3)
    unmount()
  }
})

test('la carga de contenido conserva un respaldo v5 con historial, ajustes y estadísticas', async () => {
  await resetAll()
  const backup = await exportBackup()
  backup.progress = [...previousProgress().values()]
  backup.settings = { ...backup.settings, dailyGoal: 17, mixRatio: .7 }
  backup.daily = [{ date: '2026-10-09', reviews: 62, correct: 50, newCards: 62, durationMs: 8000 }]
  const card = oldCards[0]!
  backup.reviews = [{ eventId: 'existing-event', cardId: card.id, moduleId: card.moduleId, sectionId: card.sectionId, capsuleId: card.capsuleId, kind: card.kind, mode: 'opcion-multiple', grade: 3, ts: 1234, durationMs: 55, interval: 1 }]
  await importBackup(backup)
  const before = await exportBackup()
  const progress = new Map(before.progress.map(p => [p.cardId, p]))
  const queue = buildSession(progress, before.settings, capsuleStatuses(progress), { capsuleId: cid })
  assert.equal(queue.length, 7)
  assert.ok(queue.every(i => i.isNew))
  const after = await exportBackup()
  assert.equal(after.version, 5)
  for (const key of ['progress', 'reviews', 'daily', 'settings'] as const) assert.deepEqual(after[key], before[key])
  await resetAll()
})


function ReadySession({ freePractice = false }: { freePractice?: boolean }) {
  const { ready } = useStore()
  return ready ? <SessionScreen capsuleId={cid} freePractice={freePractice} onExit={() => {}} /> : null
}

test('completar cápsula 9 conserva progreso previo; repetir con fallos y refuerzo no persiste nada', async () => {
  await resetAll()
  const backup = await exportBackup()
  backup.progress = [...previousProgress().values()]
  await importBackup(backup)
  const user = userEvent.setup()
  const normal = render(<StoreProvider><ReadySession /></StoreProvider>)
  for (let i = 0; i < questions.length; i++) {
    await user.click(await screen.findByRole('button', { name: resolved(questions[i]!.sourceId).answer }))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await waitFor(() => assert.equal(screen.queryByRole('button', { name: 'Continuar' }), null))
  }
  await screen.findByText('¡Excelente!')
  const before = await exportBackup()
  assert.equal(before.reviews.length, 7)
  const progress = new Map(before.progress.map(p => [p.cardId, p]))
  assert.equal(capsuleStatuses(progress).find(s => s.capsule.id === cid)!.completed, true)
  for (const p of backup.progress) assert.deepEqual(progress.get(p.cardId), p)
  normal.unmount()
  const repeat = render(<StoreProvider><ReadySession freePractice /></StoreProvider>)
  // Cuatro falladas: solo las tres primeras vuelven; ni esas respuestas se guardan.
  for (let i = 0; i < 10; i++) {
    const q = questions[i < 7 ? i : i - 7]!
    const r = resolved(q.sourceId)
    await user.click(await screen.findByRole('button', { name: i < 4 || i >= 7 ? r.distractors[0]! : r.answer }))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await waitFor(() => assert.equal(screen.queryByRole('button', { name: 'Continuar' }), null))
    if (i === 6) assert.ok(screen.getByText('Refuerzo 1/3'))
  }
  await screen.findByText(/Repaso terminado/)
  const after = await exportBackup()
  for (const key of ['progress', 'reviews', 'daily', 'settings'] as const) assert.deepEqual(after[key], before[key])
  repeat.unmount()
  await resetAll()
}, 15000)
