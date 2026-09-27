import { app, shell } from 'electron'
import { resolve } from 'node:path'
import { z } from 'zod'
import { DomainError, ErrorCode } from '@bllt/shared'
import { paths } from '../../core/config'
import { handle } from '../../core/ipc'
import { backupService } from '../backups/backup.service'

export function registerAppIpc(): void {
  handle('app:info', { auth: false }, () => ({
    version: app.getVersion(),
    platform: process.platform,
    dataPath: paths.userData
  }))
  // Only folders and files Bllt itself writes can be opened from the UI.
  handle('app:openPath', { input: z.string().min(1) }, async (target) => {
    const full = resolve(target)
    const allowed = [paths.documentsRoot, backupService.settings().dir, paths.userData]
    if (!allowed.some((root) => full.startsWith(resolve(root)))) {
      throw new DomainError(ErrorCode.FORBIDDEN, 'Ruta no permitida')
    }
    if (/\.(xlsx|csv|db)$/i.test(full)) shell.showItemInFolder(full)
    else await shell.openPath(full)
  })
}
