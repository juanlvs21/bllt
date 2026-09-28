import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@bllt/shared/schema/cloud'

export type Db = ReturnType<typeof createDb>

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema })
}

export { schema }
