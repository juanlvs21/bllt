import { and, asc, count, eq, ne, sql } from 'drizzle-orm'
import {
  Role,
  type BusinessSettingRow,
  type CustomerRow,
  type ExchangeRateRow,
  type SaleItemRow,
  type SaleRow,
  type StockMovementRow,
  type UserRow
} from '@bllt/shared'
import { db, schema } from '../../core/db'

const { users, products, customers, exchangeRates, sales, saleItems, stockMovements } = schema
const { businessSettings, syncConflicts } = schema

type ProductPayload = Omit<typeof products.$inferSelect, 'stock'>

/**
 * Writes rows that came from another PC. It touches the tables of several modules on purpose: a
 * remote row is applied as it is, without the validations and queuing of a local edit.
 */
export const applyRepository = {
  userById: (id: string) => db().select().from(users).where(eq(users.id, id)).get(),
  userByUsername: (username: string, exceptId: string) =>
    db()
      .select()
      .from(users)
      .where(and(sql`lower(${users.username}) = ${username.toLowerCase()}`, ne(users.id, exceptId)))
      .get(),
  upsertUser(row: UserRow): void {
    const { id, ...rest } = row
    db().insert(users).values(row).onConflictDoUpdate({ target: users.id, set: rest }).run()
  },
  renameUser(id: string, username: string, stamp: { updatedAt: string; updatedByDevice: string }) {
    return db()
      .update(users)
      .set({ username, ...stamp })
      .where(eq(users.id, id))
      .returning()
      .get()
  },
  activeAdmins: () =>
    db()
      .select({ n: count() })
      .from(users)
      .where(and(eq(users.role, Role.ADMIN), eq(users.active, true)))
      .get()?.n ?? 0,
  /** The admin deactivated last. */
  lastDeactivatedAdmin: () =>
    db()
      .select()
      .from(users)
      .where(eq(users.role, Role.ADMIN))
      .orderBy(sql`${users.updatedAt} desc`)
      .limit(1)
      .get(),
  reactivateUser(id: string, stamp: { updatedAt: string; updatedByDevice: string }) {
    return db()
      .update(users)
      .set({ active: true, ...stamp })
      .where(eq(users.id, id))
      .returning()
      .get()
  },

  productById: (id: string) => db().select().from(products).where(eq(products.id, id)).get(),
  /** The stock column keeps whatever this PC has: it's rebuilt from movements, never copied. */
  upsertProduct(row: ProductPayload): void {
    const { id, ...rest } = row
    db()
      .insert(products)
      .values({ ...row, stock: 0 })
      .onConflictDoUpdate({ target: products.id, set: rest })
      .run()
  },
  productsByCode: (code: string) =>
    db()
      .select()
      .from(products)
      .where(sql`lower(${products.code}) = ${code.toLowerCase()}`)
      .orderBy(asc(products.id))
      .all(),
  productCodeTaken: (code: string) =>
    !!db()
      .select({ id: products.id })
      .from(products)
      .where(sql`lower(${products.code}) = ${code.toLowerCase()}`)
      .get(),
  renameProduct(id: string, code: string, stamp: { updatedAt: string; updatedByDevice: string }) {
    return db()
      .update(products)
      .set({ code, ...stamp })
      .where(eq(products.id, id))
      .returning()
      .get()
  },
  refreshStock(productIds: Iterable<string>): void {
    for (const id of productIds) {
      db()
        .update(products)
        .set({
          stock: sql`(select coalesce(sum(${stockMovements.delta}), 0) from ${stockMovements} where ${stockMovements.productId} = ${id})`
        })
        .where(eq(products.id, id))
        .run()
    }
  },

  customerById: (id: string) => db().select().from(customers).where(eq(customers.id, id)).get(),
  upsertCustomer(row: CustomerRow): void {
    const { id, ...rest } = row
    db().insert(customers).values(row).onConflictDoUpdate({ target: customers.id, set: rest }).run()
  },
  customersByDocument: (document: string) =>
    db()
      .select()
      .from(customers)
      .where(sql`upper(${customers.document}) = ${document.toUpperCase()}`)
      .all(),

  rateByDate: (date: string) =>
    db().select().from(exchangeRates).where(eq(exchangeRates.date, date)).get(),
  upsertRate(row: ExchangeRateRow): void {
    const { date, ...rest } = row
    db()
      .insert(exchangeRates)
      .values(row)
      .onConflictDoUpdate({ target: exchangeRates.date, set: rest })
      .run()
  },

  saleById: (id: string) => db().select().from(sales).where(eq(sales.id, id)).get(),
  saleWithNumber: (series: string, number: number) =>
    db()
      .select()
      .from(sales)
      .where(and(eq(sales.series, series), eq(sales.number, number)))
      .get(),
  nextNumber: (series: string) =>
    (db()
      .select({ n: sql<number>`max(${sales.number})` })
      .from(sales)
      .where(eq(sales.series, series))
      .get()?.n ?? 0) + 1,
  insertSale(sale: SaleRow, items: SaleItemRow[]): void {
    db().insert(sales).values(sale).onConflictDoNothing().run()
    if (items.length > 0) db().insert(saleItems).values(items).onConflictDoNothing().run()
  },
  voidSale(id: string, voidedAt: string | null, voidedBy: string | null): void {
    db().update(sales).set({ status: 'VOIDED', voidedAt, voidedBy }).where(eq(sales.id, id)).run()
  },

  insertMovement(row: StockMovementRow): void {
    db().insert(stockMovements).values(row).onConflictDoNothing().run()
  },

  settingByKey: (key: string) =>
    db().select().from(businessSettings).where(eq(businessSettings.key, key)).get(),
  upsertSetting(row: BusinessSettingRow): void {
    const { key, ...rest } = row
    db()
      .insert(businessSettings)
      .values(row)
      .onConflictDoUpdate({ target: businessSettings.key, set: rest })
      .run()
  },

  insertConflict(row: typeof syncConflicts.$inferInsert): void {
    db().insert(syncConflicts).values(row).run()
  },
  unresolvedConflicts: () =>
    db()
      .select()
      .from(syncConflicts)
      .where(sql`${syncConflicts.resolvedAt} is null`)
      .orderBy(sql`${syncConflicts.createdAt} desc`)
      .all(),
  resolveConflict(id: string, at: string): void {
    db().update(syncConflicts).set({ resolvedAt: at }).where(eq(syncConflicts.id, id)).run()
  },
  openConflict: (entityId: string, kind: string) =>
    !!db()
      .select({ id: syncConflicts.id })
      .from(syncConflicts)
      .where(
        and(
          eq(syncConflicts.entityId, entityId),
          sql`${syncConflicts.kind} = ${kind}`,
          sql`${syncConflicts.resolvedAt} is null`
        )
      )
      .get()
}
