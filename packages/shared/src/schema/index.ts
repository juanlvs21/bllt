/**
 * Tables shared by SQLite (desktop) and D1 (cloud). Same shape on both sides
 * so the sync is a plain upsert by UUID.
 *
 * Only primary keys are unique here. Business uniqueness (username, sale
 * series and number) is enforced by desktop-only indexes (see
 * apps/desktop/drizzle/0001_desktop_unique.sql and 0003_*): the cloud copy must
 * accept whatever the desktop sends. Product codes aren't unique anywhere:
 * two PCs can create the same code offline and the sync renames one of them.
 *
 * Rows that PCs edit (users, products, customers, rates) carry `updated_at` and
 * `updated_by_device`; the newest edit wins (see lww.ts).
 */
import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { RATE_SOURCES, ROLES, SALE_STATUSES, STOCK_REASONS } from '../enums'

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    username: text('username').notNull(),
    passwordHash: text('password_hash').notNull(),
    salt: text('salt').notNull(),
    iterations: integer('iterations').notNull(),
    role: text('role', { enum: ROLES }).notNull(),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    updatedByDevice: text('updated_by_device').notNull().default('')
  },
  (t) => [index('users_username_idx').on(sql`lower(${t.username})`)]
)

export const products = sqliteTable(
  'products',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    /** Local cache: the sum of the product's stock movements. Never synced. */
    stock: integer('stock').notNull().default(0),
    costCents: integer('cost_cents').notNull(),
    priceCents: integer('price_cents').notNull(),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    updatedAt: text('updated_at').notNull(),
    updatedByDevice: text('updated_by_device').notNull().default('')
  },
  (t) => [index('products_code_idx').on(t.code), index('products_name_idx').on(t.name)]
)

export const customers = sqliteTable(
  'customers',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    document: text('document'),
    phone: text('phone'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    updatedByDevice: text('updated_by_device').notNull().default('')
  },
  (t) => [index('customers_document_idx').on(t.document)]
)

export const exchangeRates = sqliteTable('exchange_rates', {
  /** Business date (UTC-4), "YYYY-MM-DD". */
  date: text('date').primaryKey(),
  /** Bs per USD scaled by RATE_SCALE (4 decimals). */
  bsPerUsd: integer('bs_per_usd').notNull(),
  source: text('source', { enum: RATE_SOURCES }).notNull(),
  confirmedBy: text('confirmed_by').notNull(),
  confirmedAt: text('confirmed_at').notNull(),
  /** Tie-breaker when two PCs confirm at the same instant. */
  updatedByDevice: text('updated_by_device').notNull().default('')
})

export const sales = sqliteTable(
  'sales',
  {
    id: text('id').primaryKey(),
    /** Series of the PC that made the sale ("A", "B"...); the invoice reads "A-000123". */
    series: text('series').notNull().default('A'),
    /** Correlative inside the series, starts at 1. */
    number: integer('number').notNull(),
    customerId: text('customer_id'),
    userId: text('user_id').notNull(),
    rate: integer('rate').notNull(),
    totalCents: integer('total_cents').notNull(),
    status: text('status', { enum: SALE_STATUSES }).notNull(),
    createdAt: text('created_at').notNull(),
    voidedAt: text('voided_at'),
    voidedBy: text('voided_by')
  },
  (t) => [
    index('sales_number_idx').on(t.number),
    index('sales_created_at_idx').on(t.createdAt),
    index('sales_customer_idx').on(t.customerId)
  ]
)

export const saleItems = sqliteTable(
  'sale_items',
  {
    id: text('id').primaryKey(),
    saleId: text('sale_id').notNull(),
    productId: text('product_id').notNull(),
    /** Copies of the product at the time of sale, so past profit never changes. */
    productCode: text('product_code').notNull(),
    productName: text('product_name').notNull(),
    qty: integer('qty').notNull(),
    priceCents: integer('price_cents').notNull(),
    costCents: integer('cost_cents').notNull()
  },
  (t) => [index('sale_items_sale_idx').on(t.saleId)]
)

/** Append-only: the stock of a product is the sum of its deltas, so PCs never overwrite each other. */
export const stockMovements = sqliteTable(
  'stock_movements',
  {
    id: text('id').primaryKey(),
    productId: text('product_id').notNull(),
    delta: integer('delta').notNull(),
    reason: text('reason', { enum: STOCK_REASONS }).notNull(),
    /** Sale item or other record that caused it. */
    refId: text('ref_id'),
    deviceId: text('device_id').notNull(),
    createdAt: text('created_at').notNull()
  },
  (t) => [index('stock_movements_product_idx').on(t.productId)]
)

/** Settings every PC shares (today: the recovery code hash). Newest edit wins. */
export const businessSettings = sqliteTable('business_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
  updatedByDevice: text('updated_by_device').notNull().default('')
})

export type UserRow = typeof users.$inferSelect
export type ProductRow = typeof products.$inferSelect
export type CustomerRow = typeof customers.$inferSelect
export type ExchangeRateRow = typeof exchangeRates.$inferSelect
export type SaleRow = typeof sales.$inferSelect
export type SaleItemRow = typeof saleItems.$inferSelect
export type StockMovementRow = typeof stockMovements.$inferSelect
export type BusinessSettingRow = typeof businessSettings.$inferSelect
