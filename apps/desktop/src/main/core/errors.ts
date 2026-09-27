import { DomainError, ErrorCode, type Result } from '@bllt/shared'
import { ZodError } from 'zod'

export { DomainError, ErrorCode }

export const notFound = (what: string) => new DomainError(ErrorCode.NOT_FOUND, `${what} no existe`)
export const forbidden = () =>
  new DomainError(ErrorCode.FORBIDDEN, 'No tienes permiso para esta acción')
export const unauthorized = () => new DomainError(ErrorCode.UNAUTHORIZED, 'Inicia sesión de nuevo')

/** Converts anything thrown by a handler into a Result that survives the IPC bridge. */
export function toErrorResult(error: unknown): Result<never> {
  if (error instanceof DomainError) return { ok: false, code: error.code, message: error.message }
  if (error instanceof ZodError) {
    const first = error.issues[0]
    return {
      ok: false,
      code: ErrorCode.VALIDATION,
      message: first ? first.message : 'Datos inválidos'
    }
  }
  if (error instanceof Error && /UNIQUE constraint failed/.test(error.message)) {
    return { ok: false, code: ErrorCode.CONFLICT, message: 'Ya existe un registro con ese valor' }
  }
  console.error(error)
  return { ok: false, code: ErrorCode.INTERNAL, message: 'Ocurrió un error inesperado' }
}
