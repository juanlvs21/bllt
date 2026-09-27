import { and, asc, count, eq, inArray, like, or, sql, type SQL } from 'drizzle-orm'
import type { ProductRow } from '@bllt/shared'
import { db, schema } from '../../core/db'

const { products } = schema

/** A product is running out at this stock or below. */
export const LOW_STOCK = 3

function listFilter(search?: string, includeInactive = false): SQL | undefined {
  const filters: SQL[] = []
  if (!includeInactive) filters.push(eq(products.active, true))
  if (search) {
    const term = `%${search}%`
    filters.push(or(like(products.name, term), like(products.code, term)) as SQL)
  }
  return filters.length ? and(...filters) : undefined
}

export const productRepository = {
  list(
    search?: string,
    includeInactive = false,
    window?: { limit: number; offset: number }
  ): ProductRow[] {
    const query = db()
      .select()
      .from(products)
      .where(listFilter(search, includeInactive))
      .orderBy(asc(products.name))
    return window ? query.limit(window.limit).offset(window.offset).all() : query.all()
  },
  /** Count, inventory value at cost and low-stock count over every matching product. */
  summary(search?: string, includeInactive = false) {
    const row = db()
      .select({
        total: count(),
        inventoryCents: sql<number>`coalesce(sum(${products.stock} * ${products.costCents}), 0)`,
        lowStock: sql<number>`coalesce(sum(case when ${products.active} and ${products.stock} <= ${LOW_STOCK} then 1 else 0 end), 0)`
      })
      .from(products)
      .where(listFilter(search, includeInactive))
      .get()
    return row ?? { total: 0, inventoryCents: 0, lowStock: 0 }
  },
  findById(id: string): ProductRow | undefined {
    return db().select().from(products).where(eq(products.id, id)).get()
  },
  findByIds(ids: string[]): ProductRow[] {
    if (ids.length === 0) return []
    return db().select().from(products).where(inArray(products.id, ids)).all()
  },
  findByCode(code: string): ProductRow | undefined {
    return db()
      .select()
      .from(products)
      .where(sql`lower(${products.code}) = ${code.toLowerCase()}`)
      .get()
  },
  insert(row: ProductRow): void {
    db().insert(products).values(row).run()
  },
  update(id: string, patch: Partial<Omit<ProductRow, 'id'>>): ProductRow {
    return db().update(products).set(patch).where(eq(products.id, id)).returning().get()
  },
  /** Relative stock change; returns the updated row. */
  addStock(id: string, delta: number, updatedAt: string): ProductRow {
    return db()
      .update(products)
      .set({ stock: sql`${products.stock} + ${delta}`, updatedAt })
      .where(eq(products.id, id))
      .returning()
      .get()
  }
}
