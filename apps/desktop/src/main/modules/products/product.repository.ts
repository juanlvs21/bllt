import { and, asc, eq, inArray, like, or, sql, type SQL } from 'drizzle-orm'
import type { ProductRow } from '@bllt/shared'
import { db, schema } from '../../core/db'

const { products } = schema

export const productRepository = {
  list(search?: string, includeInactive = false): ProductRow[] {
    const filters: SQL[] = []
    if (!includeInactive) filters.push(eq(products.active, true))
    if (search) {
      const term = `%${search}%`
      filters.push(or(like(products.name, term), like(products.code, term)) as SQL)
    }
    return db()
      .select()
      .from(products)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(asc(products.name))
      .all()
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
