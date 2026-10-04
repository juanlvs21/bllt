import { eq } from 'drizzle-orm'
import type { BusinessSettingRow } from '@bllt/shared'
import { db, schema } from '../../core/db'

const { businessSettings } = schema

export const businessSettingsRepository = {
  find(key: string): BusinessSettingRow | undefined {
    return db().select().from(businessSettings).where(eq(businessSettings.key, key)).get()
  },
  upsert(row: BusinessSettingRow): void {
    const { key, ...rest } = row
    db()
      .insert(businessSettings)
      .values(row)
      .onConflictDoUpdate({ target: businessSettings.key, set: rest })
      .run()
  }
}
