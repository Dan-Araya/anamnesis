import type {
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

export const modules: ModuleContent[] = Object.values(files)
  .map((m) => m.default)
  .sort((a, b) => a.number - b.number)
  .map((m) => ({ ...m, sections: [...m.sections].sort((a, b) => a.number - b.number) }))

/** Una sección junto al módulo al que pertenece. */
export interface PathNode {
  section: Section
  module: ModuleContent
}

/**
 * Las secciones de todos los módulos, en el orden en que se recorren.
 * Es la espina dorsal del camino: el desbloqueo avanza por esta lista.
 */
export const path: PathNode[] = modules.flatMap((module) =>
  module.sections.map((section) => ({ section, module })),
)

const moduleById = new Map(modules.map((m) => [m.id, m]))
const nodeBySectionId = new Map(path.map((node) => [node.section.id, node]))

export function getModule(id: string): ModuleContent | undefined {
  return moduleById.get(id)
}

export function getNode(sectionId: string): PathNode | undefined {
  return nodeBySectionId.get(sectionId)
}

/** ¿Tiene la sección algo que practicar? */
export function isEmpty(s: Section): boolean {
  return s.vocabulary.length === 0 && s.paradigms.length === 0 && s.sentences.length === 0
}

/** Nombre visible de una sección: su título si lo tiene, si no su número. */
export function sectionLabel(s: Section): string {
  return s.title ?? `Sección ${s.number}`
}

/** Nombre visible de un módulo. */
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

function cardsForSection(section: Section, moduleId: string): Card[] {
  const cards: Card[] = []
  const base = { moduleId, sectionId: section.id }

  for (const v of section.vocabulary) {
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

  for (const p of section.paradigms) {
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

  for (const s of section.sentences) {
    cards.push({ ...base, id: `s:${s.id}`, kind: 'traduccion', sourceId: s.id })
  }

  return cards
}

export const cardsBySection = new Map<string, Card[]>(
  path.map(({ section, module }) => [section.id, cardsForSection(section, module.id)]),
)

/** Todas las tarjetas del contenido, en orden del camino. */
export const allCards: Card[] = path.flatMap(
  ({ section }) => cardsBySection.get(section.id) ?? [],
)

// ---------------------------------------------------------------------------
// Acceso al ítem de origen de una tarjeta
// ---------------------------------------------------------------------------

const vocabById = new Map<string, VocabEntry>()
const paradigmById = new Map<string, Paradigm>()
const sentenceById = new Map<string, Sentence>()

for (const { section } of path) {
  for (const v of section.vocabulary) vocabById.set(v.id, v)
  for (const p of section.paradigms) paradigmById.set(p.id, p)
  for (const s of section.sentences) sentenceById.set(s.id, s)
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

/** Vocabulario de todo el contenido, para generar distractores. */
export const allVocab: VocabEntry[] = path.flatMap(({ section }) => section.vocabulary)
