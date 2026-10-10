/**
 * Revisa los módulos antes de publicar: ids repetidos, campos vacíos, celdas
 * de paradigma que no casan con los ejes declarados y alternativas de
 * reconocimiento suficientes, calculadas con las mismas reglas que el runtime.
 *
 *   npm run check-content
 *
 * La lógica vive en `validateModules` para poder probarla desde Vitest; al
 * ejecutarse como script (npm run check-content) valida src/content/modules.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Capsule, ModuleContent, Paradigm, Letter, VocabEntry } from '../src/types'
import { resolveQuestion } from '../src/lib/consolidation'
import { vocabDistractorLabels, type VocabLike } from '../src/lib/distractors'

export interface ValidationResult {
  errors: string[]
  warnings: string[]
  /** Resumen legible: módulos, secciones, cápsulas, ítems. */
  summary: string
}

export function validateModules(dir: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const seenIds = new Set<string>()

  function uniqueId(id: string, where: string) {
    if (!id) {
      errors.push(`${where}: falta el id`)
      return
    }
    if (seenIds.has(id)) errors.push(`${where}: id duplicado «${id}»`)
    seenIds.add(id)
  }

  /** Todas las combinaciones de valores de los ejes. */
  function validKeys(axes: Paradigm['axes']): Set<string> {
    let combos = ['']
    for (const axis of axes) {
      combos = combos.flatMap((prefix) =>
        axis.values.map((v) => (prefix ? `${prefix}|${v.id}` : v.id)),
      )
    }
    return new Set(combos)
  }

  function checkCapsule(capsule: Capsule, where: string) {
    for (const q of capsule.consolidation ?? []) {
      uniqueId(q.id, `${where} · consolidación`)
      try {
        const resolved = resolveQuestion(q, presentedLetters, previousVocab)
        const options = [resolved.answer, ...resolved.distractors]
        if (options.length !== 4 || options.some(o => !o.trim()) || new Set(options).size !== 4) {
          errors.push(`${where}: «${q.id}» necesita una respuesta y tres alternativas distintas no vacías`)
        }
      } catch (e) { errors.push(`${where}: ${(e as Error).message}`) }
    }
    for (const l of capsule.letters ?? []) {
      uniqueId(l.id, `${where} · letras`)
      if (!l.uppercase) errors.push(`${where}: la letra «${l.id}» no tiene mayúscula`)
      if (!l.lowercase) errors.push(`${where}: la letra «${l.id}» no tiene minúscula`)
      if (!l.name) errors.push(`${where}: la letra «${l.id}» no tiene nombre`)
      if (!l.phonetic) errors.push(`${where}: la letra «${l.id}» no tiene valor fonético`)
      if (!l.transliteration) {
        errors.push(`${where}: la letra «${l.id}» no tiene transliteración`)
      }
      if (!l.pronunciation) {
        errors.push(`${where}: la letra «${l.id}» no tiene explicación de pronunciación`)
      }
      for (const field of ['uppercase', 'lowercase'] as const) {
        const value = l[field]
        if (value && value !== value.normalize('NFC')) {
          warnings.push(`${where}: la letra «${l.id}» (${field}) no está en forma Unicode NFC`)
        }
      }
      // La forma final es metadata de presentación, opcional y nunca una
      // letra propia: si existe, debe tener contenido y estar en NFC.
      if (l.finalForm !== undefined) {
        if (!l.finalForm.trim()) {
          errors.push(`${where}: la letra «${l.id}» declara una forma final vacía`)
        } else if (l.finalForm !== l.finalForm.normalize('NFC')) {
          warnings.push(`${where}: la letra «${l.id}» (finalForm) no está en forma Unicode NFC`)
        }
      }
    }

    for (const v of capsule.vocabulary ?? []) {
      uniqueId(v.id, `${where} · vocabulario`)
      if (!v.greek) errors.push(`${where}: «${v.id}» sin forma griega`)
      if (!v.es?.length) errors.push(`${where}: «${v.id}» sin traducción`)
      if (v.greek && v.greek !== v.greek.normalize('NFC')) {
        warnings.push(`${where}: «${v.id}» no está en forma Unicode NFC`)
      }
      if (v.cards && v.cards.length === 0) {
        warnings.push(`${where}: «${v.id}» tiene «cards» vacío y no generará tarjetas`)
      }
      if (v.recognitionLabel !== undefined && !v.recognitionLabel.trim()) {
        errors.push(`${where}: «${v.id}» declara una recognitionLabel vacía`)
      }
      if (v.distractors !== undefined) {
        if (!Array.isArray(v.distractors) || v.distractors.length === 0) {
          errors.push(`${where}: «${v.id}» declara «distractors» vacío`)
        } else {
          const label = v.recognitionLabel ?? v.es[0] ?? ''
          const seen = new Set<string>()
          for (const d of v.distractors) {
            if (!d || !d.trim()) {
              errors.push(`${where}: «${v.id}» tiene un distractor vacío`)
              continue
            }
            if (d === label) {
              errors.push(`${where}: el distractor «${d}» de «${v.id}» repite la respuesta correcta`)
            }
            if (seen.has(d)) {
              errors.push(`${where}: «${v.id}» repite el distractor «${d}»`)
            }
            seen.add(d)
          }
        }
      }
      // La tarjeta de transliterar necesita la respuesta correcta y tres
      // distractores válidos; sin eso, la pregunta de opción múltiple no
      // tendría alternativas suficientes.
      if (v.cards?.includes('transliterar')) {
        if (!v.transliteration || !v.transliteration.trim()) {
          errors.push(`${where}: «${v.id}» declara «transliterar» sin «transliteration»`)
        } else if (v.transliteration !== v.transliteration.normalize('NFC')) {
          warnings.push(`${where}: la transliteración de «${v.id}» no está en forma Unicode NFC`)
        }
        const ds = v.transliterationDistractors
        if (!Array.isArray(ds)) {
          errors.push(
            `${where}: «${v.id}» declara «transliterar» sin «transliterationDistractors»`,
          )
        } else if (ds.length !== 3) {
          errors.push(
            `${where}: «${v.id}» necesita exactamente 3 distractores de transliteración, tiene ${ds.length}`,
          )
        } else {
          const seen = new Set<string>()
          for (const d of ds) {
            if (!d || !d.trim()) {
              errors.push(`${where}: «${v.id}» tiene un distractor de transliteración vacío`)
              continue
            }
            if (d === v.transliteration) {
              errors.push(
                `${where}: el distractor de transliteración «${d}» de «${v.id}» repite la respuesta correcta`,
              )
            }
            if (seen.has(d)) {
              errors.push(`${where}: «${v.id}» repite el distractor de transliteración «${d}»`)
            }
            seen.add(d)
          }
        }
      }
    }

    for (const p of capsule.paradigms ?? []) {
      uniqueId(p.id, `${where} · paradigmas`)
      if (!p.axes?.length) {
        errors.push(`${where}: el paradigma «${p.id}» no declara ejes`)
        continue
      }
      const valid = validKeys(p.axes)
      for (const key of Object.keys(p.cells ?? {})) {
        if (!valid.has(key)) {
          errors.push(`${where}: «${p.id}» tiene la celda «${key}», que no casa con los ejes`)
        }
      }
      const missing = [...valid].filter((k) => !(k in (p.cells ?? {})))
      if (missing.length) {
        warnings.push(
          `${where}: «${p.id}» deja ${missing.length} celdas sin rellenar (${missing
            .slice(0, 4)
            .join(', ')}${missing.length > 4 ? '…' : ''})`,
        )
      }
    }

    for (const s of capsule.sentences ?? []) {
      uniqueId(s.id, `${where} · frases`)
      if (!s.greek) errors.push(`${where}: la frase «${s.id}» no tiene griego`)
      if (!s.es?.length) errors.push(`${where}: la frase «${s.id}» no tiene traducción`)
    }

    for (const g of capsule.grammar ?? []) uniqueId(g.id, `${where} · gramática`)

    for (const d of capsule.drills ?? []) {
      uniqueId(d.id, `${where} · drills`)
      if (!d.axes?.length) {
        errors.push(`${where}: el drill «${d.id}» no declara ejes`)
        continue
      }
      const valid = validKeys(d.axes)
      for (const key of Object.keys(d.cells ?? {})) {
        if (!valid.has(key)) {
          errors.push(`${where}: «${d.id}» tiene la celda «${key}», que no casa con los ejes`)
        }
      }
      // A diferencia de un paradigma normal, un drill se practica entero: si le
      // falta una celda, el ejercicio de huecos puede tocar tapar algo que no
      // tiene respuesta.
      const missing = [...valid].filter((k) => !(k in (d.cells ?? {})))
      if (missing.length) {
        errors.push(
          `${where}: el drill «${d.id}» debe llegar completo, le faltan ${missing.length} celdas (${missing
            .slice(0, 4)
            .join(', ')}${missing.length > 4 ? '…' : ''})`,
        )
      }
    }
  }

  /**
   * El reconocimiento de opción múltiple necesita al menos tres alternativas
   * válidas. Las calcula `vocabDistractorLabels`, la misma función del
   * runtime: respuesta correcta excluida, etiquetas vacías y repetidas
   * excluidas, distractores editoriales primero y solo vocabulario de la
   * propia cápsula o de las anteriores, considerando su recognitionLabel.
   */
  function checkDistractors(capsule: Capsule, where: string) {
    const scope: VocabLike[] = [
      ...presentedVocab,
      ...(capsule.vocabulary ?? []),
    ]
    for (const v of capsule.vocabulary ?? []) {
      if (v.cards && !v.cards.includes('reconocer')) continue
      const labels = vocabDistractorLabels(v, scope)
      if (labels.length < 3) {
        errors.push(
          `${where}: «${v.id}» no reúne 3 alternativas válidas de reconocer — ` +
            `añade distractores editoriales o vocabulario anterior con etiquetas distintas`,
        )
      }
    }
  }

  /** Comprueba que una lista numerada no repita números. */
  function checkNumbering(
    items: { id: string; number: number }[],
    what: string,
    where: string,
  ) {
    const seen = new Map<number, string>()
    for (const item of items) {
      if (typeof item.number !== 'number') {
        errors.push(`${where} · ${what} «${item.id}»: falta «number»`)
        continue
      }
      if (seen.has(item.number)) {
        errors.push(`${where}: dos ${what}s con el número ${item.number}`)
      }
      seen.set(item.number, item.id)
    }
  }

  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
  const moduleNumbers = new Map<number, string>()
  let sectionCount = 0
  let capsuleCount = 0
  /** Vocabulario ya presentado, en orden del camino: limita los distractores. */
  const presentedVocab: VocabLike[] = []
  const previousVocab: VocabEntry[] = []
  const presentedLetters: Letter[] = []

  for (const file of files) {
    let module: ModuleContent
    try {
      module = JSON.parse(readFileSync(join(dir, file), 'utf8')) as ModuleContent
    } catch (e) {
      errors.push(`${file}: JSON inválido — ${(e as Error).message}`)
      continue
    }

    if (!module.id) errors.push(`${file}: falta «id»`)
    if (typeof module.number !== 'number') errors.push(`${file}: falta «number»`)

    const previous = moduleNumbers.get(module.number)
    if (previous) errors.push(`${file}: el número ${module.number} ya lo usa ${previous}`)
    moduleNumbers.set(module.number, file)

    if (!Array.isArray(module.sections) || module.sections.length === 0) {
      errors.push(`${file}: el módulo no tiene secciones`)
      continue
    }

    checkNumbering(module.sections, 'sección', file)

    for (const section of [...module.sections].sort((a, b) => a.number - b.number)) {
      sectionCount++
      uniqueId(section.id, `${file} · sección ${section.number}`)

      if (!Array.isArray(section.capsules) || section.capsules.length === 0) {
        errors.push(`${file} · sección ${section.number}: no tiene cápsulas`)
        continue
      }

      checkNumbering(section.capsules, 'cápsula', `${file} · sección ${section.number}`)

      for (const capsule of [...section.capsules].sort((a, b) => a.number - b.number)) {
        capsuleCount++
        const where = `${file} · sección ${section.number} · cápsula ${capsule.number}`
        uniqueId(capsule.id, where)
        checkCapsule(capsule, where)
        checkDistractors(capsule, where)
        for (const v of capsule.vocabulary ?? []) { presentedVocab.push(v); previousVocab.push(v) }
        presentedLetters.push(...(capsule.letters ?? []))
      }
    }
  }

  return {
    errors,
    warnings,
    summary:
      `${files.length} módulos · ${sectionCount} secciones · ${capsuleCount} cápsulas · ` +
      `${seenIds.size} ítems · ${errors.length} errores · ${warnings.length} avisos`,
  }
}

/** Al ejecutarse como script valida el contenido real y sale con su veredicto. */
const isMain = Boolean(process.argv[1]?.endsWith('check-content.ts'))

if (isMain) {
  const { errors, warnings, summary } = validateModules(
    join(process.cwd(), 'src/content/modules'),
  )

  for (const w of warnings) console.warn(`aviso  ${w}`)
  for (const e of errors) console.error(`error  ${e}`)

  console.log(`\n${summary}`)

  process.exit(errors.length > 0 ? 1 : 0)
}
