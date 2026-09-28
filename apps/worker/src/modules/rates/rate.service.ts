import {
  businessDate,
  nowIso,
  phoneSuggestionCutoff,
  RateSource,
  type RateCandidateDto,
  type RateResponse,
  type WebUser
} from '@bllt/shared'
import type { RateCandidateRow } from '@bllt/shared/schema/cloud'
import { fetchPublicRate } from '../../libs/rate-providers'
import { rateRepository } from './rate.repository'

function toDto(row: RateCandidateRow | undefined): RateCandidateDto | null {
  if (!row) return null
  const { createdBy: _createdBy, decision: _decision, decidedAt: _decidedAt, ...dto } = row
  return dto
}

function newCandidate(
  candidate: Pick<RateCandidateRow, 'bsPerUsd' | 'source' | 'valueDate' | 'createdBy'>
): RateCandidateRow {
  return {
    id: crypto.randomUUID(),
    date: businessDate(),
    fetchedAt: nowIso(),
    decision: null,
    decidedAt: null,
    ...candidate
  }
}

export const rateService = {
  /** What the desktop asks for on each sync: the day's cron rate and the pending phone suggestion. */
  async candidates(d1: D1Database): Promise<RateResponse> {
    const [internet, phone] = await Promise.all([
      rateRepository.latestWorkerCandidate(d1, businessDate()),
      rateService.latestPhone(d1)
    ])
    return { internet: toDto(internet), phone: phone?.decision ? null : toDto(phone) }
  },

  /** Latest phone suggestion that hasn't expired (they expire at 1:00 am UTC-4). */
  latestPhone(d1: D1Database): Promise<RateCandidateRow | undefined> {
    return rateRepository.latestPhoneCandidate(d1, phoneSuggestionCutoff())
  },

  /** Cron: fetch the BCV rate and store it as a candidate, never as the confirmed rate. */
  async fetchFromProviders(d1: D1Database): Promise<void> {
    const quote = await fetchPublicRate()
    if (!quote) {
      console.warn('[cron] ninguna fuente de tasa respondió')
      return
    }
    const latest = await rateRepository.latestWorkerCandidate(d1, businessDate())
    // Same value as the latest one: keep its id so a dismissal on the desktop still holds.
    if (latest?.bsPerUsd === quote.bsPerUsd) return
    await rateRepository.insertCandidate(
      d1,
      newCandidate({
        bsPerUsd: quote.bsPerUsd,
        source: RateSource.WORKER,
        valueDate: quote.valueDate,
        createdBy: null
      })
    )
  },

  /** Phone: suggest a rate; the desktop decides whether to accept it. Each send is a new suggestion. */
  async suggestFromWeb(d1: D1Database, user: WebUser, bsPerUsd: number): Promise<void> {
    await rateRepository.insertCandidate(
      d1,
      newCandidate({ bsPerUsd, source: RateSource.WEB, valueDate: null, createdBy: user.id })
    )
  }
}
