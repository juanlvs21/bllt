/**
 * Clamps the requested page to the last one that has rows, so a stale page
 * number (after a filter or a delete) still returns something.
 */
export function pageWindow(
  total: number,
  page: number,
  perPage: number
): { page: number; offset: number } {
  const last = Math.max(1, Math.ceil(total / perPage))
  const current = Math.min(page, last)
  return { page: current, offset: (current - 1) * perPage }
}
