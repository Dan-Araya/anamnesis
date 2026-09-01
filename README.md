# Anamnesis

_ἀνάμνησις, «recuerdo»._

App de práctica diaria de griego antiguo para el móvil. PWA instalable, sin
servidor ni cuentas: el contenido va en archivos JSON del repositorio y el
progreso vive en el IndexedDB del dispositivo.

El material está organizado en **módulos** numerados que se abren en orden: el
módulo siguiente se desbloquea al alcanzar el umbral de dominio del anterior
(60 % por defecto, ajustable).

## Comandos

| Comando                 | Qué hace                                              |
| ----------------------- | ----------------------------------------------------- |
| `npm run dev`           | Servidor de desarrollo (`--host` para verlo en la LAN) |
| `npm test`              | Pruebas de la lógica y de la interfaz                  |
| `npm run check-content` | Valida los JSON de contenido antes de publicar         |
| `npm run build`         | Comprueba tipos y compila a `dist/`                    |
| `npm run deploy`        | Compila y publica en GitHub Pages                      |

## Añadir contenido

Cada módulo es un archivo en `src/content/modules/`. Copia `module-03.json`,
súbele el número y rellénalo: el cargador recoge automáticamente cualquier
`.json` de esa carpeta y los ordena por `number`. No hay que registrar nada.

```jsonc
{
  "id": "module-04",          // único; no lo cambies después
  "number": 4,
  "title": "Aoristo",
  "summary": "Descripción corta que se ve en la lista.",

  "vocabulary": [
    {
      "id": "m04-luo",        // único en todo el proyecto
      "greek": "λύω",
      "info": "λύσω, ἔλυσα",  // opcional: genitivo, partes principales, régimen
      "es": ["soltar", "desatar"], // la primera es la principal
      "pos": "verbo",
      "notes": "Aparece bajo la respuesta.",
      "tags": ["temático"]
    }
  ],

  "paradigms": [
    {
      "id": "m04-luo-aor",
      "title": "Aoristo de indicativo activo",
      "lemma": "λύω",
      "gloss": "solté",
      "axes": [
        { "id": "numero", "label": "Número",
          "values": [{ "id": "sg", "label": "Singular" }, { "id": "pl", "label": "Plural" }] },
        { "id": "persona", "label": "Persona",
          "values": [{ "id": "1", "label": "1ª" }, { "id": "2", "label": "2ª" }] }
      ],
      // La clave une los ids de cada eje en el orden declarado.
      // Un array lista varias formas aceptadas.
      "cells": {
        "sg|1": "ἔλυσα",
        "sg|2": "ἔλυσας",
        "pl|1": "ἐλύσαμεν",
        "pl|2": "ἐλύσατε"
      },
      "notes": "Nota al pie de la tabla."
    }
  ],

  "sentences": [
    {
      "id": "m04-s1",
      "greek": "τοὺς ἵππους ἔλυσαν.",
      "es": ["Soltaron los caballos."],  // varias traducciones válidas
      "hint": "Pista opcional, se pide a mano."
    }
  ],

  "grammar": [
    { "id": "m04-g1", "title": "El aumento", "body": "Texto explicativo." }
  ]
}
```

Los cuatro apartados pueden ir vacíos (`[]`). Un módulo sin contenido aparece
en la lista pero no bloquea la progresión.

Al terminar, `npm run check-content` avisa de ids repetidos, celdas que no
casan con los ejes declarados, paradigmas incompletos y texto griego que no
esté en forma Unicode NFC.

**Los `id` son la memoria del progreso.** Puedes corregir la grafía, la
traducción o las notas de una entrada cuando quieras, pero si cambias su `id`
la app la tratará como una tarjeta nueva y perderás su historial.

## Cómo se practica

De cada entrada de contenido salen varias tarjetas independientes:

| Contenido        | Tarjetas que genera                                       |
| ---------------- | --------------------------------------------------------- |
| Palabra          | Reconocer (griego → español) y producir (español → griego) |
| Celda de tabla   | Una por casilla del paradigma                              |
| Frase            | Una de traducción                                          |

El formato de la pregunta se endurece según se asienta la tarjeta: primero
opción múltiple, después escribir la forma de memoria o autoevaluarse con una
flashcard. Las respuestas en griego se escriben con el teclado politónico en
pantalla (pulsa la letra y luego los diacríticos; pulsar el mismo diacrítico
dos veces lo retira).

La repetición espaciada es SM-2 con pasos de aprendizaje, el mismo esquema de
Anki: notas de 1 a 4, intervalos crecientes y vuelta a empezar al olvidar. Lo
que se falla reaparece antes de terminar la sesión.

## Publicar e instalar en el móvil

La app asume que cuelga de `/anamnesis/` (el nombre del repositorio en
GitHub Pages). Si publicas en otro sitio, compila con `BASE_PATH=/ npm run build`.

```bash
git init && git add . && git commit -m "Primera versión"
gh repo create anamnesis --private --source=. --push
npm run deploy          # publica dist/ en la rama gh-pages
```

En GitHub: **Settings → Pages → Source: Deploy from a branch → `gh-pages` / root**.
En un par de minutos la app estará en `https://<usuario>.github.io/anamnesis/`.

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
  lib/
    greek.ts          Unicode politónico, comparación de respuestas, teclado
    srs.ts            Repetición espaciada
    progression.ts    Desbloqueo de módulos y armado de la sesión
    session.ts        Une el contenido con las reglas de progresión
    db.ts             IndexedDB: progreso, historial, racha, copias
  components/         Teclado, tablas y los cuatro tipos de ejercicio
  screens/            Inicio, sesión, módulos, progreso y ajustes
scripts/              Validador de contenido y pruebas
```
