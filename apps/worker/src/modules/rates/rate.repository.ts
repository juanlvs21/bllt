import { and, desc, eq, gte } from 'drizzle-orm'
import { RateSource } from '@bllt/shared'
import type { RateCandidateRow } from '@bllt/shared/schema/cloud'
import { createDb, schema } from '../../core/db'

export const rateRepository = {
  /** Latest cron candidate of a business day. */
  async latestWorkerCandidate(
    d1: D1Database,
    date: string
  ): Promise<RateCandidateRow | undefined> {
    return createDb(d1)
      .select()
      .from(schema.rateCandidates)
      .where(
        and(
          eq(schema.rateCandidates.date, date),
          eq(schema.rateCandidates.source, RateSource.WORKER)
        )
      )
      .orderBy(desc(schema.rateCandidates.fetchedAt))
      .get()
  },
  /** Latest phone suggestion made at or after `since`, whatever its decision. */
  async latestPhoneCandidate(
    d1: D1Database,
    since: string
  ): Promise<RateCandidateRow | undefined> {
    return createDb(d1)
      .select()
      .from(schema.rateCandidates)
      .where(
        and(
          eq(schema.rateCandidates.source, RateSource.WEB),
          gte(schema.rateCandidates.fetchedAt, since)
        )
      )
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
