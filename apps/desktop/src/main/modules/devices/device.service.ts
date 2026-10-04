import { nowIso, type DeviceDto } from '@bllt/shared'
import { rawDb } from '../../core/db'
import { ensureDeviceId } from '../../core/migrate'
import { SettingKey, settingsService } from '../settings/settings.service'
import { deviceRepository } from './device.repository'

const DEFAULT_SERIES = 'A'

export const deviceService = {
  /** This PC's id, the same for the life of the installation. */
  id(): string {
    return ensureDeviceId(rawDb())
  },

  series(): string {
    return settingsService.get(SettingKey.DEVICE_SERIES) ?? DEFAULT_SERIES
  },

  name(): string {
    return settingsService.get(SettingKey.DEVICE_NAME) ?? ''
  },

  /** Stamp for a row this PC is writing now. */
  stamp(): { updatedAt: string; updatedByDevice: string } {
    return { updatedAt: nowIso(), updatedByDevice: this.id() }
  },

  /** Keeps what the Worker assigned this PC. */
  assign(name: string, series: string): void {
    settingsService.set(SettingKey.DEVICE_NAME, name)
    settingsService.set(SettingKey.DEVICE_SERIES, series)
  },

  list(): DeviceDto[] {
    return deviceRepository.list().map((d) => ({ ...d }))
  },

  /** Replaces the local copy with what the Worker reports. */
  replaceAll(devices: DeviceDto[]): void {
    for (const d of devices) deviceRepository.upsert(d)
  },

  /** Name of the PC that issued a series, for receipts and exports. */
  nameOf(series: string): string {
    return deviceRepository.list().find((d) => d.series === series)?.name ?? ''
  }
}
