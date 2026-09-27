import { asc, count, inArray, isNull } from 'drizzle-orm'
import type { OutboxEntity } from '@bllt/shared'
import { db, schema } from '../../core/db'

export const outboxRepository = {
  insert(row: {
    id: string
    entity: OutboxEntity
    entityId: string
    payload: string
    createdAt: string
  }) {
    db().insert(schema.outbox).values(row).run()
  },
  pending(limit: number) {
    return db()
      .select()
      .from(schema.outbox)
      .where(isNull(schema.outbox.sentAt))
      .orderBy(asc(schema.outbox.createdAt))
      .limit(limit)
      .all()
  },
  countPending(): number {
    const row = db()
      .select({ n: count() })
      .from(schema.outbox)
      .where(isNull(schema.outbox.sentAt))
      .get()
    return row?.n ?? 0
  },
  markSent(ids: string[], sentAt: string) {
    if (ids.length === 0) return
    db().update(schema.outbox).set({ sentAt }).where(inArray(schema.outbox.id, ids)).run()
  }
}
