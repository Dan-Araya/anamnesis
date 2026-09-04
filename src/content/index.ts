import type {
  Capsule,
  Card,
  ModuleContent,
  Paradigm,
  Section,
  Sentence,
  VocabEntry,
} from '@/types'

/**
 * Carga todos los módulos de `./modules/*.json` en tiempo de build.
 * Añadir un módulo es dejar caer un JSON nuevo en esa carpeta: no hay que
 * registrarlo en ningún sitio.
 */
const files = import.meta.glob<{ default: ModuleContent }>('./modules/*.json', {
  eager: true,
})

const byNumber = <T extends { number: number }>(items: T[]): T[] =>
  [...items].sort((a, b) => a.number - b.number)

export const modules: ModuleContent[] = byNumber(
  Object.values(files).map((m) => m.default),
).map((m) => ({
  ...m,
  sections: byNumber(m.sections).map((s) => ({ ...s, capsules: byNumber(s.capsules) })),
}))

/** Una cápsula junto al lugar que ocupa en la jerarquía. */
export interface PathNode {
  capsule: Capsule
  section: Section
  module: ModuleContent
}

/**
 * Las cápsulas de todo el contenido, en el orden en que se recorren.
 * Es la espina dorsal del camino: el desbloqueo avanza por esta lista.
 */
export const path: PathNode[] = modules.flatMap((module) =>
  module.sections.flatMap((section) =>
    section.capsules.map((capsule) => ({ capsule, section, module })),
  ),
)

const moduleById = new Map(modules.map((m) => [m.id, m]))
const nodeByCapsuleId = new Map(path.map((node) => [node.capsule.id, node]))

export function getModule(id: string): ModuleContent | undefined {
  return moduleById.get(id)
}

export function getNode(capsuleId: string): PathNode | undefined {
  return nodeByCapsuleId.get(capsuleId)
}

/** ¿Tiene la cápsula algo que practicar? */
export function isEmpty(c: Capsule): boolean {
  return (
    c.vocabulary.length === 0 &&
    c.paradigms.length === 0 &&
    c.sentences.length === 0 &&
    c.drills.length === 0
  )
}

export function capsuleLabel(c: Capsule): string {
  return c.title ?? `Cápsula ${c.number}`
}

export function sectionLabel(s: Section): string {
  return s.title ?? `Sección ${s.number}`
}

export function moduleLabel(m: ModuleContent): string {
  return m.title ?? `Módulo ${m.number}`
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

function cardsForCapsule(node: PathNode): Card[] {
  const cards: Card[] = []
  const base = {
    moduleId: node.module.id,
    sectionId: node.section.id,
    capsuleId: node.capsule.id,
  }

  for (const v of node.capsule.vocabulary) {
    // Por defecto una palabra se practica en las dos direcciones; las
    // expresiones suelen declarar solo "reconocer".
    const directions = v.cards ?? ['reconocer', 'producir']
    if (directions.includes('reconocer')) {
      cards.push({ ...base, id: `v:${v.id}:rec`, kind: 'vocab-reconocer', sourceId: v.id })
    }
    if (directions.includes('producir')) {
      cards.push({ ...base, id: `v:${v.id}:pro`, kind: 'vocab-producir', sourceId: v.id })
    }
  }

  for (const p of node.capsule.paradigms) {
    for (const key of cellKeys(p)) {
      cards.push({
        ...base,
        id: `p:${p.id}:${key}`,
        kind: 'morfologia',
        sourceId: p.id,
        cellKey: key,
      })
    }
  }

  for (const s of node.capsule.sentences) {
    cards.push({ ...base, id: `s:${s.id}`, kind: 'traduccion', sourceId: s.id })
  }

  for (const d of node.capsule.drills) {
    cards.push({ ...base, id: `d:${d.id}`, kind: 'tabla', sourceId: d.id })
  }

  return cards
}

export const cardsByCapsule = new Map<string, Card[]>(
  path.map((node) => [node.capsule.id, cardsForCapsule(node)]),
)

/** Todas las tarjetas del contenido, en orden del camino. */
export const allCards: Card[] = path.flatMap(
  ({ capsule }) => cardsByCapsule.get(capsule.id) ?? [],
)

// ---------------------------------------------------------------------------
// Acceso al ítem de origen de una tarjeta
// ---------------------------------------------------------------------------

const vocabById = new Map<string, VocabEntry>()
const paradigmById = new Map<string, Paradigm>()
const sentenceById = new Map<string, Sentence>()
const drillById = new Map<string, Paradigm>()

for (const { capsule } of path) {
  for (const v of capsule.vocabulary) vocabById.set(v.id, v)
  for (const p of capsule.paradigms) paradigmById.set(p.id, p)
  for (const s of capsule.sentences) sentenceById.set(s.id, s)
  for (const d of capsule.drills) drillById.set(d.id, d)
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

/** Tabla completa de un ejercicio de huecos (ver `Capsule.drills`). */
export function getDrill(id: string): Paradigm | undefined {
  return drillById.get(id)
}

/** Vocabulario de todo el contenido, para generar distractores. */
export const allVocab: VocabEntry[] = path.flatMap(({ capsule }) => capsule.vocabulary)
