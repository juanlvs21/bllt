/** Zod schemas for every input crossing a boundary (IPC or HTTP). */
import { z } from 'zod'
import { EXPORT_FORMATS, RATE_SOURCES, ROLES } from './enums'

const trimmed = (max: number) => z.string().trim().min(1, 'Requerido').max(max)
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null)

export const cents = z.number().int('Monto inválido').min(0, 'No puede ser negativo')
export const scaledRate = z.number().int().positive('La tasa debe ser mayor que cero')
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
export const uuid = z.uuid()

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Mínimo 3 caracteres')
  .max(40)
  .regex(/^[a-zA-Z0-9._-]+$/, 'Solo letras, números, punto, guion y guion bajo')
export const passwordSchema = z.string().min(8, 'Mínimo 8 caracteres').max(200)

export const productInput = z.object({
  code: trimmed(64),
  name: trimmed(160),
  stock: z.number().int().min(0, 'No puede ser negativo'),
  costCents: cents,
  priceCents: cents
})
export type ProductInput = z.infer<typeof productInput>

export const productUpdate = productInput.extend({ id: uuid, active: z.boolean() })
export type ProductUpdate = z.infer<typeof productUpdate>

export const stockAdjust = z.object({ id: uuid, delta: z.number().int() })
export type StockAdjust = z.infer<typeof stockAdjust>

export const customerInput = z.object({
  name: trimmed(160),
  document: optionalText(32),
  phone: optionalText(32)
})
export type CustomerInput = z.infer<typeof customerInput>

export const customerUpdate = customerInput.extend({ id: uuid })
export type CustomerUpdate = z.infer<typeof customerUpdate>

export const listQuery = z.object({
  search: z.string().trim().max(160).optional(),
  includeInactive: z.boolean().optional()
})
export type ListQuery = z.infer<typeof listQuery>

export const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const
export type PerPage = (typeof PER_PAGE_OPTIONS)[number]
export const DEFAULT_PER_PAGE: PerPage = 10

const pagination = {
  page: z.number().int().min(1).default(1),
  perPage: z.literal(PER_PAGE_OPTIONS).default(DEFAULT_PER_PAGE)
}

export const pageQuery = listQuery.extend(pagination)
export type PageQuery = z.infer<typeof pageQuery>
/** What callers send: page and perPage are optional. */
export type PageQueryInput = z.input<typeof pageQuery>

/** One page of a list plus the total count of rows matching the filters. */
export interface Page<T> {
  items: T[]
  total: number
  page: number
  perPage: number
}

export const saleInput = z.object({
  customerId: uuid.nullable(),
  items: z
    .array(z.object({ productId: uuid, qty: z.number().int().positive('Cantidad inválida') }))
    .min(1, 'Agrega al menos un producto')
})
export type SaleInput = z.infer<typeof saleInput>

export const salesQuery = z.object({
  customerId: uuid.optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  limit: z.number().int().positive().max(500).optional()
})
export type SalesQuery = z.infer<typeof salesQuery>

export const salesPageQuery = salesQuery.omit({ limit: true }).extend(pagination)
export type SalesPageQuery = z.infer<typeof salesPageQuery>
export type SalesPageQueryInput = z.input<typeof salesPageQuery>

export const rateConfirmInput = z.object({
  bsPerUsd: scaledRate,
  source: z.enum(RATE_SOURCES),
  /** Candidate being accepted, if any. */
  candidateId: z.string().optional()
})
export type RateConfirmInput = z.infer<typeof rateConfirmInput>

export const loginInput = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1)
})
export type LoginInput = z.infer<typeof loginInput>

/**
 * Venezuelan RIF: type letter, 8 digits and a check digit. Accepts it with or
 * without dashes and stores it as `J-12345678-9`.
 */
export const rifSchema = z
  .string()
  .trim()
  .toUpperCase()
  .transform((v) => v.replace(/[\s.-]/g, ''))
  .pipe(z.string().regex(/^[VEJPGC]\d{9}$/, 'RIF inválido. Ejemplo: J-12345678-9'))
  .transform((v) => `${v[0]}-${v.slice(1, 9)}-${v[9]}`)

const optionalRif = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null)
  .pipe(rifSchema.nullable())

/** Max length of the logo data URL (~375 KB of image). The UI downsizes it first. */
export const LOGO_MAX_LENGTH = 500_000

/** Business logo as a PNG, JPEG or WebP data URL; blank or missing means none. */
const optionalLogo = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null)
  .pipe(
    z
      .string()
      .max(LOGO_MAX_LENGTH, 'El logo es demasiado grande')
      .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/, 'Logo inválido')
      .nullable()
  )

export const businessInput = z.object({
  name: z.string().trim().min(1, 'Escribe el nombre del negocio').max(120),
  rif: optionalRif,
  logo: optionalLogo
})
export type BusinessInput = z.infer<typeof businessInput>
/** What callers send: the RIF may be omitted or blank. */
export type BusinessInputRaw = z.input<typeof businessInput>

export const setupInput = z.object({
  business: businessInput,
  username: usernameSchema,
  password: passwordSchema,
  workerUrl: z.url().optional().or(z.literal('')),
  syncToken: z.string().trim().max(512).optional()
})
export type SetupInput = z.infer<typeof setupInput>
export type SetupInputRaw = z.input<typeof setupInput>

export const recoverInput = z.object({
  username: z.string().trim().min(1),
  recoveryCode: z.string().trim().min(1),
  newPassword: passwordSchema
})
export type RecoverInput = z.infer<typeof recoverInput>

export const userCreateInput = z.object({
  username: usernameSchema,
  password: passwordSchema,
  role: z.enum(ROLES)
})
export type UserCreateInput = z.infer<typeof userCreateInput>

export const userSetActiveInput = z.object({ id: uuid, active: z.boolean() })
export const userResetPasswordInput = z.object({ id: uuid, password: passwordSchema })
export const changePasswordInput = z.object({ current: z.string().min(1), next: passwordSchema })

export const cloudSettingsInput = z.object({
  workerUrl: z.url('URL inválida').or(z.literal('')),
  syncToken: z.string().trim().max(512)
})
export type CloudSettingsInput = z.infer<typeof cloudSettingsInput>

export const exportInput = z
  .object({ from: isoDate, to: isoDate, format: z.enum(EXPORT_FORMATS) })
  .refine((v) => v.from <= v.to, { message: 'La fecha de inicio debe ser anterior a la de fin' })
export type ExportInput = z.infer<typeof exportInput>

/** Web app: suggest a rate from the phone. */
export const webRateInput = z.object({ bsPerUsd: scaledRate })
