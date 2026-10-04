import { and, asc, eq, sql } from 'drizzle-orm'
import { createDb, schema } from '../../core/db'

const { devices } = schema
export type DeviceRow = typeof devices.$inferSelect

export const deviceRepository = {
  list(d1: D1Database): Promise<DeviceRow[]> {
    return createDb(d1).select().from(devices).orderBy(asc(devices.series)).all()
  },
  async count(d1: D1Database): Promise<number> {
    const row = await createDb(d1)
      .select({ n: sql<number>`count(*)` })
      .from(devices)
      .get()
    return row?.n ?? 0
  },
  findById(d1: D1Database, id: string): Promise<DeviceRow | undefined> {
    return createDb(d1).select().from(devices).where(eq(devices.id, id)).get()
  },
  findActiveByTokenHash(d1: D1Database, hash: string): Promise<DeviceRow | undefined> {
    return createDb(d1)
      .select()
      .from(devices)
      .where(and(eq(devices.tokenHash, hash), eq(devices.active, true)))
      .get()
  },
  async insert(d1: D1Database, row: DeviceRow): Promise<void> {
    await createDb(d1).insert(devices).values(row).run()
  },
  async update(d1: D1Database, id: string, patch: Partial<DeviceRow>): Promise<void> {
    await createDb(d1).update(devices).set(patch).where(eq(devices.id, id)).run()
  }
}
