/** Domain errors carry a stable code plus a Spanish message safe to show the user. */
export const ErrorCode = {
  VALIDATION: 'VALIDATION',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  FORBIDDEN: 'FORBIDDEN',
  UNAUTHORIZED: 'UNAUTHORIZED',
  RATE_REQUIRED: 'RATE_REQUIRED',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  RATE_LIMITED: 'RATE_LIMITED',
  UNAVAILABLE: 'UNAVAILABLE',
  INTERNAL: 'INTERNAL'
} as const
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

export class DomainError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'DomainError'
  }
}

/** Shape every IPC call resolves to, so errors cross the bridge intact. */
export type Result<T> = { ok: true; data: T } | { ok: false; code: ErrorCode; message: string }
