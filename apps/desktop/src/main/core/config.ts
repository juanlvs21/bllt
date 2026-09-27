import { app } from 'electron'
import { join } from 'node:path'

/** Filesystem locations. The live database stays in userData; user-facing files go to Documents. */
/** BLLT_DOCUMENTS_DIR lets tests and development keep files out of the real Documents folder. */
const documents = () => process.env['BLLT_DOCUMENTS_DIR'] || app.getPath('documents')

export const paths = {
  get userData() {
    return app.getPath('userData')
  },
  get database() {
    return join(app.getPath('userData'), 'bllt.db')
  },
  get documentsRoot() {
    return join(documents(), 'Bllt')
  },
  get defaultBackups() {
    return join(documents(), 'Bllt', 'Backups')
  },
  get exports() {
    return join(documents(), 'Bllt', 'Exports')
  },
  get receipts() {
    return join(documents(), 'Bllt', 'Receipts')
  },
  get migrations() {
    return app.isPackaged
      ? join(process.resourcesPath, 'drizzle')
      : join(__dirname, '../../drizzle')
  }
}

export const BACKUP_RETENTION_DAYS = 7
export const SYNC_INTERVAL_MS = 45_000
