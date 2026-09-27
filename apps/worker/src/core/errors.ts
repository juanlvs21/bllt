import { DomainError, ErrorCode } from '@bllt/shared'
import type { Context } from 'hono'
import { ZodError } from 'zod'

const STATUS: Record<string, 400 | 401 | 403 | 404 | 409 | 429 | 503 | 500> = {
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  UNAVAILABLE: 503
}

export function onError(error: Error, c: Context) {
  if (error instanceof DomainError) {
    return c.json({ code: error.code, message: error.message }, STATUS[error.code] ?? 500)
  }
  if (error instanceof ZodError) {
    return c.json(
      { code: ErrorCode.VALIDATION, message: error.issues[0]?.message ?? 'Datos inválidos' },
      400
    )
  }
  console.error(error)
  return c.json({ code: ErrorCode.INTERNAL, message: 'Ocurrió un error inesperado' }, 500)
}
