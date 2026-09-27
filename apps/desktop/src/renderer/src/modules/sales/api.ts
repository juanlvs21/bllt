import type { SaleInput, SalesQuery } from '@bllt/shared'
import { api, unwrap } from '../../lib/api'

export const salesApi = {
  create: (input: SaleInput) => unwrap(api.sales.create(input)),
  list: (query: SalesQuery = {}) => unwrap(api.sales.list(query)),
  get: (id: string) => unwrap(api.sales.get(id)),
  void: (id: string) => unwrap(api.sales.void(id))
}
