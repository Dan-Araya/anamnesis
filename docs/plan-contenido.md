# Plan de contenido de Anamnesis

Este documento define el contenido antes de implementarlo. El módulo actual es
provisional y se podrá reemplazar cuando la estructura quede aprobada. Cambiar
su contenido e identificadores requerirá decidir explícitamente cómo preservar
o reiniciar el progreso existente.

## Principios didácticos

- El recorrido empieza desde cero para que también sirva a quien nunca ha leído
  griego, aunque el primer usuario ya conozca el alfabeto.
- Cada cápsula introduce poco material nuevo y la cola SRS mezcla lo recién
  aprendido con tarjetas de cápsulas anteriores. La proporción predeterminada
  de repaso sigue siendo 40 %.
- Las letras se presentan en el orden alfabético real, de alfa a omega.
- Una letra comprende tres datos distintos: su forma, su nombre y su valor
  fonético básico. No deben confundirse el nombre de la letra y el sonido que
  representa.
- Las palabras aparecen solo después de que se hayan presentado todas sus
  letras. En esta primera sección se prefieren palabras con una herencia
  reconocible en español: deben producir curiosidad y mostrar desde el inicio
  que el griego ya forma parte del mundo lingüístico del estudiante.
- Las partículas y palabras funcionales (`καί`, `πρός`, `σύ`, `τε`,
  `ὦ`, `ἔπειτα`...) se reservan para una sección posterior, donde puedan
  aprenderse juntas y usarse con sentido en frases. `δέ` es la excepción
  introductoria ya aprobada: se reconoce y se translitera desde la cápsula 2,
  antes de que el tema de las partículas se trate como tal.
- Los acentos, espíritus y demás diacríticos pueden aparecer visualmente en
  palabras reales, pero no se explican ni se califican en esta sección. Tendrán
  su propia sección posterior.
- La forma minúscula es la principal porque es la habitual en las ediciones
  modernas. La mayúscula se enseña junto a ella como reconocimiento, sin
  duplicar innecesariamente la carga de tarjetas.
- Sigma final (`ς`) se enseña como variante contextual de sigma, no como una
  letra número 25.

## Pronunciación y producción de audio

Antes de publicar audio hay que fijar un modelo único. La recomendación inicial
es pronunciación ática reconstruida de los siglos V–IV a. C., explicada para
hispanohablantes. Es la opción más coherente con un curso de griego antiguo,
pero debe confirmarse porque afecta vocales, diptongos, aspiradas y letras como
beta, gamma y dseta.

Cada letra necesitará, conceptualmente, dos audios diferenciados:

1. nombre de la letra;
2. sonido o valor fonético básico.

El entorno del proyecto ya tiene `espeak-ng` y una voz específica `grc`
(Greek Ancient), además de `ffmpeg`. Una prueba local diferencia claramente la
salida antigua de la moderna: `ψυχή` se transcribe aproximadamente
`/psyxɛː/` con `grc`, frente a `/psiçi/` con `el`. Es una base automatizable,
aunque su síntesis es robótica y no reproduce por sí sola todos los matices de
una reconstrucción histórica, especialmente el acento tonal.

La estrategia recomendada es híbrida y reproducible:

1. definir y revisar una transcripción fonética canónica para cada letra y
   palabra, sin dejar que el sintetizador decida el modelo pedagógico;
2. generar borradores empaquetados con `espeak-ng -v grc` y normalizarlos con
   `ffmpeg`;
3. revisar cada archivo de oído;
4. reemplazar manualmente solo los casos deficientes, mediante grabación humana
   u otra voz, conservando nombres de archivo y volumen homogéneos.

Así no hace falta grabar todo desde el principio y la app sigue funcionando sin
red. La estructura de datos y el ejercicio auditivo se diseñarán al implementar
el contenido; este plan no cambia todavía los tipos ni genera tarjetas nuevas.

## Módulo 1 — Leer el alfabeto

El módulo tendrá una sola sección, **El alfabeto**, con nueve cápsulas: ocho
grupos de tres letras y una consolidación. Tres letras por cápsula mantienen la
carga cerca del límite predeterminado de diez tarjetas nuevas diarias, incluso
al sumar una palabra breve.

| Cápsula | Letras nuevas | Vocabulario real | Objetivo adicional |
| --- | --- | --- | --- |
| 1 | Α α · Β β · Γ γ | — | Distinguir forma, nombre y sonido; descubrir que «alfabeto» une los nombres alfa y beta. |
| 2 | Δ δ · Ε ε · Ζ ζ | δέ | Consolidar el mecanismo de lectura y reconocer la primera palabra real: la partícula δέ con su acento (que no se evalúa todavía). |
| 3 | Η η · Θ θ · Ι ι | θεά | Leer la primera palabra-puente: «diosa», y descubrir el elemento teo- de palabras como «teología». |
| 4 | Κ κ · Λ λ · Μ μ | κλῖμα | Relacionar «inclinación / región» con la familia de «clima». |
| 5 | Ν ν · Ξ ξ · Ο ο | ὄνομα | Relacionar «nombre» con «onomástica» y formaciones como «anónimo» y «sinónimo». |
| 6 | Π π · Ρ ρ · Σ σ/ς | ποίησις | Enseñar sigma medial/final y relacionar «creación / producción» con «poesía» y «poema». |
| 7 | Τ τ · Υ υ · Φ φ | μῦθος | Relacionar «relato / mito» con la familia de «mito» y practicar el valor propio de υ/φ en el modelo elegido. |
| 8 | Χ χ · Ψ ψ · Ω ω | ψυχή | Completar el alfabeto con «alma/vida» → «psique/psicología». |
| 9 | ninguna | lectura de cierre | Leer palabras como ἄνθρωπος, κόσμος y φιλοσοφία; descubrir las familias «antropo-», «cosmos/cosmético» y «filosofía» sin convertirlas todas en tarjetas nuevas. |

Estas conexiones son familias etimológicas, no siempre préstamos directos de
la forma exacta mostrada. La explicación de cada palabra debe distinguirlo con
honestidad y evitar equivalencias engañosas.

## Experiencia de cada cápsula

1. Una introducción breve muestra las tres parejas mayúscula/minúscula.
2. Para cada letra se presenta el nombre, se reproduce su nombre y se explica
   su sonido básico con una comparación breve en español cuando sea posible.
3. La práctica comprueba reconocimiento de forma y nombre, producción de la
   minúscula y reconocimiento auditivo. La mayúscula es reconocimiento-only.
4. Cuando corresponde, se introduce la palabra real al final del material
   nuevo de la cápsula.
5. La sesión SRS intercala automáticamente tarjetas anteriores. No hace falta
   crear bloques manuales de repaso en cada cápsula.
6. La cápsula 9 no introduce letras: comprueba orden, variantes y lectura
   acumulativa antes de abrir la sección siguiente.

## Sección siguiente — Los signos de la palabra

No conviene interrumpir el orden alfa–omega con una lección completa sobre
diacríticos, pero tampoco postergarla varios módulos. Las palabras del alfabeto
se muestran desde el principio con su ortografía real; un aviso breve explica
que las marcas todavía no se evalúan. Inmediatamente después viene una segunda
sección del mismo módulo:

| Cápsula | Contenido | Resultado esperado |
| --- | --- | --- |
| 10 | Espíritu suave y áspero | Entender que aparecen al inicio sobre vocal o rho; reconocer que el áspero añade /h/ y el suave no. Comparar pares reales cuando sea posible. |
| 11 | Acento agudo y grave | Reconocer las marcas y entender la grave como variante contextual, sin memorizar aún todas las reglas de colocación. |
| 12 | Circunflejo y cantidad vocálica | Relacionar el circunflejo con sílabas largas y distinguir duración vocálica de simple «énfasis». |
| 13 | Iota suscrita y diéresis | Reconocer ᾳ/ῃ/ῳ y comprender que la diéresis separa vocales que de otro modo podrían leerse juntas. |
| 14 | Puntuación y lectura acumulativa | Punto alto, signo de interrogación y lectura de palabras ya conocidas con todos sus signos. |

La profundidad fonética de los acentos dependerá del modelo elegido: si se usa
ática reconstruida, hay que explicar que originalmente eran distinciones de
tono; la primera práctica puede aceptar una realización pedagógica más simple
sin afirmar que sea idéntica a la antigua.

## Alcance que queda fuera de estas dos secciones

- diptongos y contracciones como tema sistemático;
- pronunciaciones histórica, koiné o moderna alternativas;
- reglas exhaustivas para predecir la posición del acento;
- morfología y sintaxis de las palabras presentadas.

Las palabras aprendidas aquí se reutilizarán después en frases y explicaciones,
conservando los mismos identificadores.

## Criterios para aprobar la estructura antes de implementarla

- Confirmar el modelo de pronunciación.
- Revisar y cerrar la lista de palabras-puente y sus notas etimológicas.
- Decidir exactamente qué acciones producen tarjetas SRS y cuáles quedan solo
  en el material explicativo.
- Definir cómo se representa el par mayúscula/minúscula sin multiplicar
  tarjetas de forma artificial.
- Confirmar si el progreso del módulo provisional se migrará o se reiniciará
  al reemplazar sus identificadores.
