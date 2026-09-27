import { nowIso, SYNC_STATEMENT_BUDGET, type PushRequest, type PushResponse } from '@bllt/shared'
import { statementsFor, syncRepository } from './sync.repository'

export const LAST_SYNC_KEY = 'last_sync_at'

export const syncService = {
  /**
   * Upserts a prefix of the batch that fits the statement budget in one D1
   * batch (atomic). Returns the accepted outbox ids; the desktop resends the rest.
   */
  async push(d1: D1Database, request: PushRequest): Promise<PushResponse> {
    const accepted: string[] = []
    const statements: ReturnType<typeof statementsFor> = []
    for (const message of request.messages) {
      const next = statementsFor(d1, message)
      if (accepted.length > 0 && statements.length + next.length > SYNC_STATEMENT_BUDGET) break
      statements.push(...next)
      accepted.push(message.id)
    }
    await syncRepository.run(d1, statements)
    await syncRepository.touch(d1, LAST_SYNC_KEY, nowIso())
    return { accepted }
  }
}
