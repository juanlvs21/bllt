import { and, count, eq, gte, lt } from 'drizzle-orm'
import { SaleStatus, type ProfitLine } from '@bllt/shared'
import { db, schema } from '../../core/db'

const { sales, saleItems } = schema

export const dashboardRepository = {
  /** Every sale line in [start, end) with its sale's rate and status. */
  lines(start: string, end: string): ProfitLine[] {
    return db()
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
  completedCount(start: string, end: string): number {
    return (
      db()
        .select({ n: count() })
        .from(sales)
        .where(
          and(
            gte(sales.createdAt, start),
            lt(sales.createdAt, end),
            eq(sales.status, SaleStatus.COMPLETED)
          )
        )
        .get()?.n ?? 0
    )
  }
}
