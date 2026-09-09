import { useEffect, useRef } from 'react'
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import { useStore } from '@/store'

interface PracticeWidgetPlugin {
  update(snapshot: { daily: { date: string; reviews: number }[]; goal: number }): Promise<void>
  requestPin(): Promise<{ supported: boolean; requested?: boolean }>
  consumePractice(): Promise<{ requested: boolean }>
  addListener(event: 'practiceRequested', listener: () => void): Promise<PluginListenerHandle>
}

const Widget = registerPlugin<PracticeWidgetPlugin>('PracticeWidget')
export const supportsPracticeWidget = () => Capacitor.getPlatform() === 'android'

export async function requestPracticeWidget(): Promise<string> {
  if (!supportsPracticeWidget()) return 'El widget está disponible en la app de Android.'
  const result = await Widget.requestPin()
  return result.supported && result.requested
    ? 'Confirma «Añadir» en la ventana de Android. Si no aparece, busca Anamnesis en los widgets de tu pantalla de inicio.'
    : 'Mantén pulsado un espacio vacío de la pantalla de inicio, entra en Widgets y busca Anamnesis → Racha diaria.'
}

/** Sends only a display cache. IndexedDB remains the source of truth. */
export function usePracticeWidget(onPracticeRequested: () => void) {
  const { ready, daily, settings } = useStore()
  const onPractice = useRef(onPracticeRequested)
  onPractice.current = onPracticeRequested

  useEffect(() => {
    if (!ready || !supportsPracticeWidget()) return
    void Widget.update({
      daily: daily.map(({ date, reviews }) => ({ date, reviews })),
      goal: settings.dailyGoal,
    }).catch(() => console.warn('No se pudo actualizar el widget de práctica.'))
  }, [ready, daily, settings.dailyGoal])

  useEffect(() => {
    if (!ready || !supportsPracticeWidget()) return
    let disposed = false
    let listener: PluginListenerHandle | undefined
    const consume = async () => {
      const { requested } = await Widget.consumePractice()
      if (requested && !disposed) onPractice.current()
    }
    void (async () => {
      listener = await Widget.addListener('practiceRequested', () => {
        void consume().catch(() => console.warn('No se pudo abrir la práctica desde el widget.'))
      })
      if (disposed) { await listener.remove(); return }
      await consume()
    })().catch(() => console.warn('No se pudo conectar el widget de práctica.'))
    return () => { disposed = true; void listener?.remove() }
  }, [ready])
}
