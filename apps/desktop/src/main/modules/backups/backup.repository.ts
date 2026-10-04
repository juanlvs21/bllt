import Database from 'better-sqlite3'
import { rawDb } from '../../core/db'

export const backupRepository = {
  /** Online backup through SQLite's backup API: safe while the database is open. */
  async backupTo(file: string): Promise<void> {
    await rawDb().backup(file)
  },
  /**
   * After a restore the PC must ask the Worker for its own changes too: what it uploaded after
   * the backup was taken exists only there. Written in the restored file, before it opens.
   */
  markRestored(file: string): void {
    const sqlite = new Database(file)
    try {
      sqlite
        .prepare(
          `INSERT INTO settings (key, value) VALUES ('pull_include_own', '1')
           ON CONFLICT (key) DO UPDATE SET value = '1'`
        )
        .run()
    } finally {
      sqlite.close()
    }
  }
}
