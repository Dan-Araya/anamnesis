import type { Paradigm } from '@/types'
import { cellForms } from '@/content'

/**
 * Dibuja un paradigma según cuántos ejes tenga:
 * uno → lista; dos → tabla; tres → una tabla por cada valor del primer eje
 * (así el artículo sale en tres bloques, uno por género).
 */
export default function ParadigmTable({ paradigm }: { paradigm: Paradigm }) {
  const [first, second, third] = paradigm.axes

  if (!first) return null

  if (!second) {
    return (
      <ul className="lista">
        {first.values.map((v) => (
          <li key={v.id}>
            <span className="muted">{v.label}</span>
            <span className="griego">{cellForms(paradigm, v.id).join(' / ')}</span>
          </li>
        ))}
      </ul>
    )
  }

  if (!third) {
    return <Grid paradigm={paradigm} columns={first} rows={second} prefix="" />
  }

  return (
    <>
      {first.values.map((v) => (
        <div key={v.id} style={{ marginTop: 12 }}>
          <div className="small muted">{v.label}</div>
          <Grid paradigm={paradigm} columns={second} rows={third} prefix={`${v.id}|`} />
        </div>
      ))}
    </>
  )
}

function Grid({
  paradigm,
  columns,
  rows,
  prefix,
}: {
  paradigm: Paradigm
  columns: Paradigm['axes'][number]
  rows: Paradigm['axes'][number]
  prefix: string
}) {
  return (
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
              <td key={c.id} className="griego">
                {cellForms(paradigm, `${prefix}${c.id}|${r.id}`).join(' / ') || '—'}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
