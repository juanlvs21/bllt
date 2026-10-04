import { nowIso, OutboxEntity, type StockMovementRow, type StockReason } from '@bllt/shared'
import { newId } from '../../utils/id'
import { deviceService } from '../devices/device.service'
import { syncService } from '../sync/sync.service'
import { stockRepository } from './stock.repository'

export interface MovementInput {
  productId: string
  delta: number
  reason: StockReason
  refId?: string | null
  /** Fixed id for movements two PCs could create for the same event (voiding a sale). */
  id?: string
  at?: string
}

export const stockService = {
  /**
   * Records a stock movement, updates the product's cached stock and queues the movement.
   * Must run inside a transaction. A movement that already exists is ignored.
   */
  record(input: MovementInput): void {
    const row: StockMovementRow = {
      id: input.id ?? newId(),
      productId: input.productId,
      delta: input.delta,
      reason: input.reason,
      refId: input.refId ?? null,
      deviceId: deviceService.id(),
      createdAt: input.at ?? nowIso()
    }
    if (!stockRepository.insert(row)) return
    stockRepository.refreshCache([row.productId])
    syncService.enqueue(OutboxEntity.STOCK_MOVEMENT, row.id, row)
  }
}
