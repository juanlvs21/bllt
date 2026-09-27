import { desc, eq } from 'drizzle-orm'
import type { ExchangeRateRow } from '@bllt/shared'
import { db, schema } from '../../core/db'

const { exchangeRates } = schema

export const rateRepository = {
  findByDate(date: string): ExchangeRateRow | undefined {
    return db().select().from(exchangeRates).where(eq(exchangeRates.date, date)).get()
  },
  upsert(row: ExchangeRateRow): ExchangeRateRow {
    return db()
      .insert(exchangeRates)
      .values(row)
      .onConflictDoUpdate({
        target: exchangeRates.date,
        set: {
          bsPerUsd: row.bsPerUsd,
          source: row.source,
          confirmedBy: row.confirmedBy,
          confirmedAt: row.confirmedAt
        }
      })
      .returning()
      .get()
  },
  history(limit: number): ExchangeRateRow[] {
    return db().select().from(exchangeRates).orderBy(desc(exchangeRates.date)).limit(limit).all()
  }
}
