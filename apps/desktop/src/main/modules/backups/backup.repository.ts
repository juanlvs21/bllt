import { rawDb } from '../../core/db'

export const backupRepository = {
  /** Online backup through SQLite's backup API: safe while the database is open. */
  async backupTo(file: string): Promise<void> {
    await rawDb().backup(file)
  }
}
