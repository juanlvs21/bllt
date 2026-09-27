import { businessDate } from '@bllt/shared'
import type { RateSuggestion, TodayRate } from '../../../../../types/api'
import { ratesApi } from '../api'

/** Today's confirmed rate and any pending suggestion, shared across screens. */
class RateStore {
  today = $state<TodayRate | null>(null)
  loading = $state(false)

  confirmed = $derived(this.today?.confirmed ?? null)
  suggestion = $derived(this.today?.suggestion ?? null)
  /** True when the business day rolled over since the last load. */
  get stale() {
    return !!this.today && this.today.businessDate !== businessDate()
  }

  async refresh() {
    this.loading = true
    try {
      this.today = await ratesApi.today()
    } finally {
      this.loading = false
    }
  }

  pushSuggestion(suggestion: RateSuggestion) {
    if (this.today) this.today = { ...this.today, suggestion }
  }
}

export const rateStore = new RateStore()
