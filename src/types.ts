/**
 * Modelo de contenido y de progreso.
 *
 * El contenido vive en `src/content/modules/*.json` y se edita a mano. Cada
 * módulo se divide en secciones, y cada sección es un nodo del camino: lo que
 * se practica de una sentada.
 *
 * El progreso vive en IndexedDB y nunca se mezcla con el contenido: si
 * reescribes una sección, las tarjetas conservan su historial mientras el `id`
 * del ítem no cambie.
 */

// ---------------------------------------------------------------------------
// Contenido
// ---------------------------------------------------------------------------

export type PartOfSpeech =
  | 'sustantivo'
  | 'verbo'
  | 'adjetivo'
  | 'adverbio'
  | 'preposicion'
  | 'conjuncion'
  | 'particula'
  | 'pronombre'
  | 'articulo'
  | 'numeral'
  | 'expresion'

/** Qué tarjetas genera una entrada de vocabulario. */
export type VocabDirection = 'reconocer' | 'producir'

/** Una entrada de vocabulario. `greek` es la forma de cita. */
export interface VocabEntry {
  id: string
  greek: string
  /** Complemento de la forma de cita: genitivo y artículo, partes principales, régimen… */
  info?: string
  /** Traducciones aceptadas. La primera es la principal. */
  es: string[]
  pos?: PartOfSpeech
  notes?: string
  tags?: string[]
  /**
   * Direcciones que se practican. Por defecto ambas. Las correlaciones y
   * expresiones largas suelen querer solo `["reconocer"]`: no tiene sentido
   * teclearlas letra a letra.
   */
  cards?: VocabDirection[]
}

/** Un eje de un paradigma (número, caso, persona, tiempo…). */
export interface ParadigmAxis {
  id: string
  label: string
  values: { id: string; label: string }[]
}

/**
 * Tabla de formas. Las claves de `cells` son los ids de valor de cada eje
 * unidos por `|`, en el mismo orden en que aparecen los ejes.
 * Ej. ejes [numero, caso] → clave "sg|nom".
 * Una celda puede tener varias formas aceptadas.
 */
export interface Paradigm {
  id: string
  title: string
  lemma: string
  gloss?: string
  axes: ParadigmAxis[]
  cells: Record<string, string | string[]>
  notes?: string
}

/** Una frase para traducir. */
export interface Sentence {
  id: string
  greek: string
  es: string[]
  hint?: string
  notes?: string
}

/** Nota de gramática que se puede consultar desde la sección. */
export interface GrammarNote {
  id: string
  title: string
  body: string
}

/**
 * Un nodo del camino. Se practica entera de una vez y, al dominarla, abre la
 * siguiente.
 */
export interface Section {
  id: string
  /** Posición dentro del módulo. El nodo lo muestra mientras no haya título. */
  number: number
  /** Opcional: se le pone nombre cuando la sección está terminada. */
  title?: string
  vocabulary: VocabEntry[]
  paradigms: Paradigm[]
  sentences: Sentence[]
  grammar: GrammarNote[]
}

/** Un tramo del camino. Solo agrupa secciones: no se entra en él. */
export interface ModuleContent {
  id: string
  number: number
  title?: string
  summary?: string
  sections: Section[]
}

// ---------------------------------------------------------------------------
// Tarjetas (unidad de repaso)
// ---------------------------------------------------------------------------

export type CardKind =
  /** Ver el griego, recordar el significado. */
  | 'vocab-reconocer'
  /** Ver el español, producir el griego. */
  | 'vocab-producir'
  /** Dada una celda del paradigma, escribir la forma. */
  | 'morfologia'
  /** Traducir una frase. */
  | 'traduccion'

/** Cómo se le presenta al usuario una tarjeta en una sesión concreta. */
export type ExerciseMode = 'opcion-multiple' | 'flashcard' | 'escribir' | 'traducir'

/** Tarjeta derivada del contenido. Se recalcula en cada arranque. */
export interface Card {
  id: string
  moduleId: string
  sectionId: string
  kind: CardKind
  /** id del ítem de contenido del que procede (vocab, paradigma, frase). */
  sourceId: string
  /** Clave de celda, solo para `morfologia`. */
  cellKey?: string
}

// ---------------------------------------------------------------------------
// Progreso
// ---------------------------------------------------------------------------

export type CardState = 'nueva' | 'aprendiendo' | 'repaso' | 'reaprendiendo'

/** 1 = otra vez, 2 = difícil, 3 = bien, 4 = fácil. */
export type Grade = 1 | 2 | 3 | 4

export interface CardProgress {
  cardId: string
  moduleId: string
  sectionId: string
  kind: CardKind
  state: CardState
  /** Timestamp (ms) del próximo repaso. */
  due: number
  /** Intervalo actual en días. */
  interval: number
  /** Factor de facilidad SM-2. */
  ease: number
  /** Paso actual dentro de los pasos de aprendizaje. */
  step: number
  reps: number
  lapses: number
  lastReview: number | null
  /** Aciertos consecutivos, para decidir el modo de presentación. */
  streak: number
}

export interface ReviewLog {
  id?: number
  cardId: string
  moduleId: string
  sectionId: string
  kind: CardKind
  mode: ExerciseMode
  grade: Grade
  /** Timestamp del repaso. */
  ts: number
  /** Milisegundos que tardó en responder. */
  durationMs: number
  /** Intervalo resultante en días. */
  interval: number
}

export interface Settings {
  /** Tarjetas nuevas por día. */
  newPerDay: number
  /** Objetivo diario de tarjetas (nuevas + repasos). */
  dailyGoal: number
  /** Exigir acentos y espíritus en las respuestas escritas. */
  strictDiacritics: boolean
  /** % de dominio de una sección necesario para abrir la siguiente. */
  unlockThreshold: number
  /** Mostrar el teclado griego en pantalla. */
  showKeyboard: boolean
  theme: 'oscuro' | 'claro'
}

export interface DailyStat {
  /** Fecha local en formato YYYY-MM-DD. */
  date: string
  reviews: number
  correct: number
  newCards: number
  durationMs: number
}
