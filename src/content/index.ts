import type { Card, ModuleContent, Paradigm, Sentence, VocabEntry } from '@/types'

/**
 * Carga todos los módulos de `./modules/*.json` en tiempo de build.
 * Añadir un módulo es dejar caer un JSON nuevo en esa carpeta: no hay que
 * registrarlo en ningún sitio.
 */
const files = import.meta.glob<{ default: ModuleContent }>('./modules/*.json', {
  eager: true,
})

export const modules: ModuleContent[] = Object.values(files)
  .map((m) => m.default)
  .sort((a, b) => a.number - b.number)

const moduleById = new Map(modules.map((m) => [m.id, m]))

export function getModule(id: string): ModuleContent | undefined {
  return moduleById.get(id)
}

/** ¿Tiene el módulo algo que practicar? */
export function isEmpty(m: ModuleContent): boolean {
  return m.vocabulary.length === 0 && m.paradigms.length === 0 && m.sentences.length === 0
}

// ---------------------------------------------------------------------------
// Derivación de tarjetas
// ---------------------------------------------------------------------------

/** Claves de celda de un paradigma, en orden de lectura de la tabla. */
export function cellKeys(p: Paradigm): string[] {
  const combine = (axisIndex: number): string[] => {
    const axis = p.axes[axisIndex]
    if (!axis) return ['']
    const rest = combine(axisIndex + 1)
    return axis.values.flatMap((v) =>
      rest.map((suffix) => (suffix ? `${v.id}|${suffix}` : v.id)),
    )
  }
  return combine(0).filter((key) => key in p.cells)
}

/** Formas aceptadas de una celda. */
export function cellForms(p: Paradigm, key: string): string[] {
  const value = p.cells[key]
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

/** Etiqueta legible de una celda: "Plural · Genitivo". */
export function cellLabel(p: Paradigm, key: string): string {
  const parts = key.split('|')
  return p.axes
    .map((axis, i) => axis.values.find((v) => v.id === parts[i])?.label ?? parts[i])
    .join(' · ')
}

function cardsForModule(m: ModuleContent): Card[] {
  const cards: Card[] = []

  for (const v of m.vocabulary) {
    cards.push({ id: `v:${v.id}:rec`, moduleId: m.id, kind: 'vocab-reconocer', sourceId: v.id })
    cards.push({ id: `v:${v.id}:pro`, moduleId: m.id, kind: 'vocab-producir', sourceId: v.id })
  }

  for (const p of m.paradigms) {
    for (const key of cellKeys(p)) {
      cards.push({
        id: `p:${p.id}:${key}`,
        moduleId: m.id,
        kind: 'morfologia',
        sourceId: p.id,
        cellKey: key,
      })
    }
  }

  for (const s of m.sentences) {
    cards.push({ id: `s:${s.id}`, moduleId: m.id, kind: 'traduccion', sourceId: s.id })
  }

  return cards
}

/** Todas las tarjetas derivadas del contenido, en orden de módulo. */
export const allCards: Card[] = modules.flatMap(cardsForModule)

export const cardsByModule = new Map<string, Card[]>(
  modules.map((m) => [m.id, allCards.filter((c) => c.moduleId === m.id)]),
)

const cardById = new Map(allCards.map((c) => [c.id, c]))

export function getCard(id: string): Card | undefined {
  return cardById.get(id)
}

// ---------------------------------------------------------------------------
// Acceso al ítem de origen de una tarjeta
// ---------------------------------------------------------------------------

const vocabById = new Map<string, VocabEntry>()
const paradigmById = new Map<string, Paradigm>()
const sentenceById = new Map<string, Sentence>()

for (const m of modules) {
  for (const v of m.vocabulary) vocabById.set(v.id, v)
  for (const p of m.paradigms) paradigmById.set(p.id, p)
  for (const s of m.sentences) sentenceById.set(s.id, s)
}

export function getVocab(id: string): VocabEntry | undefined {
  return vocabById.get(id)
}

export function getParadigm(id: string): Paradigm | undefined {
  return paradigmById.get(id)
}

export function getSentence(id: string): Sentence | undefined {
  return sentenceById.get(id)
}

/** Vocabulario de todos los módulos, para generar distractores. */
export const allVocab: VocabEntry[] = modules.flatMap((m) => m.vocabulary)
