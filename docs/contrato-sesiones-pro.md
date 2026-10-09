# Contrato de producto: sesiones, cupo gratuito y Pro

Estado: decisiones de producto para el siguiente chat maestro. **No es una implementación ni una orden de ejecución.** Última revisión: 2026-09-21.

Este documento prevalece sobre las descripciones antiguas del MVP que digan que toda la práctica gratuita funciona sin conexión. El progreso SRS continúa siendo local; la cuota gratuita y los derechos Pro tendrán autoridad en el servidor.

## 1. Oferta y precios

- Toda cápsula y todo ejercicio disponible en el curso es accesible en el nivel gratuito; no hay contenido curricular detrás de Pro.
- Gratis: 5 minutos de práctica interactiva activa por día civil, con conexión. La lectura pasiva, el camino, los ajustes, la consulta del material y la gestión de copias no gastan cupo.
- Pro: práctica sin límite diario y práctica offline. Las estadísticas avanzadas pueden añadirse más adelante; **no son requisito para lanzar ni justificación principal del precio**.
- Productos de pago único, sin renovación automática: **pase de 6 meses, US$12,99 de precio de referencia**, y **Pro permanente, US$19,99 de precio de referencia**. Los precios locales mostrados al comprador y el efecto de impuestos se revisan en los paneles antes de publicar; no se codifican conversiones USD→CLP en la app.
- Web: Paddle es la primera opción, condicionada a la aprobación de la cuenta y a comprobar el checkout real en Chile y otros países. Android distribuido por Play: Google Play Billing. El derecho Pro es común a ambos canales y pertenece a la cuenta de Anamnesis, no al dispositivo.
- Un segundo pase extiende la fecha de expiración seis meses desde `max(ahora, vencimiento_actual)`. Pro permanente prevalece sobre cualquier pase. Un usuario que ya tiene Pro permanente no debe comprar otro producto por error. No habrá prorrateo por subir de pase a permanente en la primera versión; la interfaz debe avisarlo antes de comprar.

### Economía unitaria preliminar

| Precio de referencia | Paddle: después de 5 % + US$0,50 | Play: después de 15 %* |
| --- | ---: | ---: |
| Pase, US$12,99 | US$11,84 | US$11,04 |
| Permanente, US$19,99 | US$18,49 | US$16,99 |

Estas cifras son **solo comisión sobre precio de referencia**, antes de impuestos, devoluciones, cambio de moneda y eventual diferencia entre precio base y precio final mostrado al comprador. No son utilidad ni importe de pago garantizado. `*` El 15 % de Play requiere inscripción en el tramo para el primer millón de USD anual; de no corresponder, verificar tarifa efectiva en Play Console. En Chile, hasta la fecha de esta revisión, los cambios anunciados por Play para el resto del mundo están programados para el 30-09-2027; no usar una tarifa futura para proyectar el lanzamiento.

**Impuestos — asunto que no puede darse por resuelto con la cuenta anterior:** Google informa que un desarrollador ubicado en Chile debe determinar, cobrar y enterar el IVA de ventas a compradores chilenos, y que, si no está registrado como contribuyente de IVA, puede aplicar además 19 % de IVA sobre su comisión. Por ejemplo, si US$12,99 fuese un precio final chileno *con IVA incluido*, la base sería US$10,92 y, restando 15 % de esa base, quedarían aproximadamente US$9,28 antes de cualquier IVA sobre la comisión y antes de impuesto a la renta. Para US$19,99 serían aproximadamente US$14,28. Es un escenario ilustrativo, no una liquidación real. Paddle, como comerciante registrado, gestiona los impuestos indirectos de las compras procesadas por él; eso **no elimina** las obligaciones tributarias que correspondan al titular chileno por sus ingresos. El impuesto a la renta no es un 19 % fijo ni se debe llamar aquí “ganancia de capital”: dependerá de la situación tributaria y de la forma en que se reciban/documenten los pagos. Antes de cobrar dinero real: revisar el perfil fiscal de Play, la liquidación y contrato de Paddle, e iniciar la actividad y documentación que corresponda con un contador/SII. Una venta pequeña no crea por sí sola una exención general.

Fuentes consultadas: [Paddle: tarifa](https://www.paddle.com/pricing), [Paddle: países admitidos](https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle), [Google Play: tarifas vigentes](https://support.google.com/googleplay/android-developer/answer/112622?hl=en), [Google Play: cambios y cronología](https://support.google.com/googleplay/android-developer/answer/16954621?hl=es), [Google Play: IVA para desarrolladores en Chile](https://support.google.com/googleplay/android-developer/answer/138000?hl=es-ES), [SII: obligaciones tributarias](https://www.sii.cl/destacados/renta/2026/primera_renta/obligaciones_tributarias/).

## 2. Identidad y fuentes de verdad

- Una persona puede practicar gratis sin registrarse explícitamente; la app crea una identidad anónima de Supabase en segundo plano. Para **comprar, restaurar o usar Pro en otro dispositivo**, debe vincular una cuenta recuperable (Google o correo).
- El progreso de aprendizaje y el SRS permanecen en IndexedDB. No introducir sincronización automática de progreso como parte de este proyecto. Las copias privadas existentes siguen siendo manuales.
- Supabase es la fuente de verdad para consumo del cupo gratuito, zona horaria de reinicio y derechos Pro. La hora del dispositivo nunca decide cuánto cupo gratuito queda ni cuándo vence un pase en línea.
- La identidad anónima puede perderse al borrar los datos del navegador o reinstalar; eso permite reiniciar el cupo. Se acepta esta limitación del nivel gratuito, sin prometer protección antifraude absoluta. Al convertir la identidad o iniciar sesión en otra cuenta no se debe reiniciar el cupo del día: reconciliar de forma conservadora el consumo diario de ambas identidades, sin tocar el progreso local.
- Los derechos Pro no se conceden por un flag editable en el cliente ni por el retorno visual del checkout: solo por una compra verificada en backend.

## 3. Contrato de sesión de aprendizaje

Hay dos conceptos distintos:

1. **Sesión pedagógica local:** cola concreta y ordenada de tarjetas/ejercicios, cápsula o repaso, posición, repeticiones introducidas en la cola y respuestas ya confirmadas. Se guarda en IndexedDB tras cada respuesta. Al volver, se retoma esa cola, no se regenera otra. Si cambia el contenido y alguna tarjeta ya no existe, se conserva el progreso SRS y se ofrece reiniciar solo la cola incompatible, con explicación.
2. **Tramo de práctica cronometrado:** permiso temporal del backend para que una persona gratuita practique ahora. Puede haber varios tramos en un día y en diferentes sesiones; todos descuentan del mismo saldo diario. No equivale a una cápsula completa.

Una respuesta confirmada debe persistir **atómicamente** con su nuevo estado SRS, registro de revisión, estadística local y avance de la cola. Si la app se cierra durante el guardado, la respuesta no debe quedar a medias ni duplicarse al retomar. Preservar `eventId`, ids de tarjeta y datos ya guardados: requiere migración de IndexedDB, nunca borrar progreso para simplificarla.

Al cerrar una cápsula, agotarse el cupo, cerrar la app o perder conexión, quedan guardadas todas las respuestas confirmadas. El ejercicio aún no confirmado se muestra nuevamente al retomar. Una cápsula pendiente no necesita empezar desde cero. Los ejercicios voluntarios son práctica libre: no conservan una “partida” al interrumpirse y no modifican la programación SRS.

## 4. Contrato del reloj gratuito

- Cupo: **300 segundos** por día civil. Reinicio a las **00:00 de la zona horaria IANA registrada para el usuario**, calculado con reloj de servidor. Registrar la zona detectada en el primer uso y mostrarla en ajustes. Un cambio de zona horaria entra en vigor en el próximo día de cupo; nunca concede un segundo cupo para el mismo período ya consumido. La política exacta de transición se prueba con viajes y cambios de hora de verano.
- El reloj corre desde que se muestra el primer ejercicio interactivo tras pulsar «Practicar», hasta que se completa la sesión o se pausa/sale. También corre entre tarjetas y mientras se piensa en una respuesta. No corre en material de lectura, menús, resumen ni pantallas de compra.
- Al ocultar la app, bloquear la pantalla o salir de la práctica, el cliente solicita pausa. El backend emite tramos cortos renovables (objetivo inicial: latido cada 5 s, permiso máximo de 10 s) y calcula el consumo con su reloj, no con `durationMs` enviado por el cliente. Una caída inesperada puede cargar hasta 10 s adicionales; esa cota debe verificarse en pruebas. Sin conexión, la práctica gratuita se pausa y se explica cómo retomarla.
- Al acabarse el cupo, se bloquea la interacción antes de registrar otra respuesta, se guarda la sesión local y se muestra el momento del próximo reinicio. No se considera completada una cápsula a medias. No se cobra tiempo por una pantalla en segundo plano.
- El servidor devuelve `server_now`, `remaining_ms`, `reset_at` y estado de permiso para que el cliente muestre un contador aproximado; la decisión final sigue siendo del servidor. Se puede registrar únicamente diferencia aproximada entre reloj del dispositivo y servidor, evento de pérdida de conexión, tiempo diario usado y tope alcanzado. No registrar respuestas individuales en el servidor. Las discrepancias horarias son diagnóstico, no sanción automática.
- Un usuario Pro no consume este cupo. Si el derecho Pro vence durante una práctica online, se aplica la regla gratuita desde ese momento, con el saldo diario que le corresponda; no se borra la sesión local.

## 5. Contrato de derechos Pro y offline

- Registro servidor de cada compra: `user_id`, proveedor (`paddle` o `play`), identificador único del proveedor, producto, fecha de compra, vencimiento (nulo para permanente), estado y eventos de reembolso/revocación. Eventos repetidos deben ser idempotentes. El estado efectivo Pro se deriva de compras válidas, no se mantiene como un booleano desconectado de ellas.
- Web: crear checkout desde backend con usuario/producto y precio decidido por el catálogo; webhook firmado confirma el pago y concede el derecho. Volver del checkout sin webhook verificado no concede Pro. Android: verificar token de compra en backend antes de conceder derecho, gestionar compras pendientes, confirmación/consumo según el tipo de producto y revocaciones. En la app de Play no enlazar a la compra web.
- Compra en cualquiera de los dos canales activa el mismo derecho al iniciar sesión en el otro. El progreso SRS sigue local; no prometer que una compra sincronice también el avance.
- Pro offline usa una autorización local firmada por el servidor, ligada al usuario y al derecho, emitida al conectar. **Ventana offline inicial: 30 días desde la última validación**, nunca más allá del vencimiento del pase. Se renueva automáticamente al conectarse. Si vence o el reloj local resulta incoherente respecto de la última referencia conocida, se solicita conexión para revalidar; no se borra progreso. Este límite permite práctica offline real sin prometer revocación instantánea de compras reembolsadas mientras el dispositivo está desconectado.
- La compra y restauración de derechos requieren conexión. Si el backend está caído, el Pro con autorización local vigente sigue practicando; el gratuito no puede iniciar un tramo nuevo hasta recuperar conexión. No bloquear lectura ni acceso/exportación del progreso por un fallo de red.

## 6. Orden de ejecución y reparto

Este orden es de **proyecto**, no un prompt para un agente. El chat maestro nuevo decidirá cuándo encargar cada etapa y revisará el resultado.

1. **Base local:** contrato de sesión pedagógica, migración IndexedDB, guardado atómico y pruebas de reanudación/crash. El agente cambia código; el usuario revisa comportamiento. Sin activar paywall.
2. **Cupo en entorno de pruebas:** Supabase anónimo, zona horaria, libro diario de tiempo, endpoints de iniciar/renovar/pausar, cliente y pruebas de conectividad. El agente entrega SQL/funciones/código y guía. El usuario crea/configura el proyecto Supabase de pruebas, aplica migraciones, despliega funciones y configura claves. No dar acceso supuesto al agente a la base remota.
3. **Derechos y pagos de prueba:** tabla/eventos de derechos, Paddle sandbox y Google Play Billing de prueba. El agente integra y prueba con simulaciones; el usuario abre/verifica Paddle, Play Console y perfil de pagos, crea productos, configura claves y webhooks y ejecuta compras de prueba.
4. **Validación fiscal y de precios:** comprobar checkout/IVA/monedas, inscripción al tramo aplicable de Play, comisiones reales, documentación tributaria chilena y liquidaciones. Ajustar precios locales si los resultados reales difieren. El usuario hace la gestión externa; el chat maestro ayuda a revisar.
5. **Lanzamiento:** habilitar cobros y cupo solo cuando restauración Pro, vencimiento, reembolsos, modo offline, medianoche y recuperación de cápsulas pasen pruebas. Web y Android se publican como una misma versión de producto.

## 7. Contexto del repositorio para la próxima sesión

- `src/lib/db.ts` está en `DB_VERSION = 4`; allí viven progreso, historial, estadísticas y backup. La v1→v2 borró progreso una vez; **no repetir**. `src/store.tsx` escribe progreso, historial y estadística por separado, así que hoy una respuesta no es atómica.
- `src/screens/SessionScreen.tsx` guarda la cola y posición solo en estado React; hoy no existe reanudación exacta.
- `src/auth.tsx` tiene Google OAuth y enlace por correo, pero no identidad anónima. `supabase/schema.sql` solo define copias privadas, no cupos ni derechos. Una identidad anónima de Supabase usa el rol `authenticated`; revisar las políticas existentes de `user_backups` antes de habilitarla.
- Mantener el frontend estático y el progreso local. Supabase aporta autenticación, cupo, derechos y funciones. El usuario administra proyectos, claves, paneles y despliegue.
- `AGENTS.md` define el **chat maestro**: por defecto se discute/revisa; no se implementa ni despliega sin instrucción explícita. Este documento es un traspaso, no autoriza ejecución automática.

## 8. Pendientes acotados antes de cobrar realmente

- Confirmar aprobación de cuenta Paddle y sus condiciones de liquidación a Chile. Si falla, seleccionar otro proveedor web antes de codificar su adaptador.
- Crear precios locales en Paddle/Play y comprobar cuánto ve y paga un comprador chileno y uno extranjero. Los US$12,99/19,99 son referencias de producto, no una promesa de tipo de cambio.
- Confirmar con contador/SII el tratamiento de los ingresos y obligaciones documentales según la figura con que se venderá. No asumir exención por bajo volumen.
- Definir textos legales y de compra: qué incluye Pro, no renovación, duración, restauración, política de devoluciones y funcionamiento offline de 30 días entre validaciones.
