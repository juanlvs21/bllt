/**
 * Export job, run in an Electron utilityProcess so the app keeps selling
 * while a large range is written to disk.
 */
import Database from 'better-sqlite3'
import ExcelJS from 'exceljs'
import { createWriteStream, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  businessDateRange,
  formatBusinessDate,
  formatBusinessTime,
  lineProfitCents,
  rateToNumber,
  SaleStatus,
  usdCentsToBsCents,
  type ExportFormat
} from '@bllt/shared'
import { exportRepository, type ExportLine } from './export.repository'

export interface ExportJob {
  jobId: string
  dbPath: string
  outDir: string
  from: string
  to: string
  format: ExportFormat
}

export type ExportMessage =
  | { type: 'progress'; percent: number }
  | { type: 'done'; file: string; rows: number }
  | { type: 'error'; message: string }

const HEADERS = [
  'Venta',
  'Fecha',
  'Hora',
  'Estado',
  'Cliente',
  'Cédula/RIF',
  'Usuario',
  'Tasa (Bs/USD)',
  'Código',
  'Producto',
  'Cantidad',
  'Precio USD',
  'Total USD',
  'Total Bs',
  'Costo USD',
  'Ganancia USD',
  'Ganancia Bs'
]

function toRow(line: ExportLine): (string | number)[] {
  const total = line.qty * line.priceCents
  const profit = line.status === SaleStatus.COMPLETED ? lineProfitCents(line) : 0
  return [
    line.number,
    formatBusinessDate(line.createdAt),
    formatBusinessTime(line.createdAt),
    line.status === SaleStatus.COMPLETED ? 'Completada' : 'Anulada',
    line.customerName ?? 'Anónimo',
    line.customerDocument ?? '',
    line.username ?? '',
    rateToNumber(line.rate),
    line.code,
    line.name,
    line.qty,
    line.priceCents / 100,
    total / 100,
    usdCentsToBsCents(total, line.rate) / 100,
    (line.qty * line.costCents) / 100,
    profit / 100,
    usdCentsToBsCents(profit, line.rate) / 100
  ]
}

function csvCell(value: string | number): string {
  if (typeof value === 'number') return String(value)
  return /[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

async function run(job: ExportJob, post: (m: ExportMessage) => void): Promise<void> {
  const sqlite = new Database(job.dbPath, { readonly: true, fileMustExist: true })
  try {
    const { start, end } = businessDateRange(job.from, job.to)
    const total = Math.max(1, exportRepository.countLines(sqlite, start, end))
    mkdirSync(job.outDir, { recursive: true })
    const base = `ventas_${job.from}_a_${job.to}`
    let written = 0
    const tick = () => {
      written++
      if (written % 200 === 0)
        post({ type: 'progress', percent: Math.round((written / total) * 100) })
    }

    if (job.format === 'CSV') {
      const file = join(job.outDir, `${base}.csv`)
      const out = createWriteStream(file, { encoding: 'utf8' })
      out.write('﻿' + HEADERS.map(csvCell).join(',') + '\n')
      for (const line of exportRepository.lines(sqlite, start, end)) {
        if (!out.write(toRow(line).map(csvCell).join(',') + '\n')) {
          await new Promise<void>((resolve) => out.once('drain', () => resolve()))
        }
        tick()
      }
      await new Promise<void>((resolve, reject) =>
        out.end((err?: Error | null) => (err ? reject(err) : resolve()))
      )
      post({ type: 'done', file, rows: written })
      return
    }

    const file = join(job.outDir, `${base}.xlsx`)
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ filename: file, useStyles: true })
    const sheet = workbook.addWorksheet('Ventas', { views: [{ state: 'frozen', ySplit: 1 }] })
    sheet.columns = HEADERS.map((header) => ({ header, width: Math.max(12, header.length + 4) }))
    sheet.getRow(1).font = { bold: true }
    sheet.getRow(1).commit()
    const money = '#,##0.00'
    for (const line of exportRepository.lines(sqlite, start, end)) {
      const row = sheet.addRow(toRow(line))
      for (const col of [12, 13, 14, 15, 16, 17]) row.getCell(col).numFmt = money
      row.getCell(8).numFmt = '#,##0.0000'
      row.commit()
      tick()
    }
    sheet.commit()
    await workbook.commit()
    post({ type: 'done', file, rows: written })
  } finally {
    sqlite.close()
  }
}

process.parentPort?.once('message', (event: { data: ExportJob }) => {
  const post = (m: ExportMessage) => process.parentPort.postMessage(m)
  run(event.data, post)
    .catch((error: unknown) =>
      post({ type: 'error', message: error instanceof Error ? error.message : String(error) })
    )
    .finally(() => process.exit(0))
})
