import { asc, eq, like, or, sql } from 'drizzle-orm'
import { SaleStatus, type CustomerRow } from '@bllt/shared'
import { db, schema } from '../../core/db'

const { customers, sales } = schema

export const customerRepository = {
  /** Customers with their completed sales count and total. */
  list(search?: string) {
    const term = search ? `%${search}%` : null
    return db()
      .select({
        id: customers.id,
        name: customers.name,
        document: customers.document,
        phone: customers.phone,
        createdAt: customers.createdAt,
        salesCount: sql<number>`count(${sales.id})`,
        totalCents: sql<number>`coalesce(sum(${sales.totalCents}), 0)`
      })
      .from(customers)
      .leftJoin(
        sales,
        sql`${sales.customerId} = ${customers.id} and ${sales.status} = ${SaleStatus.COMPLETED}`
      )
      .where(
        term
          ? or(
              like(customers.name, term),
              like(customers.document, term),
              like(customers.phone, term)
            )
          : undefined
      )
      .groupBy(customers.id)
      .orderBy(asc(customers.name))
      .all()
  },
  findById(id: string): CustomerRow | undefined {
    return db().select().from(customers).where(eq(customers.id, id)).get()
  },
  findByDocument(document: string): CustomerRow | undefined {
    return db()
      .select()
      .from(customers)
      .where(sql`upper(${customers.document}) = ${document.toUpperCase()}`)
      .get()
  },
  insert(row: CustomerRow): void {
    db().insert(customers).values(row).run()
  },
  update(id: string, patch: Partial<Omit<CustomerRow, 'id'>>): CustomerRow {
    return db().update(customers).set(patch).where(eq(customers.id, id)).returning().get()
  }
}
