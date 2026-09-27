import type { BusinessInput } from '@bllt/shared'
import type { BusinessDto } from '../../../types/api'
import { SettingKey, settingsService } from '../settings/settings.service'

/** Name and RIF of the business, shown on the sidebar and on receipts. */
export const businessService = {
  get(): BusinessDto {
    return {
      name: settingsService.get(SettingKey.BUSINESS_NAME) ?? '',
      rif: settingsService.get(SettingKey.BUSINESS_RIF)
    }
  },

  save(input: BusinessInput): BusinessDto {
    settingsService.set(SettingKey.BUSINESS_NAME, input.name)
    if (input.rif) settingsService.set(SettingKey.BUSINESS_RIF, input.rif)
    else settingsService.delete(SettingKey.BUSINESS_RIF)
    return businessService.get()
  }
}
