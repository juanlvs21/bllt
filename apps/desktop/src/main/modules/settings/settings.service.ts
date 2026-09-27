import { settingsRepository } from './settings.repository'

/** Local-only settings; never synced. */
export const SettingKey = {
  BUSINESS_NAME: 'business_name',
  BUSINESS_RIF: 'business_rif',
  BUSINESS_LOGO: 'business_logo',
  WORKER_URL: 'worker_url',
  SYNC_TOKEN: 'sync_token',
  BACKUP_DIR: 'backup_dir',
  LAST_BACKUP_AT: 'last_backup_at',
  LAST_SYNC_AT: 'last_sync_at',
  RECOVERY_CODE: 'recovery_code_hash',
  DISMISSED_CANDIDATES: 'dismissed_candidates'
} as const
export type SettingKey = (typeof SettingKey)[keyof typeof SettingKey]

export const settingsService = {
  get(key: SettingKey): string | null {
    return settingsRepository.get(key)
  },
  set(key: SettingKey, value: string): void {
    settingsRepository.set(key, value)
  },
  delete(key: SettingKey): void {
    settingsRepository.delete(key)
  },
  getJson<T>(key: SettingKey, fallback: T): T {
    const raw = settingsRepository.get(key)
    if (!raw) return fallback
    try {
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  },
  setJson(key: SettingKey, value: unknown): void {
    settingsRepository.set(key, JSON.stringify(value))
  }
}
