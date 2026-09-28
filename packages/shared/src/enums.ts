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
  RATE_DECISION: 'RATE_DECISION'
} as const
export type OutboxEntity = (typeof OutboxEntity)[keyof typeof OutboxEntity]
export const OUTBOX_ENTITIES = [
  OutboxEntity.USER,
  OutboxEntity.PRODUCT,
  OutboxEntity.CUSTOMER,
  OutboxEntity.SALE,
  OutboxEntity.EXCHANGE_RATE,
  OutboxEntity.RATE_DECISION
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
