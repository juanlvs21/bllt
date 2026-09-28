/**
 * Money rules: USD amounts are integer cents; the Bs/USD rate is an integer
 * scaled to 4 decimals (36.1234 Bs/USD -> 361234). Floats never get stored.
 */

export const RATE_SCALE = 10_000

/** Parses user input like "12", "12.5", "12,50" or "1.234,56" into cents. */
export function parseUsdToCents(input: string | number): number | null {
  const value = typeof input === 'number' ? input : parseDecimal(input)
  if (value === null || !Number.isFinite(value)) return null
  return Math.round(value * 100)
}

/** Parses a rate like "36,1234" or "36.1234" into the scaled integer. */
export function parseRate(input: string | number): number | null {
  const value = typeof input === 'number' ? input : parseDecimal(input)
  if (value === null || !Number.isFinite(value) || value <= 0) return null
  return Math.round(value * RATE_SCALE)
}

export function rateToNumber(rate: number): number {
  return rate / RATE_SCALE
}

/** Converts USD cents to Bs cents at a scaled rate, rounding half away from zero. */
export function usdCentsToBsCents(usdCents: number, rate: number): number {
  const product = usdCents * rate
  return Math.sign(product) * Math.round(Math.abs(product) / RATE_SCALE)
}

export function centsToNumber(cents: number): number {
  return cents / 100
}

const usdFormatter = new Intl.NumberFormat('es-VE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

export function formatUsd(cents: number): string {
  return `$${usdFormatter.format(cents / 100)}`
}

export function formatBs(cents: number): string {
  return `Bs ${usdFormatter.format(cents / 100)}`
}

const rateFormatter = new Intl.NumberFormat('es-VE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4
})

export function formatRate(rate: number): string {
  return rateFormatter.format(rateToNumber(rate))
}

/** Editable text for inputs with a decimal comma and no thousands separator ("1234,50"). */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

/** Rate for inputs ("855,6625"), keeping at least two decimals ("36,10"). */
export function rateToInput(rate: number): string {
  return rateToNumber(rate)
    .toFixed(4)
    .replace(/0{1,2}$/, '')
    .replace('.', ',')
}

function parseDecimal(raw: string): number | null {
  let s = raw.trim().replace(/\s|\$|Bs\.?/gi, '')
  if (!s) return null
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma > -1 && lastDot > -1) {
    // Whichever separator comes last is the decimal one.
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (lastComma > -1) {
    s = s.replace(',', '.')
  }
  if (!/^-?\d*\.?\d+$/.test(s)) return null
  return Number(s)
}
