import {
  businessDateRange,
  DomainError,
  ErrorCode,
  lineProfitCents,
  nowIso,
  OutboxEntity,
  Role,
  SaleStatus,
  type SaleInput,
  type SaleItemRow,
  type SaleRow,
  type SalesPageQuery,
  type SalesQuery
} from '@bllt/shared'
import type { SaleDto, SalePage, SessionUser } from '../../../types/api'
import { transaction } from '../../core/db'
import { forbidden, notFound } from '../../core/errors'
import { newId } from '../../utils/id'
import { pageWindow } from '../../utils/page'
import { customerService } from '../customers/customer.service'
import { productService } from '../products/product.service'
import { rateService } from '../rates/rate.service'
import { syncService } from '../sync/sync.service'
import { saleRepository, type SaleListFilter } from './sale.repository'

function load(filter: SaleListFilter): SaleDto[] {
  const rows = saleRepository.list(filter)
  const items = saleRepository.itemsFor(rows.map((r) => r.sale.id))
  const bySale = new Map<string, SaleItemRow[]>()
  for (const item of items) {
    const list = bySale.get(item.saleId) ?? []
    list.push(item)
    bySale.set(item.saleId, list)
  }
  return rows.map(({ sale, customerName, customerDocument, username }) => {
    const saleItems = bySale.get(sale.id) ?? []
    return {
      ...sale,
      customerName,
      customerDocument,
      username,
      profitCents: saleItems.reduce((sum, item) => sum + lineProfitCents(item), 0),
      items: saleItems.map(({ saleId: _saleId, ...item }) => item)
    }
  })
}

function toFilter(query: Pick<SalesQuery, 'customerId' | 'from' | 'to'>): SaleListFilter {
  const range = query.from && query.to ? businessDateRange(query.from, query.to) : undefined
  return { customerId: query.customerId, start: range?.start, end: range?.end }
}

function snapshot(sale: SaleRow): void {
  syncService.enqueue(OutboxEntity.SALE, sale.id, {
    ...sale,
    items: saleRepository.itemsFor([sale.id])
  })
}

export const saleService = {
  /**
   * Registers a sale (the invoice): copies price and cost, stores the day's
   * rate, discounts stock and queues the outbox, all in one transaction.
   */
  create(user: SessionUser, input: SaleInput): SaleDto {
    const rate = rateService.requireToday()
    if (input.customerId && !customerService.exists(input.customerId)) throw notFound('El cliente')

    const qtyByProduct = new Map<string, number>()
    for (const item of input.items) {
      qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) ?? 0) + item.qty)
    }

    const id = transaction(() => {
      const products = productService.findManyByIds([...qtyByProduct.keys()])
      const byId = new Map(products.map((p) => [p.id, p]))
      const saleId = newId()
      const createdAt = nowIso()
      const items: SaleItemRow[] = []

      for (const [productId, qty] of qtyByProduct) {
        const product = byId.get(productId)
        if (!product || !product.active) throw notFound('Un producto de la venta')
        if (product.stock < qty) {
          throw new DomainError(
            ErrorCode.INSUFFICIENT_STOCK,
            `No hay suficiente "${product.name}": quedan ${product.stock}`
          )
        }
        items.push({
          id: newId(),
          saleId,
          productId,
          productCode: product.code,
          productName: product.name,
          qty,
          priceCents: product.priceCents,
          costCents: product.costCents
        })
      }

      const sale: SaleRow = {
        id: saleId,
        number: saleRepository.nextNumber(),
        customerId: input.customerId,
        userId: user.id,
        rate: rate.bsPerUsd,
        totalCents: items.reduce((sum, i) => sum + i.qty * i.priceCents, 0),
        status: SaleStatus.COMPLETED,
        createdAt,
        voidedAt: null,
        voidedBy: null
      }
      saleRepository.insert(sale, items)
      for (const item of items)
        productService.applyStockChange(item.productId, -item.qty, createdAt)
      snapshot(sale)
      return saleId
    })
    return this.get(id)
  },

  list(query: SalesQuery): SaleDto[] {
    return load({ ...toFilter(query), limit: query.limit })
  },

  page(query: SalesPageQuery): SalePage {
    const filter = toFilter(query)
    const { total, ...summary } = saleRepository.summary(filter)
    const { page, offset } = pageWindow(total, query.page, query.perPage)
    const items = load({ ...filter, limit: query.perPage, offset })
    return { items, total, page, perPage: query.perPage, ...summary }
  },

  get(id: string): SaleDto {
    const [sale] = load({ id, limit: 1 })
    if (!sale) throw notFound('La venta')
    return sale
  },

  /** Voiding keeps the rows: status becomes VOIDED and stock comes back. Admin only. */
  void(user: SessionUser, id: string): SaleDto {
    if (user.role !== Role.ADMIN) throw forbidden()
    const current = saleRepository.findById(id)
    if (!current) throw notFound('La venta')
    if (current.status === SaleStatus.VOIDED) {
      throw new DomainError(ErrorCode.CONFLICT, 'La venta ya estaba anulada')
    }
    transaction(() => {
      const at = nowIso()
      const sale = saleRepository.update(id, {
        status: SaleStatus.VOIDED,
        voidedAt: at,
        voidedBy: user.id
      })
      for (const item of saleRepository.itemsFor([id])) {
        productService.applyStockChange(item.productId, item.qty, at)
      }
      snapshot(sale)
    })
    return this.get(id)
  }
}
