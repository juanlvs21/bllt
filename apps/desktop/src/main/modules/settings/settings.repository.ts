import { eq } from 'drizzle-orm'
import { db, schema } from '../../core/db'

export const settingsRepository = {
  get(key: string): string | null {
    const row = db().select().from(schema.settings).where(eq(schema.settings.key, key)).get()
    return row?.value ?? null
  },
  set(key: string, value: string): void {
    db()
      .insert(schema.settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value } })
      .run()
  },
  delete(key: string): void {
    db().delete(schema.settings).where(eq(schema.settings.key, key)).run()
  }
}
