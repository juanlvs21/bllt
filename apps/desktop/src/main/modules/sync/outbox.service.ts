import { nowIso, type OutboxEntity } from '@bllt/shared'
import { newId } from '../../utils/id'
import { outboxRepository } from './outbox.repository'

/** Kept apart from sync.service so the modules that apply remote rows can queue edits too. */
export const outboxService = {
  /**
   * Appends a snapshot to the outbox. Callers invoke it inside the same
   * transaction as the write it describes.
   */
  enqueue(entity: OutboxEntity, entityId: string, payload: unknown): void {
    outboxRepository.insert({
      id: newId(),
      entity,
      entityId,
      payload: JSON.stringify(payload),
      createdAt: nowIso()
    })
  }
}
