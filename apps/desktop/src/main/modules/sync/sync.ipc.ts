import { Role, cloudSettingsInput } from '@bllt/shared'
import { handle } from '../../core/ipc'
import { syncService } from './sync.service'

export function registerSyncIpc(): void {
  handle('sync:status', {}, () => syncService.status())
  handle('sync:runNow', {}, () => syncService.runCycle())
  handle('sync:getSettings', { role: Role.ADMIN }, () => syncService.getSettings())
  handle('sync:saveSettings', { role: Role.ADMIN, input: cloudSettingsInput }, (input) =>
    syncService.saveSettings(input)
  )
  handle('sync:test', { role: Role.ADMIN }, () => syncService.test())
}
