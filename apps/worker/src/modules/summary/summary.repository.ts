import { and, count, desc, eq, gte, lt, sql } from 'drizzle-orm'
import { SaleStatus, type ProfitLine } from '@bllt/shared'
import { createDb, schema } from '../../core/db'

const { sales, saleItems, customers, cloudMeta } = schema

export const summaryRepository = {
  async lines(d1: D1Database, start: string, end: string): Promise<ProfitLine[]> {
    return createDb(d1)
      .select({
        qty: saleItems.qty,
        priceCents: saleItems.priceCents,
        costCents: saleItems.costCents,
        rate: sales.rate,
        status: sales.status
      })
      .from(saleItems)
      .innerJoin(sales, eq(sales.id, saleItems.saleId))
      .where(and(gte(sales.createdAt, start), lt(sales.createdAt, end)))
      .all()
  },
  async completedCount(d1: D1Database, start: string, end: string): Promise<number> {
    const row = await createDb(d1)
      .select({ n: count() })
      .from(sales)
      .where(
        and(
          gte(sales.createdAt, start),
          lt(sales.createdAt, end),
          eq(sales.status, SaleStatus.COMPLETED)
        )
      )
      .get()
    return row?.n ?? 0
  },
  async salesBetween(d1: D1Database, start: string, end: string) {
    return createDb(d1)
      .select({
        id: sales.id,
        number: sales.number,
        createdAt: sales.createdAt,
        customerName: customers.name,
        totalCents: sales.totalCents,
        rate: sales.rate,
        status: sales.status,
        profitCents: sql<number>`coalesce((select sum(${saleItems.qty} * (${saleItems.priceCents} - ${saleItems.costCents})) from ${saleItems} where ${saleItems.saleId} = ${sales.id}), 0)`
      })
      .from(sales)
      .leftJoin(customers, eq(customers.id, sales.customerId))
      .where(and(gte(sales.createdAt, start), lt(sales.createdAt, end)))
      .orderBy(desc(sales.createdAt))
      .limit(50)
      .all()
  },
  async meta(d1: D1Database, key: string): Promise<string | null> {
    const row = await createDb(d1).select().from(cloudMeta).where(eq(cloudMeta.key, key)).get()
    return row?.value ?? null
  }
}
