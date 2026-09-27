import {
  businessDate,
  businessDayRange,
  businessMonthRange,
  summarizeProfit,
  type DashboardSummary
} from '@bllt/shared'
import { rateService } from '../rates/rate.service'
import { syncService } from '../sync/sync.service'
import { dashboardRepository } from './dashboard.repository'

function period(range: { start: string; end: string }) {
  return {
    ...summarizeProfit(dashboardRepository.lines(range.start, range.end)),
    salesCount: dashboardRepository.completedCount(range.start, range.end)
  }
}

export const dashboardService = {
  summary(): DashboardSummary {
    const date = businessDate()
    const { confirmed } = rateService.today()
    return {
      businessDate: date,
      rate: confirmed
        ? {
            bsPerUsd: confirmed.bsPerUsd,
            source: confirmed.source,
            confirmedAt: confirmed.confirmedAt
          }
        : null,
      today: period(businessDayRange(date)),
      month: period(businessMonthRange(date)),
      lastSyncAt: syncService.status().lastSyncAt
    }
  }
}
