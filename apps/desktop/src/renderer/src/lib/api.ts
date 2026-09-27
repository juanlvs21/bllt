import type { ErrorCode, Result } from '@bllt/shared'
import { toast } from '@bllt/ui'
import { session } from './session.svelte'

export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string
  ) {
    super(message)
  }
}

/** Unwraps an IPC Result, throwing ApiError on failure. An expired session sends the user to login. */
export async function unwrap<T>(promise: Promise<Result<T>>): Promise<T> {
  const result = await promise
  if (result.ok) return result.data
  if (result.code === 'UNAUTHORIZED' && session.user) session.clear()
  throw new ApiError(result.code, result.message)
}

/** Runs an action and shows its error as a toast. Returns undefined on failure. */
export async function attempt<T>(fn: () => Promise<T>, success?: string): Promise<T | undefined> {
  try {
    const value = await fn()
    if (success) toast.success(success)
    return value
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Ocurrió un error')
    return undefined
  }
}

export const api = window.api
