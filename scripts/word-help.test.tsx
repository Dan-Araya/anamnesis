import { strict as assert } from 'node:assert'
import { test } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { allCards, getVocab } from '../src/content'
import { newProgress } from '../src/lib/srs'
import MultipleChoice from '../src/components/exercises/MultipleChoice'

test('reconocimiento revela el significado y no una transliteración ni una respuesta registrada', async () => {
  const user = userEvent.setup()
  const card = allCards.find(c => c.id === 'v:onoma:rec')!
  const vocab = getVocab(card.sourceId)!
  let grade = 0
  render(<MultipleChoice item={{ card, progress: newProgress(card), mode: 'opcion-multiple', isNew: true }} onGraded={() => { grade++ }} />)
  assert.equal(document.querySelectorAll('.options .greek-word-help').length, 0)
  await user.click(screen.getByRole('button', { name: 'Ayuda para ὄνομα' }))
  const content = screen.getByRole('dialog').textContent!
  assert.ok(content.includes(`Significa: ${vocab.recognitionLabel ?? vocab.es[0]}`))
  assert.ok(!content.includes('Se escribe:'))
  assert.equal(screen.queryByRole('button', { name: 'Continuar' }), null)
  await user.click(screen.getByRole('button', { name: 'Cerrar ayuda' }))
  assert.equal(grade, 0)
})
