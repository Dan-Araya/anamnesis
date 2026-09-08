/**
 * Modelo de contenido y de progreso.
 *
 * El contenido se organiza en tres niveles: un módulo agrupa secciones, y una
 * sección agrupa cápsulas. La cápsula es lo que se practica de una sentada y
 * lo que aparece como nodo en el camino.
 *
 * El progreso vive en IndexedDB y guarda lo mínimo —el identificador de la
 * tarjeta y su estado—, así que reorganizar el contenido no lo invalida
 * mientras los `id` de los ítems no cambien.
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
  | 'interjeccion'
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

/** Nota de gramática que se puede consultar desde la cápsula. */
export interface GrammarNote {
  id: string
  title: string
  body: string
}

/**
 * Un nodo del camino: el material que se practica de una vez. Al dominarla
 * abre la siguiente, pero su vocabulario sigue apareciendo mezclado en las
 * cápsulas posteriores mientras el algoritmo lo pida.
 */
export interface Capsule {
  id: string
  /** Posición dentro de la sección. El nodo lo muestra mientras no haya título. */
  number: number
  /** Opcional: se le pone nombre cuando la cápsula está terminada. */
  title?: string
  vocabulary: VocabEntry[]
  paradigms: Paradigm[]
  sentences: Sentence[]
  grammar: GrammarNote[]
  /**
   * Tablas completas para el repaso consolidado: a diferencia de `paradigms`
   * (que reparte una tarjeta por celda), cada tabla aquí genera una única
   * tarjeta que la practica entera, tapando celdas al azar en cada intento.
   * Por eso deben llegar con todas las celdas rellenas.
   */
  drills: Paradigm[]
}

/** Un grupo de cápsulas dentro de un módulo. */
export interface Section {
  id: string
  number: number
  title?: string
  capsules: Capsule[]
}

/** Un tramo del camino. Solo agrupa: no se entra en él. */
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
  /** Rellenar de memoria las celdas al azar de una tabla ya vista entera. */
  | 'tabla'

/** Cómo se le presenta al usuario una tarjeta en una sesión concreta. */
export type ExerciseMode = 'opcion-multiple' | 'flashcard' | 'escribir' | 'traducir' | 'huecos'

/** Tarjeta derivada del contenido. Se recalcula en cada arranque. */
export interface Card {
  id: string
  moduleId: string
  sectionId: string
  capsuleId: string
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

/**
 * Estado de una tarjeta. A propósito no guarda a qué cápsula pertenece: eso lo
 * sabe el contenido, y así mover material de sitio no rompe el historial.
 */
export interface CardProgress {
  cardId: string
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
  /** Identificador global estable para sincronizar sin duplicar repasos. */
  eventId: string
  cardId: string
  moduleId: string
  sectionId: string
  capsuleId: string
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
  /**
   * Proporción de la sesión reservada a repasar material antiguo, de 0 a 1.
   * Con 0 cada cápsula sería estanca; con 0,4 casi la mitad de lo que ves al
   * practicar una cápsula nueva son palabras de las anteriores.
   */
  mixRatio: number
  /** Exigir acentos y espíritus en las respuestas escritas. */
  strictDiacritics: boolean
  /** % de dominio de una cápsula necesario para abrir la siguiente. */
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
