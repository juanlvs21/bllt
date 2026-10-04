import { and, asc, count, eq, gt, inArray, max, ne, sql, type SQL } from 'drizzle-orm'
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core'
import {
  clampFuture,
  nowIso,
  SHARED_ENTITIES,
  type OutboxEntity,
  type OutboxMessage,
  type PullItem
} from '@bllt/shared'
import type { BatchItem } from 'drizzle-orm/batch'
import { createDb, schema } from '../../core/db'

type Statement = BatchItem<'sqlite'>

/** cloud_meta key holding the business name the desktop synced. */
export const BUSINESS_NAME_KEY = 'business_name'
/** cloud_meta key set once the first PC has uploaded everything it had. */
export const UPLOAD_COMPLETE_KEY = 'upload_complete'

/** Rows per multi-row insert so each statement stays under D1's 100 bound parameters. */
const ITEMS_PER_STATEMENT = 10

/**
 * The incoming row wins when it's newer than the stored one, or equal and from a greater device
 * id: the same rule the desktop applies (see lww.ts in @bllt/shared).
 */
function incomingWins(updatedAt: SQLiteColumn, device: SQLiteColumn): SQL {
  return sql`(excluded.${sql.raw(updatedAt.name)} > ${updatedAt} or (excluded.${sql.raw(updatedAt.name)} = ${updatedAt} and excluded.${sql.raw(device.name)} > ${device}))`
}

/** Builds the idempotent upserts for one outbox message, plus the row the PCs pull from. */
export function statementsFor(
  d1: D1Database,
  message: OutboxMessage,
  deviceId: string
): Statement[] {
  const db = createDb(d1)
  const now = nowIso()
  const change = (entity: OutboxEntity, entityId: string): Statement[] =>
    (SHARED_ENTITIES as readonly string[]).includes(entity)
      ? [db.insert(schema.changes).values({ entity, entityId, deviceId, createdAt: now })]
      : []
  switch (message.entity) {
    case 'USER': {
      const payload = { ...message.payload, updatedAt: clampFuture(message.payload.updatedAt) }
      const { id, ...rest } = payload
      return [
        db
          .insert(schema.users)
          .values(payload)
          .onConflictDoUpdate({
            target: schema.users.id,
            set: rest,
            setWhere: incomingWins(schema.users.updatedAt, schema.users.updatedByDevice)
          }),
        ...change('USER', id)
      ]
    }
    case 'PRODUCT': {
      const payload = { ...message.payload, updatedAt: clampFuture(message.payload.updatedAt) }
      const { id, ...rest } = payload
      return [
        db
          .insert(schema.products)
          .values(payload)
          .onConflictDoUpdate({
            target: schema.products.id,
            set: rest,
            setWhere: incomingWins(schema.products.updatedAt, schema.products.updatedByDevice)
          }),
        ...change('PRODUCT', id)
      ]
    }
    case 'CUSTOMER': {
      const payload = { ...message.payload, updatedAt: clampFuture(message.payload.updatedAt) }
      const { id, ...rest } = payload
      return [
        db
          .insert(schema.customers)
          .values(payload)
          .onConflictDoUpdate({
            target: schema.customers.id,
            set: rest,
            setWhere: incomingWins(schema.customers.updatedAt, schema.customers.updatedByDevice)
          }),
        ...change('CUSTOMER', id)
      ]
    }
    case 'EXCHANGE_RATE': {
      const payload = { ...message.payload, confirmedAt: clampFuture(message.payload.confirmedAt) }
      const { date, ...rest } = payload
      return [
        db
          .insert(schema.exchangeRates)
          .values(payload)
          .onConflictDoUpdate({
            target: schema.exchangeRates.date,
            set: rest,
            setWhere: incomingWins(
              schema.exchangeRates.confirmedAt,
              schema.exchangeRates.updatedByDevice
            )
          }),
        ...change('EXCHANGE_RATE', date)
      ]
    }
    case 'SETTING': {
      const payload = { ...message.payload, updatedAt: clampFuture(message.payload.updatedAt) }
      const { key, ...rest } = payload
      return [
        db
          .insert(schema.businessSettings)
          .values(payload)
          .onConflictDoUpdate({
            target: schema.businessSettings.key,
            set: rest,
            setWhere: incomingWins(
              schema.businessSettings.updatedAt,
              schema.businessSettings.updatedByDevice
            )
          }),
        ...change('SETTING', key)
      ]
    }
    case 'STOCK_MOVEMENT':
      return [
        db.insert(schema.stockMovements).values(message.payload).onConflictDoNothing(),
        ...change('STOCK_MOVEMENT', message.payload.id)
      ]
    case 'RATE_DECISION': {
      const { candidateId, decision, decidedAt } = message.payload
      return [
        db
          .update(schema.rateCandidates)
          .set({ decision, decidedAt })
          .where(eq(schema.rateCandidates.id, candidateId))
      ]
    }
    case 'BUSINESS': {
      const value = message.payload.name
      return [
        db
          .insert(schema.cloudMeta)
          .values({ key: BUSINESS_NAME_KEY, value })
          .onConflictDoUpdate({ target: schema.cloudMeta.key, set: { value } })
      ]
    }
    case 'SALE': {
      const { items, ...sale } = message.payload
      const { id, ...rest } = sale
      const statements: Statement[] = [
        // A sale never changes; the only thing a conflict may do is void it.
        db
          .insert(schema.sales)
          .values(sale)
          .onConflictDoUpdate({
            target: schema.sales.id,
            set: { status: rest.status, voidedAt: rest.voidedAt, voidedBy: rest.voidedBy },
            setWhere: sql`excluded.status = 'VOIDED' and ${schema.sales.status} <> 'VOIDED'`
          })
      ]
      // Sale lines never change after the sale, so existing ones are skipped.
      for (let i = 0; i < items.length; i += ITEMS_PER_STATEMENT) {
        statements.push(
          db
            .insert(schema.saleItems)
            .values(items.slice(i, i + ITEMS_PER_STATEMENT))
            .onConflictDoNothing()
        )
      }
      return [...statements, ...change('SALE', id)]
    }
  }
}

/** The 50 most recent changes' current rows, in the shape the PCs apply. */
async function loadState(
  d1: D1Database,
  entity: PullItem['entity'],
  ids: string[]
): Promise<Map<string, PullItem['payload']>> {
  const db = createDb(d1)
  const out = new Map<string, PullItem['payload']>()
  if (ids.length === 0) return out
  switch (entity) {
    case 'USER':
      for (const r of await db.select().from(schema.users).where(inArray(schema.users.id, ids)))
        out.set(r.id, r)
      break
    case 'PRODUCT':
      for (const { stock: _stock, ...r } of await db
        .select()
        .from(schema.products)
        .where(inArray(schema.products.id, ids)))
        out.set(r.id, r)
      break
    case 'CUSTOMER':
      for (const r of await db
        .select()
        .from(schema.customers)
        .where(inArray(schema.customers.id, ids)))
        out.set(r.id, r)
      break
    case 'EXCHANGE_RATE':
      for (const r of await db
        .select()
        .from(schema.exchangeRates)
        .where(inArray(schema.exchangeRates.date, ids)))
        out.set(r.date, r)
      break
    case 'STOCK_MOVEMENT':
      for (const r of await db
        .select()
        .from(schema.stockMovements)
        .where(inArray(schema.stockMovements.id, ids)))
        out.set(r.id, r)
      break
    case 'SETTING':
      for (const r of await db
        .select()
        .from(schema.businessSettings)
        .where(inArray(schema.businessSettings.key, ids)))
        out.set(r.key, r)
      break
    case 'SALE': {
      const sales = await db.select().from(schema.sales).where(inArray(schema.sales.id, ids))
      const items = await db
        .select()
        .from(schema.saleItems)
        .where(inArray(schema.saleItems.saleId, ids))
      for (const s of sales) {
        out.set(s.id, { ...s, items: items.filter((i) => i.saleId === s.id) })
      }
      break
    }
  }
  return out
}

export const syncRepository = {
  async run(d1: D1Database, statements: Statement[]): Promise<void> {
    if (statements.length === 0) return
    const db = createDb(d1)
    await db.batch(statements as [Statement, ...Statement[]])
  },

  /**
   * Changes after the cursor, with the current state of each row they point at. A row changed
   * several times is sent once. `nextSeq` is where to ask from next time; when this page is the
   * last one it jumps to the newest change, so a PC's own changes aren't scanned again and again.
   */
  async pull(
    d1: D1Database,
    since: number,
    limit: number,
    deviceId: string,
    includeOwn: boolean
  ): Promise<{ items: PullItem[]; nextSeq: number; hasMore: boolean; remaining: number }> {
    const db = createDb(d1)
    const others = includeOwn ? undefined : ne(schema.changes.deviceId, deviceId)
    const inRange = and(gt(schema.changes.seq, since), others)
    const [rows, newest] = await db.batch([
      db.select().from(schema.changes).where(inRange).orderBy(asc(schema.changes.seq)).limit(limit),
      db.select({ seq: max(schema.changes.seq) }).from(schema.changes)
    ])
    const last = rows[rows.length - 1]
    const hasMore = rows.length === limit
    const nextSeq = hasMore && last ? last.seq : Math.max(since, newest[0]?.seq ?? 0)

    // Latest change per row, so the row travels once.
    const latest = new Map<string, (typeof rows)[number]>()
    for (const row of rows) latest.set(`${row.entity}:${row.entityId}`, row)
    const byEntity = new Map<PullItem['entity'], string[]>()
    for (const row of latest.values()) {
      const ids = byEntity.get(row.entity as PullItem['entity']) ?? []
      ids.push(row.entityId)
      byEntity.set(row.entity as PullItem['entity'], ids)
    }
    const states = new Map<string, PullItem['payload']>()
    for (const [entity, ids] of byEntity) {
      for (const [id, payload] of await loadState(d1, entity, ids))
        states.set(`${entity}:${id}`, payload)
    }
    const items = [...latest.values()].flatMap((row) => {
      const payload = states.get(`${row.entity}:${row.entityId}`)
      return payload ? [{ seq: row.seq, entity: row.entity, payload } as PullItem] : []
    })

    const remaining = hasMore
      ? ((
          await db
            .select({ n: count() })
            .from(schema.changes)
            .where(and(gt(schema.changes.seq, nextSeq), others))
            .get()
        )?.n ?? 0)
      : 0
    return { items, nextSeq, hasMore, remaining }
  },

  async meta(d1: D1Database, key: string): Promise<string | null> {
    const row = await createDb(d1)
      .select({ value: schema.cloudMeta.value })
      .from(schema.cloudMeta)
      .where(eq(schema.cloudMeta.key, key))
      .get()
    return row?.value ?? null
  },
  async touch(d1: D1Database, key: string, value: string): Promise<void> {
    await createDb(d1)
      .insert(schema.cloudMeta)
      .values({ key, value })
      .onConflictDoUpdate({ target: schema.cloudMeta.key, set: { value } })
  }
}
