/** Shapes the Worker returns to the web app (PWA). */
import type { Role, SaleStatus } from './enums'
import type { DashboardSummary } from './profit'

export interface WebUser {
  id: string
  username: string
  role: Role
}

export interface WebSale {
  id: string
  number: number
  createdAt: string
  customerName: string | null
  totalCents: number
  profitCents: number
  rate: number
  status: SaleStatus
}

export interface WebSummary {
  summary: DashboardSummary
  sales: WebSale[]
  /** Latest pending suggestion (cron or phone) for today, if any. */
  candidate: { bsPerUsd: number; source: string; fetchedAt: string } | null
  generatedAt: string
}
