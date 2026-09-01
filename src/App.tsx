import { useEffect, useState } from 'react'
import { useStore } from '@/store'
import PathScreen from '@/screens/PathScreen'
import SessionScreen from '@/screens/SessionScreen'
import CapsuleScreen from '@/screens/CapsuleScreen'
import CardsScreen from '@/screens/CardsScreen'
import StatsScreen from '@/screens/StatsScreen'
import SettingsScreen from '@/screens/SettingsScreen'

type Route =
  | { name: 'camino' }
  | { name: 'sesion'; capsuleId?: string; onlyReviews?: boolean }
  | { name: 'capsula'; id: string }
  | { name: 'tarjetas' }
  | { name: 'progreso' }
  | { name: 'ajustes' }

const TABS = [
  { name: 'camino', icon: '🛤', label: 'Camino' },
  { name: 'tarjetas', icon: '🃏', label: 'Tarjetas' },
  { name: 'progreso', icon: '📈', label: 'Progreso' },
  { name: 'ajustes', icon: '⚙', label: 'Ajustes' },
] as const

export default function App() {
  const { ready, settings } = useStore()
  const [route, setRoute] = useState<Route>({ name: 'camino' })

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
  }, [settings.theme])

  if (!ready) {
    return (
      <div className="app">
        <div className="vacio">
          <div className="vacio__icono griego">α</div>
          <p>Cargando…</p>
        </div>
      </div>
    )
  }

  // La sesión ocupa la pantalla entera: sin barra de navegación que distraiga.
  if (route.name === 'sesion') {
    return (
      <div className="app">
        <SessionScreen
          capsuleId={route.capsuleId}
          onlyReviews={route.onlyReviews}
          onExit={() =>
            setRoute(route.onlyReviews ? { name: 'tarjetas' } : { name: 'camino' })
          }
          onOpenMaterial={(id) => setRoute({ name: 'capsula', id })}
        />
      </div>
    )
  }

  return (
    <div className="app">
      {route.name === 'camino' && (
        <PathScreen onPractice={(capsuleId) => setRoute({ name: 'sesion', capsuleId })} />
      )}
      {route.name === 'capsula' && (
        <CapsuleScreen
          capsuleId={route.id}
          onBack={() => setRoute({ name: 'camino' })}
          onPractice={(capsuleId) => setRoute({ name: 'sesion', capsuleId })}
        />
      )}
      {route.name === 'tarjetas' && (
        <CardsScreen
          onReview={() => setRoute({ name: 'sesion', onlyReviews: true })}
          onGoToPath={() => setRoute({ name: 'camino' })}
        />
      )}
      {route.name === 'progreso' && <StatsScreen />}
      {route.name === 'ajustes' && <SettingsScreen />}

      <nav className="nav">
        {TABS.map((tab) => {
          const active =
            route.name === tab.name || (tab.name === 'camino' && route.name === 'capsula')
          return (
            <button
              key={tab.name}
              type="button"
              className="nav__item"
              aria-current={active ? 'page' : undefined}
              onClick={() => setRoute({ name: tab.name } as Route)}
            >
              <span className="nav__icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
