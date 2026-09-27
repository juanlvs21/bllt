import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const escapeHtml = (v: string) =>
  v.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** Puts the business name in the page title and the iOS home screen label. */
function businessTitle(name: string): Plugin {
  return {
    name: 'bllt-business-title',
    transformIndexHtml: (html) =>
      html
        .replace('<title>Bllt</title>', `<title>${escapeHtml(name)}</title>`)
        .replace(
          '<meta name="apple-mobile-web-app-title" content="Bllt" />',
          `<meta name="apple-mobile-web-app-title" content="${escapeHtml(name)}" />`
        )
  }
}

export default defineConfig(({ mode }) => {
  // Build-time variable (Cloudflare build variable or apps/web/.env.local).
  const env = loadEnv(mode, process.cwd(), '')
  const configuredName = (env.BUSINESS_NAME || env.VITE_BUSINESS_NAME || '').trim()
  const businessName = configuredName || 'Bllt'

  return {
    define: { 'import.meta.env.VITE_BUSINESS_NAME': JSON.stringify(configuredName) },
    plugins: [
      businessTitle(businessName),
      tailwindcss(),
      svelte(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'apple-touch-icon.png', 'img/*.svg'],
        manifest: {
          name: businessName,
          short_name: businessName,
          description: 'Resumen del día y tasa de tu negocio',
          lang: 'es',
          theme_color: '#1bae8f',
          background_color: '#eeeaea',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
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
  }
})
