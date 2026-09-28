import { businessDate } from '@bllt/shared'
import type { RateSuggestion, TodayRate } from '../../../../../types/api'
import { ratesApi } from '../api'

/** Today's confirmed rate and the internet and phone suggestions, shared across screens. */
class RateStore {
  today = $state<TodayRate | null>(null)
  loading = $state(false)

  confirmed = $derived(this.today?.confirmed ?? null)
  internet = $derived(this.today?.internet ?? null)
  phone = $derived(this.today?.phone ?? null)
  /** A rate other than the one saved today, not yet discarded. The phone wins: someone chose it. */
  change = $derived.by(() => {
    const confirmed = this.confirmed
    if (!confirmed) return null
    const differs = (s: RateSuggestion | null) =>
      s && !s.dismissed && s.bsPerUsd !== confirmed.bsPerUsd ? s : null
    return differs(this.phone) ?? differs(this.internet)
  })
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

  set(today: TodayRate) {
    this.today = today
  }

  /** Looks the rate up on the internet now. Throws when offline, like any API call. */
  async search() {
    this.today = await ratesApi.search()
    return this.today
  }

  /** Looks for a newer rate in the background; errors (no internet) are ignored. */
  async check() {
    if (!this.confirmed) return
    await this.search().catch(() => null)
  }

  async dismiss(suggestion: RateSuggestion) {
    await ratesApi.dismiss(suggestion.id)
    await this.refresh()
  }
}

export const rateStore = new RateStore()
