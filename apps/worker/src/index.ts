import { SYNC_PROTOCOL } from '@bllt/shared'
import { Hono } from 'hono'
import { csrf } from 'hono/csrf'
import { secureHeaders } from 'hono/secure-headers'
import type { AppContext, Env } from './core/env'
import { onError } from './core/errors'
import { businessName, serveManifest } from './modules/pwa/pwa.service'
import { authRoutes } from './modules/auth/auth.routes'
import { businessRoutes } from './modules/business/business.routes'
import { deviceRoutes } from './modules/devices/device.routes'
import { rateRoutes } from './modules/rates/rate.routes'
import { rateService } from './modules/rates/rate.service'
import { summaryRoutes } from './modules/summary/summary.routes'
import { syncRoutes } from './modules/sync/sync.routes'

// No CORS: the PWA is served from this same origin. Anything outside /api/* is the PWA (assets,
// SPA mode); of those, only the manifest reaches this Worker, to put the business name in.
const app = new Hono<AppContext>().basePath('/api')

app.use(secureHeaders())
app.use('/auth/*', csrf())
app.use('/rate', csrf())
app.onError(onError)

app.route('/sync', syncRoutes)
app.route('/devices', deviceRoutes)
app.route('/business', businessRoutes)
app.route('/auth', authRoutes)
app.route('/summary', summaryRoutes)
app.route('/rate', rateRoutes)
// Public: the login screen shows it too.
app.get('/business', async (c) => c.json({ name: await businessName(c.env) }))
app.get('/health', (c) => c.json({ ok: true, protocol: SYNC_PROTOCOL }))
app.notFound((c) => c.json({ code: 'NOT_FOUND', message: 'Ruta no encontrada' }, 404))

export default {
  fetch(request, env, ctx) {
    if (new URL(request.url).pathname === '/manifest.webmanifest')
      return serveManifest(request, env)
    return app.fetch(request, env, ctx)
  },
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(rateService.fetchFromProviders(env.DB))
  }
} satisfies ExportedHandler<Env>
