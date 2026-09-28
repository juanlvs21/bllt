import {
  businessDate,
  DomainError,
  ErrorCode,
  nowIso,
  OutboxEntity,
  phoneSuggestionCutoff,
  RateDecision,
  RateSource,
  type RateCandidateDto,
  type RateResponse,
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

/** Latest internet rate seen this session (public API from this PC or the Worker cron). */
let internet: Omit<RateSuggestion, 'dismissed'> | null = null
/** Pending phone suggestion, as last reported by the Worker. */
let phone: Omit<RateSuggestion, 'dismissed'> | null = null

function fromCandidate(c: RateCandidateDto): Omit<RateSuggestion, 'dismissed'> {
  return {
    id: c.id,
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

/** Keeps the newer of two internet rates. */
function hide(id: string): void {
  const list = [id, ...dismissed().filter((other) => other !== id)].slice(0, 50)
  settingsService.setJson(SettingKey.DISMISSED_CANDIDATES, list)
}

function newer<T extends { fetchedAt: string }>(a: T | null, b: T | null): T | null {
  if (!a || !b) return a ?? b
  return a.fetchedAt >= b.fetchedAt ? a : b
}

function snapshot(): TodayRate {
  const date = businessDate()
  const hidden = dismissed()
  const inet = internet && businessDate(new Date(internet.fetchedAt)) === date ? internet : null
  const fromPhone =
    phone && phone.fetchedAt >= phoneSuggestionCutoff() && !hidden.includes(phone.id) ? phone : null
  return {
    businessDate: date,
    confirmed: rateRepository.findByDate(date) ?? null,
    internet: inet ? { ...inet, dismissed: hidden.includes(inet.id) } : null,
    phone: fromPhone ? { ...fromPhone, dismissed: false } : null
  }
}

function applyCandidates(candidates: RateResponse): void {
  if (candidates.internet) internet = newer(internet, fromCandidate(candidates.internet))
  phone = candidates.phone ? fromCandidate(candidates.phone) : null
}

/** Tells the Worker (through the outbox) what the PC did with a phone suggestion. */
function decide(candidateId: string, decision: RateDecision): void {
  syncService.enqueue(OutboxEntity.RATE_DECISION, candidateId, {
    candidateId,
    decision,
    decidedAt: nowIso()
  })
}

export const rateService = {
  /** Wires Worker candidates (from the sync loop) into the UI. */
  init(): void {
    syncService.onCandidates((candidates) => {
      applyCandidates(candidates)
      broadcast(EventChannel.RATE_UPDATE, snapshot())
    })
  },

  today(): TodayRate {
    return snapshot()
  },

  /**
   * Always asks the internet from this PC. The Worker is only asked for the
   * phone suggestion; if either lookup fails the other still counts.
   */
  async search(): Promise<TodayRate> {
    const [quote] = await Promise.all([
      fetchPublicRate(),
      syncService.isConfigured()
        ? syncService
            .fetchCandidates()
            .then(applyCandidates)
            .catch(() => undefined)
        : undefined
    ])
    if (quote) {
      const date = businessDate()
      internet = {
        id: `${RateSource.PUBLIC_API}:${date}:${quote.bsPerUsd}`,
        candidateId: null,
        bsPerUsd: quote.bsPerUsd,
        source: RateSource.PUBLIC_API,
        valueDate: quote.valueDate,
        fetchedAt: nowIso(),
        provider: quote.provider
      }
    }
    return snapshot()
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
    // A pending phone suggestion is settled either way: taken or passed over.
    if (phone) {
      const accepted = phone.candidateId === input.candidateId
      if (phone.candidateId)
        decide(phone.candidateId, accepted ? RateDecision.ACCEPTED : RateDecision.REJECTED)
      hide(phone.id)
      phone = null
    }
    if (input.candidateId) hide(input.candidateId)
    // The internet rate on the table was seen and passed over too; otherwise, after taking the
    // phone's rate, the older internet one would pop back up as a "new" suggestion.
    if (internet) hide(internet.id)
    return row
  },

  /** Discards a suggestion; a phone one is reported to the Worker as rejected. */
  dismiss(id: string): void {
    if (phone?.id === id) {
      if (phone.candidateId) decide(phone.candidateId, RateDecision.REJECTED)
      phone = null
    }
    hide(id)
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
