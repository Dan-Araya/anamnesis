# Anamnesis

_ἀνάμνησις, «recuerdo»._

App de práctica diaria de griego antiguo para el móvil. Funciona como PWA y
como aplicación Android mediante Capacitor. El contenido va en archivos JSON
del repositorio y el progreso se conserva primero en el dispositivo; una
cuenta opcional permite guardarlo también en Supabase.

## Cómo está organizada

El contenido tiene tres niveles: un **módulo** agrupa **secciones**, y una
sección agrupa **cápsulas**. La cápsula es la unidad que se practica.

La pantalla principal es **el camino**: un scroll continuo de nodos, uno por
cápsula. Al pulsar un nodo se abre su material y desde allí se inicia la práctica.
Módulos y secciones no se visitan: son los rótulos que separan tramos.

El avance es lineal. Una cápsula se abre cuando todas las tarjetas activas de
la anterior se han respondido al menos una vez, incluso con errores. El camino
sigue de una sección a la siguiente y de un módulo al siguiente sin cambiar
de pantalla.

Las cuatro pestañas:

| Pestaña      | Para qué                                                        |
| ------------ | --------------------------------------------------------------- |
| **Camino**   | Avanzar. Es donde entra el material nuevo                        |
| **Tarjetas** | Repasar lo ya visto de todas las cápsulas, con la racha del día  |
| **Progreso** | Historial, precisión y previsión de repasos                      |
| **Ajustes**  | Objetivo diario, diacríticos, copias de seguridad           |

## Cápsulas fijas y repaso separado

Cada práctica del camino contiene **todas las tarjetas activas de la cápsula
seleccionada**, una vez y en orden de contenido. No entran tarjetas de otras
cápsulas ni se omiten ejercicios por progreso previo, vencimientos, objetivo
diario o límite de nuevas. Volver tras dos semanas ofrece la misma lección.
Una cápsula parcialmente respondida también se practica completa, conservando
las respuestas ya guardadas; no hay reanudación de una cola interrumpida.

La cola principal queda fija al comenzar y el contador conserva su denominador.
Al terminar, hasta tres tarjetas distintas falladas reaparecen una sola vez en
una fase de **refuerzo** separada, sin bucles. Responder todas las tarjetas
activas al menos una vez completa la cápsula y abre la siguiente; los errores
nunca la vuelven a bloquear.

**Repasar cápsula** repite el contenido completo como práctica libre: ni la
cola principal ni el refuerzo modifican progreso SRS, historial o estadísticas.
En la práctica normal se registran todas las respuestas y se conserva la
programación SRS interna por compatibilidad.

La pestaña **Tarjetas** ofrece exclusivamente el repaso SRS de tarjetas vistas
y vencidas, ordenadas por vencimiento. Conserva su límite por sesión, igual al
objetivo diario, indicado en Ajustes y en Tarjetas. La meta diaria y la racha
siguen contando respuestas normales, sin recortar ni alargar cápsulas. Los
ajustes heredados `newPerDay` y `mixRatio` se conservan al guardar, pero ya no
se ofrecen en la interfaz ni gobiernan el camino.

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
| Palabra        | Reconocer (griego → español), producir (español → griego) y, si la declara, transliterar (griego → latino) |
| Celda de tabla | Una por casilla del paradigma                               |
| Frase          | Una de traducción                                           |

El campo `cards` permite limitar esas direcciones. Las correlaciones y
expresiones largas suelen querer solo `["reconocer"]`: no tiene sentido pedir
que se teclee `τε … καί` letra a letra. La dirección `"transliterar"` requiere
`transliteration` (la respuesta correcta) y `transliterationDistractors`
(exactamente tres alternativas); `check-content` la rechaza sin ellos.

La **transliteración** es una operación distinta de la traducción y de la
pronunciación: cómo se escriben las letras griegas con el alfabeto latino. Por
ahora es básica —no representa acentos ni espíritus— y conserva
correspondencias como θ → th o η → ē. Cada letra declara la suya en el campo
`transliteration`.

En el camino el formato depende únicamente del tipo: reconocer vocabulario,
transliterar y reconocer/producir letras usan opción múltiple; producir
vocabulario y morfología usan escritura; las frases usan traducción y las
tablas completas, huecos. Las letras muestran juntas mayúscula y minúscula
al reconocerlas (también sigma final `ς`); producir pide la minúscula. El
feedback identifica las variantes. No se crean ids adicionales. Los
vencimientos y repeticiones solo afectan al repaso separado de Tarjetas,
que conserva sus formatos y alternancia de variantes SRS.

Para las respuestas en griego hay un teclado politónico en pantalla: pulsa la
letra y luego los diacríticos, o al revés —el acento delante, como en el
teclado español—, que la marca espera a la siguiente vocal. Pulsar el mismo
diacrítico dos veces lo retira, y ninguno cae donde el griego no lo admite.

El campo sigue siendo editable, así que tocarlo abre el teclado del sistema y
se puede alternar entre los dos a mitad de palabra: las teclas de pantalla
escriben en la posición del cursor sin robar el foco.

El repaso de Tarjetas usa SM-2 con pasos de aprendizaje: notas de 1 a 4
e intervalos crecientes. Esta programación no gobierna los ejercicios del camino.

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

El progreso no se sincroniza automáticamente entre dispositivos. En
**Ajustes** puedes exportar e importar un JSON con todo el historial o, si
configuras una cuenta, guardar y restaurar manualmente una copia privada en la
nube. Haz una copia antes de cambiar de móvil o limpiar los datos del navegador.

### Android con Capacitor

Genera los recursos web y actualiza el proyecto nativo:

```bash
npm run build:android
```

Para compilar un APK de desarrollo:

```bash
cd android
ANDROID_HOME=/ruta/al/Android/Sdk ./gradlew assembleDebug
```

El APK queda en `android/app/build/outputs/apk/debug/app-debug.apk`. Para abrir
el proyecto en Android Studio usa `npm run open:android`.

### Widget de racha diaria (Android)

En la app, abre **Ajustes → Añadir widget** y confirma la colocación en Android.
También puedes mantener pulsada la pantalla de inicio y buscar
**Widgets → Anamnesis → Racha diaria**. Muestra la racha, las respuestas de hoy
respecto al objetivo y un botón para entrar directamente a practicar.

El widget recibe una copia de las estadísticas diarias al abrir la app,
practicar, cambiar el objetivo o restaurar el progreso. Esta copia local es
solo para mostrar datos: no modifica IndexedDB ni los identificadores de tarjeta.
Android solicita además actualizaciones periódicas cada 30 minutos (pueden
retrasarse por ahorro de batería); la fecha y la zona horaria del dispositivo
se usan para recalcular el día y la racha. No requiere notificaciones ni red.

Pruebas nativas: `cd android && ./gradlew :app:testDebugUnitTest`.

### Cuenta y respaldo remoto

1. Crea un proyecto en Supabase y ejecuta `supabase/schema.sql` en el editor SQL.
2. Copia `.env.example` a `.env.local` y añade la URL y la clave pública `anon`.
3. En Supabase Auth, configura la URL pública de la aplicación entre las URLs
   de redirección permitidas. Añade también
   `cl.danaraya.anamnesis://auth/callback` para que los enlaces abran Android.

Sin esas variables la aplicación permanece íntegramente local. Usa
`VITE_SUPABASE_PUBLISHABLE_KEY` para la clave pública. Con ellas, en
**Ajustes** aparece el acceso por enlace de correo y los controles para guardar
o restaurar una copia privada. La exportación JSON sigue disponible como
respaldo independiente.

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
