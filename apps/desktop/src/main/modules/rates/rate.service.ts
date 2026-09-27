import {
  businessDate,
  DomainError,
  ErrorCode,
  nowIso,
  OutboxEntity,
  RateSource,
  type RateCandidateDto,
  type RateConfirmInput
} from '@bllt/shared'
import type { ExchangeRateDto, RateSuggestion, SessionUser, TodayRate } from '../../../types/api'
import { EventChannel } from '../../../types/api'
import { transaction } from '../../core/db'
import { broadcast } from '../../core/ipc'
import { fetchPublicRate } from '../../libs/rate-providers'
import { SettingKey, settingsService } from '../settings/settings.service'
import { syncService } from '../sync/sync.service'
import { rateRepository } from './rate.repository'

/** Last suggestion seen this session (from the Worker or a public API). */
let latest: RateSuggestion | null = null

function fromCandidate(c: RateCandidateDto): RateSuggestion {
  return {
    candidateId: c.id,
    bsPerUsd: c.bsPerUsd,
    source: c.source === RateSource.WEB ? RateSource.WEB : RateSource.WORKER,
    valueDate: c.valueDate,
    fetchedAt: c.fetchedAt,
    provider: c.source === RateSource.WEB ? 'App web' : 'Worker'
  }
}

function dismissed(): string[] {
  return settingsService.getJson<string[]>(SettingKey.DISMISSED_CANDIDATES, [])
}

/** A suggestion is shown only if it differs from today's rate and wasn't dismissed. */
function pending(suggestion: RateSuggestion | null): RateSuggestion | null {
  if (!suggestion) return null
  if (suggestion.candidateId && dismissed().includes(suggestion.candidateId)) return null
  const confirmed = rateRepository.findByDate(businessDate())
  if (confirmed && confirmed.bsPerUsd === suggestion.bsPerUsd) return null
  return suggestion
}

export const rateService = {
  /** Wires Worker candidates (from the sync loop) into suggestions for the UI. */
  init(): void {
    syncService.onCandidate((candidate) => {
      latest = fromCandidate(candidate)
      const suggestion = pending(latest)
      if (suggestion) broadcast(EventChannel.RATE_SUGGESTION, suggestion)
    })
  },

  today(): TodayRate {
    const date = businessDate()
    return {
      businessDate: date,
      confirmed: rateRepository.findByDate(date) ?? null,
      suggestion: pending(latest)
    }
  },

  /** Asks the Worker for its candidate; without a Worker, queries public APIs directly. */
  async fetchSuggestion(): Promise<RateSuggestion | null> {
    if (syncService.isConfigured()) {
      try {
        const candidate = await syncService.fetchCandidate()
        if (candidate) {
          latest = fromCandidate(candidate)
          return latest
        }
      } catch {
        // Worker unreachable: fall through to the public API.
      }
    }
    const quote = await fetchPublicRate()
    if (!quote) return latest
    latest = {
      candidateId: null,
      bsPerUsd: quote.bsPerUsd,
      source: RateSource.PUBLIC_API,
      valueDate: quote.valueDate,
      fetchedAt: nowIso(),
      provider: quote.provider
    }
    return latest
  },

  /** The day's rate is whatever the user confirms, keyed by the UTC-4 business date. */
  confirm(user: SessionUser, input: RateConfirmInput): ExchangeRateDto {
    const row = transaction(() => {
      const saved = rateRepository.upsert({
        date: businessDate(),
        bsPerUsd: input.bsPerUsd,
        source: input.source,
        confirmedBy: user.id,
        confirmedAt: nowIso()
      })
      syncService.enqueue(OutboxEntity.EXCHANGE_RATE, saved.date, saved)
      return saved
    })
    if (input.candidateId) this.dismiss(input.candidateId)
    return row
  },

  dismiss(candidateId: string): void {
    const list = [candidateId, ...dismissed().filter((id) => id !== candidateId)].slice(0, 50)
    settingsService.setJson(SettingKey.DISMISSED_CANDIDATES, list)
  },

  history(): ExchangeRateDto[] {
    return rateRepository.history(60)
  },

  /** Throws unless today's rate is confirmed. Sales call this before writing. */
  requireToday(): ExchangeRateDto {
    const row = rateRepository.findByDate(businessDate())
    if (!row) {
      throw new DomainError(
        ErrorCode.RATE_REQUIRED,
        'Confirma la tasa del día antes de registrar ventas'
      )
    }
    return row
  }
}
