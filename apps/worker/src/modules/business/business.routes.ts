import { Hono } from 'hono'
import { requireSyncToken } from '../../core/auth'
import type { AppContext } from '../../core/env'
import { businessName } from '../pwa/pwa.service'
import { deviceService } from '../devices/device.service'
import { syncRepository, UPLOAD_COMPLETE_KEY } from '../sync/sync.repository'

/** What a new PC needs to know before joining: it already has data, and it's complete. */
export const businessRoutes = new Hono<AppContext>().get('/status', requireSyncToken, async (c) => {
  const [hasData, complete, name] = await Promise.all([
    deviceService.hasDevices(c.env.DB),
    syncRepository.meta(c.env.DB, UPLOAD_COMPLETE_KEY),
    businessName(c.env)
  ])
  return c.json({ name: name || null, hasData, complete: !!complete })
})
