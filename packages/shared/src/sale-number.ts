/** Invoice number as printed: series and a six digit correlative, "A-000123". */
export function formatSaleNumber(series: string, number: number): string {
  return `${series}-${String(number).padStart(6, '0')}`
}
