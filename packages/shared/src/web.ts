/** Shapes the Worker returns to the web app (PWA). */
import type { RateDecision, Role, SaleStatus } from './enums'
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
  /** Latest phone suggestion not yet expired, with what the PC did with it (null = pending). */
  phoneSuggestion: { bsPerUsd: number; fetchedAt: string; decision: RateDecision | null } | null
  generatedAt: string
}
