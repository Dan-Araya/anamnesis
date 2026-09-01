// IndexedDB de mentira para poder ejercitar la persistencia en las pruebas.
import 'fake-indexeddb/auto'

// jsdom no implementa scrollIntoView, que el camino usa para centrar el nodo
// actual al abrir la app.
Element.prototype.scrollIntoView ??= () => {}
