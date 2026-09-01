import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import type { DiacriticName } from '@/lib/greek'
import {
  DIACRITIC_KEYS,
  KEYBOARD_ROWS,
  applyDiacritic,
  backspace,
  canApplyDiacritic,
} from '@/lib/greek'

/**
 * Teclado griego en pantalla. Los teclados de Android no traen politónico
 * cómodo, así que las marcas se aplican a la última letra escrita: pulsa α,
 * luego espíritu suave y agudo, y sale ἄ. Pulsar la misma marca otra vez la
 * retira.
 *
 * También admite el orden del teclado español, donde el acento va delante: si
 * la marca no cabe en lo último escrito —o no hay nada— queda en espera y cae
 * sobre la siguiente vocal que la admita. Así δ, ´, ε produce δέ igual que
 * δ, ε, ´, y nunca se acaba con un acento sobre una consonante.
 *
 * Convive con el teclado del sistema: el campo sigue siendo editable, y estas
 * teclas escriben en la posición del cursor sin robarle el foco, de modo que
 * se puede alternar entre uno y otro a mitad de palabra.
 */
export default function GreekKeyboard({
  value,
  onChange,
  inputRef,
}: {
  value: string
  onChange: (next: string) => void
  inputRef?: RefObject<HTMLInputElement | null>
}) {
  const [pendientes, setPendientes] = useState<DiacriticName[]>([])
  const cursorDeseado = useRef<number | null>(null)

  // Tras repintar con el valor nuevo, devuelve el cursor a donde tocaba.
  useLayoutEffect(() => {
    const el = inputRef?.current
    const pos = cursorDeseado.current
    if (el && pos !== null && document.activeElement === el) {
      el.setSelectionRange(pos, pos)
    }
    cursorDeseado.current = null
  })

  /** Dónde escribir: el cursor si el campo está enfocado, si no al final. */
  const posicion = (): number => {
    const el = inputRef?.current
    if (!el || document.activeElement !== el || el.selectionStart === null) {
      return value.length
    }
    return el.selectionStart
  }

  /** Aplica una transformación al texto que queda a la izquierda del cursor. */
  const escribir = (transformar: (antes: string) => string) => {
    const corte = posicion()
    const antes = transformar(value.slice(0, corte))
    cursorDeseado.current = antes.length
    onChange(antes + value.slice(corte))
    return antes
  }

  const pulsarLetra = (letra: string) => {
    const quedan: DiacriticName[] = []
    escribir((antes) => {
      let texto = antes + letra
      for (const d of pendientes) {
        if (canApplyDiacritic(texto, d)) texto = applyDiacritic(texto, d)
        else quedan.push(d)
      }
      return texto
    })
    setPendientes(quedan)
  }

  const pulsarDiacritico = (d: DiacriticName) => {
    if (pendientes.includes(d)) {
      setPendientes(pendientes.filter((p) => p !== d))
      return
    }
    const corte = posicion()
    if (canApplyDiacritic(value.slice(0, corte), d)) {
      escribir((antes) => applyDiacritic(antes, d))
      return
    }
    // Todavía no hay dónde ponerlo: espera a la próxima vocal.
    setPendientes([...pendientes, d])
  }

  /**
   * Pulsar una tecla no debe mover el foco: si el campo estaba enfocado,
   * conserva su cursor; y si no lo estaba, no abre el teclado del sistema.
   */
  const noRobarFoco = (e: React.PointerEvent) => e.preventDefault()

  return (
    <div className="teclado">
      {KEYBOARD_ROWS.map((row, i) => (
        <div className="teclado__fila" key={i}>
          {row.map((letter) => (
            <button
              key={letter}
              type="button"
              className="tecla griego"
              onPointerDown={noRobarFoco}
              onClick={() => pulsarLetra(letter)}
            >
              {letter}
            </button>
          ))}
        </div>
      ))}

      <div className="teclado__fila">
        {DIACRITIC_KEYS.map((d) => (
          <button
            key={d.name}
            type="button"
            className={`tecla tecla--modificador griego ${
              pendientes.includes(d.name) ? 'tecla--pendiente' : ''
            }`}
            title={d.hint}
            aria-label={d.hint}
            aria-pressed={pendientes.includes(d.name)}
            onPointerDown={noRobarFoco}
            onClick={() => pulsarDiacritico(d.name)}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="teclado__fila">
        <button
          type="button"
          className="tecla tecla--ancha"
          aria-label="Espacio"
          onPointerDown={noRobarFoco}
          onClick={() => {
            setPendientes([])
            escribir((antes) => antes + ' ')
          }}
        >
          ␣
        </button>
        <button
          type="button"
          className="tecla tecla--ancha"
          aria-label="Borrar"
          onPointerDown={noRobarFoco}
          onClick={() => {
            // Si hay marcas en espera, lo primero que se borra son ellas.
            if (pendientes.length > 0) setPendientes(pendientes.slice(0, -1))
            else escribir(backspace)
          }}
        >
          ⌫
        </button>
      </div>
    </div>
  )
}
