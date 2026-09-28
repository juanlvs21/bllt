import { businessDate } from '@bllt/shared'
import type { RateSuggestion, TodayRate } from '../../../../../types/api'
import { ratesApi } from '../api'

/** Today's confirmed rate and any pending suggestion, shared across screens. */
class RateStore {
  today = $state<TodayRate | null>(null)
  loading = $state(false)

  /** Public API quotes have no candidate id to dismiss on disk; this hides them for the session. */
  #ignored = $state<string[]>([])

  confirmed = $derived(this.today?.confirmed ?? null)
  suggestion = $derived.by(() => {
    const s = this.today?.suggestion ?? null
    return s && !this.#ignored.includes(ignoreKey(s)) ? s : null
  })
  /** A newer rate than the one saved today, from the Worker or a public API. */
  change = $derived(this.confirmed && this.suggestion ? this.suggestion : null)
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

  /** Looks for a newer rate in the background; errors (no internet) are ignored. */
  async check() {
    if (!this.confirmed) return
    await ratesApi.fetchSuggestion().catch(() => null)
    await this.refresh()
  }

  async dismiss(suggestion: RateSuggestion) {
    if (suggestion.candidateId) {
      await ratesApi.dismiss(suggestion.candidateId)
      await this.refresh()
    } else {
      this.#ignored = [...this.#ignored, ignoreKey(suggestion)]
    }
  }
}

const ignoreKey = (s: RateSuggestion) => `${s.source}:${s.bsPerUsd}`

export const rateStore = new RateStore()
