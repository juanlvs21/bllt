import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { businessDate } from '@bllt/shared'
import { paths } from './config'

/**
 * Opening an existing business with a newer version is the riskiest moment of an update, so it
 * goes in three steps: a copy of the database before anything changes, the SQL migrations, and a
 * one-time conversion of the data (stock into movements, device stamps). The conversion compares
 * the numbers before and after; if they differ the app refuses to start and the copy is there.
 * Raw SQL on purpose: this runs before any module exists.
 */

export const DEVICE_ID_KEY = 'device_id'
const LEGACY_DONE_KEY = 'legacy_migrated'
const RECOVERY_KEY = 'recovery_code_hash'

interface Totals {
  users: number
  products: number
  customers: number
  sales: number
  salesCents: number
}

const one = <T>(sqlite: Database.Database, sql: string): T => sqlite.prepare(sql).get() as T

function tableExists(sqlite: Database.Database, name: string): boolean {
  return !!sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name)
}

function setting(sqlite: Database.Database, key: string): string | null {
  if (!tableExists(sqlite, 'settings')) return null
  const row = sqlite.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    { value: string } | undefined
  return row?.value ?? null
}

function setSetting(sqlite: Database.Database, key: string, value: string): void {
  sqlite
    .prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value'
    )
    .run(key, value)
}

function totals(sqlite: Database.Database): Totals {
  const count = (table: string) =>
    one<{ n: number }>(sqlite, `SELECT count(*) AS n FROM ${table}`).n
  return {
    users: count('users'),
    products: count('products'),
    customers: count('customers'),
    sales: count('sales'),
    salesCents: one<{ n: number }>(sqlite, 'SELECT coalesce(sum(total_cents), 0) AS n FROM sales').n
  }
}

function hasPendingMigrations(sqlite: Database.Database, folder: string): boolean {
  const journal = JSON.parse(readFileSync(join(folder, 'meta', '_journal.json'), 'utf8')) as {
    entries: unknown[]
  }
  const applied = tableExists(sqlite, '__drizzle_migrations')
    ? one<{ n: number }>(sqlite, 'SELECT count(*) AS n FROM "__drizzle_migrations"').n
    : 0
  return applied < journal.entries.length
}

/** Copy next to the regular backups, named so the daily cleanup never deletes it. */
function backupBeforeMigrating(sqlite: Database.Database): string {
  const dir = setting(sqlite, 'backup_dir') || paths.defaultBackups
  mkdirSync(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const file = join(dir, `premigracion-${businessDate()}-${stamp}.db`)
  if (existsSync(file)) throw new Error(`Ya existe ${file}`)
  sqlite.prepare('VACUUM INTO ?').run(file)
  return file
}

/** This PC's id, created the first time it's asked for. */
export function ensureDeviceId(sqlite: Database.Database): string {
  const existing = setting(sqlite, DEVICE_ID_KEY)
  if (existing) return existing
  const id = randomUUID()
  setSetting(sqlite, DEVICE_ID_KEY, id)
  return id
}

/**
 * Installations from before the sync between PCs: their stock becomes one INITIAL movement per
 * product (the history was never recorded, so it can't be rebuilt), every edited row is stamped
 * with this PC and the recovery code hash moves to the shared settings.
 */
function convertLegacyData(sqlite: Database.Database, before: Totals | null): void {
  const device = ensureDeviceId(sqlite)
  const now = new Date().toISOString()
  sqlite.transaction(() => {
    for (const table of ['users', 'products', 'customers', 'exchange_rates']) {
      sqlite
        .prepare(`UPDATE ${table} SET updated_by_device = ? WHERE updated_by_device = ''`)
        .run(device)
    }
    const insert = sqlite.prepare(
      `INSERT INTO stock_movements (id, product_id, delta, reason, ref_id, device_id, created_at)
       VALUES (?, ?, ?, 'INITIAL', NULL, ?, ?)`
    )
    const products = sqlite
      .prepare(
        `SELECT id, stock FROM products WHERE stock <> 0
         AND NOT EXISTS (SELECT 1 FROM stock_movements m WHERE m.product_id = products.id)`
      )
      .all() as { id: string; stock: number }[]
    for (const p of products) insert.run(randomUUID(), p.id, p.stock, device, now)

    const hash = setting(sqlite, RECOVERY_KEY)
    if (hash) {
      sqlite
        .prepare(
          `INSERT INTO business_settings (key, value, updated_at, updated_by_device)
           VALUES (?, ?, ?, ?) ON CONFLICT (key) DO NOTHING`
        )
        .run(RECOVERY_KEY, hash, now, device)
    }

    const after = totals(sqlite)
    const mismatch =
      before && (Object.keys(after) as (keyof Totals)[]).find((k) => before[k] !== after[k])
    const drift = one<{ n: number }>(
      sqlite,
      `SELECT count(*) AS n FROM products p WHERE p.stock <>
       (SELECT coalesce(sum(delta), 0) FROM stock_movements m WHERE m.product_id = p.id)`
    ).n
    if (mismatch) throw new Error(`La migración cambió el total de ${mismatch}`)
    if (drift > 0) throw new Error(`El stock de ${drift} productos no coincide con sus movimientos`)
    setSetting(sqlite, LEGACY_DONE_KEY, now)
  })()
}

/** Runs everything needed to open the database with the current schema. */
export function prepareDatabase(
  sqlite: Database.Database,
  migrate: () => void,
  folder = paths.migrations
): void {
  const existing = tableExists(sqlite, 'users') && totals(sqlite).users > 0
  const pending = hasPendingMigrations(sqlite, folder)
  const before = existing && pending ? totals(sqlite) : null
  if (existing && pending) backupBeforeMigrating(sqlite)
  migrate()
  if (setting(sqlite, LEGACY_DONE_KEY)) return
  if (totals(sqlite).users > 0) convertLegacyData(sqlite, before)
  else setSetting(sqlite, LEGACY_DONE_KEY, new Date().toISOString())
}
