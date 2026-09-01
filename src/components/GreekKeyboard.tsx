import { DIACRITIC_KEYS, KEYBOARD_ROWS, applyDiacritic, backspace } from '@/lib/greek'

/**
 * Teclado griego en pantalla. Los teclados de Android no traen politónico
 * cómodo, así que las marcas se aplican a la última letra escrita: pulsa α,
 * luego espíritu suave y agudo, y sale ἄ. Pulsar la misma marca otra vez la
 * retira.
 */
export default function GreekKeyboard({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  return (
    <div className="teclado">
      {KEYBOARD_ROWS.map((row, i) => (
        <div className="teclado__fila" key={i}>
          {row.map((letter) => (
            <button
              key={letter}
              type="button"
              className="tecla griego"
              onClick={() => onChange(value + letter)}
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
            className="tecla tecla--modificador griego"
            title={d.hint}
            aria-label={d.hint}
            onClick={() => onChange(applyDiacritic(value, d.name))}
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
          onClick={() => onChange(value + ' ')}
        >
          ␣
        </button>
        <button
          type="button"
          className="tecla tecla--ancha"
          aria-label="Borrar"
          onClick={() => onChange(backspace(value))}
        >
          ⌫
        </button>
      </div>
    </div>
  )
}
