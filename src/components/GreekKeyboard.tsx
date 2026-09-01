import { useState } from 'react'
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
 */
export default function GreekKeyboard({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  const [pendientes, setPendientes] = useState<DiacriticName[]>([])

  const pulsarLetra = (letra: string) => {
    let siguiente = value + letra
    const quedan: DiacriticName[] = []

    for (const d of pendientes) {
      if (canApplyDiacritic(siguiente, d)) siguiente = applyDiacritic(siguiente, d)
      else quedan.push(d)
    }

    setPendientes(quedan)
    onChange(siguiente)
  }

  const pulsarDiacritico = (d: DiacriticName) => {
    if (pendientes.includes(d)) {
      setPendientes(pendientes.filter((p) => p !== d))
      return
    }
    if (canApplyDiacritic(value, d)) {
      onChange(applyDiacritic(value, d))
      return
    }
    // Todavía no hay dónde ponerlo: espera a la próxima vocal.
    setPendientes([...pendientes, d])
  }

  return (
    <div className="teclado">
      {KEYBOARD_ROWS.map((row, i) => (
        <div className="teclado__fila" key={i}>
          {row.map((letter) => (
            <button
              key={letter}
              type="button"
              className="tecla griego"
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
          onClick={() => {
            setPendientes([])
            onChange(value + ' ')
          }}
        >
          ␣
        </button>
        <button
          type="button"
          className="tecla tecla--ancha"
          aria-label="Borrar"
          onClick={() => {
            // Si hay marcas en espera, lo primero que se borra son ellas.
            if (pendientes.length > 0) setPendientes(pendientes.slice(0, -1))
            else onChange(backspace(value))
          }}
        >
          ⌫
        </button>
      </div>
    </div>
  )
}
