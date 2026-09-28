/**
 * The only place profit is computed, so the desktop and the phone always
 * show the same number.
 */
import { usdCentsToBsCents } from './money'
import { SaleStatus } from './enums'

export interface ProfitLine {
  qty: number
  priceCents: number
  costCents: number
  /** Rate of the sale this line belongs to. */
  rate: number
  status: SaleStatus
}

export interface ProfitSummary {
  revenueUsdCents: number
  revenueBsCents: number
  profitUsdCents: number
  profitBsCents: number
}

/** qty × (price − cost); in Bs, multiplied by the line's own sale rate. */
export function lineProfitCents(
  line: Pick<ProfitLine, 'qty' | 'priceCents' | 'costCents'>
): number {
  return line.qty * (line.priceCents - line.costCents)
}

export function summarizeProfit(lines: ProfitLine[]): ProfitSummary {
  const summary: ProfitSummary = {
    revenueUsdCents: 0,
    revenueBsCents: 0,
    profitUsdCents: 0,
    profitBsCents: 0
  }
  for (const line of lines) {
    if (line.status !== SaleStatus.COMPLETED) continue
    const revenue = line.qty * line.priceCents
    const profit = lineProfitCents(line)
    summary.revenueUsdCents += revenue
    summary.revenueBsCents += usdCentsToBsCents(revenue, line.rate)
    summary.profitUsdCents += profit
    summary.profitBsCents += usdCentsToBsCents(profit, line.rate)
  }
  return summary
}

export interface DashboardSummary {
  businessDate: string
  rate: { bsPerUsd: number; source: string; confirmedAt: string } | null
  today: ProfitSummary & { salesCount: number }
  month: ProfitSummary & { salesCount: number }
  lastSyncAt: string | null
}
