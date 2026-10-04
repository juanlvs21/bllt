/** D1-only tables on top of the shared schema. */
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { OUTBOX_ENTITIES, RATE_DECISIONS, RATE_SOURCES } from '../enums'

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
    createdBy: text('created_by'),
    /** Set by the desktop through the outbox; null while pending. */
    decision: text('decision', { enum: RATE_DECISIONS }),
    decidedAt: text('decided_at')
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

/** PCs of the business. Each one has its own token; only its hash is stored. */
export const devices = sqliteTable(
  'devices',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    /** One letter, unique among devices: the series of the invoices this PC issues. */
    series: text('series').notNull(),
    tokenHash: text('token_hash').notNull(),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull(),
    lastSeenAt: text('last_seen_at')
  },
  (t) => [
    uniqueIndex('devices_series_unique').on(t.series),
    index('devices_token_idx').on(t.tokenHash)
  ]
)

/**
 * Pull cursor: one row per accepted push message. `seq` is assigned by the server, so the PCs'
 * clocks never decide what to download. The pull reads the current state of each row.
 */
export const changes = sqliteTable(
  'changes',
  {
    seq: integer('seq').primaryKey({ autoIncrement: true }),
    entity: text('entity', { enum: OUTBOX_ENTITIES }).notNull(),
    entityId: text('entity_id').notNull(),
    deviceId: text('device_id').notNull(),
    createdAt: text('created_at').notNull()
  },
  (t) => [index('changes_device_idx').on(t.deviceId, t.seq)]
)

export type RateCandidateRow = typeof rateCandidates.$inferSelect
