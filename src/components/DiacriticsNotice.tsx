import { getNode } from '@/content'

export function shouldShowDiacriticsNotice(capsuleId: string, word?: string) {
  const node = getNode(capsuleId)
  return Boolean(node?.section.id === 'm01-s01' && node.capsule.number >= 2 &&
    word && /[\u0300-\u036f]/u.test(word.normalize('NFD')))
}

/** Siempre visible; las marcas aisladas y etiquetadas desambiguan el espíritu. */
export default function DiacriticsNotice({ capsuleId, word, transliteration = false }: {
  capsuleId: string; word?: string; transliteration?: boolean
}) {
  if (!shouldShowDiacriticsNotice(capsuleId, word)) return null
  return <aside className="diacritics-notice" aria-label="Sobre los diacríticos">
    <p>Por ahora, fíjate solo en las letras. En <span className="griego diacritics-example">δέ</span>, la rayita sobre ε es un acento; en <span className="griego diacritics-example">ὄνομα</span>, la pequeña marca curva sobre ο es un espíritu.</p>
    <div className="diacritics-key">
      <span><span className="griego diacritics-mark">᾿</span> ← espíritu: marca curva a la izquierda</span>
      <span><span className="griego diacritics-mark">´</span> ← acento: rayita a la derecha</span>
    </div>
    <p>La ο de ὄνομα lleva ambos signos. Estas marcas se muestran, pero no se evalúan todavía. Las aprenderás en la siguiente sección.</p>
    {transliteration && <p>Aquí no representamos los acentos ni los espíritus en letras latinas. Las rayas de ē/ō distinguen η/ω; no son acentos griegos.</p>}
  </aside>
}
