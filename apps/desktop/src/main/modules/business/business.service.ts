import type { BusinessInput } from '@bllt/shared'
import type { BusinessDto } from '../../../types/api'
import { SettingKey, settingsService } from '../settings/settings.service'

/** Name, RIF and logo of the business, shown on the sidebar and on receipts. */
export const businessService = {
  get(): BusinessDto {
    return {
      name: settingsService.get(SettingKey.BUSINESS_NAME) ?? '',
      rif: settingsService.get(SettingKey.BUSINESS_RIF),
      logo: settingsService.get(SettingKey.BUSINESS_LOGO)
    }
  },

  save(input: BusinessInput): BusinessDto {
    settingsService.set(SettingKey.BUSINESS_NAME, input.name)
    setOrDelete(SettingKey.BUSINESS_RIF, input.rif)
    setOrDelete(SettingKey.BUSINESS_LOGO, input.logo)
    return businessService.get()
  }
}

function setOrDelete(key: SettingKey, value: string | null): void {
  if (value) settingsService.set(key, value)
  else settingsService.delete(key)
}
