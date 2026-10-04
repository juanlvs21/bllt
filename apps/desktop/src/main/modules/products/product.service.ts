import {
  DomainError,
  ErrorCode,
  OutboxEntity,
  StockReason,
  type ListQuery,
  type PageQuery,
  type ProductInput,
  type ProductRow,
  type ProductUpdate
} from '@bllt/shared'
import type { ProductDto, ProductPage } from '../../../types/api'
import { transaction } from '../../core/db'
import { notFound } from '../../core/errors'
import { newId } from '../../utils/id'
import { pageWindow } from '../../utils/page'
import { deviceService } from '../devices/device.service'
import { stockService } from '../stock/stock.service'
import { syncService } from '../sync/sync.service'
import { productRepository } from './product.repository'

const toDto = (p: ProductRow): ProductDto => ({ ...p })

/** The stock stays on this PC: the other PCs rebuild it from the movements. */
function syncProduct(row: ProductRow): void {
  const { stock: _stock, ...payload } = row
  syncService.enqueue(OutboxEntity.PRODUCT, row.id, payload)
}

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

  page(query: PageQuery): ProductPage {
    const { total, inventoryCents, lowStock } = productRepository.summary(
      query.search,
      query.includeInactive
    )
    const { page, offset } = pageWindow(total, query.page, query.perPage)
    const items = productRepository
      .list(query.search, query.includeInactive, { limit: query.perPage, offset })
      .map(toDto)
    return {
      items,
      total,
      page,
      perPage: query.perPage,
      inventoryCents,
      lowStock,
      negativeStock: productRepository.countNegative()
    }
  },

  findByCode(code: string): ProductDto | null {
    const row = productRepository.findByCode(code.trim())
    return row && row.active ? toDto(row) : null
  },

  create(input: ProductInput): ProductDto {
    assertCodeFree(input.code)
    const row: ProductRow = {
      id: newId(),
      ...input,
      stock: 0,
      active: true,
      ...deviceService.stamp()
    }
    return transaction(() => {
      productRepository.insert(row)
      if (input.stock !== 0) {
        stockService.record({
          productId: row.id,
          delta: input.stock,
          reason: StockReason.INITIAL,
          at: row.updatedAt
        })
      }
      syncProduct(row)
      return toDto(productRepository.findById(row.id) as ProductRow)
    })
  },

  update(input: ProductUpdate): ProductDto {
    const current = productRepository.findById(input.id)
    if (!current) throw notFound('El producto')
    assertCodeFree(input.code, input.id)
    const { id, stock, ...patch } = input
    return transaction(() => {
      // Typing a new stock in the form is an adjustment by the difference, never an overwrite.
      if (stock !== current.stock) {
        stockService.record({
          productId: id,
          delta: stock - current.stock,
          reason: StockReason.ADJUSTMENT
        })
      }
      const row = productRepository.update(id, { ...patch, ...deviceService.stamp() })
      syncProduct(row)
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
      stockService.record({ productId: id, delta, reason: StockReason.ADJUSTMENT })
      return toDto(productRepository.findById(id) as ProductRow)
    })
  },

  /**
   * Gives the product a free code (CODE-2, CODE-3...) and queues it as a normal edit. Used when
   * the sync finds two products with the same code. Must run inside a transaction.
   */
  renameCode(id: string): string {
    const current = productRepository.findById(id) as ProductRow
    let n = 2
    while (productRepository.findByCode(`${current.code}-${n}`)) n++
    const row = productRepository.update(id, {
      code: `${current.code}-${n}`,
      ...deviceService.stamp()
    })
    syncProduct(row)
    return row.code
  },

  findAllByCode(code: string): ProductRow[] {
    return productRepository.allByCode(code)
  },

  /** Used by sales inside their transaction. */
  findManyByIds(ids: string[]): ProductRow[] {
    return productRepository.findByIds(ids)
  }
}
