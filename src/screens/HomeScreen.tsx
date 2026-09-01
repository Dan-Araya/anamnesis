import { useStore } from '@/store'
import { currentModule } from '@/lib/session'
import { isEmpty } from '@/content'

export default function HomeScreen({
  onPractice,
}: {
  onPractice: (options: { unlimited?: boolean }) => void
}) {
  const { settings, statuses, today, streak } = useStore()

  const open = statuses.filter((s) => s.unlocked)
  const due = open.reduce((sum, s) => sum + s.due, 0)
  const freshAvailable = open.reduce((sum, s) => sum + s.fresh, 0)
  const newBudget = Math.max(0, settings.newPerDay - today.newCards)
  const pending = due + Math.min(freshAvailable, newBudget)

  const goalPct = Math.min(100, Math.round((today.reviews / settings.dailyGoal) * 100))
  const actual = currentModule(statuses)
  const hayContenido = statuses.some((s) => !isEmpty(s.module))

  return (
    <div className="screen">
      <div className="hero">
        <div className="ring" style={{ ['--pct' as string]: goalPct }}>
          <div className="ring__inner">
            <div>
              <div className="ring__value">
                {today.reviews}
                <span className="muted small">/{settings.dailyGoal}</span>
              </div>
              <div className="muted small">hoy</div>
            </div>
          </div>
        </div>
        <div className="hero__streak">{streak}</div>
        <div className="hero__label">
          {streak === 1 ? 'día seguido' : 'días seguidos'}
        </div>
      </div>

      {!hayContenido ? (
        <div className="card">
          <strong>Aún no hay contenido</strong>
          <p className="muted small">
            Añade vocabulario, paradigmas o frases en{' '}
            <code>src/content/modules/</code> y aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="stack">
          <button
            type="button"
            className="btn btn--primary btn--wide"
            disabled={pending === 0}
            onClick={() => onPractice({})}
          >
            {pending > 0 ? `Practicar · ${pending} tarjetas` : 'Todo al día'}
          </button>

          {pending === 0 && (
            <button
              type="button"
              className="btn btn--wide"
              onClick={() => onPractice({ unlimited: true })}
            >
              Repasar de más
            </button>
          )}

          {actual && (
            <div className="card">
              <div className="modulo__num">Módulo {actual.module.number}</div>
              <div className="modulo__title">{actual.module.title}</div>
              <div className="bar">
                <div
                  className="bar__fill"
                  style={{ width: `${Math.round((actual.mastery ?? 0) * 100)}%` }}
                />
              </div>
              <div className="row small muted" style={{ marginTop: 8 }}>
                <span>{Math.round((actual.mastery ?? 0) * 100)}% dominado</span>
                <span>
                  {actual.started}/{actual.total} tarjetas vistas
                </span>
              </div>
            </div>
          )}

          <div className="card row">
            <div>
              <div className="metrica__valor">{due}</div>
              <div className="metrica__label">para repasar</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="metrica__valor">{Math.min(freshAvailable, newBudget)}</div>
              <div className="metrica__label">nuevas hoy</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
