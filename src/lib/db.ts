import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { CardProgress, DailyStat, ReviewLog, Settings } from '@/types'

/**
 * Persistencia local. Todo vive en el móvil: no hay servidor ni cuentas.
 * El respaldo es el export a JSON de la pantalla de ajustes.
 */

const DB_NAME = 'griego-antiguo'
/**
 * v2: el contenido pasó a organizarse en secciones y los identificadores de
 * tarjeta cambiaron, así que el progreso de la v1 ya no apunta a nada.
 * v3: el progreso deja de guardar a qué módulo pertenece cada tarjeta; ese
 * dato lo aporta el contenido. Los registros se conservan.
 * v4: cada repaso recibe un eventId estable para poder sincronizarlo. Los
 * registros anteriores se conservan y reciben un id derivado de su clave.
 */
const DB_VERSION = 4

export const DEFAULT_SETTINGS: Settings = {
  newPerDay: 10,
  dailyGoal: 40,
  mixRatio: 0.4,
  strictDiacritics: false,
  // Con 0,5 basta con haber graduado la mayoría de las tarjetas de la cápsula:
  // una rezagada no bloquea el camino.
  unlockThreshold: 0.5,
  showKeyboard: true,
  theme: 'oscuro',
}

interface Schema extends DBSchema {
  progress: {
    key: string
    value: CardProgress
    indexes: { due: number }
  }
  reviews: {
    key: number
    value: ReviewLog
    indexes: { ts: number; cardId: string }
  }
  daily: {
    key: string
    value: DailyStat
  }
  meta: {
    key: string
    value: unknown
  }
}

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null

function db(): Promise<IDBPDatabase<Schema>> {
  dbPromise ??= openDB<Schema>(DB_NAME, DB_VERSION, {
    upgrade(database, oldVersion, _newVersion, tx) {
      if (oldVersion < 1) {
        const progress = database.createObjectStore('progress', { keyPath: 'cardId' })
        progress.createIndex('due', 'due')

        const reviews = database.createObjectStore('reviews', {
          keyPath: 'id',
          autoIncrement: true,
        })
        reviews.createIndex('ts', 'ts')
        reviews.createIndex('cardId', 'cardId')

        database.createObjectStore('daily', { keyPath: 'date' })
        database.createObjectStore('meta')
      }

      if (oldVersion === 1) {
        // Las tarjetas de la v1 apuntaban a contenido que ya no existe. Se
        // descartan el progreso y el historial; los ajustes se conservan.
        tx.objectStore('progress').clear()
        tx.objectStore('reviews').clear()
        tx.objectStore('daily').clear()
      }

      if (oldVersion > 0 && oldVersion < 3) {
        // El progreso ya no se agrupa por módulo desde la propia tarjeta. El
        // índice ha salido del esquema tipado, así que se borra con la API cruda.
        const store = tx.objectStore('progress') as unknown as {
          indexNames: DOMStringList
          deleteIndex(name: string): void
        }
        if (store.indexNames.contains('moduleId')) store.deleteIndex('moduleId')
      }

      if (oldVersion > 0 && oldVersion < 4) {
        const reviews = tx.objectStore('reviews')
        void reviews.openCursor().then(function migrate(cursor): Promise<unknown> | undefined {
          if (!cursor) return undefined
          if (!cursor.value.eventId) {
            void cursor.update({ ...cursor.value, eventId: `legacy:${String(cursor.primaryKey)}` })
          }
          return cursor.continue().then(migrate)
        })
      }
    },
  })
  return dbPromise
}

// ---------------------------------------------------------------------------
// Progreso
// ---------------------------------------------------------------------------

export async function loadProgress(): Promise<Map<string, CardProgress>> {
  const all = await (await db()).getAll('progress')
  return new Map(all.map((p) => [p.cardId, p]))
}

export async function saveProgress(p: CardProgress): Promise<void> {
  await (await db()).put('progress', p)
}

export async function saveManyProgress(items: CardProgress[]): Promise<void> {
  const tx = (await db()).transaction('progress', 'readwrite')
  await Promise.all([...items.map((p) => tx.store.put(p)), tx.done])
}

// ---------------------------------------------------------------------------
// Historial
// ---------------------------------------------------------------------------

export async function logReview(entry: ReviewLog): Promise<void> {
  await (await db()).add('reviews', entry)
}

export async function reviewsSince(ts: number): Promise<ReviewLog[]> {
  return (await db()).getAllFromIndex('reviews', 'ts', IDBKeyRange.lowerBound(ts))
}

export async function getAllReviews(): Promise<ReviewLog[]> {
  return (await db()).getAll('reviews')
}

// ---------------------------------------------------------------------------
// Estadísticas diarias y racha
// ---------------------------------------------------------------------------

/** Fecha local en YYYY-MM-DD (no UTC: la racha va por el día del usuario). */
export function dayKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function shiftDay(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y!, m! - 1, d! + days)
  return dayKey(date)
}

export async function getDaily(date = dayKey()): Promise<DailyStat> {
  const found = await (await db()).get('daily', date)
  return found ?? { date, reviews: 0, correct: 0, newCards: 0, durationMs: 0 }
}

export async function getAllDaily(): Promise<DailyStat[]> {
  const all = await (await db()).getAll('daily')
  return all.sort((a, b) => a.date.localeCompare(b.date))
}

export async function bumpDaily(patch: {
  correct: boolean
  isNew: boolean
  durationMs: number
}): Promise<DailyStat> {
  const date = dayKey()
  const current = await getDaily(date)
  const updated: DailyStat = {
    date,
    reviews: current.reviews + 1,
    correct: current.correct + (patch.correct ? 1 : 0),
    newCards: current.newCards + (patch.isNew ? 1 : 0),
    durationMs: current.durationMs + patch.durationMs,
  }
  await (await db()).put('daily', updated)
  return updated
}

/**
 * Días consecutivos con al menos un repaso, contando hacia atrás desde hoy.
 * Si hoy aún no se ha practicado, la racha de ayer sigue viva.
 */
export function computeStreak(stats: DailyStat[], today = dayKey()): number {
  const active = new Set(stats.filter((s) => s.reviews > 0).map((s) => s.date))
  let cursor = active.has(today) ? today : shiftDay(today, -1)
  let streak = 0
  while (active.has(cursor)) {
    streak++
    cursor = shiftDay(cursor, -1)
  }
  return streak
}

// ---------------------------------------------------------------------------
// Ajustes
// ---------------------------------------------------------------------------

export async function loadSettings(): Promise<Settings> {
  const stored = (await (await db()).get('meta', 'settings')) as Partial<Settings> | undefined
  return { ...DEFAULT_SETTINGS, ...stored }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await (await db()).put('meta', settings, 'settings')
}

export async function getDeviceId(): Promise<string> {
  const database = await db()
  const stored = await database.get('meta', 'deviceId')
  if (typeof stored === 'string') return stored
  const created = crypto.randomUUID()
  await database.put('meta', created, 'deviceId')
  return created
}

// ---------------------------------------------------------------------------
// Copia de seguridad
// ---------------------------------------------------------------------------

export interface Backup {
  version: number
  exportedAt: string
  progress: CardProgress[]
  daily: DailyStat[]
  reviews: ReviewLog[]
  settings: Settings
}

export async function exportBackup(): Promise<Backup> {
  const database = await db()
  return {
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    progress: await database.getAll('progress'),
    daily: await database.getAll('daily'),
    reviews: await database.getAll('reviews'),
    settings: await loadSettings(),
  }
}

/** Reemplaza todo el progreso local por el del archivo. */
export async function importBackup(backup: Backup): Promise<void> {
  const database = await db()
  const tx = database.transaction(['progress', 'daily', 'reviews', 'meta'], 'readwrite')
  await Promise.all([
    tx.objectStore('progress').clear(),
    tx.objectStore('daily').clear(),
    tx.objectStore('reviews').clear(),
  ])
  await Promise.all([
    ...backup.progress.map((p) => tx.objectStore('progress').put(p)),
    ...backup.daily.map((d) => tx.objectStore('daily').put(d)),
    // Los ids del log se regeneran para no chocar con el autoincremento.
    ...backup.reviews.map(({ id: _id, ...r }) =>
      tx.objectStore('reviews').add({
        ...r,
        eventId: r.eventId ?? crypto.randomUUID(),
      } as ReviewLog),
    ),
    tx.objectStore('meta').put(backup.settings, 'settings'),
    tx.done,
  ])
}

export async function resetAll(): Promise<void> {
  const database = await db()
  const tx = database.transaction(['progress', 'daily', 'reviews'], 'readwrite')
  await Promise.all([
    tx.objectStore('progress').clear(),
    tx.objectStore('daily').clear(),
    tx.objectStore('reviews').clear(),
    tx.done,
  ])
}
