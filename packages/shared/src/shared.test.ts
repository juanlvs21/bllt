import { describe, expect, it } from 'vitest'
import {
  businessDate,
  businessDayRange,
  businessMonthRange,
  formatBusinessTime,
  hashPassword,
  parseRate,
  parseUsdToCents,
  summarizeProfit,
  usdCentsToBsCents,
  verifyPassword
} from './index'

describe('money', () => {
  it('parses USD in both decimal styles', () => {
    expect(parseUsdToCents('12')).toBe(1200)
    expect(parseUsdToCents('12,5')).toBe(1250)
    expect(parseUsdToCents('1.234,56')).toBe(123456)
    expect(parseUsdToCents('1,234.56')).toBe(123456)
    expect(parseUsdToCents('abc')).toBeNull()
  })

  it('scales the rate to 4 decimals and converts to Bs', () => {
    expect(parseRate('36,1234')).toBe(361234)
    expect(parseRate(0)).toBeNull()
    expect(usdCentsToBsCents(1000, 361234)).toBe(36123)
  })
})

describe('time', () => {
  it('computes the business date in UTC-4 regardless of the PC zone', () => {
    expect(businessDate(new Date('2026-09-27T03:59:00Z'))).toBe('2026-09-26')
    expect(businessDate(new Date('2026-09-27T04:00:00Z'))).toBe('2026-09-27')
  })

  it('builds UTC ranges for a business day and month', () => {
    expect(businessDayRange('2026-09-27')).toEqual({
      start: '2026-09-27T04:00:00.000Z',
      end: '2026-09-28T04:00:00.000Z'
    })
    expect(businessMonthRange('2026-12-15')).toEqual({
      start: '2026-12-01T04:00:00.000Z',
      end: '2027-01-01T04:00:00.000Z'
    })
  })

  it('formats Venezuela time', () => {
    expect(formatBusinessTime('2026-09-27T19:40:00Z')).toBe('3:40 pm')
  })
})

describe('profit', () => {
  it('uses each sale rate and ignores voided sales', () => {
    const summary = summarizeProfit([
      { qty: 2, priceCents: 500, costCents: 300, rate: 400000, status: 'COMPLETED' },
      { qty: 1, priceCents: 1000, costCents: 100, rate: 500000, status: 'VOIDED' }
    ])
    expect(summary.profitUsdCents).toBe(400)
    expect(summary.profitBsCents).toBe(16000)
    expect(summary.revenueUsdCents).toBe(1000)
  })
})

describe('password', () => {
  it('hashes and verifies', async () => {
    const stored = await hashPassword('secreto123', 1000)
    expect(await verifyPassword('secreto123', stored)).toBe(true)
    expect(await verifyPassword('otra', stored)).toBe(false)
  })
})
