import {
  nowIso,
  SYNC_STATEMENT_BUDGET,
  type PullResponse,
  type PushRequest,
  type PushResponse
} from '@bllt/shared'
import { statementsFor, syncRepository, UPLOAD_COMPLETE_KEY } from './sync.repository'

export const LAST_SYNC_KEY = 'last_sync_at'

export const syncService = {
  /**
   * Upserts a prefix of the batch that fits the statement budget in one D1
   * batch (atomic). Returns the accepted outbox ids; the desktop resends the rest.
   */
  async push(d1: D1Database, deviceId: string, request: PushRequest): Promise<PushResponse> {
    const accepted: string[] = []
    const statements: ReturnType<typeof statementsFor> = []
    for (const message of request.messages) {
      const next = statementsFor(d1, message, deviceId)
      if (accepted.length > 0 && statements.length + next.length > SYNC_STATEMENT_BUDGET) break
      statements.push(...next)
      accepted.push(message.id)
    }
    await syncRepository.run(d1, statements)
    await syncRepository.touch(d1, LAST_SYNC_KEY, nowIso())
    return { accepted }
  },

  pull(
    d1: D1Database,
    deviceId: string,
    query: { since: number; limit: number; includeOwn: boolean }
  ): Promise<PullResponse> {
    return syncRepository.pull(d1, query.since, query.limit, deviceId, query.includeOwn)
  },

  /** The first PC says it uploaded everything: other PCs may join from now on. */
  markUploadComplete(d1: D1Database): Promise<void> {
    return syncRepository.touch(d1, UPLOAD_COMPLETE_KEY, nowIso())
  }
}
