# Anamnesis — práctica de griego antiguo

## Proyecto

Anamnesis es una PWA de práctica diaria de griego antiguo por repetición
espaciada (SRS), de uso personal: sin backend, sin cuentas, con todo el
progreso guardado localmente en el dispositivo. Se despliega como sitio
estático en GitHub Pages.

## Arquitectura (resumen)

- **Contenido**: JSON en `src/content/modules/*.json`, jerarquía
  módulo > sección > cápsula (`src/types.ts`). Módulo y sección solo
  agrupan; la cápsula es la única unidad que se practica.
- **Tarjetas**: se derivan del contenido en `src/content/index.ts`
  (`cardsForCapsule`) a partir del vocabulario, los paradigmas, las frases y
  los `drills` de cada cápsula. No se guardan como tal: se recalculan en
  cada arranque.
- **Progreso**: vive en IndexedDB (`src/lib/db.ts`, vía `idb`), indexado por
  el `id` de cada tarjeta. No hay servidor ni sincronización; el respaldo es
  el export/import JSON de la pantalla de ajustes.
- **Repetición espaciada**: `src/lib/srs.ts` (variante SM-2 con pasos de
  aprendizaje). `src/lib/progression.ts` decide qué cápsulas están
  desbloqueadas y arma la cola de cada sesión, mezclando material antiguo
  con el nuevo.

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
3. **Sin backend ni cuentas.** Toda persistencia es local (IndexedDB) y el
   despliegue es un sitio estático (GitHub Pages). Verificación: ningún
   cambio debe añadir llamadas de red a un servicio propio ni un sistema de
   login.

## Flujo de trabajo

Proyecto personal de una sola persona: no hay gates ni agentes guardianes
formales. Antes de cualquier cambio que toque `src/lib/db.ts`, la
generación de ids en `src/content/index.ts`, o el shape de
`CardProgress`/`ReviewLog` en `src/types.ts`, parar y confirmar
explícitamente si hace falta una migración, aunque el cambio parezca
puramente aditivo.

Verificación mínima antes de dar un cambio por terminado:
`npm run typecheck && npm run test && npm run check-content`.
