import { and, desc, eq, gte, inArray, lt, max, sql, type SQL } from 'drizzle-orm'
import type { SaleItemRow, SaleRow } from '@bllt/shared'
import { db, schema } from '../../core/db'

const { sales, saleItems, customers, users } = schema

export interface SaleListFilter {
  id?: string
  customerId?: string
  start?: string
  end?: string
  limit?: number
}

export const saleRepository = {
  nextNumber(): number {
    const row = db()
      .select({ n: max(sales.number) })
      .from(sales)
      .get()
    return (row?.n ?? 0) + 1
  },
  insert(sale: SaleRow, items: SaleItemRow[]): void {
    db().insert(sales).values(sale).run()
    db().insert(saleItems).values(items).run()
  },
  update(id: string, patch: Partial<Omit<SaleRow, 'id'>>): SaleRow {
    return db().update(sales).set(patch).where(eq(sales.id, id)).returning().get()
  },
  findById(id: string): SaleRow | undefined {
    return db().select().from(sales).where(eq(sales.id, id)).get()
  },
  itemsFor(saleIds: string[]): SaleItemRow[] {
    if (saleIds.length === 0) return []
    return db().select().from(saleItems).where(inArray(saleItems.saleId, saleIds)).all()
  },
  /** Sales joined with customer and user names, newest first. */
  list(filter: SaleListFilter) {
    const where: SQL[] = []
    if (filter.id) where.push(eq(sales.id, filter.id))
    if (filter.customerId) where.push(eq(sales.customerId, filter.customerId))
    if (filter.start) where.push(gte(sales.createdAt, filter.start))
    if (filter.end) where.push(lt(sales.createdAt, filter.end))
    return db()
      .select({
        sale: sales,
        customerName: customers.name,
        customerDocument: customers.document,
        username: sql<string>`coalesce(${users.username}, '')`
      })
      .from(sales)
      .leftJoin(customers, eq(customers.id, sales.customerId))
      .leftJoin(users, eq(users.id, sales.userId))
      .where(where.length ? and(...where) : undefined)
      .orderBy(desc(sales.createdAt))
      .limit(filter.limit ?? 200)
      .all()
  }
}
