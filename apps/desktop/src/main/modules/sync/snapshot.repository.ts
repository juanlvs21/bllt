import { asc, inArray } from 'drizzle-orm'
import { db, schema } from '../../core/db'

const { users, products, customers, exchangeRates, businessSettings, sales, saleItems } = schema
const { stockMovements } = schema

/** Reads whole tables, in pages where they can be large, to rebuild the outbox on connect. */
export const snapshotRepository = {
  users: () => db().select().from(users).all(),
  products: () => db().select().from(products).all(),
  customers: () => db().select().from(customers).all(),
  rates: () => db().select().from(exchangeRates).all(),
  settings: () => db().select().from(businessSettings).all(),
  movements: (limit: number, offset: number) =>
    db()
      .select()
      .from(stockMovements)
      .orderBy(asc(stockMovements.createdAt), asc(stockMovements.id))
      .limit(limit)
      .offset(offset)
      .all(),
  sales: (limit: number, offset: number) =>
    db()
      .select()
      .from(sales)
      .orderBy(asc(sales.createdAt), asc(sales.id))
      .limit(limit)
      .offset(offset)
      .all(),
  itemsOf: (saleIds: string[]) =>
    saleIds.length === 0
      ? []
      : db().select().from(saleItems).where(inArray(saleItems.saleId, saleIds)).all()
}
