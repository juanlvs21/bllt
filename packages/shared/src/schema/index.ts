/**
 * Tables shared by SQLite (desktop) and D1 (cloud). Same shape on both sides
 * so the sync is a plain upsert by UUID.
 *
 * Only primary keys are unique here. Business uniqueness (username, product
 * code, sale number) is enforced by desktop-only indexes (see
 * apps/desktop/drizzle/0001_desktop_unique.sql): the cloud copy must accept
 * whatever the desktop sends, e.g. reused sale numbers after a restore.
 */
import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { RATE_SOURCES, ROLES, SALE_STATUSES } from '../enums'

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
    updatedAt: text('updated_at').notNull()
  },
  (t) => [index('users_username_idx').on(sql`lower(${t.username})`)]
)

export const products = sqliteTable(
  'products',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    stock: integer('stock').notNull().default(0),
    costCents: integer('cost_cents').notNull(),
    priceCents: integer('price_cents').notNull(),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    updatedAt: text('updated_at').notNull()
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
    updatedAt: text('updated_at').notNull()
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
  confirmedAt: text('confirmed_at').notNull()
})

export const sales = sqliteTable(
  'sales',
  {
    id: text('id').primaryKey(),
    /** Local correlative, starts at 1. */
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

export type UserRow = typeof users.$inferSelect
export type ProductRow = typeof products.$inferSelect
export type CustomerRow = typeof customers.$inferSelect
export type ExchangeRateRow = typeof exchangeRates.$inferSelect
export type SaleRow = typeof sales.$inferSelect
export type SaleItemRow = typeof saleItems.$inferSelect
