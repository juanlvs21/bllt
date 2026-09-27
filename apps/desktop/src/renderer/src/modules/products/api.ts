import type { PageQueryInput, ListQuery, ProductInput, ProductUpdate } from '@bllt/shared'
import { api, unwrap } from '../../lib/api'

export const productsApi = {
  list: (query: ListQuery = {}) => unwrap(api.products.list(query)),
  page: (query: PageQueryInput) => unwrap(api.products.page(query)),
  findByCode: (code: string) => unwrap(api.products.findByCode(code)),
  create: (input: ProductInput) => unwrap(api.products.create(input)),
  update: (input: ProductUpdate) => unwrap(api.products.update(input)),
  adjustStock: (id: string, delta: number) => unwrap(api.products.adjustStock({ id, delta }))
}
