import { strict as assert } from 'node:assert'
import { test } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { validateModules } from './check-content'

/**
 * La validación de distractores de `check-content` se comporta como el
 * runtime: mismas reglas, mismas etiquetas visibles.
 */

function modulo(vocabulary: Record<string, unknown>[]): Record<string, unknown> {
  return {
    id: 'module-01',
    number: 1,
    sections: [
      {
        id: 's1',
        number: 1,
        capsules: [
          {
            id: 'c1',
            number: 1,
            letters: [],
            vocabulary,
            paradigms: [],
            sentences: [],
            grammar: [],
            drills: [],
          },
        ],
      },
    ],
  }
}

function validar(vocabulary: Record<string, unknown>[]): string[] {
  const dir = mkdtempSync(join(tmpdir(), 'anamnesis-content-'))
  try {
    writeFileSync(join(dir, 'module-01.json'), JSON.stringify(modulo(vocabulary)))
    return validateModules(dir).errors
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('rechaza entradas que comparten la misma etiqueta visible', () => {
  // Cuatro entradas cuyas primeras traducciones coinciden: al excluirse
  // etiquetas duplicadas no queda ninguna alternativa válida.
  const errors = validar(
    ['a', 'b', 'c', 'd'].map((id) => ({ id, greek: id, es: ['sí'] })),
  )
  const fallos = errors.filter((e) => e.includes('no reúne 3 alternativas'))
  assert.equal(fallos.length, 4, errors.join('\n'))
})

test('acepta cuando los distractores editoriales reúnen tres etiquetas válidas', () => {
  const errors = validar([
    {
      id: 'de',
      greek: 'δέ',
      es: ['y'],
      recognitionLabel: 'y / pero / por otra parte',
      distractors: ['sí', 'no', 'aquí'],
    },
  ])
  assert.equal(errors.length, 0, errors.join('\n'))
})

test('considera la recognitionLabel de las otras entradas', () => {
  // Sin recognitionLabel, todas compartirían «mismo» y no habría opciones;
  // con ella, cada entrada aporta una etiqueta distinta.
  const errors = validar([
    { id: 'a', greek: 'a', es: ['mismo'] },
    { id: 'b', greek: 'b', es: ['mismo'], recognitionLabel: 'etiqueta b' },
    { id: 'c', greek: 'c', es: ['mismo'], recognitionLabel: 'etiqueta c' },
    { id: 'd', greek: 'd', es: ['mismo'], recognitionLabel: 'etiqueta d' },
  ])
  assert.equal(errors.length, 0, errors.join('\n'))
})

test('rechaza una entrada con distractores editoriales repetidos o vacíos', () => {
  const errors = validar([
    {
      id: 'a',
      greek: 'a',
      es: ['primero'],
      distractors: ['sí', 'sí', '  ', 'primero'],
    },
  ])
  // Los errores de forma (duplicados, vacíos, repetición de la correcta) se
  // detectan aparte de la suficiencia.
  assert.ok(errors.some((e) => e.includes('repite el distractor')))
  assert.ok(errors.some((e) => e.includes('distractor vacío')))
  assert.ok(errors.some((e) => e.includes('repite la respuesta correcta')))
  assert.ok(errors.some((e) => e.includes('no reúne 3 alternativas')))
})

test('acepta una transliteración completa con tres distractores válidos', () => {
  const errors = validar([
    {
      id: 'a',
      greek: 'a',
      es: ['x'],
      cards: ['transliterar'],
      transliteration: 'ab',
      transliterationDistractors: ['ba', 'bb', 'bc'],
    },
  ])
  assert.equal(errors.length, 0, errors.join('\n'))
})

test('rechaza «transliterar» sin transliteration o sin distractores', () => {
  const errors = validar([
    { id: 'a', greek: 'a', es: ['x'], cards: ['transliterar'] },
  ])
  assert.ok(errors.some((e) => e.includes('sin «transliteration»')))
  assert.ok(errors.some((e) => e.includes('sin «transliterationDistractors»')))
})

test('rechaza una transliteración sin exactamente tres distractores', () => {
  const dos = validar([
    {
      id: 'a',
      greek: 'a',
      es: ['x'],
      cards: ['transliterar'],
      transliteration: 'ab',
      transliterationDistractors: ['ba', 'bb'],
    },
  ])
  assert.ok(dos.some((e) => e.includes('exactamente 3')))

  const cuatro = validar([
    {
      id: 'a',
      greek: 'a',
      es: ['x'],
      cards: ['transliterar'],
      transliteration: 'ab',
      transliterationDistractors: ['ba', 'bb', 'bc', 'bd'],
    },
  ])
  assert.ok(cuatro.some((e) => e.includes('exactamente 3')))
})

test('rechaza distractores de transliteración vacíos, repetidos o iguales a la respuesta', () => {
  const errors = validar([
    {
      id: 'a',
      greek: 'a',
      es: ['x'],
      cards: ['transliterar'],
      transliteration: 'ab',
      transliterationDistractors: ['ab', 'ba', '  '],
    },
  ])
  assert.ok(errors.some((e) => e.includes('repite la respuesta correcta')))
  assert.ok(errors.some((e) => e.includes('distractor de transliteración vacío')))

  const repetidos = validar([
    {
      id: 'a',
      greek: 'a',
      es: ['x'],
      cards: ['transliterar'],
      transliteration: 'ab',
      transliterationDistractors: ['ba', 'ba', 'bb'],
    },
  ])
  assert.ok(repetidos.some((e) => e.includes('repite el distractor de transliteración')))
})

test('rechaza letras sin transliteración', () => {
  const dir = mkdtempSync(join(tmpdir(), 'anamnesis-content-'))
  try {
    writeFileSync(
      join(dir, 'module-01.json'),
      JSON.stringify({
        id: 'module-01',
        number: 1,
        sections: [
          {
            id: 's1',
            number: 1,
            capsules: [
              {
                id: 'c1',
                number: 1,
                letters: [
                  {
                    id: 'alpha',
                    uppercase: 'Α',
                    lowercase: 'α',
                    name: 'alfa',
                    phonetic: '/a/',
                    pronunciation: 'Suena /a/.',
                  },
                ],
                vocabulary: [],
                paradigms: [],
                sentences: [],
                grammar: [],
                drills: [],
              },
            ],
          },
        ],
      }),
    )
    const errors = validateModules(dir).errors
    assert.ok(errors.some((e) => e.includes('no tiene transliteración')))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('valida la forma final: opcional, no vacía y Unicode NFC cuando existe', () => {
  const dir = mkdtempSync(join(tmpdir(), 'anamnesis-content-'))
  try {
    const letra = (id: string, finalForm: unknown) => ({
      id,
      uppercase: 'Σ',
      lowercase: 'σ',
      name: 'sigma',
      phonetic: '/s/',
      transliteration: 's',
      pronunciation: 'Suena /s/.',
      finalForm,
    })
    writeFileSync(
      join(dir, 'module-01.json'),
      JSON.stringify({
        id: 'module-01',
        number: 1,
        sections: [
          {
            id: 's1',
            number: 1,
            capsules: [
              {
                id: 'c1',
                number: 1,
                // Sin finalForm: opcional, no da error. Vacía o solo
                // espacios: error. Sin NFC (α + acento combinante): aviso.
                // «ς»: válida.
                letters: [
                  letra('sigma-a', undefined),
                  letra('sigma-b', ''),
                  letra('sigma-e', '   '),
                  letra('sigma-c', 'α\u0301'),
                  letra('sigma-d', 'ς'),
                ],
                vocabulary: [],
                paradigms: [],
                sentences: [],
                grammar: [],
                drills: [],
              },
            ],
          },
        ],
      }),
    )
    const { errors, warnings } = validateModules(dir)
    // Tanto la forma final vacía como la de solo espacios se rechazan.
    assert.ok(
      errors.some((e) => e.includes('sigma-b') && e.includes('forma final vacía')),
      errors.join('\n'),
    )
    assert.ok(
      errors.some((e) => e.includes('sigma-e') && e.includes('forma final vacía')),
      errors.join('\n'),
    )
    assert.ok(
      warnings.some((w) => w.includes('finalForm') && w.includes('NFC')),
      warnings.join('\n'),
    )
    // Ni la letra sin finalForm ni la válida levantan errores propios.
    assert.ok(!errors.some((e) => e.includes('sigma-a')))
    assert.ok(!errors.some((e) => e.includes('sigma-d')))
    assert.ok(!warnings.some((w) => w.includes('sigma-d')))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
