import { cloudSettingsInput, DomainError, ErrorCode, Role } from '@bllt/shared'
import { z } from 'zod'
import { handle } from '../../core/ipc'
import { deviceService } from '../devices/device.service'
import { userService } from '../users/user.service'
import { syncService } from './sync.service'

/** Joining a business is only possible before the first user exists. */
function assertFirstRun(): void {
  if (!userService.status().needsSetup) {
    throw new DomainError(ErrorCode.FORBIDDEN, 'Esta PC ya está configurada')
  }
}

export function registerSyncIpc(): void {
  handle('sync:status', {}, () => syncService.status())
  handle('sync:runNow', {}, () => syncService.runCycle())
  handle('sync:getSettings', { role: Role.ADMIN }, () => syncService.getSettings())
  handle('sync:saveSettings', { role: Role.ADMIN, input: cloudSettingsInput }, (input) =>
    syncService.connect(input)
  )
  handle('sync:test', { role: Role.ADMIN, input: cloudSettingsInput }, (input) =>
    syncService.test(input)
  )
  handle('sync:inspect', { auth: false, input: cloudSettingsInput }, (input) => {
    assertFirstRun()
    return syncService.inspect(input)
  })
  handle('sync:join', { auth: false, input: cloudSettingsInput }, (input) => {
    assertFirstRun()
    return syncService.join(input)
  })
  handle('sync:devices', {}, () => deviceService.list())
  handle('sync:revokeDevice', { role: Role.ADMIN, input: z.uuid() }, (id) =>
    syncService.revokeDevice(id)
  )
  handle('sync:conflicts', { role: Role.ADMIN }, () => syncService.conflicts())
  handle('sync:resolveConflict', { role: Role.ADMIN, input: z.uuid() }, (id) =>
    syncService.resolveConflict(id)
  )
}
