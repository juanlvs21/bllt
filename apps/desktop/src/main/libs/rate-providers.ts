import { net } from 'electron'
import { fetchRateWithFallback, type RateQuote } from '@bllt/shared'

/** Public API lookup used when no Worker is configured. Uses Chromium's network stack (proxies, certs). */
export function fetchPublicRate(): Promise<RateQuote | null> {
  return fetchRateWithFallback({
    fetchFn: net.fetch as unknown as typeof fetch,
    onError: (provider, error) => console.warn(`[rates] ${provider} falló:`, error)
  })
}
