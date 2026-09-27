/**
 * BCV rate providers with ordered fallback. There is no official BCV API:
 * every source scrapes bcv.org.ve, so the result is only ever a suggestion.
 */
import { parseRate } from './money'

export interface RateQuote {
  /** Scaled Bs/USD. */
  bsPerUsd: number
  /** Value date published by the source ("YYYY-MM-DD"), informational. */
  valueDate: string | null
  provider: string
}

export interface RateProvider {
  name: string
  fetch(fetchFn: typeof fetch, signal: AbortSignal): Promise<RateQuote>
}

/** ve.dolarapi.com: community API, free. Default. */
export const dolarApiProvider: RateProvider = {
  name: 've.dolarapi.com',
  async fetch(fetchFn, signal) {
    const res = await fetchFn('https://ve.dolarapi.com/v1/dolares/oficial', {
      signal,
      headers: { accept: 'application/json' }
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body = (await res.json()) as { promedio?: number; fechaActualizacion?: string }
    const rate = body.promedio != null ? parseRate(body.promedio) : null
    if (!rate) throw new Error('Respuesta sin tasa')
    return {
      bsPerUsd: rate,
      valueDate: body.fechaActualizacion ? body.fechaActualizacion.slice(0, 10) : null,
      provider: this.name
    }
  }
}

/** Last resort: read the rate straight from bcv.org.ve. Breaks if their HTML changes. */
export const bcvScrapeProvider: RateProvider = {
  name: 'bcv.org.ve',
  async fetch(fetchFn, signal) {
    const res = await fetchFn('https://www.bcv.org.ve/', { signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    const block = html.match(/id="dolar"[\s\S]*?<strong>\s*([\d.,]+)\s*<\/strong>/i)
    const rate = block?.[1] ? parseRate(block[1]) : null
    if (!rate) throw new Error('No se encontró la tasa en la página del BCV')
    const date = html.match(/content="(\d{4}-\d{2}-\d{2})T[^"]*"[^>]*class="date-display-single"/i)
    return { bsPerUsd: rate, valueDate: date?.[1] ?? null, provider: this.name }
  }
}

export const DEFAULT_RATE_PROVIDERS: RateProvider[] = [dolarApiProvider, bcvScrapeProvider]

/** Tries each provider in order; returns the first quote or null if all fail. */
export async function fetchRateWithFallback(
  options: {
    providers?: RateProvider[]
    fetchFn?: typeof fetch
    timeoutMs?: number
    onError?: (provider: string, error: unknown) => void
  } = {}
): Promise<RateQuote | null> {
  const providers = options.providers ?? DEFAULT_RATE_PROVIDERS
  const fetchFn = options.fetchFn ?? fetch
  for (const provider of providers) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000)
    try {
      return await provider.fetch(fetchFn, controller.signal)
    } catch (error) {
      options.onError?.(provider.name, error)
    } finally {
      clearTimeout(timer)
    }
  }
  return null
}
