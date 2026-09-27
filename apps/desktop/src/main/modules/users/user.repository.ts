import { and, asc, count, eq, sql } from 'drizzle-orm'
import { Role, type UserRow } from '@bllt/shared'
import { db, schema } from '../../core/db'

const { users } = schema

export const userRepository = {
  count(): number {
    return db().select({ n: count() }).from(users).get()?.n ?? 0
  },
  countActiveAdmins(): number {
    return (
      db()
        .select({ n: count() })
        .from(users)
        .where(and(eq(users.role, Role.ADMIN), eq(users.active, true)))
        .get()?.n ?? 0
    )
  },
  findById(id: string): UserRow | undefined {
    return db().select().from(users).where(eq(users.id, id)).get()
  },
  findByUsername(username: string): UserRow | undefined {
    return db()
      .select()
      .from(users)
      .where(sql`lower(${users.username}) = ${username.toLowerCase()}`)
      .get()
  },
  list(): UserRow[] {
    return db().select().from(users).orderBy(asc(users.createdAt)).all()
  },
  insert(row: UserRow): void {
    db().insert(users).values(row).run()
  },
  update(id: string, patch: Partial<Omit<UserRow, 'id'>>): UserRow {
    return db().update(users).set(patch).where(eq(users.id, id)).returning().get()
  }
}
