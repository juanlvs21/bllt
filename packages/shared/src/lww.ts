/**
 * "Newest edit wins" for the rows PCs edit (users, products, customers, rates, settings).
 * Used by the desktop when applying remote changes and by the Worker when accepting pushes,
 * so both sides always pick the same winner.
 *
 * It trusts each PC's clock: a PC set days ahead wins every edit until it's fixed.
 * `clampFuture` limits the damage to one day.
 */

export interface Versioned {
  updatedAt: string
  updatedByDevice: string
}

/** True when `incoming` must replace `current`: newer, or same instant and a greater device id. */
export function wins(incoming: Versioned, current: Versioned): boolean {
  if (incoming.updatedAt !== current.updatedAt) return incoming.updatedAt > current.updatedAt
  return incoming.updatedByDevice > current.updatedByDevice
}

/** Largest distance into the future an `updatedAt` may claim. */
export const MAX_FUTURE_SKEW_MS = 24 * 60 * 60 * 1000

/** Pulls a timestamp from the far future back to `now`. Anything else is returned as is. */
export function clampFuture(iso: string, now: Date = new Date()): string {
  const at = Date.parse(iso)
  return Number.isNaN(at) || at <= now.getTime() + MAX_FUTURE_SKEW_MS ? iso : now.toISOString()
}
