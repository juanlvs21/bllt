import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    tailwindcss(),
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'img/*.svg'],
      manifest: {
        name: 'Bllt',
        short_name: 'Bllt',
        description: 'Resumen del día y tasa de tu negocio',
        lang: 'es',
        theme_color: '#1bae8f',
        background_color: '#eeeaea',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // The API is never cached by the service worker; the last summary lives in the app.
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
      }
    })
  ],
  server: {
    // `pnpm --filter @bllt/worker dev` serves the API on 8787.
    proxy: { '/api': 'http://localhost:8787' }
  }
})
