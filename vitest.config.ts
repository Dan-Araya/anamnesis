import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * Config aparte de la de la app: aquí no queremos el plugin de PWA, pero sí
 * el resolver de Vite (los módulos se cargan con `import.meta.glob`).
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['scripts/**/*.test.ts', 'scripts/**/*.test.tsx'],
    setupFiles: ['./scripts/setup.ts'],
    restoreMocks: true,
  },
})
