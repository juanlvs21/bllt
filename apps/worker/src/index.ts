import { Hono } from 'hono'
import { csrf } from 'hono/csrf'
import { secureHeaders } from 'hono/secure-headers'
import type { AppContext, Env } from './core/env'
import { onError } from './core/errors'
import { authRoutes } from './modules/auth/auth.routes'
import { rateRoutes } from './modules/rates/rate.routes'
import { rateService } from './modules/rates/rate.service'
import { summaryRoutes } from './modules/summary/summary.routes'
import { syncRoutes } from './modules/sync/sync.routes'

// No CORS: the PWA is served from this same origin. Anything outside /api/* is the PWA (assets, SPA mode).
const app = new Hono<AppContext>().basePath('/api')

app.use(secureHeaders())
app.use('/auth/*', csrf())
app.use('/rate', csrf())
app.onError(onError)

app.route('/sync', syncRoutes)
app.route('/auth', authRoutes)
app.route('/summary', summaryRoutes)
app.route('/rate', rateRoutes)
app.get('/health', (c) => c.json({ ok: true }))
app.notFound((c) => c.json({ code: 'NOT_FOUND', message: 'Ruta no encontrada' }, 404))

export default {
  fetch: app.fetch,
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(rateService.fetchFromProviders(env.DB))
  }
} satisfies ExportedHandler<Env>
