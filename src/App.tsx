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
  { name: 'camino', icon: 'path', label: 'Camino' },
  { name: 'tarjetas', icon: 'cards', label: 'Tarjetas' },
  { name: 'progreso', icon: 'chart', label: 'Progreso' },
  { name: 'ajustes', icon: 'settings', label: 'Ajustes' },
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
              <NavIcon name={tab.icon} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

function NavIcon({ name }: { name: (typeof TABS)[number]['icon'] }) {
  const paths = {
    path: <><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18c6 0 4-10 8-10" /></>,
    cards: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
  }
  return <svg className="nav__icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}
