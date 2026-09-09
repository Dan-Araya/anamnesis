import { capsuleLabel, getNode, isEmpty, moduleLabel } from '@/content'
import ParadigmTable from '@/components/ParadigmTable'

/**
 * El material de una cápsula, para consultarlo fuera de la práctica. Se llega
 * desde el final de una sesión; cada cápsula se practica directamente desde el camino.
 */
export default function CapsuleScreen({
  capsuleId,
  onBack,
  onPractice,
}: {
  capsuleId: string
  onBack: () => void
  onPractice: (capsuleId: string) => void
}) {
  const node = getNode(capsuleId)

  if (!node) {
    return (
      <div className="screen">
        <p className="vacio">No se encuentra la cápsula.</p>
      </div>
    )
  }

  const { capsule, module } = node

  return (
    <div className="screen">
      <button type="button" className="btn btn--ghost" onClick={onBack}>
        ← Volver
      </button>

      <div className="modulo__num" style={{ marginTop: 12 }}>
        {moduleLabel(module)}
      </div>
      <h1 className="screen__title" style={{ marginTop: 2 }}>
        {capsuleLabel(capsule)}
      </h1>

      {isEmpty(capsule) ? (
        <div className="card">
          <strong>Cápsula vacía</strong>
          <p className="muted small">
            Añade el contenido en <code>src/content/modules/{module.id}.json</code>.
          </p>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn--primary btn--wide"
          style={{ marginBottom: 20 }}
          onClick={() => onPractice(capsule.id)}
        >
          Practicar esta cápsula
        </button>
      )}

      {capsule.vocabulary.length > 0 && (
        <section>
          <h2 className="screen__title" style={{ fontSize: '1.1rem' }}>
            Vocabulario
          </h2>
          <div className="card">
            <ul className="lista">
              {capsule.vocabulary.map((v) => (
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

      {capsule.paradigms.map((p) => (
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

      {capsule.drills.map((d) => (
        <section key={d.id}>
          <h2 className="screen__title" style={{ fontSize: '1.1rem', marginTop: 24 }}>
            {d.title} · repaso
          </h2>
          <div className="card">
            <div className="row">
              <span className="griego" style={{ fontSize: '1.1rem' }}>
                {d.lemma}
              </span>
              {d.gloss && <span className="muted small">{d.gloss}</span>}
            </div>
            <ParadigmTable paradigm={d} />
            <p className="muted small" style={{ marginBottom: 0 }}>
              Se practica entera, tapando celdas al azar.
            </p>
          </div>
        </section>
      ))}

      {capsule.sentences.length > 0 && (
        <section>
          <h2 className="screen__title" style={{ fontSize: '1.1rem', marginTop: 24 }}>
            Frases
          </h2>
          <div className="card">
            {capsule.sentences.map((s) => (
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

      {capsule.grammar.length > 0 && (
        <section>
          <h2 className="screen__title" style={{ fontSize: '1.1rem', marginTop: 24 }}>
            Gramática
          </h2>
          {capsule.grammar.map((g) => (
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
