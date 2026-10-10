import { capsuleLabel, getNode, isEmpty, moduleLabel } from '@/content'
import { useStore } from '@/store'
import ParadigmTable from '@/components/ParadigmTable'
import CapsuleGreekLine from '@/components/CapsuleGreekLine'

/**
 * El material de una cápsula: la lección que se ve antes de practicar. Se
 * llega tocando un nodo del camino y desde aquí se inicia la sesión. En una
 * cápsula ya completada el botón ofrece repetirla a voluntad.
 */
export default function CapsuleScreen({
  capsuleId,
  onBack,
  onPractice,
}: {
  capsuleId: string
  onBack: () => void
  onPractice: (capsuleId: string, freePractice?: boolean) => void
}) {
  const { statuses } = useStore()
  const node = getNode(capsuleId)

  if (!node) {
    return (
      <div className="screen">
        <p className="vacio">No se encuentra la cápsula.</p>
      </div>
    )
  }

  const { capsule, module } = node
  const total = statuses.find((s) => s.capsule.id === capsuleId)?.total ?? 0
  const completed = Boolean(
    statuses.find((s) => s.capsule.id === capsuleId)?.completed,
  )

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
      <CapsuleGreekLine capsule={capsule} />

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
          onClick={() => onPractice(capsule.id, completed)}
        >
          {completed ? 'Repasar cápsula' : 'Comenzar práctica'}
        </button>
      )}

      {!isEmpty(capsule) && (
        <p className="muted small">
          {total} ejercicios de esta cápsula, siempre completos. Hasta tres fallos
          pueden repetirse una vez al final.
          {completed && ' Repetirla es práctica libre y no cambia tus estadísticas.'}
        </p>
      )}

      {capsule.letters.length > 0 && (
        <section>
          <h2 className="screen__title" style={{ fontSize: '1.1rem' }}>
            El alfabeto
          </h2>
          <p className="muted small" style={{ marginTop: 0 }}>
            Vas a aprender estas letras: su forma —mayúscula y minúscula—, su nombre, su
            sonido y su transliteración, la manera de escribirlas con el alfabeto latino.
            La transliteración no representa necesariamente la pronunciación exacta.
          </p>
          {capsule.letters.map((l) => (
            <div className="card" key={l.id}>
              <div className="row">
                <span className="griego" style={{ fontSize: '1.6rem' }}>
                  {l.uppercase}
                </span>
                <span className="muted">
                  {l.name} mayúscula · {l.phonetic}
                </span>
              </div>
              <div className="row" style={{ marginTop: 4 }}>
                <span className="griego" style={{ fontSize: '1.6rem' }}>
                  {l.lowercase}
                </span>
                <span className="muted">{l.name} minúscula</span>
              </div>
              {l.finalForm && (
                <div className="row" style={{ marginTop: 4 }}>
                  <span className="griego" style={{ fontSize: '1.6rem' }}>
                    {l.finalForm}
                  </span>
                  <span className="muted">{l.name} final</span>
                </div>
              )}
              <p className="small" style={{ margin: '4px 0 0' }}>
                Transliteración: <strong>{l.transliteration}</strong>
              </p>
              <p className="small" style={{ marginBottom: 0 }}>
                {l.pronunciation}
              </p>
              {l.note && (
                <p className="muted small" style={{ margin: '8px 0 0' }}>
                  {l.note}
                </p>
              )}
            </div>
          ))}
        </section>
      )}

      {capsule.notes && capsule.notes.length > 0 && (
        <section>
          <h2 className="screen__title" style={{ fontSize: '1.1rem', marginTop: 24 }}>
            Nota
          </h2>
          <div className="card">
            {capsule.notes.map((note, i) => (
              <p className="small" key={i} style={{ margin: i ? '8px 0 0' : 0 }}>
                {note}
              </p>
            ))}
          </div>
        </section>
      )}

      {capsule.vocabulary.length > 0 && (
        <section>
          <h2 className="screen__title" style={{ fontSize: '1.1rem', marginTop: 24 }}>
            Vocabulario
          </h2>
          {capsule.vocabulary.some((v) => v.transliteration) && (
            <p className="muted small" style={{ marginTop: 0 }}>
              En esta transliteración básica no representamos todavía los acentos ni los
              espíritus.
            </p>
          )}
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
                    {v.transliteration && (
                      <div className="muted small">
                        Transliteración: {v.transliteration}
                      </div>
                    )}
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
