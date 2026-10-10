# Plan de contenido de Anamnesis

Este documento define el contenido antes de implementarlo. El módulo actual es
provisional y se podrá reemplazar cuando la estructura quede aprobada. Cambiar
su contenido e identificadores requerirá decidir explícitamente cómo preservar
o traducir el progreso existente sin perder datos.

## Principios didácticos

- El recorrido empieza desde cero para que también sirva a quien nunca ha leído
  griego, aunque el primer usuario ya conozca el alfabeto.
- Cada cápsula ofrece un conjunto fijo y breve de ejercicios de su contenido,
  independiente del progreso y del tiempo transcurrido. El repaso SRS de
  material anterior se realiza por separado en Tarjetas.
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
  palabras reales, pero solo se identifican en un aviso y no se califican en esta sección. Tendrán
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

La primera sección del módulo, **El alfabeto**, tiene nueve cápsulas: ocho
grupos de tres letras y una consolidación. Tres letras por cápsula mantienen
una lección breve y previsible, incluso al sumar una palabra. Los límites
diarios no fragmentan las cápsulas.

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
5. La práctica incluye todas las tarjetas activas de la cápsula una vez, sin
   mezcla automática. Reconocer muestra juntas mayúscula, minúscula y sigma
   final cuando existe; producir pide la minúscula. Hasta tres falladas se
   repiten una vez al final. Tarjetas ofrece el repaso SRS por separado.
6. La cápsula 9 no introduce letras: comprueba variantes y lectura
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
- Diseñar una migración que preserve el progreso si se reemplazan
  identificadores del módulo provisional.

## Implementado: consolidación y aviso del alfabeto

La cápsula 9, «Ya puedes leer griego», contiene exactamente **siete** ejercicios
principales, en este orden: Ρ → ρ; reconocer Σ σ ς como sigma; completar
ποίησι_ → ς; transliterar θεά, ὄνομα, μῦθος y ψυχή. No comprueba orden alfabético.
La cola permanece completa con cualquier progreso o tiempo transcurrido,
sin añadir repasos automáticos. Conserva hasta tres falladas en un refuerzo
separado, una sola vez. Repetir una completada sigue siendo práctica libre.

Las preguntas usan `consolidation`, con ids propios `q:<id>` y referencias a
letras y vocabulario anteriores. Respuestas y alternativas se resuelven desde
esas fuentes, sin duplicarlas ni copiar su progreso. La forma final referencia
además `wordId`: no guarda una segunda entrada de ποίησις. `check-content`
comprueba que las referencias sean anteriores, que la forma final corresponda
a la palabra y que haya cuatro opciones distintas. El resumen de las 24 letras
y la lectura de cierre son consulta y no producen tarjetas.

Decisión de persistencia: después de leer `db.ts` completo, no se requiere
migración. No cambia el esquema, los campos de CardProgress/ReviewLog ni los
62 ids existentes; solo se añaden siete ids de preguntas. DB_VERSION sigue en 5.
No se clona ni se traslada progreso anterior a las preguntas nuevas.

Desde la cápsula 2, las preguntas que muestran palabras con diacríticos llevan
el aviso antes de responder. δέ y ὄνομα mantienen su ortografía. Las marcas
curva y recta se amplían por separado con etiquetas permanentes; se aclara que
ὄνομα lleva ambas. En transliteración se distinguen los acentos de las rayas
latinas de ē/ō. No hay evaluación de diacríticos en esta sección.

Fuentes de la lectura de cierre: [antropo-](https://dle.rae.es/antropo-),
[cosmos](https://dle.rae.es/cosmos), [filosofía](https://dle.rae.es/filosofía)
y [la familia de cosmético](https://cvc.cervantes.es/el_rinconete/anteriores/febrero_99/15021999_02.htm).
La relación de cosmético con κόσμος es una familia etimológica mediada por
κοσμητικός, no un préstamo directo de la forma de consulta.

## Diseño pendiente: cápsulas 10–14

Solo preparación editorial: no se añaden nodos vacíos, contenido practicable
ni preguntas de signos. Los conteos siguientes corresponden a ejercicios
principales fijos; los ejemplos de consulta no se convierten automáticamente
en tarjetas de vocabulario. Todos los futuros ejercicios serán visuales y
objetivos, sin audio ni evaluación de pronunciación.

### 10 — Espíritus suave y áspero · 8 ejercicios

Objetivo: reconocer las dos marcas, localizarlas y relacionar el áspero con
aspiración inicial /h/ sobre vocal, frente a la ausencia de aspiración del
suave. En rho inicial se muestra ῥ como convención propia, sin enseñar que
se pronuncia simplemente «hr». Sobre diptongo, la marca se escribe en la
segunda vocal; ante mayúscula inicial, a su izquierda.

Ejemplos de consulta: ὀ / ὁ para ver las formas; ὄνομα y ἄνθρωπος (suave),
ὁ (áspero), οἱ (marca sobre segunda vocal), ῥ y Ῥ (rho inicial).
Distribución: 4 identificaciones de suave/áspero en palabras (2 de cada uno),
2 localizaciones en vocal simple y diptongo, 1 identificación de la ausencia
o presencia de aspiración vocálica y 1 reconocimiento de la convención de rho.
Las marcas deben poder señalarse sin depender del color, aun junto a un acento.
No se evalúan acentos, traducciones, reglas de diptongos, sonido grabado ni
transliteración con h: la convención básica del alfabeto se mantiene explícita.

### 11 — Agudo y grave · 8 ejercicios

Objetivo: distinguir ´ y ` y ver que una palabra puede cambiar su acento final
al integrarse en una secuencia. El agudo final suele pasar a grave cuando le
sigue otra palabra sin pausa; existen excepciones que aquí solo se mencionan.
Son signos de tono en el modelo antiguo, no instrucciones de aumentar volumen.

Ejemplos: ὁδός, τὴν ὁδόν, ἀγαθός / ἀγαθὸς ἀνήρ; reutilizar δέ y θεά.
Distribución: 4 identificaciones de agudo/grave (2 de cada uno),
2 localizaciones de la vocal marcada y 2 comparaciones visuales de la misma
palabra aislada y en contexto, con la explicación visible.
No se exige predecir acentos, dominar enclíticas, traducir ni producir tono.
No se evalúan todavía circunflejo, cantidad ni todas las excepciones de grave.

### 12 — Circunflejo y cantidad vocálica · 8 ejercicios visuales

Objetivo: reconocer el circunflejo y entender que solo aparece sobre vocal
larga o diptongo. La cantidad es duración, distinta del tono y del énfasis;
una vocal sin circunflejo no es necesariamente breve.

Ejemplos: μῦθος, κλῖμα, τῆς ὁδοῦ; ε/η y ο/ω como contraste breve/larga.
α, ι y υ pueden ser breves o largas: no deducir su cantidad solo de la letra.
Distribución: 3 reconocimientos de circunflejo, 2 localizaciones sobre la vocal,
2 clasificaciones visuales ε/η y ο/ω y 1 inferencia «esta vocal con circunflejo
es larga», con la regla delante.
No se evalúan audición, duración producida, métrica, contracción, reglas de
colocación ni cantidad de α/ι/υ no marcada. No confundir vocal larga con
sílaba larga por posición ni con los macrones latinos de la transliteración.

### 13 — Iota suscrita y diéresis · 8 ejercicios

Objetivo: identificar la pequeña iota inferior en ᾳ, ῃ, ῳ y los dos puntos
sobre una segunda vocal. La iota suscrita representa una iota histórica de
los antiguos diptongos largos; su escritura inferior es una convención editorial
posterior. La diéresis señala que las vocales no forman un diptongo.

Ejemplos: τῇ (iota bajo eta), ᾧ (bajo omega, junto a otros signos),
δαΐζω y αΰπνος (diéresis); ᾳ/ῃ/ῳ como formas de consulta.
Distribución: 3 identificaciones de iota suscrita (una por vocal),
3 identificaciones de diéresis (incluido un caso con acento),
1 localización de la iota en τῇ y 1 interpretación visual de separación vocálica
con regla visible y ejemplo αΰπνος.
No se evalúan declinaciones, diptongos sistemáticos, segmentación libre,
pronunciación histórica de la iota ni escritura de combinaciones de signos.
La futura transliteración de iota suscrita requiere una decisión explícita;
no se modifica retroactivamente la transliteración de las palabras actuales.

### 14 — Puntuación y consolidación de signos · 10 ejercicios

Objetivo: distinguir signos de puntuación de signos de la palabra y reunir
el reconocimiento visual aprendido. En las ediciones actuales, «;» marca
pregunta; «·» funciona como punto alto (pausa semejante a dos puntos o punto
y coma según contexto). Punto y coma baja tienen usos familiares.

Ejemplos: signos aislados . , · ; y palabras ya presentadas ὄνομα, θεά,
μῦθος, τῇ y αΰπνος. Cualquier fragmento de consulta futuro conservará la
ortografía real y será revisado antes de implementarlo.
Distribución: 4 asociaciones de los signos de puntuación con su función;
2 identificaciones de espíritu (suave/áspero); 2 de acento (agudo/circunflejo);
1 de iota suscrita y 1 de diéresis. Los casos acumulativos piden identificar
una marca señalada explícitamente cuando convive con otra.
No se evalúan traducción, sintaxis, entonación, escritura libre, predicción
ortográfica ni reglas exhaustivas de acentuación. No se generan tarjetas de
significado para estas palabras por aparecer en los ejemplos.

### Fuentes lingüísticas de la preparación

- [Espíritus y su colocación](https://dcc.dickinson.edu/grammar/age/breathing-marks): marcas sobre vocal/diptongo y rho inicial; ejemplos ὀ, ὁ, οἱ, ῥ/Ῥ.
- [Acentos](https://dcc.dickinson.edu/grammar/goodell/accents-and-accentuation): ejemplos ὁδός, τῆς ὁδοῦ, τὴν ὁδόν, ἀγαθὸς ἀνήρ, ᾧ; límites del circunflejo y cambio contextual a grave.
- [Vocales](https://dcc.dickinson.edu/grammar/goodell/vowels): contraste de cantidad; no inferir brevedad por ausencia de circunflejo.
- [Puntuación](https://dcc.dickinson.edu/grammar/age/punctuation-marks): funciones de punto alto e interrogación.
- [Referencia lingüística, vista editorial](https://api.pageplace.de/preview/DT0400.9781108229456_A37027823/preview-9781108229456_A37027823.pdf): iota suscrita, diéresis y ejemplos δαΐζω/αΰπνος. Las fuentes no determinan la numeración del curso.

## Propuesta pendiente: práctica puntual voluntaria

Completar secuencias del alfabeto (Α Β _ Δ, Λ Μ _ Ξ, Χ Ψ _) se reserva
para una futura zona voluntaria, junto con tablas incompletas y otros ejercicios
puntuales. No forma parte de la cola de la cápsula 9 ni se implementa en esta
tarea. Su acceso y relación con el SRS requieren diseño posterior. La pestaña
**Tarjetas** conserva ahora su nombre y su función de repaso separado.

## Aceptación y revisión de esta implementación

- Exactamente siete ejercicios principales en cápsula 9, tanto nueva como
  parcialmente respondida o repetida; orden fijo, sin repasos añadidos.
- Completarla y repetirla conserva las reglas de desbloqueo y práctica libre.
- Los 62 ids anteriores, sus fuentes y cápsulas se conservan; persistencia sin
  migración y sin traslados de progreso, historial, estadísticas o ajustes.
- Aviso visible antes de responder a palabras con marcas, ausente en letras;
  ejemplos explicativos sin tarjetas ni evaluación de diacríticos.
- Consulta con 24 letras y sigma final, transliteración y lectura de cierre.
- 10–14 y práctica puntual solo documentadas, sin nodos nuevos ni renombrados.
- Verificación: typecheck, test, check-content (alternativa node --import tsx)
  y build. Revisar a 360 px el aviso, las etiquetas de las dos marcas y la
  tabla; comprobar Ρ, Σ σ ς, ποίησι_ y las cuatro transliteraciones;
  fallar cuatro preguntas y comprobar refuerzo de solo tres, sin bucles;
  repetir completada y verificar neutralidad del progreso y estadísticas.

### Archivos de la implementación

- Contenido y representación: `src/content/modules/module-01.json`,
  `src/content/index.ts`, `src/types.ts`, `src/lib/consolidation.ts`.
- Cola y presentación: `src/lib/progression.ts`,
  `src/screens/SessionScreen.tsx`, `src/screens/CapsuleScreen.tsx`,
  `src/components/DiacriticsNotice.tsx`,
  `src/components/exercises/Consolidation.tsx`,
  `src/components/exercises/MultipleChoice.tsx`,
  `src/components/exercises/VocabTransliterate.tsx`, `src/styles.css`.
- Validación y pruebas: `scripts/check-content.ts`,
  `scripts/consolidation.test.tsx`, `scripts/content.test.ts`,
  `scripts/path-screen.test.tsx`, `scripts/session.test.ts`,
  `scripts/transliteration.test.tsx`.
- Preparación editorial y criterios: `docs/plan-contenido.md`.

Revisión visual realizada en navegador local a 360 × 800: aviso de δέ y su
transliteración, ejemplos y etiquetas, tabla de consulta y los siete ejercicios
de cápsula 9. La sesión terminó con siete respuestas principales y sin refuerzo
cuando todas fueron correctas. Los insets Android conservan sus reglas; no se
ha instalado ni comprobado esta versión en un dispositivo Android.

Resultados de comprobación:

- `npm run typecheck`: correcto.
- `npm run test -- --maxWorkers=1 --reporter=verbose`: 16 archivos,
  184 pruebas aprobadas. También hubo una ejecución completa aprobada con
  dos workers; otras ejecuciones paralelas agotaron el heap de Node en este
  entorno. La ejecución secuencial final terminó sin errores.
- `npm run check-content`: bloqueado por EPERM al abrir el canal IPC de tsx.
  Alternativa autorizada `node --import tsx scripts/check-content.ts`:
  9 cápsulas, 0 errores, 0 avisos.
- `npm run build`: correcto; aviso de Vite por el tamaño del chunk principal
  (530,91 kB antes de gzip).
- `git diff --check`: correcto.

No se hizo commit, push, despliegue ni instalación en móvil.
