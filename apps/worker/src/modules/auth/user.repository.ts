import { and, count, desc, eq, gte, lt, sql } from 'drizzle-orm'
import { createDb, schema } from '../../core/db'

const { users, loginAttempts } = schema

export const userRepository = {
  async findByUsername(d1: D1Database, username: string) {
    return (
      createDb(d1)
        .select()
        .from(users)
        .where(sql`lower(${users.username}) = ${username.toLowerCase()}`)
        // The cloud copy doesn't enforce unique names: prefer the active, most recent row.
        .orderBy(desc(users.active), desc(users.updatedAt))
        .get()
    )
  },
  async findById(d1: D1Database, id: string) {
    return createDb(d1).select().from(users).where(eq(users.id, id)).get()
  },
  async countAttempts(d1: D1Database, key: string, since: string): Promise<number> {
    const row = await createDb(d1)
      .select({ n: count() })
      .from(loginAttempts)
      .where(and(eq(loginAttempts.key, key), gte(loginAttempts.at, since)))
      .get()
    return row?.n ?? 0
  },
  async addAttempt(d1: D1Database, key: string, at: string): Promise<void> {
    await createDb(d1).insert(loginAttempts).values({ id: crypto.randomUUID(), key, at })
  },
  async clearAttempts(d1: D1Database, key: string, before?: string): Promise<void> {
    const db = createDb(d1)
    await db
      .delete(loginAttempts)
      .where(before ? lt(loginAttempts.at, before) : eq(loginAttempts.key, key))
  }
}
