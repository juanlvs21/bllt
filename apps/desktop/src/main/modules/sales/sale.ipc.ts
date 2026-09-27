import { saleInput, salesPageQuery, salesQuery, uuid } from '@bllt/shared'
import { handle } from '../../core/ipc'
import { saleService } from './sale.service'

export function registerSaleIpc(): void {
  handle('sales:create', { input: saleInput }, (input, user) => saleService.create(user, input))
  handle('sales:list', { input: salesQuery }, (query) => saleService.list(query))
  handle('sales:page', { input: salesPageQuery }, (query) => saleService.page(query))
  handle('sales:get', { input: uuid }, (id) => saleService.get(id))
  handle('sales:void', { input: uuid }, (id, user) => saleService.void(user, id))
}
