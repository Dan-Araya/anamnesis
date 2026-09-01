import { useStore } from '@/store'
import { isEmpty } from '@/content'

export default function ModulesScreen({ onOpen }: { onOpen: (moduleId: string) => void }) {
  const { statuses, settings } = useStore()

  return (
    <div className="screen">
      <h1 className="screen__title">Módulos</h1>
      <div className="stack">
        {statuses.map((s, i) => {
          const previous = statuses[i - 1]
          const pct = Math.round((s.mastery ?? 0) * 100)
          const vacio = isEmpty(s.module)

          return (
            <button
              key={s.module.id}
              type="button"
              className={`modulo ${s.unlocked ? '' : 'modulo--bloqueado'}`}
              disabled={!s.unlocked}
              onClick={() => onOpen(s.module.id)}
            >
              <div className="row">
                <div className="modulo__num">Módulo {s.module.number}</div>
                {!s.unlocked && <span className="chip">🔒 Bloqueado</span>}
                {s.unlocked && s.due > 0 && <span className="chip">{s.due} por repasar</span>}
              </div>
              <div className="modulo__title">{s.module.title}</div>

              {!s.unlocked ? (
                <div className="small muted">
                  Alcanza el {Math.round(settings.unlockThreshold * 100)} % de dominio en el
                  módulo {previous?.module.number} para abrirlo.
                </div>
              ) : vacio ? (
                <div className="small muted">Sin contenido todavía.</div>
              ) : (
                <>
                  <div className="bar">
                    <div className="bar__fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="row small muted" style={{ marginTop: 8 }}>
                    <span>{pct}% dominado</span>
                    <span>
                      {s.module.vocabulary.length} palabras ·{' '}
                      {s.module.paradigms.length} paradigmas ·{' '}
                      {s.module.sentences.length} frases
                    </span>
                  </div>
                </>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
