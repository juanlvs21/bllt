import { desc, eq, sql } from 'drizzle-orm'
import type { StockMovementRow } from '@bllt/shared'
import { db, schema } from '../../core/db'

const { stockMovements, products } = schema

export const stockRepository = {
  /** Returns false when a movement with that id already existed (nothing was written). */
  insert(row: StockMovementRow): boolean {
    return db().insert(stockMovements).values(row).onConflictDoNothing().run().changes > 0
  },
  findById(id: string): StockMovementRow | undefined {
    return db().select().from(stockMovements).where(eq(stockMovements.id, id)).get()
  },
  forProduct(productId: string, limit = 100): StockMovementRow[] {
    return db()
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, productId))
      .orderBy(desc(stockMovements.createdAt))
      .limit(limit)
      .all()
  },
  /**
   * Rebuilds products.stock, which is only a cache, from the movements. It lives here and not in
   * the product module because the movements are the source and this is how they're read.
   */
  refreshCache(productIds: string[]): void {
    for (const id of new Set(productIds)) {
      db()
        .update(products)
        .set({
          stock: sql`(select coalesce(sum(${stockMovements.delta}), 0) from ${stockMovements} where ${stockMovements.productId} = ${id})`
        })
        .where(eq(products.id, id))
        .run()
    }
  }
}
