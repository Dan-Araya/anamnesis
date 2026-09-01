import { useEffect, useState } from 'react'
import { useStore } from '@/store'
import HomeScreen from '@/screens/HomeScreen'
import SessionScreen from '@/screens/SessionScreen'
import ModulesScreen from '@/screens/ModulesScreen'
import ModuleDetailScreen from '@/screens/ModuleDetailScreen'
import StatsScreen from '@/screens/StatsScreen'
import SettingsScreen from '@/screens/SettingsScreen'

type Route =
  | { name: 'inicio' }
  | { name: 'sesion'; moduleId?: string; unlimited?: boolean }
  | { name: 'modulos' }
  | { name: 'modulo'; id: string }
  | { name: 'progreso' }
  | { name: 'ajustes' }

const TABS = [
  { name: 'inicio', icon: '🏛', label: 'Inicio' },
  { name: 'modulos', icon: '📚', label: 'Módulos' },
  { name: 'progreso', icon: '📈', label: 'Progreso' },
  { name: 'ajustes', icon: '⚙', label: 'Ajustes' },
] as const

export default function App() {
  const { ready, settings } = useStore()
  const [route, setRoute] = useState<Route>({ name: 'inicio' })

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
          moduleId={route.moduleId}
          unlimited={route.unlimited}
          onExit={() =>
            setRoute(route.moduleId ? { name: 'modulo', id: route.moduleId } : { name: 'inicio' })
          }
        />
      </div>
    )
  }

  return (
    <div className="app">
      {route.name === 'inicio' && (
        <HomeScreen
          onPractice={({ unlimited }) => setRoute({ name: 'sesion', unlimited })}
        />
      )}
      {route.name === 'modulos' && (
        <ModulesScreen onOpen={(id) => setRoute({ name: 'modulo', id })} />
      )}
      {route.name === 'modulo' && (
        <ModuleDetailScreen
          moduleId={route.id}
          onBack={() => setRoute({ name: 'modulos' })}
          onPractice={(moduleId) => setRoute({ name: 'sesion', moduleId })}
        />
      )}
      {route.name === 'progreso' && <StatsScreen />}
      {route.name === 'ajustes' && <SettingsScreen />}

      <nav className="nav">
        {TABS.map((tab) => {
          const active =
            route.name === tab.name || (tab.name === 'modulos' && route.name === 'modulo')
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
