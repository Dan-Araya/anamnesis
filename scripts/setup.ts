import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// IndexedDB de mentira para poder ejercitar la persistencia en las pruebas.
import 'fake-indexeddb/auto'

// jsdom no implementa scrollIntoView, que el camino usa para centrar el nodo
// actual al abrir la app.
Element.prototype.scrollIntoView ??= () => {}

// Sin `globals: true`, Testing Library no registra su limpieza automática y
// los árboles renderizados se acumulan de un test al siguiente.
afterEach(cleanup)
