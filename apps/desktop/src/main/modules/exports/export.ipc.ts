import { exportInput, Role } from '@bllt/shared'
import { handle } from '../../core/ipc'
import { exportService } from './export.service'

export function registerExportIpc(): void {
  handle('exports:start', { role: Role.ADMIN, input: exportInput }, (input) =>
    exportService.start(input)
  )
}
