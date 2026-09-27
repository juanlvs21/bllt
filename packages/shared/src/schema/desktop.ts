/** Desktop-only tables on top of the shared schema. */
import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { OUTBOX_ENTITIES } from '../enums'

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

export type OutboxRow = typeof outbox.$inferSelect
