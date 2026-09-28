import { registerAppIpc } from '../modules/app/app.ipc'
import { registerBusinessIpc } from '../modules/business/business.ipc'
import { businessService } from '../modules/business/business.service'
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
  registerBusinessIpc()
  registerProductIpc()
  registerCustomerIpc()
  registerRateIpc()
  registerSaleIpc()
  registerDashboardIpc()
  registerSyncIpc()
  registerBackupIpc()
  registerExportIpc()
  rateService.init()
  businessService.ensureQueued()
  syncService.start()
  backupService.runDaily()
}

/** Stops background jobs before quitting. */
export function beforeQuit(): void {
  syncService.stop()
}
