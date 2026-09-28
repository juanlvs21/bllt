/**
 * Venezuela runs on UTC-4 with no daylight saving. The business day is always
 * derived from UTC, never from the PC's time zone.
 */

export const BUSINESS_UTC_OFFSET_HOURS = -4
const OFFSET_MS = BUSINESS_UTC_OFFSET_HOURS * 60 * 60 * 1000

/** Business date "YYYY-MM-DD" (UTC-4) for an instant. */
export function businessDate(at: Date = new Date()): string {
  return new Date(at.getTime() + OFFSET_MS).toISOString().slice(0, 10)
}

/** Business month "YYYY-MM" (UTC-4) for an instant. */
export function businessMonth(at: Date = new Date()): string {
  return businessDate(at).slice(0, 7)
}

/** UTC ISO start (inclusive) and end (exclusive) of a business day. */
export function businessDayRange(date: string): { start: string; end: string } {
  const start = businessDateStart(date)
  return { start: start.toISOString(), end: new Date(start.getTime() + DAY_MS).toISOString() }
}

/** UTC ISO start/end for an inclusive range of business days. */
export function businessDateRange(from: string, to: string): { start: string; end: string } {
  return {
    start: businessDateStart(from).toISOString(),
    end: new Date(businessDateStart(to).getTime() + DAY_MS).toISOString()
  }
}

/** UTC ISO start/end of the business month containing the given business date. */
export function businessMonthRange(date: string): { start: string; end: string } {
  const [y, m] = date.split('-').map(Number) as [number, number]
  const first = `${y}-${String(m).padStart(2, '0')}-01`
  const nextY = m === 12 ? y + 1 : y
  const nextM = m === 12 ? 1 : m + 1
  const next = `${nextY}-${String(nextM).padStart(2, '0')}-01`
  return {
    start: businessDateStart(first).toISOString(),
    end: businessDateStart(next).toISOString()
  }
}

/** Hour (UTC-4) at which phone rate suggestions expire. */
export const PHONE_SUGGESTION_EXPIRY_HOUR = 1

/**
 * UTC ISO instant of the latest 1:00 am (UTC-4) at or before `at`. Phone
 * suggestions made before it have expired.
 */
export function phoneSuggestionCutoff(at: Date = new Date()): string {
  const shift = PHONE_SUGGESTION_EXPIRY_HOUR * 60 * 60 * 1000
  const date = businessDate(new Date(at.getTime() - shift))
  return new Date(businessDateStart(date).getTime() + shift).toISOString()
}

export function nowIso(): string {
  return new Date().toISOString()
}

/** "3:40 pm" in Venezuela time. */
export function formatBusinessTime(iso: string): string {
  const d = new Date(new Date(iso).getTime() + OFFSET_MS)
  let h = d.getUTCHours()
  const suffix = h >= 12 ? 'pm' : 'am'
  h = h % 12 || 12
  return `${h}:${String(d.getUTCMinutes()).padStart(2, '0')} ${suffix}`
}

/** "27/09/2026" in Venezuela time. */
export function formatBusinessDate(isoOrDate: string): string {
  const date = isoOrDate.length === 10 ? isoOrDate : businessDate(new Date(isoOrDate))
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}`
}

export function formatBusinessDateTime(iso: string): string {
  return `${formatBusinessDate(iso)} ${formatBusinessTime(iso)}`
}

/** "hace 2 min" style relative label. */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime())
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'hace instantes'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  return `hace ${d} ${d === 1 ? 'día' : 'días'}`
}

const DAY_MS = 24 * 60 * 60 * 1000

function businessDateStart(date: string): Date {
  return new Date(Date.parse(`${date}T00:00:00.000Z`) - OFFSET_MS)
}
