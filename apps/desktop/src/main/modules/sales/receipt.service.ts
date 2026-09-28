import { BrowserWindow, protocol, session } from 'electron'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  formatBs,
  formatBusinessDateTime,
  formatRate,
  formatUsd,
  usdCentsToBsCents
} from '@bllt/shared'
import blltLogo from '../../../../../../assets/brand/logo-light.svg?raw'
import type { BusinessDto, SaleDto } from '../../../types/api'
import { paths } from '../../core/config'
import { newId } from '../../utils/id'
import { businessService } from '../business/business.service'
import { saleService } from './sale.service'

const PRIMARY = '#1bae8f'
const INK = '#27302f'
const MUTED = '#6b7472'
const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`

/** Always Letter; the top and bottom margins leave room for the letterhead and footer templates. */
const MARGIN = { top: 1.25, bottom: 0.75, left: 0.6, right: 0.6 }
/** Printable height of a Letter page between those margins, in CSS pixels. */
const CONTENT_HEIGHT = (11 - MARGIN.top - MARGIN.bottom) * 96

/**
 * Previews live only in memory, served by a private scheme to Chromium's PDF
 * viewer: nothing touches the disk until the user saves from the viewer.
 */
const SCHEME = 'bllt-receipt'
const PARTITION = 'receipt-preview'
const previews = new Map<string, Buffer>()

/** Must run before the app is ready. */
export function registerReceiptScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }
  ])
}

/** Serves the previews and points the viewer's save dialog at Documents/Bllt/Receipts. */
export function registerReceiptPreview(): void {
  const preview = session.fromPartition(PARTITION)
  // URL: bllt-receipt://pdf/<token>/Venta-<n>.pdf; the last segment names the saved file.
  preview.protocol.handle(SCHEME, (request) => {
    const pdf = previews.get(new URL(request.url).pathname.split('/')[1] ?? '')
    if (!pdf) return new Response(null, { status: 404 })
    return new Response(new Uint8Array(pdf), { headers: { 'content-type': 'application/pdf' } })
  })
  preview.on('will-download', (_event, item) => {
    mkdirSync(paths.receipts, { recursive: true })
    item.setSaveDialogOptions({ defaultPath: join(paths.receipts, item.getFilename()) })
  })
}

export const receiptService = {
  /** Renders the sale receipt and shows it in a viewer window, with save and print. */
  async preview(id: string): Promise<void> {
    const sale = saleService.get(id)
    const pdf = await renderPdf(sale, businessService.get())
    const token = newId()
    previews.set(token, pdf)

    const parent = BrowserWindow.getFocusedWindow() ?? undefined
    const win = new BrowserWindow({
      width: 900,
      height: Math.min(1000, parent?.getBounds().height ?? 1000),
      parent,
      title: `Venta #${sale.number}`,
      autoHideMenuBar: true,
      backgroundColor: '#525659',
      webPreferences: { partition: PARTITION, sandbox: true, contextIsolation: true, plugins: true }
    })
    win.on('closed', () => previews.delete(token))
    win.webContents.on('will-navigate', (event) => event.preventDefault())
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    // Viewer options: no thumbnail sidebar, page fit to the window width.
    await win.loadURL(`${SCHEME}://pdf/${token}/Venta-${sale.number}.pdf#navpanes=0&view=FitH`)
  }
}

/**
 * The legal notice sits at the bottom of the last page. Print layout can't
 * express that, so a spacer above it grows as much as it can without adding
 * a page: a binary search using the PDF's page count as the oracle.
 */
async function renderPdf(sale: SaleDto, business: BusinessDto): Promise<Buffer> {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, contextIsolation: true }
  })
  const print = async (spacer: number) => {
    await win.webContents.executeJavaScript(
      `document.getElementById('spacer').style.height = '${spacer}px'`
    )
    const pdf = await win.webContents.printToPDF({
      pageSize: 'Letter',
      printBackground: true,
      margins: MARGIN,
      displayHeaderFooter: true,
      headerTemplate: headerHtml(sale, business),
      footerTemplate: footerHtml()
    })
    return { pdf, pages: countPages(pdf) }
  }
  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(bodyHtml(sale))}`)
    let best = await print(0)
    let [lo, hi] = [0, Math.floor(CONTENT_HEIGHT)]
    while (hi - lo > 2) {
      const mid = Math.floor((lo + hi) / 2)
      const attempt = await print(mid)
      if (attempt.pages === best.pages) [lo, best] = [mid, attempt]
      else hi = mid
    }
    return best.pdf
  } finally {
    win.destroy()
  }
}

/** Chromium writes page dictionaries uncompressed, so they can be counted as text. */
function countPages(pdf: Buffer): number {
  return pdf.toString('latin1').match(/\/Type\s*\/Page(?![a-zA-Z])/g)?.length ?? 0
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Letterhead repeated on every page. Header templates render without the
 * page's styles and with a zero default font size, so everything is inline.
 */
function headerHtml(sale: SaleDto, business: BusinessDto): string {
  const logo = business.logo
    ? `<img src="${esc(business.logo)}" style="max-height:44px;max-width:150px;object-fit:contain;border-radius:8px">`
    : blltLogo.replace('<svg ', '<svg style="height:38px;width:auto;display:block" ')
  const voided =
    sale.status === 'VOIDED'
      ? `<div style="display:inline-block;margin-top:3px;padding:1px 8px;border-radius:9px;background:#dc2626;color:#fff;font-size:8px;font-weight:700;letter-spacing:.5px">ANULADA</div>`
      : ''
  return `
<div style="width:100%;box-sizing:border-box;padding:0.35in ${MARGIN.right}in 0 ${MARGIN.left}in">
<div style="padding-bottom:8px;border-bottom:2px solid ${PRIMARY};
  display:flex;align-items:center;justify-content:space-between;gap:16px;font-family:${FONT};color:${INK};
  -webkit-print-color-adjust:exact">
  <div style="display:flex;align-items:center;gap:12px;min-width:0">
    ${logo}
    <div style="min-width:0">
      ${business.name ? `<div style="font-size:14px;font-weight:700;line-height:1.2">${esc(business.name)}</div>` : ''}
      ${business.rif ? `<div style="font-size:9px;color:${MUTED};font-family:ui-monospace,Menlo,Consolas,monospace">RIF ${esc(business.rif)}</div>` : ''}
    </div>
  </div>
  <div style="text-align:right;white-space:nowrap">
    <div style="font-size:14px;font-weight:700;color:${PRIMARY}">Venta #${sale.number}</div>
    <div style="font-size:9px;color:${MUTED}">${esc(formatBusinessDateTime(sale.createdAt))}</div>
    ${voided}
  </div>
</div>
</div>`
}

function footerHtml(): string {
  return `
<div style="width:100%;box-sizing:border-box;padding:0 ${MARGIN.right}in 0.3in ${MARGIN.left}in">
<div style="padding-top:6px;border-top:1px solid #dcd8d8;
  display:flex;justify-content:space-between;font-family:${FONT};font-size:8px;color:${MUTED}">
  <span>Comprobante de venta · Generado con Bllt · <span style="color:${PRIMARY}">bllt.juanl.dev</span></span>
  <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
</div>
</div>`
}

function bodyHtml(sale: SaleDto): string {
  const units = sale.items.reduce((sum, item) => sum + item.qty, 0)
  const rows = sale.items
    .map((item) => {
      const total = item.qty * item.priceCents
      return `<tr>
  <td>${esc(item.productName)}<div class="code">${esc(item.productCode)}</div></td>
  <td class="num">${item.qty}</td>
  <td class="num">${formatUsd(item.priceCents)}</td>
  <td class="num">${formatUsd(total)}</td>
  <td class="num">${formatBs(usdCentsToBsCents(total, sale.rate))}</td>
</tr>`
    })
    .join('')

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Venta #${sale.number}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: ${FONT}; font-size: 10.5px; color: ${INK};
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .info { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px;
    margin: 4px 0 20px; }
  .info .rate { margin-left: auto; text-align: right; }
  .label { font-size: 8.5px; color: ${MUTED}; text-transform: uppercase; letter-spacing: .4px; }
  .value { font-size: 12px; font-weight: 600; margin-top: 3px; font-variant-numeric: tabular-nums; }
  .detail { color: ${MUTED}; margin-top: 1px; }
  .mono, .code { font-family: ui-monospace, Menlo, Consolas, monospace; }
  .code { font-size: 8.5px; color: ${MUTED}; font-weight: 400; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  th { text-align: left; font-size: 8.5px; font-weight: 600; color: ${MUTED}; text-transform: uppercase;
    letter-spacing: .4px; padding: 6px 8px; border-bottom: 1px solid ${INK}; }
  td { padding: 6px 8px; border-bottom: 1px solid #e6e3e3; vertical-align: top; }
  tr { break-inside: avoid; }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  th.num { text-align: right; }
  .totals { break-inside: avoid; display: flex; justify-content: space-between; align-items: flex-end;
    margin-top: 14px; padding-top: 10px; border-top: 2px solid ${INK}; }
  .count { color: ${MUTED}; }
  .total-usd { font-size: 22px; font-weight: 700; text-align: right; font-variant-numeric: tabular-nums; }
  .total-bs { font-size: 12px; color: ${MUTED}; text-align: right; font-variant-numeric: tabular-nums; }
  .disclaimer { break-inside: avoid; margin: 28px 0 0; font-size: 8px; line-height: 1.5; color: #9aa19f;
    text-align: center; }
</style>
</head>
<body>
  <div class="info">
    ${
      sale.customerName
        ? `<div>
      <div class="label">Cliente</div>
      <div class="value">${esc(sale.customerName)}</div>
      ${sale.customerDocument ? `<div class="detail mono">${esc(sale.customerDocument)}</div>` : ''}
    </div>`
        : ''
    }
    <div class="rate">
      <div class="label">Tasa del día</div>
      <div class="value">Bs ${formatRate(sale.rate)}</div>
      <div class="detail">por dólar</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Producto</th>
        <th class="num">Cant.</th>
        <th class="num">Precio unit.</th>
        <th class="num">Total USD</th>
        <th class="num">Total Bs</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div class="count">${sale.items.length} ${sale.items.length === 1 ? 'producto' : 'productos'} · ${units} ${units === 1 ? 'unidad' : 'unidades'}</div>
    <div>
      <div class="label" style="text-align:right">Total</div>
      <div class="total-usd">${formatUsd(sale.totalCents)}</div>
      <div class="total-bs">${formatBs(usdCentsToBsCents(sale.totalCents, sale.rate))}</div>
    </div>
  </div>
  <div id="spacer"></div>
  <p class="disclaimer">
    Este documento no es una factura fiscal y no tiene validez legal.<br>
    Es un comprobante de carácter informativo.
  </p>
</body>
</html>`
}
