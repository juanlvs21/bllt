import type { RateConfirmInput } from '@bllt/shared'
import { api, unwrap } from '../../lib/api'

export const ratesApi = {
  today: () => unwrap(api.rates.today()),
  fetchSuggestion: () => unwrap(api.rates.fetchSuggestion()),
  confirm: (input: RateConfirmInput) => unwrap(api.rates.confirm(input)),
  dismiss: (candidateId: string) => unwrap(api.rates.dismiss(candidateId)),
  history: () => unwrap(api.rates.history())
}
