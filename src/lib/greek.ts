/**
 * Manejo de griego politónico.
 *
 * El problema de fondo: «ᾳ» puede venir como un único punto de código
 * precompuesto (U+1FB3) o como α + iota suscrita combinante (U+03B1 U+0345).
 * Visualmente son idénticos, para `===` no lo son. Todo lo que entra por
 * teclado o viene del contenido se normaliza a NFC antes de compararse.
 */

/** Marcas combinantes que usamos para el griego politónico. */
export const COMBINING = {
  agudo: '́',
  grave: '̀',
  circunflejo: '͂',
  suave: '̓',
  aspero: '̔',
  iota: 'ͅ',
  dieresis: '̈',
} as const

export type DiacriticName = keyof typeof COMBINING

/** Rango de marcas combinantes (incluye la iota suscrita U+0345). */
const COMBINING_RANGE = /[̀-ͯ]/g
/** La misma clase sin flag global, para usar con `.test()` sin arrastrar `lastIndex`. */
const IS_COMBINING = /[̀-ͯ]/

/** Puntuación griega y latina que ignoramos al comparar. */
const PUNCTUATION = /[.,;·:!?¿¡'"()\[\]«»‘’“”᾽ʼ‐-―]/g

/** Espacios de cualquier tipo, colapsados a uno. */
const WHITESPACE = /\s+/g

/** Forma canónica compuesta, sin espacios sobrantes. */
export function toNFC(input: string): string {
  return input.normalize('NFC').replace(WHITESPACE, ' ').trim()
}

/**
 * Quita acentos, espíritus, iota suscrita y diéresis; unifica sigma final y
 * pasa a minúsculas. Es la forma «tolerante» con la que comparamos cuando el
 * modo estricto está desactivado.
 */
export function stripDiacritics(input: string): string {
  return input
    .normalize('NFD')
    .replace(COMBINING_RANGE, '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/ς/g, 'σ')
}

/** Texto griego listo para comparar: sin puntuación ni espacios extra. */
function canonicalGreek(input: string): string {
  return toNFC(input.replace(PUNCTUATION, ' ')).toLowerCase().replace(/ς/g, 'σ')
}

export type MatchLevel = 'exacto' | 'sin-acentos' | 'incorrecto'

/**
 * Compara una respuesta en griego con las formas aceptadas.
 * Devuelve `sin-acentos` cuando las letras coinciden pero los diacríticos no,
 * para poder avisar sin dar la respuesta por mala.
 */
export function matchGreek(answer: string, accepted: string[]): MatchLevel {
  const a = canonicalGreek(answer)
  if (!a) return 'incorrecto'

  for (const expected of accepted) {
    if (a === canonicalGreek(expected)) return 'exacto'
  }
  for (const expected of accepted) {
    if (stripDiacritics(a) === stripDiacritics(canonicalGreek(expected))) return 'sin-acentos'
  }
  return 'incorrecto'
}

/** ¿Se acepta esta respuesta según el ajuste de exigencia de diacríticos? */
export function isGreekCorrect(level: MatchLevel, strict: boolean): boolean {
  return strict ? level === 'exacto' : level !== 'incorrecto'
}

// ---------------------------------------------------------------------------
// Español
// ---------------------------------------------------------------------------

const LEADING_ARTICLE = /^(el|la|los|las|un|una|unos|unas|lo)\s+/

/** Normaliza una traducción al español para compararla con tolerancia. */
export function canonicalSpanish(input: string): string {
  const base = input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .normalize('NFC')
    .toLowerCase()
    .replace(PUNCTUATION, ' ')
    .replace(WHITESPACE, ' ')
    .trim()
  return base.replace(LEADING_ARTICLE, '')
}

/**
 * Compara una traducción al español. Acepta la respuesta si coincide con
 * cualquiera de las aceptadas, ignorando tildes, artículos y puntuación.
 */
export function matchSpanish(answer: string, accepted: string[]): boolean {
  const a = canonicalSpanish(answer)
  if (!a) return false
  return accepted.some((e) => canonicalSpanish(e) === a)
}

/**
 * Solapamiento de palabras entre dos textos, de 0 a 1. Se usa para orientar
 * la autoevaluación de frases largas, donde exigir coincidencia literal no
 * tiene sentido.
 */
export function wordOverlap(answer: string, expected: string): number {
  const words = (s: string) => canonicalSpanish(s).split(' ').filter((w) => w.length > 2)
  const a = words(answer)
  const e = words(expected)
  if (e.length === 0) return 0
  const pool = [...a]
  let hits = 0
  for (const word of e) {
    const i = pool.indexOf(word)
    if (i !== -1) {
      hits++
      pool.splice(i, 1)
    }
  }
  return hits / e.length
}

// ---------------------------------------------------------------------------
// Teclado en pantalla
// ---------------------------------------------------------------------------

/** Filas del alfabeto griego tal como se dibujan en el teclado. */
export const KEYBOARD_ROWS: string[][] = [
  ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι'],
  ['κ', 'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ρ', 'σ'],
  ['ς', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω'],
]

export const DIACRITIC_KEYS: { name: DiacriticName; label: string; hint: string }[] = [
  { name: 'agudo', label: '´', hint: 'Agudo' },
  { name: 'grave', label: '`', hint: 'Grave' },
  { name: 'circunflejo', label: '῀', hint: 'Circunflejo' },
  { name: 'suave', label: '᾿', hint: 'Espíritu suave' },
  { name: 'aspero', label: '῾', hint: 'Espíritu áspero' },
  { name: 'iota', label: 'ͺ', hint: 'Iota suscrita' },
  { name: 'dieresis', label: '¨', hint: 'Diéresis' },
]

/**
 * Aplica un diacrítico al último carácter del texto.
 *
 * Descompone, inserta la marca combinante y vuelve a componer, de modo que
 * α + suave + agudo produce ἄ. Si el carácter ya llevaba esa marca, la quita:
 * pulsar dos veces deshace.
 */
export function applyDiacritic(text: string, diacritic: DiacriticName): string {
  if (!text) return text
  const mark = COMBINING[diacritic]

  const decomposed = text.normalize('NFD')
  // Retrocede sobre las marcas combinantes hasta dar con la letra base.
  let i = decomposed.length
  while (i > 0 && IS_COMBINING.test(decomposed[i - 1]!)) i--
  if (i === 0) return text

  const head = decomposed.slice(0, i)
  const marks = decomposed.slice(i)

  const next = marks.includes(mark)
    ? marks.replace(mark, '') // ya estaba: se retira
    : marks + mark

  return (head + next).normalize('NFC')
}

/** Borra un carácter completo, marcas combinantes incluidas. */
export function backspace(text: string): string {
  if (!text) return text
  return Array.from(text.normalize('NFC')).slice(0, -1).join('')
}
