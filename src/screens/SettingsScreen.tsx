import { useRef, useState } from 'react'
import { useStore } from '@/store'
import { useAuth } from '@/auth'
import { restoreCloudBackup, saveCloudBackup } from '@/lib/cloud'
import { dayKey, exportBackup, importBackup, resetAll, type Backup } from '@/lib/db'

export default function SettingsScreen() {
  const { settings, updateSettings, refresh } = useStore()
  const fileInput = useRef<HTMLInputElement>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const exportar = async () => {
    const backup = await exportBackup()
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `griego-progreso-${dayKey()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setAviso('Copia descargada.')
  }

  const importar = async (file: File) => {
    try {
      const backup = JSON.parse(await file.text()) as Backup
      if (!Array.isArray(backup.progress)) throw new Error('formato')
      if (!confirm('Esto reemplazará todo tu progreso actual. ¿Seguir?')) return
      await importBackup(backup)
      await refresh()
      setAviso('Progreso restaurado.')
    } catch {
      setAviso('El archivo no tiene el formato esperado.')
    }
  }

  const borrar = async () => {
    if (!confirm('Se borrará todo el progreso. Esta acción no se puede deshacer.')) return
    await resetAll()
    await refresh()
    setAviso('Progreso borrado.')
  }

  return (
    <div className="screen">
      <h1 className="screen__title">Ajustes</h1>

      <AccountCard onRestored={refresh} />

      <div className="card">
        <div className="campo">
          <div>
            <div className="campo__label">Tarjetas nuevas al día</div>
            <div className="muted small">Cuánto material fresco entra cada jornada.</div>
          </div>
          <input
            type="number"
            min={0}
            max={100}
            value={settings.newPerDay}
            onChange={(e) => void updateSettings({ newPerDay: clamp(e.target.value, 0, 100) })}
          />
        </div>

        <div className="campo">
          <div>
            <div className="campo__label">Objetivo diario</div>
            <div className="muted small">Tarjetas por sesión, repasos incluidos.</div>
          </div>
          <input
            type="number"
            min={5}
            max={300}
            value={settings.dailyGoal}
            onChange={(e) => void updateSettings({ dailyGoal: clamp(e.target.value, 5, 300) })}
          />
        </div>

        <div className="campo">
          <div>
            <div className="campo__label">Repaso mezclado</div>
            <div className="muted small">
              Qué parte de una cápsula nueva se dedica a repasar lo anterior. Con 0 cada
              cápsula sería estanca.
            </div>
          </div>
          <input
            type="number"
            min={0}
            max={80}
            step={10}
            value={Math.round(settings.mixRatio * 100)}
            onChange={(e) => void updateSettings({ mixRatio: clamp(e.target.value, 0, 80) / 100 })}
          />
        </div>

        <div className="campo">
          <div>
            <div className="campo__label">Dominio para desbloquear</div>
            <div className="muted small">
              Porcentaje del módulo necesario para abrir el siguiente.
            </div>
          </div>
          <input
            type="number"
            min={10}
            max={100}
            step={5}
            value={Math.round(settings.unlockThreshold * 100)}
            onChange={(e) =>
              void updateSettings({ unlockThreshold: clamp(e.target.value, 10, 100) / 100 })
            }
          />
        </div>
      </div>

      <div className="card">
        <Interruptor
          label="Exigir acentos y espíritus"
          hint="Con esto activo, una respuesta sin diacríticos correctos cuenta como fallo."
          checked={settings.strictDiacritics}
          onChange={(v) => void updateSettings({ strictDiacritics: v })}
        />
        <Interruptor
          label="Teclado griego en pantalla"
          hint="Convive con el del sistema: toca el campo para escribir con tu teclado. Desactívalo si ya tienes uno politónico."
          checked={settings.showKeyboard}
          onChange={(v) => void updateSettings({ showKeyboard: v })}
        />
        <Interruptor
          label="Tema oscuro"
          hint="El claro se lee mejor a plena luz."
          checked={settings.theme === 'oscuro'}
          onChange={(v) => void updateSettings({ theme: v ? 'oscuro' : 'claro' })}
        />
      </div>

      <div className="card">
        <strong>Copia de seguridad</strong>
        <p className="muted small">
          El progreso vive solo en este dispositivo. Exporta de vez en cuando si no quieres
          perderlo al cambiar de móvil o limpiar los datos del navegador.
        </p>
        <div className="stack">
          <button type="button" className="btn btn--wide" onClick={() => void exportar()}>
            Exportar progreso
          </button>
          <button
            type="button"
            className="btn btn--wide"
            onClick={() => fileInput.current?.click()}
          >
            Importar progreso
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void importar(file)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            className="btn btn--wide btn--danger"
            onClick={() => void borrar()}
          >
            Borrar todo el progreso
          </button>
        </div>
        {aviso && (
          <p className="small" style={{ marginBottom: 0 }}>
            {aviso}
          </p>
        )}
      </div>

      <div className="card">
        <strong>Añadir contenido</strong>
        <p className="muted small" style={{ marginBottom: 0 }}>
          Cada módulo es un archivo JSON en <code>src/content/modules/</code>. Copia{' '}
          <code>module-03.json</code>, cámbiale el número y rellena vocabulario, paradigmas y
          frases. Al publicar de nuevo la app, el contenido nuevo aparece sin tocar tu
          progreso.
        </p>
      </div>
    </div>
  )
}

function AccountCard({ onRestored }: { onRestored: () => Promise<void> }) {
  const { configured, loading, user, sendMagicLink, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const action = async (work: () => Promise<void>) => {
    setBusy(true)
    setMessage(null)
    try {
      await work()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo completar la acción.')
    } finally {
      setBusy(false)
    }
  }

  if (!configured) {
    return (
      <div className="card account-card">
        <div className="eyebrow">Cuenta y respaldo</div>
        <strong>Conecta Supabase para proteger tu progreso</strong>
        <p className="muted small">
          La práctica seguirá guardándose en este dispositivo. Añade las variables de
          entorno para habilitar una copia privada en la nube.
        </p>
        <span className="status-pill">Modo local</span>
      </div>
    )
  }

  if (loading) {
    return <div className="card account-card muted">Comprobando tu cuenta…</div>
  }

  if (!user) {
    return (
      <div className="card account-card">
        <div className="eyebrow">Cuenta y respaldo</div>
        <strong>Protege tu progreso</strong>
        <p className="muted small">Recibe un enlace de acceso. No necesitas contraseña.</p>
        <label className="input-label" htmlFor="account-email">Correo electrónico</label>
        <input
          id="account-email"
          className="text-input"
          type="email"
          autoComplete="email"
          placeholder="nombre@correo.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <button
          type="button"
          className="btn btn--primary btn--wide"
          disabled={busy || !email.includes('@')}
          onClick={() => void action(async () => {
            await sendMagicLink(email.trim())
            setMessage('Revisa tu correo para entrar en Anamnesis.')
          })}
        >
          Enviarme un enlace
        </button>
        {message && <p className="small account-message">{message}</p>}
      </div>
    )
  }

  return (
    <div className="card account-card">
      <div className="account-heading">
        <div>
          <div className="eyebrow">Cuenta conectada</div>
          <strong>{user.email}</strong>
        </div>
        <span className="status-pill status-pill--ok">Protegido</span>
      </div>
      <p className="muted small">
        Tú decides cuándo guardar o restaurar. La copia local permanece disponible sin
        conexión.
      </p>
      <div className="stack">
        <button
          type="button"
          className="btn btn--primary btn--wide"
          disabled={busy}
          onClick={() => void action(async () => {
            const date = await saveCloudBackup(user)
            setMessage(`Copia guardada: ${new Date(date).toLocaleString()}.`)
          })}
        >
          Guardar en la nube
        </button>
        <button
          type="button"
          className="btn btn--wide"
          disabled={busy}
          onClick={() => void action(async () => {
            if (!confirm('Esto reemplazará el progreso de este dispositivo. ¿Seguir?')) return
            const date = await restoreCloudBackup()
            await onRestored()
            setMessage(`Copia restaurada: ${new Date(date).toLocaleString()}.`)
          })}
        >
          Restaurar desde la nube
        </button>
        <button type="button" className="btn btn--ghost btn--wide" disabled={busy} onClick={() => void action(signOut)}>
          Cerrar sesión
        </button>
      </div>
      {message && <p className="small account-message">{message}</p>}
    </div>
  )
}

function clamp(value: string, min: number, max: number): number {
  const n = Number(value)
  if (Number.isNaN(n)) return min
  return Math.min(max, Math.max(min, Math.round(n)))
}

function Interruptor({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="campo">
      <div>
        <div className="campo__label">{label}</div>
        <div className="muted small">{hint}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className="switch"
        onClick={() => onChange(!checked)}
      />
    </div>
  )
}
