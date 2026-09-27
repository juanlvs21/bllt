import { Hono } from 'hono'
import { requireSession } from '../../core/auth'
import type { AppContext } from '../../core/env'
import { summaryService } from './summary.service'

export const summaryRoutes = new Hono<AppContext>()
  .use(requireSession)
  .get('/', async (c) => c.json(await summaryService.get(c.env.DB)))
