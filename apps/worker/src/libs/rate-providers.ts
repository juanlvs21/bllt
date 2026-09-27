import { fetchRateWithFallback, type RateQuote } from '@bllt/shared'

/** Public BCV sources with fallback, used by the cron. */
export function fetchPublicRate(): Promise<RateQuote | null> {
  return fetchRateWithFallback({
    onError: (provider, error) => console.warn(`[rates] ${provider} falló`, error)
  })
}
