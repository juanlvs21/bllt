export type Page = 'dashboard' | 'new-sale' | 'sales' | 'products' | 'customers' | 'settings'

class Router {
  page = $state<Page>('dashboard')
  /** Optional parameter for the target page (e.g. a customer id to filter sales). */
  params = $state<Record<string, string>>({})

  go(page: Page, params: Record<string, string> = {}) {
    this.page = page
    this.params = params
  }
}

export const router = new Router()
