import { OutboxEntity } from '@bllt/shared'
import { deviceService } from '../devices/device.service'
import { syncService } from '../sync/sync.service'
import { businessSettingsRepository } from './business-settings.repository'

/** Settings every PC of the business shares and edits (newest edit wins). */
export const BusinessSettingKey = {
  RECOVERY_CODE: 'recovery_code_hash',
  /** { name, rif, logo }, applied to the local settings by the sync (see apply.service.ts). */
  BUSINESS: 'business'
} as const
export type BusinessSettingKey = (typeof BusinessSettingKey)[keyof typeof BusinessSettingKey]

export const businessSettingsService = {
  has(key: BusinessSettingKey): boolean {
    return !!businessSettingsRepository.find(key)
  },

  getJson<T>(key: BusinessSettingKey, fallback: T): T {
    const row = businessSettingsRepository.find(key)
    if (!row) return fallback
    try {
      return JSON.parse(row.value) as T
    } catch {
      return fallback
    }
  },

  /** Saves and queues the setting. Call inside a transaction when other writes go with it. */
  setJson(key: BusinessSettingKey, value: unknown): void {
    const row = { key, value: JSON.stringify(value), ...deviceService.stamp() }
    businessSettingsRepository.upsert(row)
    syncService.enqueue(OutboxEntity.SETTING, key, row)
  }
}
