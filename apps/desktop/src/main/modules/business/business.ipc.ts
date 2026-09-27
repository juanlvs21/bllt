import { businessInput, Role } from '@bllt/shared'
import { handle } from '../../core/ipc'
import { businessService } from './business.service'

export function registerBusinessIpc(): void {
  // Public: the login screen shows the business name.
  handle('business:get', { auth: false }, () => businessService.get())
  handle('business:save', { role: Role.ADMIN, input: businessInput }, (input) =>
    businessService.save(input)
  )
}
