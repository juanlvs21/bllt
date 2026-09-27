import { Role } from '@bllt/shared'
import type { SessionUser } from '../../../types/api'

class Session {
  user = $state<SessionUser | null>(null)
  isAdmin = $derived(this.user?.role === Role.ADMIN)

  set(user: SessionUser) {
    this.user = user
  }

  clear() {
    this.user = null
  }
}

export const session = new Session()
