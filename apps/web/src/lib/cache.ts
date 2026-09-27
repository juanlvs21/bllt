import type { WebSummary } from '@bllt/shared'

/** Last summary seen, shown offline as "actualizado a las 3:40 pm". Contains no credentials. */
const KEY = 'bllt:last-summary'

export const summaryCache = {
  read(): WebSummary | null {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? (JSON.parse(raw) as WebSummary) : null
    } catch {
      return null
    }
  },
  write(summary: WebSummary): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(summary))
    } catch {
      // Storage full or blocked: offline view just won't be available.
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(KEY)
    } catch {
      // ignore
    }
  }
}
