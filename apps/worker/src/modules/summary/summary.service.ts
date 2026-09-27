import {
  businessDate,
  businessDayRange,
  businessMonthRange,
  nowIso,
  summarizeProfit,
  type WebSummary
} from '@bllt/shared'
import { rateRepository } from '../rates/rate.repository'
import { rateService } from '../rates/rate.service'
import { LAST_SYNC_KEY } from '../sync/sync.service'
import { summaryRepository } from './summary.repository'

async function period(d1: D1Database, range: { start: string; end: string }) {
  const [lines, salesCount] = await Promise.all([
    summaryRepository.lines(d1, range.start, range.end),
    summaryRepository.completedCount(d1, range.start, range.end)
  ])
  return { ...summarizeProfit(lines), salesCount }
}

export const summaryService = {
  /** Same numbers as the desktop dashboard: both use summarizeProfit from @bllt/shared. */
  async get(d1: D1Database): Promise<WebSummary> {
    const date = businessDate()
    const day = businessDayRange(date)
    const [today, month, rate, sales, lastSyncAt, candidate] = await Promise.all([
      period(d1, day),
      period(d1, businessMonthRange(date)),
      rateRepository.confirmed(d1, date),
      summaryRepository.salesBetween(d1, day.start, day.end),
      summaryRepository.meta(d1, LAST_SYNC_KEY),
      rateService.latestCandidate(d1)
    ])
    return {
      summary: {
        businessDate: date,
        rate: rate
          ? { bsPerUsd: rate.bsPerUsd, source: rate.source, confirmedAt: rate.confirmedAt }
          : null,
        today,
        month,
        lastSyncAt
      },
      sales,
      candidate:
        candidate && candidate.bsPerUsd !== rate?.bsPerUsd
          ? {
              bsPerUsd: candidate.bsPerUsd,
              source: candidate.source,
              fetchedAt: candidate.fetchedAt
            }
          : null,
      generatedAt: nowIso()
    }
  }
}
