/**
 * Revisa los módulos antes de publicar: ids repetidos, campos vacíos y celdas
 * de paradigma que no casan con los ejes declarados.
 *
 *   npm run check-content
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Capsule, ModuleContent, Paradigm } from '../src/types'

const DIR = join(process.cwd(), 'src/content/modules')

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

const files = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort()
const moduleNumbers = new Map<number, string>()
let sectionCount = 0
let capsuleCount = 0

for (const file of files) {
  let module: ModuleContent
  try {
    module = JSON.parse(readFileSync(join(DIR, file), 'utf8')) as ModuleContent
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

  for (const section of module.sections) {
    sectionCount++
    uniqueId(section.id, `${file} · sección ${section.number}`)

    if (!Array.isArray(section.capsules) || section.capsules.length === 0) {
      errors.push(`${file} · sección ${section.number}: no tiene cápsulas`)
      continue
    }

    checkNumbering(section.capsules, 'cápsula', `${file} · sección ${section.number}`)

    for (const capsule of section.capsules) {
      capsuleCount++
      const where = `${file} · sección ${section.number} · cápsula ${capsule.number}`
      uniqueId(capsule.id, where)
      checkCapsule(capsule, where)
    }
  }
}

for (const w of warnings) console.warn(`aviso  ${w}`)
for (const e of errors) console.error(`error  ${e}`)

console.log(
  `\n${files.length} módulos · ${sectionCount} secciones · ${capsuleCount} cápsulas · ` +
    `${seenIds.size} ítems · ${errors.length} errores · ${warnings.length} avisos`,
)

process.exit(errors.length > 0 ? 1 : 0)
