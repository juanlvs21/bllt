import { and, asc, count, eq, inArray, isNull, notInArray } from 'drizzle-orm'
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
  /** Oldest unsent rows, skipping the entities the Worker can't take yet. */
  pending(limit: number, held: OutboxEntity[] = []) {
    return db()
      .select()
      .from(schema.outbox)
      .where(
        and(
          isNull(schema.outbox.sentAt),
          held.length ? notInArray(schema.outbox.entity, held) : undefined
        )
      )
      .orderBy(asc(schema.outbox.createdAt))
      .limit(limit)
      .all()
  },
  countPending(held: OutboxEntity[] = []): number {
    const row = db()
      .select({ n: count() })
      .from(schema.outbox)
      .where(
        and(
          isNull(schema.outbox.sentAt),
          held.length ? notInArray(schema.outbox.entity, held) : undefined
        )
      )
      .get()
    return row?.n ?? 0
  },
  hasEntity(entity: OutboxEntity): boolean {
    return !!db()
      .select({ id: schema.outbox.id })
      .from(schema.outbox)
      .where(eq(schema.outbox.entity, entity))
      .limit(1)
      .get()
  },
  markSent(ids: string[], sentAt: string) {
    if (ids.length === 0) return
    db().update(schema.outbox).set({ sentAt }).where(inArray(schema.outbox.id, ids)).run()
  }
}
