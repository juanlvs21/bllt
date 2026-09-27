import type { SalesPageQueryInput, SaleInput, SalesQuery } from '@bllt/shared'
import { api, unwrap } from '../../lib/api'

export const salesApi = {
  create: (input: SaleInput) => unwrap(api.sales.create(input)),
  list: (query: SalesQuery = {}) => unwrap(api.sales.list(query)),
  page: (query: SalesPageQueryInput) => unwrap(api.sales.page(query)),
  get: (id: string) => unwrap(api.sales.get(id)),
  void: (id: string) => unwrap(api.sales.void(id)),
  openPdf: (id: string) => unwrap(api.sales.openPdf(id))
}
