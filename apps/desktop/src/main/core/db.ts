import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import * as schema from '@bllt/shared/schema/desktop'
import { paths } from './config'
import { prepareDatabase } from './migrate'

export type Db = BetterSQLite3Database<typeof schema>

let sqlite: Database.Database | null = null
let instance: Db | null = null

/** Opens the database and applies pending migrations. Called once at startup. */
export function openDatabase(file = paths.database): Db {
  mkdirSync(dirname(file), { recursive: true })
  sqlite = new Database(file)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  sqlite.pragma('busy_timeout = 5000')
  instance = drizzle(sqlite, { schema })
  prepareDatabase(sqlite, () => migrate(instance!, { migrationsFolder: paths.migrations }))
  return instance
}

export function db(): Db {
  if (!instance) throw new Error('Database not open')
  return instance
}

export function rawDb(): Database.Database {
  if (!sqlite) throw new Error('Database not open')
  return sqlite
}

/** Runs fn inside a single SQLite transaction; every repository call inside shares it. */
export function transaction<T>(fn: () => T): T {
  return rawDb().transaction(fn)()
}

export function closeDatabase(): void {
  sqlite?.close()
  sqlite = null
  instance = null
}

export { schema }
