import { registerRequest } from '@bllt/shared'
import { Hono } from 'hono'
import { requireDevice, requireSyncToken } from '../../core/auth'
import type { AppContext } from '../../core/env'
import { deviceService } from './device.service'

export const deviceRoutes = new Hono<AppContext>()
  // The registration token (SYNC_TOKEN) only opens this door: a PC gets its own token here.
  .post('/register', requireSyncToken, async (c) => {
    const body = registerRequest.parse(await c.req.json())
    return c.json(await deviceService.register(c.env.DB, body))
  })
  .get('/', requireDevice, async (c) => c.json({ devices: await deviceService.list(c.env.DB) }))
  .post('/:id/revoke', requireDevice, async (c) => {
    await deviceService.revoke(c.env.DB, c.req.param('id'), c.get('device').id)
    return c.json({ ok: true })
  })
