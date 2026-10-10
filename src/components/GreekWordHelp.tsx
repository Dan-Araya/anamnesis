import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getNode } from '@/content'
import { markedGreekLetters } from '@/lib/greek'

/** Ayuda de lectura independiente de la selección y el registro de respuestas. */
export default function GreekWordHelp({ exerciseId, capsuleId, word, label = word, answer }: {
  exerciseId: string; capsuleId: string; word: string; label?: string; answer: string
}) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const bounds = useRef<HTMLDivElement>(null)
  const id = useId()
  const marks = getNode(capsuleId)?.section.id === 'm01-s01' ? markedGreekLetters(word) : []
  const close = () => { setOpen(false); trigger.current?.focus({ preventScroll: true }) }

  useEffect(() => { setOpen(false) }, [exerciseId, word, answer])
  useLayoutEffect(() => {
    if (!open) return
    const position = () => {
      if (!trigger.current || !panel.current || !bounds.current) return
      const anchor = trigger.current.getBoundingClientRect()
      const area = bounds.current.getBoundingClientRect()
      const popup = panel.current
      popup.style.maxWidth = `${area.width}px`
      popup.style.maxHeight = `${area.height}px`
      const { width, height } = popup.getBoundingClientRect()
      popup.style.left = `${Math.max(area.left, Math.min(anchor.left + anchor.width / 2 - width / 2, area.right - width))}px`
      const below = anchor.bottom + 8
      popup.style.top = `${Math.max(area.top, Math.min(below + height <= area.bottom ? below : anchor.top - height - 8, area.bottom - height))}px`
    }
    position()
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
    const outside = (event: MouseEvent) => {
      if (panel.current?.contains(event.target as Node) || trigger.current?.contains(event.target as Node)) return
      // Consumir este toque: no puede elegir la alternativa que queda detrás.
      event.preventDefault()
      event.stopPropagation()
      close()
    }
    const pointer = (event: PointerEvent) => {
      if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) event.preventDefault()
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
    }
    document.addEventListener('click', outside, true)
    document.addEventListener('pointerdown', pointer, true)
    document.addEventListener('keydown', escape, true)
    window.addEventListener('scroll', position, true)
    window.addEventListener('resize', position)
    window.visualViewport?.addEventListener('resize', position)
    window.visualViewport?.addEventListener('scroll', position)
    return () => {
      document.removeEventListener('click', outside, true)
      document.removeEventListener('pointerdown', pointer, true)
      document.removeEventListener('keydown', escape, true)
      window.removeEventListener('scroll', position, true)
      window.removeEventListener('resize', position)
      window.visualViewport?.removeEventListener('resize', position)
      window.visualViewport?.removeEventListener('scroll', position)
    }
  }, [open])

  return <>
    <button ref={trigger} type="button" className="greek-word-help griego"
      aria-label={`Ayuda para ${label}`} aria-expanded={open} aria-controls={open ? id : undefined}
      aria-haspopup="dialog" onClick={() => setOpen(value => !value)}>{label}</button>
    {open && createPortal(<>
      <div ref={bounds} className="word-help-bounds" aria-hidden="true" />
      <div ref={panel} id={id} className="word-help-panel" role="dialog" aria-label={`Ayuda para ${label}`}>
        <button type="button" className="word-help-close" onClick={close} aria-label="Cerrar ayuda">Cerrar ×</button>
        <p>{answer}</p>
        {marks.map(({ original, base, count }) => <p key={original}>
          Mira <span className="griego">{original} → {base}</span>: para este ejercicio, lee la letra sin {count === 1 ? 'la pequeña marca' : 'las pequeñas marcas'} de arriba. {count === 1 ? 'La aprenderás' : 'Las aprenderás'} más adelante.
        </p>)}
      </div>
    </>, document.body)}
  </>
}
