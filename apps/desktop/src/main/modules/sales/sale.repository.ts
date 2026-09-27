import { and, count, desc, eq, gte, inArray, lt, max, sql, type SQL } from 'drizzle-orm'
import { SaleStatus, type SaleItemRow, type SaleRow } from '@bllt/shared'
import { db, schema } from '../../core/db'

const { sales, saleItems, customers, users } = schema

export interface SaleListFilter {
  id?: string
  customerId?: string
  start?: string
  end?: string
  limit?: number
  offset?: number
}

function listFilter(filter: SaleListFilter): SQL | undefined {
  const where: SQL[] = []
  if (filter.id) where.push(eq(sales.id, filter.id))
  if (filter.customerId) where.push(eq(sales.customerId, filter.customerId))
  if (filter.start) where.push(gte(sales.createdAt, filter.start))
  if (filter.end) where.push(lt(sales.createdAt, filter.end))
  return where.length ? and(...where) : undefined
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
      .where(listFilter(filter))
      .orderBy(desc(sales.createdAt))
      .limit(filter.limit ?? 200)
      .offset(filter.offset ?? 0)
      .all()
  },
  /** Every matching sale counted; count, total and profit of the completed ones. */
  summary(filter: SaleListFilter) {
    const where = listFilter(filter)
    const completed = and(where, eq(sales.status, SaleStatus.COMPLETED))
    const totals = db()
      .select({
        total: count(),
        completed: sql<number>`coalesce(sum(case when ${sales.status} = ${SaleStatus.COMPLETED} then 1 else 0 end), 0)`,
        totalCents: sql<number>`coalesce(sum(case when ${sales.status} = ${SaleStatus.COMPLETED} then ${sales.totalCents} else 0 end), 0)`
      })
      .from(sales)
      .where(where)
      .get()
    const profit = db()
      .select({
        cents: sql<number>`coalesce(sum(${saleItems.qty} * (${saleItems.priceCents} - ${saleItems.costCents})), 0)`
      })
      .from(saleItems)
      .innerJoin(sales, eq(sales.id, saleItems.saleId))
      .where(completed)
      .get()
    return {
      total: totals?.total ?? 0,
      completedCount: totals?.completed ?? 0,
      totalCents: totals?.totalCents ?? 0,
      profitCents: profit?.cents ?? 0
    }
  }
}
