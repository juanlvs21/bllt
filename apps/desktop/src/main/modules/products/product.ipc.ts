import { listQuery, productInput, productUpdate, stockAdjust } from '@bllt/shared'
import { z } from 'zod'
import { handle } from '../../core/ipc'
import { productService } from './product.service'

export function registerProductIpc(): void {
  handle('products:list', { input: listQuery }, (query) => productService.list(query))
  handle('products:findByCode', { input: z.string().trim().min(1) }, (code) =>
    productService.findByCode(code)
  )
  handle('products:create', { input: productInput }, (input) => productService.create(input))
  handle('products:update', { input: productUpdate }, (input) => productService.update(input))
  handle('products:adjustStock', { input: stockAdjust }, (input) =>
    productService.adjustStock(input.id, input.delta)
  )
}
