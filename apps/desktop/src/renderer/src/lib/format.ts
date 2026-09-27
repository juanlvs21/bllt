export {
  formatBs,
  formatUsd,
  formatRate,
  formatBusinessDate,
  formatBusinessDateTime,
  formatBusinessTime,
  formatRelative,
  usdCentsToBsCents
} from '@bllt/shared'

export const RATE_SOURCE_LABEL: Record<string, string> = {
  WORKER: 'Nube (automática)',
  PUBLIC_API: 'API pública',
  MANUAL: 'Manual',
  WEB: 'Teléfono'
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}
