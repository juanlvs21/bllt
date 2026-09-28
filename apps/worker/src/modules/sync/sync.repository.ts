import { eq } from 'drizzle-orm'
import type { OutboxMessage } from '@bllt/shared'
import type { BatchItem } from 'drizzle-orm/batch'
import { createDb, schema } from '../../core/db'

type Statement = BatchItem<'sqlite'>

/** Rows per multi-row insert so each statement stays under D1's 100 bound parameters. */
const ITEMS_PER_STATEMENT = 10

/** Builds the idempotent upserts for one outbox message. */
export function statementsFor(d1: D1Database, message: OutboxMessage): Statement[] {
  const db = createDb(d1)
  switch (message.entity) {
    case 'USER': {
      const { id, ...rest } = message.payload
      return [
        db
          .insert(schema.users)
          .values(message.payload)
          .onConflictDoUpdate({ target: schema.users.id, set: rest })
      ]
    }
    case 'PRODUCT': {
      const { id, ...rest } = message.payload
      return [
        db
          .insert(schema.products)
          .values(message.payload)
          .onConflictDoUpdate({ target: schema.products.id, set: rest })
      ]
    }
    case 'CUSTOMER': {
      const { id, ...rest } = message.payload
      return [
        db
          .insert(schema.customers)
          .values(message.payload)
          .onConflictDoUpdate({ target: schema.customers.id, set: rest })
      ]
    }
    case 'EXCHANGE_RATE': {
      const { date, ...rest } = message.payload
      return [
        db
          .insert(schema.exchangeRates)
          .values(message.payload)
          .onConflictDoUpdate({ target: schema.exchangeRates.date, set: rest })
      ]
    }
    case 'RATE_DECISION': {
      const { candidateId, decision, decidedAt } = message.payload
      return [
        db
          .update(schema.rateCandidates)
          .set({ decision, decidedAt })
          .where(eq(schema.rateCandidates.id, candidateId))
      ]
    }
    case 'SALE': {
      const { items, ...sale } = message.payload
      const { id, ...rest } = sale
      const statements: Statement[] = [
        db
          .insert(schema.sales)
          .values(sale)
          .onConflictDoUpdate({ target: schema.sales.id, set: rest })
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
      return statements
    }
  }
}

export const syncRepository = {
  async run(d1: D1Database, statements: Statement[]): Promise<void> {
    if (statements.length === 0) return
    const db = createDb(d1)
    await db.batch(statements as [Statement, ...Statement[]])
  },
  async touch(d1: D1Database, key: string, value: string): Promise<void> {
    await createDb(d1)
      .insert(schema.cloudMeta)
      .values({ key, value })
      .onConflictDoUpdate({ target: schema.cloudMeta.key, set: { value } })
  }
}
