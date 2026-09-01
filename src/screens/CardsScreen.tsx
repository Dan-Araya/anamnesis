import { useStore } from '@/store'
import { sectionLabel } from '@/content'
import { currentSection } from '@/lib/session'

/**
 * Tarjetas: el repaso de lo ya visto, mezclando todas las secciones. Aquí no
 * entra material nuevo —eso es cosa del camino—; esta pantalla sirve para
 * sostener lo aprendido y para mantener la racha en un día suelto.
 */
export default function CardsScreen({
  onReview,
  onGoToPath,
}: {
  onReview: () => void
  onGoToPath: () => void
}) {
  const { settings, statuses, today, streak, progress } = useStore()

  const due = statuses.reduce((sum, s) => (s.unlocked ? sum + s.due : sum), 0)
  const enCurso = statuses.reduce((sum, s) => sum + s.started, 0)
  const goalPct = Math.min(100, Math.round((today.reviews / settings.dailyGoal) * 100))
  const actual = currentSection(statuses)

  /** Cuántas tarjetas vencen mañana, para saber si conviene volver. */
  const manana = (() => {
    const limite = Date.now() + 86_400_000
    let n = 0
    for (const p of progress.values()) {
      if (p.state !== 'nueva' && p.due > Date.now() && p.due <= limite) n++
    }
    return n
  })()

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
        <div className="hero__label">{streak === 1 ? 'día seguido' : 'días seguidos'}</div>
      </div>

      <div className="stack">
        <button
          type="button"
          className="btn btn--primary btn--wide"
          disabled={due === 0}
          onClick={onReview}
        >
          {due > 0 ? `Repasar · ${due} tarjetas` : 'Nada que repasar'}
        </button>

        {due === 0 && (
          <div className="card">
            <strong>{enCurso === 0 ? 'Todavía no has practicado nada' : 'Todo al día'}</strong>
            <p className="muted small">
              {enCurso === 0
                ? 'Las tarjetas aparecen aquí en cuanto empieces una sección del camino.'
                : manana > 0
                  ? `Mañana te tocan ${manana} tarjetas. Mientras tanto, puedes avanzar por el camino.`
                  : 'No hay repasos pendientes. Avanza por el camino para añadir material nuevo.'}
            </p>
            <button type="button" className="btn btn--wide" onClick={onGoToPath}>
              {actual ? `Ir a ${sectionLabel(actual.section)}` : 'Ir al camino'}
            </button>
          </div>
        )}

        <div className="card row">
          <div>
            <div className="metrica__valor">{enCurso}</div>
            <div className="metrica__label">tarjetas empezadas</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="metrica__valor">{manana}</div>
            <div className="metrica__label">vencen mañana</div>
          </div>
        </div>
      </div>
    </div>
  )
}
