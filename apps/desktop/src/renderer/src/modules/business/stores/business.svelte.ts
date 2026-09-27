import type { BusinessDto } from '../../../../../types/api'
import { businessApi } from '../api'

/** Name, RIF and logo of the business, shared by the sidebar, login and receipts. */
class BusinessStore {
  name = $state('')
  rif = $state<string | null>(null)
  logo = $state<string | null>(null)

  set(business: BusinessDto) {
    this.name = business.name
    this.rif = business.rif
    this.logo = business.logo
  }

  async refresh() {
    this.set(await businessApi.get())
  }
}

export const businessStore = new BusinessStore()
