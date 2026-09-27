import { app } from 'electron'
import electronUpdater from 'electron-updater'

/** Checks GitHub Releases for a new version; NSIS blockmaps make downloads differential. */
export function initUpdater(): void {
  if (!app.isPackaged) return
  const { autoUpdater } = electronUpdater
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.checkForUpdatesAndNotify().catch((error) => console.warn('[updater]', error))
  setInterval(
    () => autoUpdater.checkForUpdates().catch(() => undefined),
    6 * 60 * 60 * 1000
  ).unref()
}
