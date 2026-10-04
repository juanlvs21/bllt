/** Desktop-only tables on top of the shared schema. */
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { CONFLICT_KINDS, OUTBOX_ENTITIES } from '../enums'

export * from './index'

export const outbox = sqliteTable(
  'outbox',
  {
    id: text('id').primaryKey(),
    entity: text('entity', { enum: OUTBOX_ENTITIES }).notNull(),
    entityId: text('entity_id').notNull(),
    /** JSON snapshot of the row (a sale includes its items). */
    payload: text('payload').notNull(),
    createdAt: text('created_at').notNull(),
    sentAt: text('sent_at')
  },
  (t) => [index('outbox_pending_idx').on(t.sentAt, t.createdAt)]
)

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull()
})

/** PCs of the business, as last reported by the Worker. */
export const devices = sqliteTable('devices', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  series: text('series').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  lastSeenAt: text('last_seen_at')
})

/** Cases the sync fixed on its own (or couldn't) for the admin to look at. */
export const syncConflicts = sqliteTable('sync_conflicts', {
  id: text('id').primaryKey(),
  entity: text('entity', { enum: OUTBOX_ENTITIES }).notNull(),
  entityId: text('entity_id').notNull(),
  kind: text('kind', { enum: CONFLICT_KINDS }).notNull(),
  detail: text('detail').notNull(),
  createdAt: text('created_at').notNull(),
  resolvedAt: text('resolved_at')
})

export type OutboxRow = typeof outbox.$inferSelect
export type DeviceRow = typeof devices.$inferSelect
export type SyncConflictRow = typeof syncConflicts.$inferSelect
