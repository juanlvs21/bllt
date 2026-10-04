import { asc, eq } from 'drizzle-orm'
import { db, schema } from '../../core/db'

const { devices } = schema
type DeviceRow = typeof devices.$inferSelect

export const deviceRepository = {
  list(): DeviceRow[] {
    return db().select().from(devices).orderBy(asc(devices.series)).all()
  },
  findById(id: string): DeviceRow | undefined {
    return db().select().from(devices).where(eq(devices.id, id)).get()
  },
  upsert(row: DeviceRow): void {
    const { id, ...rest } = row
    db().insert(devices).values(row).onConflictDoUpdate({ target: devices.id, set: rest }).run()
  }
}
