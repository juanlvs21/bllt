import { DomainError, ErrorCode, verifyPassword, type LoginInput, type WebUser } from '@bllt/shared'
import { userRepository } from './user.repository'

const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES = 5

export const userService = {
  async findActive(d1: D1Database, id: string): Promise<WebUser | null> {
    const row = await userRepository.findById(d1, id)
    return row && row.active ? { id: row.id, username: row.username, role: row.role } : null
  },

  /**
   * Checks the phone login against the synced copy of the users table.
   * Five failures in 15 minutes for the same user and IP lock further tries.
   */
  async login(d1: D1Database, input: LoginInput, ip: string): Promise<WebUser> {
    const key = `${input.username.toLowerCase()}|${ip}`
    const now = Date.now()
    const since = new Date(now - WINDOW_MS).toISOString()
    if ((await userRepository.countAttempts(d1, key, since)) >= MAX_FAILURES) {
      throw new DomainError(ErrorCode.RATE_LIMITED, 'Demasiados intentos. Espera 15 minutos.')
    }
    const row = await userRepository.findByUsername(d1, input.username)
    const valid = row && row.active && (await verifyPassword(input.password, row))
    if (!row || !valid) {
      await userRepository.addAttempt(d1, key, new Date(now).toISOString())
      throw new DomainError(ErrorCode.UNAUTHORIZED, 'Usuario o contraseña incorrectos')
    }
    await userRepository.clearAttempts(d1, key)
    // Opportunistic cleanup of old attempts.
    await userRepository.clearAttempts(d1, key, since)
    return { id: row.id, username: row.username, role: row.role }
  }
}
