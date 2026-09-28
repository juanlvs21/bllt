import type { RateConfirmInput } from '@bllt/shared'
import { api, unwrap } from '../../lib/api'

export const ratesApi = {
  today: () => unwrap(api.rates.today()),
  search: () => unwrap(api.rates.search()),
  confirm: (input: RateConfirmInput) => unwrap(api.rates.confirm(input)),
  dismiss: (id: string) => unwrap(api.rates.dismiss(id)),
  history: () => unwrap(api.rates.history())
}
