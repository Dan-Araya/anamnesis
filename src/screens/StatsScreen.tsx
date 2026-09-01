import { useMemo } from 'react'
import type { CardState } from '@/types'
import { useStore } from '@/store'
import { dayKey, shiftDay } from '@/lib/db'
import { allCards } from '@/content'

const DAYS = 14

const ESTADOS: { state: CardState; label: string }[] = [
  { state: 'nueva', label: 'Sin empezar' },
  { state: 'aprendiendo', label: 'Aprendiendo' },
  { state: 'reaprendiendo', label: 'Reaprendiendo' },
  { state: 'repaso', label: 'En repaso' },
]

export default function StatsScreen() {
  const { daily, progress } = useStore()

  const ultimos = useMemo(() => {
    const byDate = new Map(daily.map((d) => [d.date, d]))
    const today = dayKey()
    return Array.from({ length: DAYS }, (_, i) => {
      const date = shiftDay(today, -(DAYS - 1 - i))
      return { date, reviews: byDate.get(date)?.reviews ?? 0 }
    })
  }, [daily])

  const max = Math.max(1, ...ultimos.map((d) => d.reviews))

  const totales = useMemo(() => {
    const reviews = daily.reduce((s, d) => s + d.reviews, 0)
    const correct = daily.reduce((s, d) => s + d.correct, 0)
    const ms = daily.reduce((s, d) => s + d.durationMs, 0)
    return {
      reviews,
      accuracy: reviews ? Math.round((correct / reviews) * 100) : 0,
      minutes: Math.round(ms / 60000),
      dias: daily.filter((d) => d.reviews > 0).length,
    }
  }, [daily])

  const porEstado = useMemo(() => {
    const counts: Record<CardState, number> = {
      nueva: 0,
      aprendiendo: 0,
      reaprendiendo: 0,
      repaso: 0,
    }
    for (const card of allCards) {
      const p = progress.get(card.id)
      counts[p?.state ?? 'nueva']++
    }
    return counts
  }, [progress])

  const proximos = useMemo(() => {
    const now = Date.now()
    const buckets = Array.from({ length: 7 }, () => 0)
    for (const p of progress.values()) {
      if (p.state === 'nueva') continue
      const days = Math.floor((p.due - now) / 86_400_000)
      if (days < 0) buckets[0]!++
      else if (days < 7) buckets[days]!++
    }
    return buckets
  }, [progress])

  const maxProximos = Math.max(1, ...proximos)

  return (
    <div className="screen">
      <h1 className="screen__title">Progreso</h1>

      <div className="metricas" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="metrica__valor">{totales.reviews}</div>
          <div className="metrica__label">respuestas</div>
        </div>
        <div className="card">
          <div className="metrica__valor">{totales.accuracy}%</div>
          <div className="metrica__label">aciertos</div>
        </div>
        <div className="card">
          <div className="metrica__valor">{totales.dias}</div>
          <div className="metrica__label">días practicados</div>
        </div>
        <div className="card">
          <div className="metrica__valor">{totales.minutes}</div>
          <div className="metrica__label">minutos</div>
        </div>
      </div>

      <div className="card">
        <strong>Últimos {DAYS} días</strong>
        <div className="grafico">
          {ultimos.map((d) => (
            <div
              key={d.date}
              className={`grafico__barra ${d.reviews === 0 ? 'grafico__barra--vacia' : ''}`}
              style={{ height: `${(d.reviews / max) * 100}%` }}
              title={`${d.date}: ${d.reviews}`}
            />
          ))}
        </div>
      </div>

      <div className="card">
        <strong>Próximos 7 días</strong>
        <div className="grafico">
          {proximos.map((count, i) => (
            <div
              key={i}
              className={`grafico__barra ${count === 0 ? 'grafico__barra--vacia' : ''}`}
              style={{ height: `${(count / maxProximos) * 100}%` }}
              title={i === 0 ? `Hoy: ${count}` : `En ${i} días: ${count}`}
            />
          ))}
        </div>
        <div className="small muted" style={{ marginTop: 6 }}>
          Repasos que vencerán cada día.
        </div>
      </div>

      <div className="card">
        <strong>Estado de las tarjetas</strong>
        <ul className="lista" style={{ marginTop: 8 }}>
          {ESTADOS.map(({ state, label }) => (
            <li key={state}>
              <span>{label}</span>
              <span className="muted">{porEstado[state]}</span>
            </li>
          ))}
          <li>
            <strong>Total</strong>
            <strong>{allCards.length}</strong>
          </li>
        </ul>
      </div>
    </div>
  )
}
