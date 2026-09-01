/**
 * Revisa los módulos antes de publicar: ids repetidos, campos vacíos y celdas
 * de paradigma que no casan con los ejes declarados.
 *
 *   npm run check-content
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { ModuleContent } from '../src/types'

const DIR = join(process.cwd(), 'src/content/modules')

const errors: string[] = []
const warnings: string[] = []
const seenIds = new Set<string>()

function uniqueId(id: string, where: string) {
  if (seenIds.has(id)) errors.push(`${where}: id duplicado «${id}»`)
  seenIds.add(id)
}

/** Todas las combinaciones de valores de los ejes. */
function validKeys(axes: ModuleContent['paradigms'][number]['axes']): Set<string> {
  let combos = ['']
  for (const axis of axes) {
    combos = combos.flatMap((prefix) =>
      axis.values.map((v) => (prefix ? `${prefix}|${v.id}` : v.id)),
    )
  }
  return new Set(combos)
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort()
const numbers = new Map<number, string>()

for (const file of files) {
  const raw = readFileSync(join(DIR, file), 'utf8')
  let module: ModuleContent
  try {
    module = JSON.parse(raw) as ModuleContent
  } catch (e) {
    errors.push(`${file}: JSON inválido — ${(e as Error).message}`)
    continue
  }

  if (!module.id) errors.push(`${file}: falta «id»`)
  if (typeof module.number !== 'number') errors.push(`${file}: falta «number»`)
  if (!module.title) errors.push(`${file}: falta «title»`)

  const previous = numbers.get(module.number)
  if (previous) errors.push(`${file}: el número ${module.number} ya lo usa ${previous}`)
  numbers.set(module.number, file)

  for (const v of module.vocabulary ?? []) {
    uniqueId(v.id, `${file} · vocabulario`)
    if (!v.greek) errors.push(`${file}: «${v.id}» sin forma griega`)
    if (!v.es?.length) errors.push(`${file}: «${v.id}» sin traducción`)
    if (v.greek && v.greek !== v.greek.normalize('NFC')) {
      warnings.push(`${file}: «${v.id}» no está en forma Unicode NFC`)
    }
  }

  for (const p of module.paradigms ?? []) {
    uniqueId(p.id, `${file} · paradigmas`)
    if (!p.axes?.length) {
      errors.push(`${file}: el paradigma «${p.id}» no declara ejes`)
      continue
    }
    const valid = validKeys(p.axes)
    for (const key of Object.keys(p.cells ?? {})) {
      if (!valid.has(key)) {
        errors.push(`${file}: «${p.id}» tiene la celda «${key}», que no casa con los ejes`)
      }
    }
    const missing = [...valid].filter((k) => !(k in (p.cells ?? {})))
    if (missing.length) {
      warnings.push(
        `${file}: «${p.id}» deja ${missing.length} celdas sin rellenar (${missing
          .slice(0, 4)
          .join(', ')}${missing.length > 4 ? '…' : ''})`,
      )
    }
  }

  for (const s of module.sentences ?? []) {
    uniqueId(s.id, `${file} · frases`)
    if (!s.greek) errors.push(`${file}: la frase «${s.id}» no tiene griego`)
    if (!s.es?.length) errors.push(`${file}: la frase «${s.id}» no tiene traducción`)
  }

  for (const g of module.grammar ?? []) uniqueId(g.id, `${file} · gramática`)
}

for (const w of warnings) console.warn(`aviso  ${w}`)
for (const e of errors) console.error(`error  ${e}`)

console.log(
  `\n${files.length} módulos · ${seenIds.size} ítems · ${errors.length} errores · ${warnings.length} avisos`,
)

process.exit(errors.length > 0 ? 1 : 0)
