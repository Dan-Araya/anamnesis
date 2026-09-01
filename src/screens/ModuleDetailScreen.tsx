import { getModule, isEmpty } from '@/content'
import { useStore } from '@/store'
import ParadigmTable from '@/components/ParadigmTable'

export default function ModuleDetailScreen({
  moduleId,
  onBack,
  onPractice,
}: {
  moduleId: string
  onBack: () => void
  onPractice: (moduleId: string) => void
}) {
  const { statuses } = useStore()
  const module = getModule(moduleId)
  const status = statuses.find((s) => s.module.id === moduleId)

  if (!module) {
    return (
      <div className="screen">
        <p className="vacio">No se encuentra el módulo.</p>
      </div>
    )
  }

  return (
    <div className="screen">
      <button type="button" className="btn btn--ghost" onClick={onBack}>
        ← Módulos
      </button>

      <div className="modulo__num" style={{ marginTop: 12 }}>
        Módulo {module.number}
      </div>
      <h1 className="screen__title" style={{ marginTop: 2 }}>
        {module.title}
      </h1>
      {module.summary && <p className="muted small">{module.summary}</p>}

      {isEmpty(module) ? (
        <div className="card">
          <strong>Módulo vacío</strong>
          <p className="muted small">
            Añade el contenido en <code>src/content/modules/{module.id}.json</code>.
          </p>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn--primary btn--wide"
          style={{ marginBottom: 20 }}
          onClick={() => onPractice(moduleId)}
        >
          Practicar este módulo
          {status && status.due > 0 ? ` · ${status.due} pendientes` : ''}
        </button>
      )}

      {module.vocabulary.length > 0 && (
        <section>
          <h2 className="screen__title" style={{ fontSize: '1.1rem' }}>
            Vocabulario
          </h2>
          <div className="card">
            <ul className="lista">
              {module.vocabulary.map((v) => (
                <li key={v.id}>
                  <span>
                    <span className="griego" style={{ fontSize: '1.15rem' }}>
                      {v.greek}
                    </span>
                    {v.info && <span className="muted small"> {v.info}</span>}
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

      {module.paradigms.map((p) => (
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

      {module.sentences.length > 0 && (
        <section>
          <h2 className="screen__title" style={{ fontSize: '1.1rem', marginTop: 24 }}>
            Frases
          </h2>
          <div className="card">
            {module.sentences.map((s) => (
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

      {module.grammar.length > 0 && (
        <section>
          <h2 className="screen__title" style={{ fontSize: '1.1rem', marginTop: 24 }}>
            Gramática
          </h2>
          {module.grammar.map((g) => (
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
