import { pullQuery, pushRequest } from '@bllt/shared'
import { Hono } from 'hono'
import { requireDevice } from '../../core/auth'
import type { AppContext } from '../../core/env'
import { rateService } from '../rates/rate.service'
import { syncService } from './sync.service'

export const syncRoutes = new Hono<AppContext>()
  .use(requireDevice)
  .post('/push', async (c) => {
    const body = pushRequest.parse(await c.req.json())
    return c.json(await syncService.push(c.env.DB, c.get('device').id, body))
  })
  // What the other PCs did since the cursor. The server numbers the changes: PC clocks don't count.
  .get('/pull', async (c) => {
    const query = pullQuery.parse(c.req.query())
    return c.json(await syncService.pull(c.env.DB, c.get('device').id, query))
  })
  .post('/upload-complete', async (c) => {
    await syncService.markUploadComplete(c.env.DB)
    return c.json({ ok: true })
  })
  // Rate candidates for the desktop. Never confirms anything.
  .get('/rate', async (c) => c.json(await rateService.candidates(c.env.DB)))
