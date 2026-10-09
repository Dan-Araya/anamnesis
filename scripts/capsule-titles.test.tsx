import { strict as assert } from 'node:assert'
import { test } from 'vitest'
import { render } from '@testing-library/react'
import type { Capsule } from '../src/types'
import CapsuleGreekLine from '../src/components/CapsuleGreekLine'
import { path } from '../src/content'

test('muestra el resumen griego derivado de las letras de la cápsula', () => {
  const { container } = render(<CapsuleGreekLine capsule={path[2]!.capsule} />)
  assert.equal(container.textContent, 'Η · Θ · Ι')
})

test('una cápsula sin letras no pinta ningún subtítulo', () => {
  const sinLetras: Capsule = { ...path[0]!.capsule, letters: [] }
  const { container } = render(<CapsuleGreekLine capsule={sinLetras} />)
  assert.equal(container.textContent, '')
})
