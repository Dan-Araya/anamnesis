import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  Card,
  CardProgress,
  DailyStat,
  ExerciseMode,
  Grade,
  Settings,
} from '@/types'
import {
  DEFAULT_SETTINGS,
  bumpDaily,
  computeStreak,
  dayKey,
  getAllDaily,
  loadProgress,
  loadSettings,
  logReview,
  saveProgress,
  saveSettings,
} from '@/lib/db'
import { newProgress, schedule } from '@/lib/srs'
import { moduleStatuses, type ModuleStatus } from '@/lib/session'

interface Store {
  ready: boolean
  settings: Settings
  progress: Map<string, CardProgress>
  daily: DailyStat[]
  today: DailyStat
  streak: number
  statuses: ModuleStatus[]
  /** Registra una respuesta y devuelve el estado resultante de la tarjeta. */
  review(input: {
    card: Card
    grade: Grade
    mode: ExerciseMode
    durationMs: number
  }): Promise<CardProgress>
  updateSettings(patch: Partial<Settings>): Promise<void>
  refresh(): Promise<void>
}

const StoreContext = createContext<Store | null>(null)

const emptyToday = (): DailyStat => ({
  date: dayKey(),
  reviews: 0,
  correct: 0,
  newCards: 0,
  durationMs: 0,
})

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [progress, setProgress] = useState<Map<string, CardProgress>>(new Map())
  const [daily, setDaily] = useState<DailyStat[]>([])

  const refresh = useCallback(async () => {
    const [loadedSettings, loadedProgress, loadedDaily] = await Promise.all([
      loadSettings(),
      loadProgress(),
      getAllDaily(),
    ])
    setSettings(loadedSettings)
    setProgress(loadedProgress)
    setDaily(loadedDaily)
    setReady(true)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const review = useCallback<Store['review']>(
    async ({ card, grade, mode, durationMs }) => {
      const now = Date.now()
      const previous = progress.get(card.id)
      const isNew = !previous
      const next = schedule(previous ?? newProgress(card, now), grade, now)

      await saveProgress(next)
      await logReview({
        cardId: card.id,
        moduleId: card.moduleId,
        kind: card.kind,
        mode,
        grade,
        ts: now,
        durationMs,
        interval: next.interval,
      })
      const updatedToday = await bumpDaily({ correct: grade > 1, isNew, durationMs })

      setProgress((prev) => new Map(prev).set(card.id, next))
      setDaily((prev) => {
        const rest = prev.filter((d) => d.date !== updatedToday.date)
        return [...rest, updatedToday].sort((a, b) => a.date.localeCompare(b.date))
      })

      return next
    },
    [progress],
  )

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const next = { ...settings, ...patch }
      setSettings(next)
      await saveSettings(next)
    },
    [settings],
  )

  const today = useMemo(
    () => daily.find((d) => d.date === dayKey()) ?? emptyToday(),
    [daily],
  )

  const streak = useMemo(() => computeStreak(daily), [daily])

  const statuses = useMemo(
    () => moduleStatuses(progress, settings),
    [progress, settings],
  )

  const value: Store = {
    ready,
    settings,
    progress,
    daily,
    today,
    streak,
    statuses,
    review,
    updateSettings,
    refresh,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore debe usarse dentro de <StoreProvider>')
  return store
}
