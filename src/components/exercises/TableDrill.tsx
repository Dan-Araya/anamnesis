import { useMemo, useRef, useState } from 'react'
import type { Grade, Paradigm, Settings } from '@/types'
import { cellForms, cellKeys, cellLabel, getDrill } from '@/content'
import { isGreekCorrect, matchGreek, toNFC, type MatchLevel } from '@/lib/greek'
import GreekKeyboard from '@/components/GreekKeyboard'
import { shuffle, type SessionItem } from '@/lib/session'

/** Proporción de celdas que se tapan en cada intento, con un mínimo. */
const BLANK_RATIO = 0.4
const MIN_BLANKS = 2

/**
 * Repasa una tabla ya vista entera (ver `Capsule.drills`): tapa al azar una
 * parte de las celdas —distinta en cada intento— y hay que rellenarlas de
 * memoria. El resto de la tabla queda visible como contexto.
 */
export default function TableDrill({
  item,
  settings,
  onGraded,
}: {
  item: SessionItem
  settings: Settings
  onGraded: (grade: Grade) => void
}) {
  const drill = getDrill(item.card.sourceId)
  const keys = useMemo(() => (drill ? cellKeys(drill) : []), [drill])

  const blanks = useMemo(() => {
    const count = Math.min(
      keys.length,
      Math.max(MIN_BLANKS, Math.round(keys.length * BLANK_RATIO)),
    )
    return new Set(shuffle(keys).slice(0, count))
    // Se elige una sola vez por tarjeta: da igual si `keys` cambia de
    // identidad entre renders, solo importa qué tarjeta es.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.card.id])

  const [values, setValues] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState(false)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})

  if (!drill) return <p className="vacio">Falta el contenido de esta tarjeta.</p>
  const [first, second, third] = drill.axes
  if (!first || !second) return <p className="vacio">Esta tabla no tiene ejes suficientes.</p>

  const setValue = (key: string, v: string) =>
    setValues((prev) => ({ ...prev, [key]: toNFC(v) }))

  const allFilled = [...blanks].every((k) => (values[k] ?? '').trim())

  const worstLevel = ((): MatchLevel => {
    let level: MatchLevel = 'exacto'
    for (const key of blanks) {
      const l = matchGreek(values[key] ?? '', cellForms(drill, key))
      if (l === 'incorrecto') return 'incorrecto'
      if (l === 'sin-acentos') level = 'sin-acentos'
    }
    return level
  })()

  const grade: Grade = worstLevel === 'exacto' ? 3 : settings.strictDiacritics ? 1 : 2
  const correct = checked && isGreekCorrect(worstLevel, settings.strictDiacritics)

  const activeRef = { current: activeKey ? (inputs.current[activeKey] ?? null) : null }

  const cell = (key: string) => {
    if (!blanks.has(key)) {
      return <span className="griego">{cellForms(drill, key).join(' / ') || '—'}</span>
    }

    const level: MatchLevel | null = checked
      ? matchGreek(values[key] ?? '', cellForms(drill, key))
      : null
    const cls = [
      'tabla__input',
      'griego',
      level === 'exacto' && 'tabla__input--ok',
      level === 'sin-acentos' && 'tabla__input--casi',
      level === 'incorrecto' && 'tabla__input--mal',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div className="tabla__celda">
        <input
          ref={(el) => {
            inputs.current[key] = el
          }}
          className={cls}
          value={values[key] ?? ''}
          onChange={(e) => setValue(key, e.target.value)}
          onFocus={() => setActiveKey(key)}
          readOnly={checked}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label={cellLabel(drill, key)}
        />
        {checked && level !== 'exacto' && (
          <div className="tabla__correccion small muted griego">
            {cellForms(drill, key).join(' / ')}
          </div>
        )}
      </div>
    )
  }

  const grid = (columns: Paradigm['axes'][number], rows: Paradigm['axes'][number], prefix: string) => (
    <table className="tabla">
      <thead>
        <tr>
          <th />
          {columns.values.map((c) => (
            <th key={c.id}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.values.map((r) => (
          <tr key={r.id}>
            <th scope="row">{r.label}</th>
            {columns.values.map((c) => (
              <td key={c.id}>{cell(`${prefix}${c.id}|${r.id}`)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <>
      <div className="prompt">
        <div className="prompt__hint">{drill.title}</div>
        <div className="prompt__greek griego">{drill.lemma}</div>
      </div>

      {third
        ? first.values.map((v) => (
            <div key={v.id} style={{ marginTop: 12 }}>
              <div className="small muted">{v.label}</div>
              {grid(second, third, `${v.id}|`)}
            </div>
          ))
        : grid(first, second, '')}

      {checked && (
        <div className={`veredicto veredicto--${correct ? 'ok' : 'mal'}`}>
          <strong>{correct ? 'Bien' : 'Revisa las celdas marcadas'}</strong>
        </div>
      )}

      {settings.showKeyboard && !checked && (
        <GreekKeyboard
          value={activeKey ? (values[activeKey] ?? '') : ''}
          onChange={(v) => activeKey && setValue(activeKey, v)}
          inputRef={activeRef}
        />
      )}

      <div className="options">
        {!checked ? (
          <button
            type="button"
            className="btn btn--primary btn--wide"
            disabled={!allFilled}
            onClick={() => setChecked(true)}
          >
            Comprobar
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primary btn--wide"
            onClick={() => onGraded(grade)}
          >
            Continuar
          </button>
        )}
      </div>
    </>
  )
}
