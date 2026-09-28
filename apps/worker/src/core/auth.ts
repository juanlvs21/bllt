import { DomainError, ErrorCode } from '@bllt/shared'
import { getCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'
import { userService } from '../modules/auth/user.service'
import type { AppContext } from './env'

export const SESSION_COOKIE = 'bllt_session'

/** Desktop → Worker: constant-time check of the Bearer SYNC_TOKEN. */
export const requireSyncToken = createMiddleware<AppContext>(async (c, next) => {
  const header = c.req.header('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!c.env.SYNC_TOKEN || !(await safeEqual(token, c.env.SYNC_TOKEN))) {
    throw new DomainError(ErrorCode.UNAUTHORIZED, 'Token de sincronización inválido')
  }
  await next()
})

/** Phone → Worker: JWT in an HttpOnly cookie, and the user must still be active. */
export const requireSession = createMiddleware<AppContext>(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE)
  if (!token) throw new DomainError(ErrorCode.UNAUTHORIZED, 'Inicia sesión')
  let sub: string
  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256')
    sub = String(payload.sub)
  } catch {
    throw new DomainError(ErrorCode.UNAUTHORIZED, 'Tu sesión expiró')
  }
  const user = await userService.findActive(c.env.DB, sub)
  if (!user) throw new DomainError(ErrorCode.UNAUTHORIZED, 'Tu usuario fue desactivado')
  c.set('user', user)
  await next()
})

async function safeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder()
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b))
  ])
  const x = new Uint8Array(ha)
  const y = new Uint8Array(hb)
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x[i]! ^ y[i]!
  return diff === 0
}
