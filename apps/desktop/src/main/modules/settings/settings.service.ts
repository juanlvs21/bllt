import { settingsRepository } from './settings.repository'

/** Local-only settings; never synced. */
export const SettingKey = {
  BUSINESS_NAME: 'business_name',
  BUSINESS_RIF: 'business_rif',
  BUSINESS_LOGO: 'business_logo',
  WORKER_URL: 'worker_url',
  /** Token of this PC (encrypted); the registration SYNC_TOKEN is never stored. */
  DEVICE_TOKEN: 'device_token',
  DEVICE_ID: 'device_id',
  DEVICE_NAME: 'device_name',
  /** Series of the invoices this PC issues. 'A' until the Worker assigns another. */
  DEVICE_SERIES: 'device_series',
  /** Last Worker change this PC applied. */
  PULL_CURSOR: 'pull_cursor',
  /** After restoring a backup the PC also asks for the changes it made itself. */
  PULL_INCLUDE_OWN: 'pull_include_own',
  /** Rows queued by the first full upload, to show its progress. */
  UPLOAD_TOTAL: 'upload_total',
  LAST_PUSH_AT: 'last_push_at',
  LAST_PULL_AT: 'last_pull_at',
  /** The Worker already knows this PC finished its first full upload. */
  UPLOAD_CONFIRMED: 'upload_confirmed',
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
