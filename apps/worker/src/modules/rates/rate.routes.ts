import { webRateInput } from '@bllt/shared'
import { Hono } from 'hono'
import { requireSession } from '../../core/auth'
import type { AppContext } from '../../core/env'
import { rateService } from './rate.service'

export const rateRoutes = new Hono<AppContext>().use(requireSession).put('/', async (c) => {
  const { bsPerUsd } = webRateInput.parse(await c.req.json())
  await rateService.suggestFromWeb(c.env.DB, c.get('user'), bsPerUsd)
  return c.json({ ok: true })
})
