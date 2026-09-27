/** D1-only tables on top of the shared schema. */
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { RATE_SOURCES } from '../enums'

export * from './index'

/** Rates proposed by the cron or the web app; the desktop decides. */
export const rateCandidates = sqliteTable(
  'rate_candidates',
  {
    id: text('id').primaryKey(),
    /** Business date (UTC-4) the candidate was fetched on. */
    date: text('date').notNull(),
    bsPerUsd: integer('bs_per_usd').notNull(),
    source: text('source', { enum: RATE_SOURCES }).notNull(),
    /** Value date published by the provider, informational only. */
    valueDate: text('value_date'),
    fetchedAt: text('fetched_at').notNull(),
    createdBy: text('created_by')
  },
  (t) => [index('rate_candidates_fetched_idx').on(t.fetchedAt)]
)

export const cloudMeta = sqliteTable('cloud_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull()
})

/** Failed web logins, used as a simple rate limit. */
export const loginAttempts = sqliteTable(
  'login_attempts',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull(),
    at: text('at').notNull()
  },
  (t) => [index('login_attempts_key_idx').on(t.key, t.at)]
)

export type RateCandidateRow = typeof rateCandidates.$inferSelect
