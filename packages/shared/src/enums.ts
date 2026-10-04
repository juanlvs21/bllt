/** Every domain enum lives here, uppercase, defined once. */

export const Role = {
  ADMIN: 'ADMIN',
  EMPLOYEE: 'EMPLOYEE'
} as const
export type Role = (typeof Role)[keyof typeof Role]
export const ROLES = [Role.ADMIN, Role.EMPLOYEE] as const

export const RateSource = {
  WORKER: 'WORKER',
  PUBLIC_API: 'PUBLIC_API',
  MANUAL: 'MANUAL',
  WEB: 'WEB'
} as const
export type RateSource = (typeof RateSource)[keyof typeof RateSource]
export const RATE_SOURCES = [
  RateSource.WORKER,
  RateSource.PUBLIC_API,
  RateSource.MANUAL,
  RateSource.WEB
] as const

export const SaleStatus = {
  COMPLETED: 'COMPLETED',
  VOIDED: 'VOIDED'
} as const
export type SaleStatus = (typeof SaleStatus)[keyof typeof SaleStatus]
export const SALE_STATUSES = [SaleStatus.COMPLETED, SaleStatus.VOIDED] as const

export const OutboxEntity = {
  USER: 'USER',
  PRODUCT: 'PRODUCT',
  CUSTOMER: 'CUSTOMER',
  SALE: 'SALE',
  EXCHANGE_RATE: 'EXCHANGE_RATE',
  RATE_DECISION: 'RATE_DECISION',
  BUSINESS: 'BUSINESS',
  STOCK_MOVEMENT: 'STOCK_MOVEMENT',
  SETTING: 'SETTING'
} as const
export type OutboxEntity = (typeof OutboxEntity)[keyof typeof OutboxEntity]
export const OUTBOX_ENTITIES = [
  OutboxEntity.USER,
  OutboxEntity.PRODUCT,
  OutboxEntity.CUSTOMER,
  OutboxEntity.SALE,
  OutboxEntity.EXCHANGE_RATE,
  OutboxEntity.RATE_DECISION,
  OutboxEntity.BUSINESS,
  OutboxEntity.STOCK_MOVEMENT,
  OutboxEntity.SETTING
] as const

/** Entities the Worker hands back to the other PCs; the rest only matter to the Worker. */
export const SHARED_ENTITIES = [
  OutboxEntity.USER,
  OutboxEntity.PRODUCT,
  OutboxEntity.CUSTOMER,
  OutboxEntity.SALE,
  OutboxEntity.EXCHANGE_RATE,
  OutboxEntity.STOCK_MOVEMENT,
  OutboxEntity.SETTING
] as const

/** What the desktop did with a Worker rate candidate. */
export const RateDecision = {
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED'
} as const
export type RateDecision = (typeof RateDecision)[keyof typeof RateDecision]
export const RATE_DECISIONS = [RateDecision.ACCEPTED, RateDecision.REJECTED] as const

export const ExportFormat = {
  XLSX: 'XLSX',
  CSV: 'CSV'
} as const
export type ExportFormat = (typeof ExportFormat)[keyof typeof ExportFormat]
export const EXPORT_FORMATS = [ExportFormat.XLSX, ExportFormat.CSV] as const

/** Why a stock movement happened. The stock of a product is the sum of its movements. */
export const StockReason = {
  INITIAL: 'INITIAL',
  SALE: 'SALE',
  VOID: 'VOID',
  PURCHASE: 'PURCHASE',
  ADJUSTMENT: 'ADJUSTMENT'
} as const
export type StockReason = (typeof StockReason)[keyof typeof StockReason]
export const STOCK_REASONS = [
  StockReason.INITIAL,
  StockReason.SALE,
  StockReason.VOID,
  StockReason.PURCHASE,
  StockReason.ADJUSTMENT
] as const

/** Cases the sync resolves on its own and leaves a note about for the admin. */
export const ConflictKind = {
  DUPLICATE_PRODUCT_CODE: 'DUPLICATE_PRODUCT_CODE',
  DUPLICATE_CUSTOMER_DOCUMENT: 'DUPLICATE_CUSTOMER_DOCUMENT',
  DUPLICATE_USERNAME: 'DUPLICATE_USERNAME',
  DUPLICATE_SALE_NUMBER: 'DUPLICATE_SALE_NUMBER',
  LAST_ADMIN_REACTIVATED: 'LAST_ADMIN_REACTIVATED'
} as const
export type ConflictKind = (typeof ConflictKind)[keyof typeof ConflictKind]
export const CONFLICT_KINDS = [
  ConflictKind.DUPLICATE_PRODUCT_CODE,
  ConflictKind.DUPLICATE_CUSTOMER_DOCUMENT,
  ConflictKind.DUPLICATE_USERNAME,
  ConflictKind.DUPLICATE_SALE_NUMBER,
  ConflictKind.LAST_ADMIN_REACTIVATED
] as const
