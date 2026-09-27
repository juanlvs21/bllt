import {
  DomainError,
  ErrorCode,
  nowIso,
  OutboxEntity,
  type ListQuery,
  type ProductInput,
  type ProductRow,
  type ProductUpdate
} from '@bllt/shared'
import type { ProductDto } from '../../../types/api'
import { transaction } from '../../core/db'
import { notFound } from '../../core/errors'
import { newId } from '../../utils/id'
import { syncService } from '../sync/sync.service'
import { productRepository } from './product.repository'

const toDto = (p: ProductRow): ProductDto => ({ ...p })

function assertCodeFree(code: string, exceptId?: string): void {
  const existing = productRepository.findByCode(code)
  if (existing && existing.id !== exceptId) {
    throw new DomainError(ErrorCode.CONFLICT, `El código ${code} ya lo usa "${existing.name}"`)
  }
}

export const productService = {
  list(query: ListQuery): ProductDto[] {
    return productRepository.list(query.search, query.includeInactive).map(toDto)
  },

  findByCode(code: string): ProductDto | null {
    const row = productRepository.findByCode(code.trim())
    return row && row.active ? toDto(row) : null
  },

  create(input: ProductInput): ProductDto {
    assertCodeFree(input.code)
    const row: ProductRow = { id: newId(), ...input, active: true, updatedAt: nowIso() }
    transaction(() => {
      productRepository.insert(row)
      syncService.enqueue(OutboxEntity.PRODUCT, row.id, row)
    })
    return toDto(row)
  },

  update(input: ProductUpdate): ProductDto {
    if (!productRepository.findById(input.id)) throw notFound('El producto')
    assertCodeFree(input.code, input.id)
    const { id, ...patch } = input
    return transaction(() => {
      const row = productRepository.update(id, { ...patch, updatedAt: nowIso() })
      syncService.enqueue(OutboxEntity.PRODUCT, row.id, row)
      return toDto(row)
    })
  },

  adjustStock(id: string, delta: number): ProductDto {
    const current = productRepository.findById(id)
    if (!current) throw notFound('El producto')
    if (current.stock + delta < 0) {
      throw new DomainError(ErrorCode.VALIDATION, 'El inventario no puede quedar negativo')
    }
    return transaction(() => {
      const row = productRepository.addStock(id, delta, nowIso())
      syncService.enqueue(OutboxEntity.PRODUCT, row.id, row)
      return toDto(row)
    })
  },

  /** Used by sales inside their transaction. */
  findManyByIds(ids: string[]): ProductRow[] {
    return productRepository.findByIds(ids)
  },

  /** Changes stock by delta and queues the snapshot. Must run inside a transaction. */
  applyStockChange(id: string, delta: number, at: string): void {
    const row = productRepository.addStock(id, delta, at)
    syncService.enqueue(OutboxEntity.PRODUCT, row.id, row)
  }
}
