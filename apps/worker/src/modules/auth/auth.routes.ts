import { loginInput } from '@bllt/shared'
import { Hono } from 'hono'
import { deleteCookie, setCookie } from 'hono/cookie'
import { sign } from 'hono/jwt'
import { requireSession, SESSION_COOKIE } from '../../core/auth'
import type { AppContext } from '../../core/env'
import { userService } from './user.service'

const SESSION_DAYS = 30

export const authRoutes = new Hono<AppContext>()
  .post('/login', async (c) => {
    const input = loginInput.parse(await c.req.json())
    const ip = c.req.header('cf-connecting-ip') ?? 'unknown'
    const user = await userService.login(c.env.DB, input, ip)
    const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60
    const token = await sign({ sub: user.id, role: user.role, exp }, c.env.JWT_SECRET, 'HS256')
    setCookie(c, SESSION_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      path: '/',
      maxAge: SESSION_DAYS * 24 * 60 * 60
    })
    return c.json({ user })
  })
  .post('/logout', (c) => {
    deleteCookie(c, SESSION_COOKIE, { path: '/', secure: true })
    return c.json({ ok: true })
  })
  .get('/me', requireSession, (c) => c.json({ user: c.get('user') }))
