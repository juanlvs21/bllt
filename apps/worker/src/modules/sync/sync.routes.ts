import { pushRequest } from '@bllt/shared'
import { Hono } from 'hono'
import { requireSyncToken } from '../../core/auth'
import type { AppContext } from '../../core/env'
import { rateService } from '../rates/rate.service'
import { syncService } from './sync.service'

export const syncRoutes = new Hono<AppContext>()
  .use(requireSyncToken)
  .post('/push', async (c) => {
    const body = pushRequest.parse(await c.req.json())
    return c.json(await syncService.push(c.env.DB, body))
  })
  // Latest candidate of the business day. Never confirms anything.
  .get('/rate', async (c) => c.json({ candidate: await rateService.latestCandidate(c.env.DB) }))
