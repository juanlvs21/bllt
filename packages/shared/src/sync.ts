/** Sync contract between the desktop outbox and the Worker. Validated on both sides. */
import { z } from 'zod'
import { OUTBOX_ENTITIES, RATE_DECISIONS, RATE_SOURCES, ROLES, SALE_STATUSES } from './enums'

export const SYNC_BATCH_SIZE = 100

/**
 * Sync contract version, announced by the Worker on /api/health. Each business deploys its own
 * copy and may not update it, so the desktop keeps messages an older Worker would reject in the
 * outbox until it's updated. Bump it when adding an outbox entity, and list the entity below.
 */
export const SYNC_PROTOCOL = 2

/** Protocol each entity needs, when newer than 1. */
export const ENTITY_PROTOCOL: Partial<Record<(typeof OUTBOX_ENTITIES)[number], number>> = {
  BUSINESS: 2
}

/** Workers from before the protocol answer `{ ok: true }` only: that's version 1. */
export const healthResponse = z.object({ ok: z.boolean(), protocol: z.number().int().default(1) })

/**
 * D1 caps statements per invocation on the free plan, so the Worker accepts
 * a prefix of each batch that fits this budget and the desktop sends the rest
 * in the next request.
 */
export const SYNC_STATEMENT_BUDGET = 40

export const userPayload = z.object({
  id: z.string(),
  username: z.string(),
  passwordHash: z.string(),
  salt: z.string(),
  iterations: z.number().int(),
  role: z.enum(ROLES),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export const productPayload = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  stock: z.number().int(),
  costCents: z.number().int(),
  priceCents: z.number().int(),
  active: z.boolean(),
  updatedAt: z.string()
})

export const customerPayload = z.object({
  id: z.string(),
  name: z.string(),
  document: z.string().nullable(),
  phone: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export const saleItemPayload = z.object({
  id: z.string(),
  saleId: z.string(),
  productId: z.string(),
  productCode: z.string(),
  productName: z.string(),
  qty: z.number().int(),
  priceCents: z.number().int(),
  costCents: z.number().int()
})

export const salePayload = z.object({
  id: z.string(),
  number: z.number().int(),
  customerId: z.string().nullable(),
  userId: z.string(),
  rate: z.number().int(),
  totalCents: z.number().int(),
  status: z.enum(SALE_STATUSES),
  createdAt: z.string(),
  voidedAt: z.string().nullable(),
  voidedBy: z.string().nullable(),
  items: z.array(saleItemPayload)
})

export const exchangeRatePayload = z.object({
  date: z.string(),
  bsPerUsd: z.number().int(),
  source: z.enum(RATE_SOURCES),
  confirmedBy: z.string(),
  confirmedAt: z.string()
})

export const rateDecisionPayload = z.object({
  candidateId: z.string(),
  decision: z.enum(RATE_DECISIONS),
  decidedAt: z.string()
})

/** Only the name: the phone shows it; RIF and logo stay on the desktop. */
export const businessPayload = z.object({ name: z.string() })

export const outboxMessage = z.discriminatedUnion('entity', [
  z.object({ id: z.string(), entity: z.literal('USER'), payload: userPayload }),
  z.object({ id: z.string(), entity: z.literal('PRODUCT'), payload: productPayload }),
  z.object({ id: z.string(), entity: z.literal('CUSTOMER'), payload: customerPayload }),
  z.object({ id: z.string(), entity: z.literal('SALE'), payload: salePayload }),
  z.object({ id: z.string(), entity: z.literal('EXCHANGE_RATE'), payload: exchangeRatePayload }),
  z.object({ id: z.string(), entity: z.literal('RATE_DECISION'), payload: rateDecisionPayload }),
  z.object({ id: z.string(), entity: z.literal('BUSINESS'), payload: businessPayload })
])
export type OutboxMessage = z.infer<typeof outboxMessage>

export const pushRequest = z.object({
  messages: z.array(outboxMessage).min(1).max(SYNC_BATCH_SIZE)
})
export type PushRequest = z.infer<typeof pushRequest>

export const pushResponse = z.object({ accepted: z.array(z.string()) })
export type PushResponse = z.infer<typeof pushResponse>

export const rateCandidateDto = z.object({
  id: z.string(),
  date: z.string(),
  bsPerUsd: z.number().int(),
  source: z.enum(RATE_SOURCES),
  valueDate: z.string().nullable(),
  fetchedAt: z.string()
})
export type RateCandidateDto = z.infer<typeof rateCandidateDto>

/** Latest cron rate of the day, and the phone suggestion still waiting for the desktop. */
export const rateResponse = z.object({
  internet: rateCandidateDto.nullable(),
  phone: rateCandidateDto.nullable()
})
export type RateResponse = z.infer<typeof rateResponse>

export type OutboxEntityName = (typeof OUTBOX_ENTITIES)[number]
