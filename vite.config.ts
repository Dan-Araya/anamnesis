import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * En GitHub Pages la app cuelga de /<nombre-del-repo>/. Si publicas en otro
 * sitio (dominio propio, Netlify), lanza el build con BASE_PATH=/.
 */
const base = process.env.BASE_PATH ?? '/anamnesis/'

export default defineConfig({
  base,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Griego Antiguo',
        short_name: 'Griego',
        description: 'Práctica diaria de griego antiguo por módulos.',
        lang: 'es',
        theme_color: '#1b2233',
        background_color: '#12161f',
        display: 'standalone',
        orientation: 'portrait',
        // start_url y scope los deriva el plugin de `base`.
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
