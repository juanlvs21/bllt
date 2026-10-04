import type Database from 'better-sqlite3'

export interface ExportLine {
  saleId: string
  series: string
  device: string | null
  number: number
  createdAt: string
  status: string
  customerName: string | null
  customerDocument: string | null
  username: string | null
  rate: number
  code: string
  name: string
  qty: number
  priceCents: number
  costCents: number
}

/**
 * Runs inside the export utility process with its own read-only connection,
 * so it takes the Database handle instead of the app's shared one.
 */
export const exportRepository = {
  countLines(sqlite: Database.Database, start: string, end: string): number {
    const row = sqlite
      .prepare(
        `select count(*) as n from sale_items i join sales s on s.id = i.sale_id
         where s.created_at >= ? and s.created_at < ?`
      )
      .get(start, end) as { n: number }
    return row.n
  },
  *lines(sqlite: Database.Database, start: string, end: string): Generator<ExportLine> {
    const stmt = sqlite.prepare(
      `select s.id as saleId, s.series as series, d.name as device, s.number as number, s.created_at as createdAt, s.status as status,
              c.name as customerName, c.document as customerDocument, u.username as username,
              s.rate as rate, i.product_code as code, i.product_name as name, i.qty as qty,
              i.price_cents as priceCents, i.cost_cents as costCents
       from sale_items i
       join sales s on s.id = i.sale_id
       left join customers c on c.id = s.customer_id
       left join users u on u.id = s.user_id
       left join devices d on d.series = s.series
       where s.created_at >= ? and s.created_at < ?
       order by s.series, s.number, i.product_name`
    )
    yield* stmt.iterate(start, end) as IterableIterator<ExportLine>
  }
}
