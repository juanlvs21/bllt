import type { WebUser } from '@bllt/shared'

export interface Env {
  DB: D1Database
  ASSETS: Fetcher
  SYNC_TOKEN: string
  JWT_SECRET: string
}

export interface AppContext {
  Bindings: Env
  Variables: { user: WebUser }
}
