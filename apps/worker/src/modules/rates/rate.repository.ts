import { and, desc, eq } from 'drizzle-orm'
import type { RateCandidateRow } from '@bllt/shared/schema/cloud'
import { createDb, schema } from '../../core/db'

export const rateRepository = {
  async latestCandidate(d1: D1Database, date: string): Promise<RateCandidateRow | undefined> {
    return createDb(d1)
      .select()
      .from(schema.rateCandidates)
      .where(eq(schema.rateCandidates.date, date))
      .orderBy(desc(schema.rateCandidates.fetchedAt))
      .get()
  },
  async insertCandidate(d1: D1Database, row: RateCandidateRow): Promise<void> {
    await createDb(d1).insert(schema.rateCandidates).values(row)
  },
  async confirmed(d1: D1Database, date: string) {
    return createDb(d1)
      .select()
      .from(schema.exchangeRates)
      .where(and(eq(schema.exchangeRates.date, date)))
      .get()
  }
}
