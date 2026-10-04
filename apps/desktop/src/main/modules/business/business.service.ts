import { OutboxEntity, type BusinessInput } from '@bllt/shared'
import type { BusinessDto } from '../../../types/api'
import { transaction } from '../../core/db'
import { SettingKey, settingsService } from '../settings/settings.service'
import { outboxRepository } from '../sync/outbox.repository'
import {
  BusinessSettingKey,
  businessSettingsService
} from '../business-settings/business-settings.service'
import { syncService } from '../sync/sync.service'

/** Outbox row id for the business: there is only one. */
const BUSINESS_ENTITY_ID = 'business'

/** Name, RIF and logo of the business, shown on the sidebar and on receipts. The name also syncs
 * to the Worker, which shows it on the phone. */
export const businessService = {
  get(): BusinessDto {
    return {
      name: settingsService.get(SettingKey.BUSINESS_NAME) ?? '',
      rif: settingsService.get(SettingKey.BUSINESS_RIF),
      logo: settingsService.get(SettingKey.BUSINESS_LOGO)
    }
  },

  save(input: BusinessInput): BusinessDto {
    transaction(() => {
      settingsService.set(SettingKey.BUSINESS_NAME, input.name)
      setOrDelete(SettingKey.BUSINESS_RIF, input.rif)
      setOrDelete(SettingKey.BUSINESS_LOGO, input.logo)
      syncService.enqueue(OutboxEntity.BUSINESS, BUSINESS_ENTITY_ID, { name: input.name })
      shareWithOtherPcs()
    })
    return businessService.get()
  },

  /** Installs from before the name synced have none in the outbox; queue it once. */
  ensureQueued(): void {
    const name = settingsService.get(SettingKey.BUSINESS_NAME)
    if (name && !outboxRepository.hasEntity(OutboxEntity.BUSINESS))
      syncService.enqueue(OutboxEntity.BUSINESS, BUSINESS_ENTITY_ID, { name })
    // Installs from before the sync between PCs: the data the other PCs will receive.
    if (name && !businessSettingsService.has(BusinessSettingKey.BUSINESS))
      transaction(() => shareWithOtherPcs())
  }
}

/** The other PCs need the same name, RIF and logo for their receipts. */
function shareWithOtherPcs(): void {
  const { name, rif, logo } = businessService.get()
  businessSettingsService.setJson(BusinessSettingKey.BUSINESS, { name, rif, logo })
}

function setOrDelete(key: SettingKey, value: string | null): void {
  if (value) settingsService.set(key, value)
  else settingsService.delete(key)
}
