import { businessDate, DomainError, ErrorCode, nowIso } from '@bllt/shared'
import { app, BrowserWindow, dialog } from 'electron'
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'
import type { BackupInfo, BackupSettings } from '../../../types/api'
import { BACKUP_RETENTION_DAYS, paths } from '../../core/config'
import { closeDatabase } from '../../core/db'
import { SettingKey, settingsService } from '../settings/settings.service'
import { backupRepository } from './backup.repository'

const PREFIX = 'bllt-'
const DAY_MS = 24 * 60 * 60 * 1000
let timer: NodeJS.Timeout | null = null

function dir(): string {
  return settingsService.get(SettingKey.BACKUP_DIR) || paths.defaultBackups
}

/** "bllt-2026-09-27_1530.db" using Venezuela time. */
function fileName(): string {
  const local = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  return `${PREFIX}${local.slice(0, 10)}_${local.slice(11, 13)}${local.slice(14, 16)}${local.slice(17, 19)}.db`
}

function info(file: string): BackupInfo {
  const path = join(dir(), file)
  const stat = statSync(path)
  return { file, path, size: stat.size, createdAt: stat.mtime.toISOString() }
}

function prune(): void {
  const limit = Date.now() - BACKUP_RETENTION_DAYS * DAY_MS
  for (const backup of backupService.list()) {
    if (new Date(backup.createdAt).getTime() < limit) rmSync(backup.path, { force: true })
  }
}

export const backupService = {
  settings(): BackupSettings {
    return {
      dir: dir(),
      defaultDir: paths.defaultBackups,
      lastBackupAt: settingsService.get(SettingKey.LAST_BACKUP_AT)
    }
  },

  list(): BackupInfo[] {
    const folder = dir()
    if (!existsSync(folder)) return []
    return readdirSync(folder)
      .filter((f) => f.startsWith(PREFIX) && f.endsWith('.db'))
      .map(info)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async runNow(): Promise<BackupInfo> {
    const folder = dir()
    mkdirSync(folder, { recursive: true })
    const file = fileName()
    await backupRepository.backupTo(join(folder, file))
    settingsService.set(SettingKey.LAST_BACKUP_AT, nowIso())
    prune()
    return info(file)
  },

  /** Daily backup while the app stays open; checked every hour. */
  schedule(): void {
    const check = () => {
      const last = settingsService.get(SettingKey.LAST_BACKUP_AT)
      if (!last || businessDate(new Date(last)) !== businessDate()) {
        this.runNow().catch((error) => console.error('[backup]', error))
      }
    }
    setTimeout(check, 60_000)
    timer = setInterval(check, 60 * 60 * 1000)
  },

  stop(): void {
    if (timer) clearInterval(timer)
  },

  async chooseDir(): Promise<BackupSettings> {
    const win = BrowserWindow.getFocusedWindow()
    const options = {
      title: 'Carpeta de respaldos',
      defaultPath: dir(),
      properties: ['openDirectory', 'createDirectory'] as Array<'openDirectory' | 'createDirectory'>
    }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    if (!result.canceled && result.filePaths[0]) {
      settingsService.set(SettingKey.BACKUP_DIR, result.filePaths[0])
    }
    return this.settings()
  },

  resetDir(): BackupSettings {
    settingsService.delete(SettingKey.BACKUP_DIR)
    return this.settings()
  },

  /** Restores a backup: copies the current database aside first, then relaunches. */
  async restore(file: string): Promise<void> {
    if (!existsSync(file) || !file.endsWith('.db')) {
      throw new DomainError(ErrorCode.NOT_FOUND, 'El respaldo no existe')
    }
    const folder = dir()
    mkdirSync(folder, { recursive: true })
    const safety = join(folder, `antes-de-restaurar-${basename(fileName())}`)
    await backupRepository.backupTo(safety)
    closeDatabase()
    for (const suffix of ['-wal', '-shm']) rmSync(paths.database + suffix, { force: true })
    copyFileSync(file, paths.database)
    app.relaunch()
    app.exit(0)
  },

  async chooseFileAndRestore(): Promise<boolean> {
    const options = {
      title: 'Elegir respaldo',
      defaultPath: dir(),
      filters: [{ name: 'Respaldo de Bllt', extensions: ['db'] }],
      properties: ['openFile'] as Array<'openFile'>
    }
    const win = BrowserWindow.getFocusedWindow()
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || !result.filePaths[0]) return false
    await this.restore(result.filePaths[0])
    return true
  }
}
