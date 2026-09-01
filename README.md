# Anamnesis

_ἀνάμνησις, «recuerdo»._

App de práctica diaria de griego antiguo para el móvil. PWA instalable, sin
servidor ni cuentas: el contenido va en archivos JSON del repositorio y el
progreso vive en el IndexedDB del dispositivo.

## Cómo está organizada

El contenido tiene tres niveles: un **módulo** agrupa **secciones**, y una
sección agrupa **cápsulas**. La cápsula es la unidad que se practica.

La pantalla principal es **el camino**: un scroll continuo de nodos, uno por
cápsula. Al pulsar un nodo se practica directamente, sin pantallas intermedias.
Módulos y secciones no se visitan: son los rótulos que separan tramos.

El avance es lineal. Una cápsula se abre cuando la anterior alcanza el umbral
de dominio, y el camino sigue de una sección a la siguiente y de un módulo al
siguiente sin cambiar de pantalla.

Las cuatro pestañas:

| Pestaña      | Para qué                                                        |
| ------------ | --------------------------------------------------------------- |
| **Camino**   | Avanzar. Es donde entra el material nuevo                        |
| **Tarjetas** | Repasar lo ya visto de todas las cápsulas, con la racha del día  |
| **Progreso** | Historial, precisión y previsión de repasos                      |
| **Ajustes**  | Ritmo diario, mezcla, diacríticos, copias de seguridad           |

## Nada se da por sabido

Terminar una cápsula no la archiva. Al practicar una cápsula nueva, parte de la
sesión se dedica a material de las anteriores, para que lo aprendido siga
volviendo:

1. Entran **todas las tarjetas vencidas**, las más atrasadas primero.
2. Si no bastan para llenar la proporción de repaso (**40 % por defecto**,
   ajustable de 0 a 80 %), se **adelantan repasos** que aún no tocaban,
   empezando por los de la misma sección y los más próximos a vencer.

Adelantar un repaso no falsea la programación: acertar una tarjeta mucho antes
de tiempo la refresca pero **no alarga su intervalo** (`EARLY_THRESHOLD` en
`src/lib/srs.ts`). Fallarla, en cambio, sí la penaliza siempre.

Dentro de una misma sesión, una tarjeta vuelve a aparecer mientras siga en
aprendizaje —no solo cuando se falla—, hasta un máximo de cuatro veces. Así el
vocabulario nuevo se ve un par de veces antes de terminar y llega a graduarse.

## Comandos

| Comando                 | Qué hace                                               |
| ----------------------- | ------------------------------------------------------ |
| `npm run dev`           | Servidor de desarrollo (`--host` para verlo en la LAN) |
| `npm test`              | Pruebas de la lógica y de la interfaz                   |
| `npm run check-content` | Valida los JSON de contenido antes de publicar          |
| `npm run build`         | Comprueba tipos y compila a `dist/`                     |
| `npm run deploy`        | Compila y publica en GitHub Pages                       |

## Añadir contenido

Cada módulo es un archivo en `src/content/modules/`. El cargador recoge
automáticamente cualquier `.json` de esa carpeta y ordena módulos, secciones y
cápsulas por su `number`, así que no hay que registrar nada. Tienes una
plantilla lista para copiar en `src/content/plantilla.json` (está fuera de
`modules/` justamente para que no aparezca como un módulo más).

Los títulos son opcionales en los tres niveles: mientras no los pongas se
muestra «Módulo 1», «Sección 2», «Cápsula 3».

```jsonc
{
  "id": "module-01",              // único; no lo cambies después
  "number": 1,
  "title": "Opcional",
  "sections": [
    {
      "id": "m01-s01",
      "number": 1,
      "title": "Opcional",
      "capsules": [
        {
          "id": "m01-s01-c02",
          "number": 2,
          "title": "Opcional",

          "vocabulary": [
            {
              "id": "m01-s01-logos",      // único en todo el proyecto
              "greek": "λόγος",
              "info": "ὁ, -ου",           // genitivo, partes principales, régimen…
              "es": ["palabra", "razón"], // la primera es la principal
              "pos": "sustantivo",
              "notes": "Aparece bajo la respuesta y en el material.",
              "cards": ["reconocer"]      // opcional; por defecto ambas direcciones
            }
          ],

          "paradigms": [
            {
              "id": "m01-s01-logos-decl",
              "title": "2ª declinación",
              "lemma": "λόγος, ὁ",
              "gloss": "la palabra",
              "axes": [
                { "id": "numero", "label": "Número",
                  "values": [{ "id": "sg", "label": "Singular" }, { "id": "pl", "label": "Plural" }] },
                { "id": "caso", "label": "Caso",
                  "values": [{ "id": "nom", "label": "Nominativo" }, { "id": "ac", "label": "Acusativo" }] }
              ],
              // La clave une los ids de cada eje en el orden declarado.
              // Un array lista varias formas aceptadas.
              "cells": {
                "sg|nom": "λόγος",
                "sg|ac": "λόγον",
                "pl|nom": "λόγοι",
                "pl|ac": ["λόγους", "λόγος"]
              },
              "notes": "Nota al pie de la tabla."
            }
          ],

          "sentences": [
            {
              "id": "m01-s01-f1",
              "greek": "ὁ λόγος καλός.",
              "es": ["La palabra es hermosa."],  // varias traducciones válidas
              "hint": "Pista opcional, se pide a mano."
            }
          ],

          "grammar": [
            { "id": "m01-s01-g1", "title": "El artículo", "body": "Explicación." }
          ]
        }
      ]
    }
  ]
}
```

Los cuatro apartados de una cápsula pueden ir vacíos (`[]`). Una cápsula sin
contenido aparece en el camino pero no bloquea el paso a la siguiente.

Al terminar, `npm run check-content` avisa de ids repetidos, números de sección
o cápsula duplicados, celdas que no casan con los ejes declarados, paradigmas
incompletos y texto griego que no esté en forma Unicode NFC.

**Los `id` son la memoria del progreso.** Puedes corregir la grafía, la
traducción o las notas de una entrada, e incluso moverla de cápsula, sin perder
su historial. Lo que no puedes es cambiarle el `id`: entonces la app la trata
como una tarjeta nueva.

## Cómo se practica

De cada entrada de contenido salen varias tarjetas independientes:

| Contenido      | Tarjetas que genera                                        |
| -------------- | ---------------------------------------------------------- |
| Palabra        | Reconocer (griego → español) y producir (español → griego)  |
| Celda de tabla | Una por casilla del paradigma                               |
| Frase          | Una de traducción                                           |

El campo `cards` permite limitar esas direcciones. Las correlaciones y
expresiones largas suelen querer solo `["reconocer"]`: no tiene sentido pedir
que se teclee `τε … καί` letra a letra.

El formato de la pregunta se endurece según se asienta la tarjeta: primero
opción múltiple, después escribir la forma de memoria o autoevaluarse con una
flashcard. Las respuestas en griego se escriben con el teclado politónico en
pantalla (pulsa la letra y luego los diacríticos; pulsar el mismo diacrítico
dos veces lo retira).

La repetición espaciada es SM-2 con pasos de aprendizaje, el mismo esquema de
Anki: notas de 1 a 4 e intervalos crecientes.

## Publicar e instalar en el móvil

La app asume que cuelga de `/anamnesis/` (el nombre del repositorio en GitHub
Pages). Si publicas en otro sitio, compila con `BASE_PATH=/ npm run build`.

```bash
npm run deploy          # publica dist/ en la rama gh-pages
```

En GitHub: **Settings → Pages → Source: Deploy from a branch → `gh-pages` / root**.
En un par de minutos la app estará en `https://dan-araya.github.io/anamnesis/`.

Ábrela en Chrome en el móvil y elige **Añadir a pantalla de inicio**. A partir
de ahí funciona sin conexión y se actualiza sola cuando vuelvas a publicar.

El progreso no se sincroniza entre dispositivos. En **Ajustes** puedes exportar
e importar un JSON con todo el historial: hazlo antes de cambiar de móvil o de
limpiar los datos del navegador.

## Estructura

```
src/
  content/
    index.ts          Carga los módulos y deriva las tarjetas
    modules/*.json    El material de estudio
    plantilla.json    Copia esto para crear un módulo
  lib/
    greek.ts          Unicode politónico, comparación de respuestas, teclado
    srs.ts            Repetición espaciada
    progression.ts    Desbloqueo del camino y armado de la sesión
    session.ts        Une el contenido con las reglas del camino
    db.ts             IndexedDB: progreso, historial, racha, copias
  components/         Teclado, tablas y los cuatro tipos de ejercicio
  screens/            Camino, sesión, cápsula, tarjetas, progreso y ajustes
scripts/              Validador de contenido y pruebas
```
