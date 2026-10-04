/**
 * A D1 stand-in over node:sqlite, so the Worker's services run against a real SQLite with its
 * real migrations. Only the parts drizzle's D1 driver uses.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { DatabaseSync, type StatementSync } from 'node:sqlite'
import { join } from 'node:path'

type Param = string | number | null | bigint

class Prepared {
  constructor(
    readonly db: DatabaseSync,
    readonly sql: string,
    readonly params: Param[] = []
  ) {}
  bind(...params: Param[]) {
    return new Prepared(this.db, this.sql, params)
  }
  private statement(arrays: boolean): StatementSync {
    const st = this.db.prepare(this.sql)
    st.setReturnArrays(arrays)
    return st
  }
  /** Executes and returns D1's result shape. */
  execute() {
    const st = this.statement(false)
    if (st.columns().length > 0) {
      const results = st.all(...this.params) as Record<string, unknown>[]
      return { success: true, results, meta: { changes: 0 } }
    }
    const r = st.run(...this.params)
    return { success: true, results: [], meta: { changes: Number(r.changes) } }
  }
  async all() {
    return this.execute()
  }
  async run() {
    return this.execute()
  }
  async first() {
    return (this.execute().results[0] as unknown) ?? null
  }
  async raw() {
    return this.statement(true).all(...this.params)
  }
}

export interface TestD1 extends D1Database {
  sqlite: DatabaseSync
}

/** A fresh database with every migration of the Worker applied. */
export function createD1(): TestD1 {
  const sqlite = new DatabaseSync(':memory:')
  const dir = join(__dirname, '../migrations')
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    for (const statement of readFileSync(join(dir, file), 'utf8').split(
      '--> statement-breakpoint'
    )) {
      if (statement.trim()) sqlite.exec(statement)
    }
  }
  const d1 = {
    sqlite,
    prepare: (sql: string) => new Prepared(sqlite, sql),
    async batch(statements: Prepared[]) {
      sqlite.exec('BEGIN')
      try {
        const out = statements.map((s) => s.execute())
        sqlite.exec('COMMIT')
        return out
      } catch (error) {
        sqlite.exec('ROLLBACK')
        throw error
      }
    }
  }
  return d1 as unknown as TestD1
}
