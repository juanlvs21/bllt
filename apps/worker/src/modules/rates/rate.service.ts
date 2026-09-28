import { businessDate, nowIso, RateSource, type RateCandidateDto, type WebUser } from '@bllt/shared'
import { fetchPublicRate } from '../../libs/rate-providers'
import { rateRepository } from './rate.repository'

async function addCandidate(
  d1: D1Database,
  candidate: Omit<RateCandidateDto, 'id' | 'date' | 'fetchedAt'> & { createdBy: string | null }
): Promise<RateCandidateDto | null> {
  const date = businessDate()
  const latest = await rateRepository.latestCandidate(d1, date)
  // Same value as the latest candidate: keep its id so a dismissal on the desktop still holds.
  if (latest && latest.bsPerUsd === candidate.bsPerUsd && latest.source === candidate.source)
    return null
  const row = { id: crypto.randomUUID(), date, fetchedAt: nowIso(), ...candidate }
  await rateRepository.insertCandidate(d1, row)
  return row
}

export const rateService = {
  async latestCandidate(d1: D1Database): Promise<RateCandidateDto | null> {
    const row = await rateRepository.latestCandidate(d1, businessDate())
    if (!row) return null
    const { createdBy: _createdBy, ...dto } = row
    return dto
  },

  /** Cron: fetch the BCV rate and store it as a candidate, never as the confirmed rate. */
  async fetchFromProviders(d1: D1Database): Promise<void> {
    const quote = await fetchPublicRate()
    if (!quote) {
      console.warn('[cron] ninguna fuente de tasa respondió')
      return
    }
    await addCandidate(d1, {
      bsPerUsd: quote.bsPerUsd,
      source: RateSource.WORKER,
      valueDate: quote.valueDate,
      createdBy: null
    })
  },

  /** Phone: suggest a rate; the desktop decides whether to accept it. */
  async suggestFromWeb(d1: D1Database, user: WebUser, bsPerUsd: number): Promise<void> {
    await addCandidate(d1, {
      bsPerUsd,
      source: RateSource.WEB,
      valueDate: null,
      createdBy: user.id
    })
  }
}
