# Anamnesis — práctica de griego antiguo

## Proyecto

Anamnesis es una PWA de práctica diaria de griego antiguo con cápsulas de
contenido fijo y repaso SRS separado, de uso personal y publicación abierta.
El progreso de estudio se guarda en el dispositivo. La siguiente etapa del producto incorporará un
cupo gratuito online y derechos Pro con práctica ilimitada y offline; su
contrato está en `docs/contrato-sesiones-pro.md`. El frontend se despliega
como sitio estático en GitHub Pages.

## Arquitectura (resumen)

- **Contenido**: JSON en `src/content/modules/*.json`, jerarquía
  módulo > sección > cápsula (`src/types.ts`). Módulo y sección solo
  agrupan; la cápsula es la única unidad que se practica.
- **Tarjetas**: se derivan del contenido en `src/content/index.ts`
  (`cardsForCapsule`) a partir del vocabulario, los paradigmas, las frases y
  los `drills` de cada cápsula. No se guardan como tal: se recalculan en
  cada arranque.
- **Progreso**: la fuente de verdad vive en IndexedDB (`src/lib/db.ts`, vía
  `idb`), indexada por el `id` de cada tarjeta. Se puede respaldar mediante
  export/import JSON o, con una cuenta opcional, guardar y restaurar una copia
  privada en Supabase. No existe sincronización automática entre dispositivos.
- **Camino**: `src/lib/progression.ts` decide el desbloqueo por respuestas y
  presenta todas las tarjetas activas de la cápsula elegida una vez, sin
  mezcla ni límites diarios. Los modos dependen del tipo de contenido; las
  letras se reconocen con sus formas juntas. Hasta tres falladas se repiten
  una vez en un refuerzo separado. Repetir una completada es práctica libre.
- **Repetición espaciada**: `src/lib/srs.ts` (variante SM-2 con pasos de
  aprendizaje) conserva la programación y el registro de respuestas normales.
  Solo gobierna el repaso de la pestaña Tarjetas, con su límite por sesión.
  El objetivo diario y la racha siguen siendo estadísticas; `newPerDay` y
  `mixRatio` se conservan en los ajustes guardados, sin efecto en el camino.

## Restricciones del proyecto

1. **El progreso del usuario es intocable.** Nunca cambiar cómo se generan
   los `id` de tarjeta (prefijos `v:`, `p:`, `s:`, `d:` en
   `cardsForCapsule`, `src/content/index.ts`) ni el esquema de IndexedDB
   (`src/lib/db.ts`) sin una migración de `DB_VERSION` que preserve o
   traduzca los datos existentes. **Ya pasó una vez**: la migración v1→v2
   cambió los ids de tarjeta y borró el progreso y el historial de quien
   hubiera usado la v1 (ver el comentario junto a `DB_VERSION` en `db.ts`).
   Verificación: antes de tocar la generación de ids o el esquema, releer
   `db.ts` completo y decidir explícitamente si hace falta subir
   `DB_VERSION` con una migración — nunca asumir que un cambio es
   inofensivo solo porque compila.
2. **No referenciar el manual de texto.** El contenido y la interfaz no
   deben nombrar el libro de texto ni copiar su numeración de capítulos —
   solo "módulo 1, módulo 2…", genéricos. Verificación: revisar el diff en
   busca de nombres propios de manuales o referencias a su estructura.
3. **Progreso local y nueva política de acceso.** IndexedDB sigue siendo la
   fuente de verdad del progreso y GitHub Pages sirve el frontend estático.
   La práctica gratuita online podrá usar identidad anónima de Supabase; la
   cuenta recuperable será necesaria para comprar/restaurar Pro. Supabase
   controlará cupo y derechos, además de las copias privadas iniciadas por el
   usuario. No introducir sincronización automática de progreso sin diseñar
   primero conflictos y preservación de datos. Ver
   `docs/contrato-sesiones-pro.md` antes de trabajar en acceso o cobros.

## Flujo de trabajo

Proyecto personal de una sola persona: no hay gates ni agentes guardianes
formales. Antes de cualquier cambio que toque `src/lib/db.ts`, la
generación de ids en `src/content/index.ts`, o el shape de
`CardProgress`/`ReviewLog` en `src/types.ts`, parar y confirmar
explícitamente si hace falta una migración, aunque el cambio parezca
puramente aditivo.

### Chat maestro y ejecución

Las conversaciones de Codex en este proyecto son, por defecto, un espacio de
dirección: aquí se discuten arquitectura, contenido, producto, alternativas,
riesgos y se revisan cambios realizados por otros modelos. Una petición de
analizar, diseñar, planificar, discutir o revisar **no autoriza a editar el
repositorio ni a ejecutar despliegues o acciones externas**.

Solo implementar, editar, borrar, publicar o hacer otros cambios cuando el
usuario lo pida explícitamente. Cuando una propuesta requiera ejecución y el
usuario no haya pedido que este chat la ejecute, entregar un prompt completo
para el modelo ejecutor, con objetivo, alcance, archivos relevantes,
restricciones, criterios de aceptación, pruebas y entregables. Después, revisar
en este chat el resultado del ejecutor.

Verificación mínima antes de dar un cambio por terminado:
`npm run typecheck && npm run test && npm run check-content`.
