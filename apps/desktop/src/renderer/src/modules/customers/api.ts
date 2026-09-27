import type { PageQueryInput, CustomerInput, CustomerUpdate, ListQuery } from '@bllt/shared'
import { api, unwrap } from '../../lib/api'

export const customersApi = {
  list: (query: ListQuery = {}) => unwrap(api.customers.list(query)),
  page: (query: PageQueryInput) => unwrap(api.customers.page(query)),
  create: (input: CustomerInput) => unwrap(api.customers.create(input)),
  update: (input: CustomerUpdate) => unwrap(api.customers.update(input))
}
