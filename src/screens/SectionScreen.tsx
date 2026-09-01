import { getNode, isEmpty, moduleLabel, sectionLabel } from '@/content'
import ParadigmTable from '@/components/ParadigmTable'

/**
 * El material de una sección, para consultarlo fuera de la práctica. Se llega
 * desde el final de una sesión: el camino en sí entra directo a practicar.
 */
export default function SectionScreen({
  sectionId,
  onBack,
  onPractice,
}: {
  sectionId: string
  onBack: () => void
  onPractice: (sectionId: string) => void
}) {
  const node = getNode(sectionId)

  if (!node) {
    return (
      <div className="screen">
        <p className="vacio">No se encuentra la sección.</p>
      </div>
    )
  }

  const { section, module } = node

  return (
    <div className="screen">
      <button type="button" className="btn btn--ghost" onClick={onBack}>
        ← Volver
      </button>

      <div className="modulo__num" style={{ marginTop: 12 }}>
        {moduleLabel(module)}
      </div>
      <h1 className="screen__title" style={{ marginTop: 2 }}>
        {sectionLabel(section)}
      </h1>

      {isEmpty(section) ? (
        <div className="card">
          <strong>Sección vacía</strong>
          <p className="muted small">
            Añade el contenido en <code>src/content/modules/{module.id}.json</code>.
          </p>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn--primary btn--wide"
          style={{ marginBottom: 20 }}
          onClick={() => onPractice(section.id)}
        >
          Practicar esta sección
        </button>
      )}

      {section.vocabulary.length > 0 && (
        <section>
          <h2 className="screen__title" style={{ fontSize: '1.1rem' }}>
            Vocabulario
          </h2>
          <div className="card">
            <ul className="lista">
              {section.vocabulary.map((v) => (
                <li key={v.id}>
                  <span>
                    <span className="griego" style={{ fontSize: '1.15rem' }}>
                      {v.greek}
                    </span>
                    {v.info && <span className="muted small"> {v.info}</span>}
                    {v.notes && <div className="muted small">{v.notes}</div>}
                  </span>
                  <span className="muted" style={{ textAlign: 'right' }}>
                    {v.es.join(', ')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {section.paradigms.map((p) => (
        <section key={p.id}>
          <h2 className="screen__title" style={{ fontSize: '1.1rem', marginTop: 24 }}>
            {p.title}
          </h2>
          <div className="card">
            <div className="row">
              <span className="griego" style={{ fontSize: '1.1rem' }}>
                {p.lemma}
              </span>
              {p.gloss && <span className="muted small">{p.gloss}</span>}
            </div>
            <ParadigmTable paradigm={p} />
            {p.notes && (
              <p className="muted small" style={{ marginBottom: 0 }}>
                {p.notes}
              </p>
            )}
          </div>
        </section>
      ))}

      {section.sentences.length > 0 && (
        <section>
          <h2 className="screen__title" style={{ fontSize: '1.1rem', marginTop: 24 }}>
            Frases
          </h2>
          <div className="card">
            {section.sentences.map((s) => (
              <div key={s.id} style={{ marginBottom: 12 }}>
                <div className="griego" style={{ fontSize: '1.1rem' }}>
                  {s.greek}
                </div>
                <div className="muted small">{s.es[0]}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {section.grammar.length > 0 && (
        <section>
          <h2 className="screen__title" style={{ fontSize: '1.1rem', marginTop: 24 }}>
            Gramática
          </h2>
          {section.grammar.map((g) => (
            <div className="card" key={g.id}>
              <strong>{g.title}</strong>
              <p className="small" style={{ marginBottom: 0 }}>
                {g.body}
              </p>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
