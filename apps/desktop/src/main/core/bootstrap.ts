import { registerAppIpc } from '../modules/app/app.ipc'
import { registerBackupIpc } from '../modules/backups/backup.ipc'
import { backupService } from '../modules/backups/backup.service'
import { registerCustomerIpc } from '../modules/customers/customer.ipc'
import { registerDashboardIpc } from '../modules/dashboard/dashboard.ipc'
import { registerExportIpc } from '../modules/exports/export.ipc'
import { registerProductIpc } from '../modules/products/product.ipc'
import { registerRateIpc } from '../modules/rates/rate.ipc'
import { rateService } from '../modules/rates/rate.service'
import { registerSaleIpc } from '../modules/sales/sale.ipc'
import { registerSyncIpc } from '../modules/sync/sync.ipc'
import { syncService } from '../modules/sync/sync.service'
import { registerUserIpc } from '../modules/users/user.ipc'
import { openDatabase } from './db'

/** Opens the database, registers every IPC adapter and starts background jobs. */
export function bootstrap(): void {
  openDatabase()
  registerAppIpc()
  registerUserIpc()
  registerProductIpc()
  registerCustomerIpc()
  registerRateIpc()
  registerSaleIpc()
  registerDashboardIpc()
  registerSyncIpc()
  registerBackupIpc()
  registerExportIpc()
  rateService.init()
  syncService.start()
  backupService.schedule()
}

let backedUpOnQuit = false

/** Takes the closing backup; returns true when quitting may continue. */
export async function beforeQuit(): Promise<void> {
  if (backedUpOnQuit) return
  backedUpOnQuit = true
  syncService.stop()
  backupService.stop()
  try {
    await backupService.runNow()
  } catch (error) {
    console.error('[backup] al cerrar', error)
  }
}

export const quitState = {
  get done() {
    return backedUpOnQuit
  }
}
