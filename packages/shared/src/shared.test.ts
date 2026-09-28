import { describe, expect, it } from 'vitest'
import {
  businessDate,
  businessDayRange,
  businessInput,
  businessMonthRange,
  centsToInput,
  formatBusinessTime,
  hashPassword,
  LOGO_MAX_LENGTH,
  parseRate,
  parseUsdToCents,
  rateToInput,
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
  })

  it('writes input text with a decimal comma that parses back', () => {
    expect(rateToInput(8556625)).toBe('855,6625')
    expect(rateToInput(361000)).toBe('36,10')
    expect(centsToInput(123450)).toBe('1234,50')
    expect(parseRate(rateToInput(8556625))).toBe(8556625)
    expect(parseUsdToCents(centsToInput(123450))).toBe(123450)
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

describe('business', () => {
  it('normalizes the RIF and makes it optional', () => {
    const parse = (rif: string | null | undefined) => businessInput.parse({ name: ' Tienda ', rif })
    expect(parse('j123456789')).toEqual({ name: 'Tienda', rif: 'J-12345678-9', logo: null })
    expect(parse(' v-01234567-0 ').rif).toBe('V-01234567-0')
    expect(parse('').rif).toBeNull()
    expect(parse(undefined).rif).toBeNull()
    expect(parse(null).rif).toBeNull()
  })

  it('rejects malformed RIFs and empty names', () => {
    expect(businessInput.safeParse({ name: 'Tienda', rif: 'X-12345678-9' }).success).toBe(false)
    expect(businessInput.safeParse({ name: 'Tienda', rif: 'J-1234567-9' }).success).toBe(false)
    expect(businessInput.safeParse({ name: '  ', rif: '' }).success).toBe(false)
  })

  it('accepts image data URLs as logo and rejects anything else', () => {
    const parse = (logo: string | null | undefined) =>
      businessInput.safeParse({ name: 'Tienda', logo })
    expect(parse('data:image/png;base64,iVBORw0KGgo=').data?.logo).toBe(
      'data:image/png;base64,iVBORw0KGgo='
    )
    expect(parse('').data?.logo).toBeNull()
    expect(parse(null).data?.logo).toBeNull()
    expect(parse('data:image/svg+xml;base64,PHN2Zz4=').success).toBe(false)
    expect(parse('https://example.com/logo.png').success).toBe(false)
    expect(parse(`data:image/png;base64,${'A'.repeat(LOGO_MAX_LENGTH)}`).success).toBe(false)
  })
})
