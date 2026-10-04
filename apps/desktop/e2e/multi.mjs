/**
 * Two PCs of the same business through a local Worker (`pnpm --filter @bllt/worker dev`, with a
 * fresh local database). Needs BLLT_E2E_WORKER (URL) and BLLT_E2E_TOKEN (its SYNC_TOKEN).
 *
 * PC A is an existing business: it works alone, then connects. PC B installs from scratch and
 * joins, so it must not repeat the setup.
 */
import { _electron as electron } from 'playwright-core'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const url = process.env.BLLT_E2E_WORKER
const token = process.env.BLLT_E2E_TOKEN
if (!url || !token) throw new Error('Faltan BLLT_E2E_WORKER y BLLT_E2E_TOKEN')
const step = (label) => console.log(`✓ ${label}`)

async function launch(name) {
  const data = mkdtempSync(join(tmpdir(), `bllt-${name}-`))
  const app = await electron.launch({
    args: [root],
    cwd: root,
    env: { ...process.env, BLLT_USER_DATA_DIR: join(data, 'userData'), BLLT_DOCUMENTS_DIR: data }
  })
  const page = await app.firstWindow()
  await page.setViewportSize({ width: 1366, height: 820 })
  page.on('pageerror', (e) => console.log(`[${name} pageerror]`, e.message, e.stack?.slice(0, 400)))
  page.on(
    'console',
    (m) => m.type() === 'error' && console.log(`[${name} console]`, m.text().slice(0, 300))
  )
  return { app, page }
}

/** Runs a sync cycle now, through the app's own IPC, until nothing is left to upload. */
async function syncNow(page) {
  let last
  for (let i = 0; i < 40; i++) {
    last = await page.evaluate(() => window.api.sync.runNow())
    if (last.ok && !last.data.running && !last.data.lastError && last.data.pending === 0) return
    await page.waitForTimeout(300)
  }
  throw new Error(`Sincronización incompleta: ${JSON.stringify(last)}`)
}

async function sell(page, code, times = 1) {
  await page.getByRole('button', { name: 'Nueva venta' }).first().click()
  const search = page.getByPlaceholder('Código o nombre del producto')
  for (let i = 0; i < times; i++) {
    await search.fill(code)
    await page.waitForTimeout(250)
    await search.press('Enter')
  }
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Registrar venta' }).click()
  await page.getByRole('button', { name: 'Confirmar venta' }).click()
  await page.getByRole('button', { name: 'Listo' }).click()
}

async function stockOf(page, name) {
  await page.getByRole('button', { name: 'Productos' }).click()
  const row = page.getByRole('row', { name: new RegExp(name) })
  await row.waitFor()
  return (await row.innerText()).replace(/\s+/g, ' ')
}

const A = await launch('a')
const B = await launch('b')
for (const [name, pc] of [
  ['A', A],
  ['B', B]
]) {
  pc.app
    .process()
    .stderr?.on(
      'data',
      (d) => /Error|error/.test(String(d)) && console.log(`[${name}]`, String(d).slice(0, 500))
    )
}
try {
  // --- PC A: an existing business that works on its own.
  const a = A.page
  await a.getByRole('button', { name: 'Usar solo en esta PC' }).click()
  await a.getByLabel('Nombre del negocio').fill('Bodega La Esquina')
  await a.getByRole('button', { name: 'Continuar' }).click()
  await a.getByLabel('Usuario').fill('dueno')
  await a.getByLabel('Contraseña', { exact: true }).fill('secreto123')
  await a.getByLabel('Repite la contraseña').fill('secreto123')
  await a.getByRole('button', { name: 'Crear cuenta' }).click()
  await a.getByText('Código de recuperación').waitFor()
  await a.getByRole('checkbox').click()
  await a.getByRole('button', { name: 'Entrar a Bllt' }).click()
  await a.getByText('Confirma la tasa de hoy').waitFor()
  await a.waitForTimeout(1500)
  await a.getByLabel('Bolívares por dólar').fill('855,6625')
  await a.getByRole('button', { name: 'Confirmar tasa' }).click()
  await a.getByRole('heading', { name: 'Inicio' }).waitFor()
  await a.getByRole('button', { name: 'Productos' }).click()
  for (const [code, name, stock, cost, price] of [
    ['7591', 'Harina PAN', '10', '0,95', '1,40'],
    ['7592', 'Arroz Mary', '5', '1,10', '1,60']
  ]) {
    await a.getByRole('button', { name: 'Nuevo producto' }).click()
    await a.getByLabel('Código').fill(code)
    await a.getByLabel('Cantidad inicial').fill(stock)
    await a.getByLabel('Nombre').fill(name)
    await a.getByLabel('Precio de compra').fill(cost)
    await a.getByLabel('Precio de venta').fill(price)
    await a.getByRole('button', { name: 'Guardar' }).click()
    await a.getByRole('cell', { name }).waitFor()
    await a.getByRole('dialog').waitFor({ state: 'detached' })
  }
  await sell(a, '7591', 2)
  step('PC A vende sola: Harina queda en 8')

  // --- PC A connects: uploads everything it had.
  await a.getByRole('button', { name: 'Configuración' }).click()
  await a.getByRole('tab', { name: 'Nube' }).click()
  await a.getByLabel('URL del Worker').fill(url)
  await a.getByLabel('SYNC_TOKEN').fill(token)
  await a.getByLabel('Nombre de esta PC').fill('Caja 1')
  await a.getByRole('button', { name: 'Conectar', exact: true }).click()
  await a.getByText('serie A').waitFor()
  await syncNow(a)
  step('PC A conectada y con todo subido (serie A)')

  // --- PC B: installs and joins; no setup, it loads the business.
  const b = B.page
  await b.getByLabel('URL del Worker').fill(url)
  await b.getByLabel('SYNC_TOKEN').fill(token)
  await b.getByLabel('Nombre de esta PC').fill('Caja 2')
  await b.getByRole('button', { name: 'Conectar', exact: true }).click()
  await b.getByRole('heading', { name: 'Iniciar sesión' }).waitFor({ timeout: 30_000 })
  step('PC B se une al negocio y va directo al login')
  await b.getByLabel('Usuario').fill('dueno')
  await b.getByLabel('Contraseña').fill('secreto123')
  await b.getByRole('button', { name: 'Entrar' }).click()
  await b.getByRole('heading', { name: 'Inicio' }).waitFor({ timeout: 15_000 })
  step('PC B entra con el usuario del negocio, sin pedir la tasa')
  const harinaB = await stockOf(b, 'Harina PAN')
  if (!harinaB.includes('8')) throw new Error(`PC B ve la Harina en: ${harinaB}`)
  step('PC B ve el stock correcto (8) sin duplicar el inicial')

  // --- Both sell the same product offline, then sync.
  await sell(a, '7591', 3)
  await sell(b, '7591', 2)
  await syncNow(a)
  await syncNow(b)
  await syncNow(a)
  const harinaA = await stockOf(a, 'Harina PAN')
  const harinaB2 = await stockOf(b, 'Harina PAN')
  if (!harinaA.includes(' 3 ') && !/\b3\b/.test(harinaA)) throw new Error(`A: ${harinaA}`)
  if (!/\b3\b/.test(harinaB2)) throw new Error(`B: ${harinaB2}`)
  step('las dos venden: el stock final refleja ambas ventas (8 - 3 - 2 = 3) en las dos PCs')

  await a.getByRole('button', { name: 'Ventas', exact: true }).click()
  await a.getByRole('cell', { name: /^B-000001/ }).waitFor()
  await a.getByRole('cell', { name: /^A-000002/ }).waitFor()
  await b.getByRole('button', { name: 'Ventas', exact: true }).click()
  await b.getByRole('cell', { name: /^A-000001/ }).waitFor()
  await b.getByRole('cell', { name: /^B-000001/ }).waitFor()
  step('cada PC sigue su serie: A-000001, A-000002 y B-000001 en las dos')

  // --- Voiding on A reaches B once.
  await a.getByRole('cell', { name: /^B-000001/ }).click()
  await a.getByRole('button', { name: 'Anular venta' }).click()
  await a.getByRole('alertdialog').getByRole('button', { name: 'Anular', exact: true }).click()
  await a.getByText('Anulada').first().waitFor()
  // The invoice dialog stays open after voiding; start the screen over.
  await a.reload()
  await a.getByRole('heading', { name: 'Inicio' }).waitFor()
  await syncNow(a)
  await syncNow(b)
  const harinaB3 = await stockOf(b, 'Harina PAN')
  if (!/\b5\b/.test(harinaB3)) throw new Error(`B tras la anulación: ${harinaB3}`)
  step('anular en A llega a B y el stock vuelve una sola vez (5)')

  // --- Devices list.
  await a.getByRole('button', { name: 'Configuración' }).click()
  await a.getByRole('tab', { name: 'Nube' }).click()
  await a.getByRole('cell', { name: /Caja 2/ }).waitFor()
  step('la lista de PCs muestra a Caja 2')
  await a.getByRole('button', { name: 'Desactivar' }).click()
  await a.getByRole('alertdialog').getByRole('button', { name: 'Desactivar' }).click()
  await a.getByText('Desactivada').waitFor()
  await b.getByRole('button', { name: 'Inicio' }).click()
  await b.getByRole('button', { name: 'Sincronizar ahora' }).first().click()
  await b.getByText('Esta PC fue desactivada').first().waitFor({ timeout: 20_000 })
  step('una PC desactivada ya no puede sincronizar')
} catch (error) {
  for (const [name, pc] of [
    ['A', A],
    ['B', B]
  ])
    console.log(
      `Estado de la nube en ${name}:`,
      JSON.stringify(await pc.page.evaluate(() => window.api.sync.status()).catch(() => null))
    )
  await A.page
    .screenshot({ path: join(root, 'e2e', 'screenshots', 'multi-a-error.png') })
    .catch(() => {})
  await B.page
    .screenshot({ path: join(root, 'e2e', 'screenshots', 'multi-b-error.png') })
    .catch(() => {})
  console.error(error)
  process.exitCode = 1
} finally {
  await A.app.close()
  await B.app.close()
}
