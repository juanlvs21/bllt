import { Role } from '@bllt/shared'
import type { SessionUser } from '../../types/api'
import { forbidden, unauthorized } from './errors'

/** The logged-in user lives only in the main process; the renderer never holds credentials. */
let current: SessionUser | null = null

export const session = {
  get(): SessionUser | null {
    return current
  },
  set(user: SessionUser | null): void {
    current = user
  },
  require(role?: Role): SessionUser {
    if (!current) throw unauthorized()
    if (role === Role.ADMIN && current.role !== Role.ADMIN) throw forbidden()
    return current
  }
}
