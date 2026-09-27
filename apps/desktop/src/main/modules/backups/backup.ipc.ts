import { Role } from '@bllt/shared'
import { z } from 'zod'
import { handle } from '../../core/ipc'
import { backupService } from './backup.service'

export function registerBackupIpc(): void {
  const admin = { role: Role.ADMIN }
  handle('backups:list', admin, () => backupService.list())
  handle('backups:settings', admin, () => backupService.settings())
  handle('backups:runNow', admin, () => backupService.runNow())
  handle('backups:chooseDir', admin, () => backupService.chooseDir())
  handle('backups:resetDir', admin, () => backupService.resetDir())
  handle('backups:restore', { ...admin, input: z.string().min(1) }, (path) =>
    backupService.restore(path)
  )
  handle('backups:chooseFileAndRestore', admin, () => backupService.chooseFileAndRestore())
}
