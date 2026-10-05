/**
 * Screenshots for the README and the landing page, over a store full of demo
 * data (scripts/seed-demo.mjs): 40 products, ~3 months of sales and customers.
 * Run `pnpm build` first. Images land in apps/site/static/capturas.
 *
 * The cloud shots (14, 17, 18) need a local Worker with a fresh database
 * (`pnpm --filter @bllt/worker dev`): set BLLT_E2E_WORKER (URL) and BLLT_E2E_TOKEN (its SYNC_TOKEN).
 */
import { _electron as electron } from 'playwright-core'
import electronPath from 'electron'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const workerUrl = process.env.BLLT_E2E_WORKER
const workerToken = process.env.BLLT_E2E_TOKEN
if (!workerUrl || !workerToken) throw new Error('Faltan BLLT_E2E_WORKER y BLLT_E2E_TOKEN')
// Captures show a workers.dev address instead of the local one.
const shownUrl = 'https://bodega-la-esquina.workers.dev'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const shots = join(root, '..', 'site', 'static', 'capturas')
const data = mkdtempSync(join(tmpdir(), 'bllt-capturas-'))
const userData = join(data, 'userData')
mkdirSync(shots, { recursive: true })

const launch = async (dir = userData) => {
  const app = await electron.launch({
    args: [root],
    cwd: root,
    env: { ...process.env, BLLT_USER_DATA_DIR: dir, BLLT_DOCUMENTS_DIR: data }
  })
  const page = await app.firstWindow()
  await page.setViewportSize({ width: 1366, height: 820 })
  await setPublicRate(app, 855.6625)
  return { app, page }
}
// Public API quotes come from a stub, so the suggested rate is the same on every run.
const setPublicRate = (app, promedio) =>
  app.evaluate(
    ({ net }, [promedio, workerUrl]) => {
      const realFetch = net.fetch.bind(net)
      net.fetch = async (input, init) => {
        // The local Worker is the real one; only the public quotes are faked.
        if (String(input?.url ?? input).startsWith(workerUrl)) return realFetch(input, init)
        return new Response(
          JSON.stringify({ promedio, fechaActualizacion: new Date().toISOString() }),
          { headers: { 'content-type': 'application/json' } }
        )
      }
    },
    [promedio, workerUrl]
  )
// Wait for enter/exit animations so captures never show a half-open dialog.
const settle = (page) =>
  page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => {}))
    )
  )
const shot = async (page, name, { toasts = true } = {}) => {
  if (!toasts)
    await page
      .locator('[data-sonner-toast]')
      .first()
      .waitFor({ state: 'detached', timeout: 10_000 })
  await settle(page)
  await page.screenshot({ path: join(shots, `${name}.png`) })
}
// Runs sync cycles through the app's own IPC until nothing is left to upload.
const syncNow = async (page) => {
  for (let i = 0; i < 100; i++) {
    const r = await page.evaluate(() => window.api.sync.runNow())
    if (r.ok && !r.data.running && !r.data.lastError && r.data.pending === 0) return
    await page.waitForTimeout(300)
  }
  throw new Error('Sincronización incompleta')
}
// Swaps the local Worker address for a workers.dev one in the text and the inputs on screen.
const showWorkerUrl = (page) =>
  page.evaluate(
    ([from, to]) => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      while (walker.nextNode()) {
        const node = walker.currentNode
        if (node.nodeValue?.includes(from)) node.nodeValue = node.nodeValue.replace(from, to)
      }
      for (const input of document.querySelectorAll('input'))
        if (input.value === from) input.value = to
    },
    [workerUrl, shownUrl]
  )
const step = (label) => console.log(`✓ ${label}`)
// The data lives in a temp folder; captures show where it goes on Windows instead.
const showWindowsPaths = (page) =>
  page.evaluate((from) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const node = walker.currentNode
      if (node.nodeValue?.includes(from))
        node.nodeValue = node.nodeValue
          .replace(from, 'C:\\Users\\Tienda\\Documents')
          .replaceAll('/', '\\')
    }
  }, data)

let app
try {
  // First run and today's rate, typed by hand so it doesn't depend on the network.
  let page
  ;({ app, page } = await launch())
  await page.getByRole('button', { name: 'Usar solo en esta PC' }).click()
  await page.getByLabel('Nombre del negocio').fill('Bodega La Esquina')
  await page.getByLabel('RIF (opcional)').fill('J-12345678-9')
  await page.locator('#logo').setInputFiles(join(root, 'build', 'icon.png'))
  await page.getByAltText('Logo del negocio').waitFor()
  await page.mouse.move(1300, 780)
  await shot(page, '01-setup')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByLabel('Usuario').fill('dueno')
  await page.getByLabel('Contraseña', { exact: true }).fill('secreto123')
  await page.getByLabel('Repite la contraseña').fill('secreto123')
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await page.getByText('Código de recuperación').first().waitFor()
  await shot(page, '02-recovery')
  await page.getByRole('checkbox').click()
  await page.getByRole('button', { name: 'Entrar a Bllt' }).click()
  await page.getByText('Confirma la tasa de hoy').waitFor()
  await page.getByRole('button', { name: /^Internet.*Bs/ }).waitFor()
  await shot(page, '03-rate')
  await page.getByRole('button', { name: 'Confirmar tasa' }).click()
  await page.getByRole('heading', { name: 'Inicio' }).waitFor()
  // An employee, so the sales are split between two users.
  await page.getByRole('button', { name: 'Configuración' }).click()
  await page.getByRole('tab', { name: 'Usuarios' }).click()
  await page.getByRole('button', { name: 'Nuevo usuario' }).click()
  await page.locator('#u-name').fill('maria')
  await page.locator('#u-pass').fill('empleada123')
  await page.getByRole('button', { name: 'Crear' }).click()
  await page.getByRole('cell', { name: 'maria' }).waitFor()
  await app.close()
  step('primer arranque y tasa')

  // Demo data straight into the database while the app is closed.
  execFileSync(
    electronPath,
    [join(root, 'scripts', 'seed-demo.mjs'), '--db', join(userData, 'bllt.db')],
    { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: 'inherit' }
  )
  step('datos de demo')

  ;({ app, page } = await launch())
  // The BCV moved since the rate was confirmed: the header shows the change.
  await setPublicRate(app, 861.3187)
  await page.getByLabel('Usuario').fill('dueno')
  await page.getByLabel('Contraseña').fill('secreto123')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByRole('heading', { name: 'Inicio' }).waitFor()

  const ratePill = page.getByRole('button', { name: /^Tasa/ })
  await ratePill.getByText('Nueva').waitFor()
  await page.mouse.move(700, 400)
  await settle(page)
  await page.screenshot({
    path: join(shots, '09-rate-badge.png'),
    clip: { x: 866, y: 0, width: 500, height: 64 }
  })
  await ratePill.click()
  await page.getByRole('dialog').getByText('La tasa cambió').waitFor()
  await shot(page, '10-rate-change')
  // Keep today's rate so the sale below matches the example on the landing page.
  await page.getByRole('dialog').getByRole('button', { name: 'Descartar' }).click()
  await ratePill.getByText('Nueva').waitFor({ state: 'detached' })
  step('cambio de tasa')

  await page.getByRole('button', { name: 'Productos' }).click()
  await page.getByRole('cell', { name: 'Arroz blanco 1 kg' }).waitFor()
  await shot(page, '05-products')
  step('productos')

  // A sale to a regular customer with a full cart.
  await page.getByRole('button', { name: 'Nueva venta' }).first().click()
  const search = page.getByPlaceholder('Código o nombre del producto')
  for (const name of [
    'Harina de maíz',
    'Harina de maíz',
    'Harina de maíz',
    'Arroz blanco',
    'Arroz blanco',
    'Café molido',
    'Aceite vegetal',
    'Queso blanco',
    'Huevos cartón',
    'Refresco cola',
    'Malta',
    'Malta',
    'Malta',
    'Papel higiénico'
  ]) {
    await search.fill(name)
    await page.waitForTimeout(300)
    await search.press('Enter')
  }
  await page.getByRole('button', { name: 'Venta anónima' }).click()
  await page.getByPlaceholder('Buscar por nombre o cédula…').fill('Comedor Doña Carmen')
  await page.getByRole('option', { name: /Comedor Doña Carmen/ }).click()
  // Park the mouse so no row shows hover controls.
  await page.mouse.move(700, 100)
  await page.waitForTimeout(300)
  await shot(page, '06-new-sale', { toasts: false })
  await page.getByRole('button', { name: 'Registrar venta' }).click()
  await page.getByRole('dialog').getByText('Resumen de venta').waitFor()
  await shot(page, '11-sale-summary')
  await page.getByRole('button', { name: 'Confirmar venta' }).click()
  await page
    .getByRole('dialog')
    .getByText(/^Venta [A-Z]-\d+$/)
    .waitFor()
  await shot(page, '07-invoice', { toasts: false })
  // The PDF is rendered in a hidden window first; the viewer is the one on bllt-receipt://.
  await page.getByRole('button', { name: 'Imprimir' }).click()
  let viewer
  while (!viewer) {
    viewer = app.windows().find((w) => w.url().startsWith('bllt-receipt:'))
    if (!viewer) await page.waitForTimeout(200)
  }
  await viewer.waitForLoadState()
  await viewer.setViewportSize({ width: 900, height: 1000 })
  await viewer.waitForTimeout(2500)
  await viewer.screenshot({ path: join(shots, '12-receipt-pdf.png') })
  await viewer.close()
  await page.getByRole('button', { name: 'Listo' }).click()
  step('venta')

  await page.getByRole('button', { name: 'Inicio' }).click()
  await page.getByText('Ventas de hoy').waitFor()
  await page.waitForTimeout(800)
  await shot(page, '08-dashboard')
  step('dashboard')

  await page.getByRole('button', { name: 'Configuración' }).click()
  for (const [tab, name, ready] of [
    ['Usuarios', '13-users', page.getByRole('cell', { name: 'maria' })],
    ['Respaldos', '15-backups', page.getByRole('button', { name: 'Restaurar' }).first()],
    ['Exportar', '16-export', page.getByRole('button', { name: 'Exportar' })]
  ]) {
    await page.getByRole('tab', { name: tab }).click()
    await ready.waitFor()
    await showWindowsPaths(page)
    await shot(page, name)
  }
  step('configuración')

  // The owner's PC connects to the cloud and uploads everything it has.
  await page.getByRole('tab', { name: 'Nube' }).click()
  await page.getByLabel('URL del Worker').fill(workerUrl)
  await page.getByLabel('SYNC_TOKEN').fill(workerToken)
  await page.getByLabel('Nombre de esta PC').fill('Caja 1')
  await page.getByRole('button', { name: 'Conectar', exact: true }).click()
  await page.getByText('serie A').waitFor()
  await syncNow(page)

  // A second PC joins from its first screen and loads the business.
  const second = await launch(join(data, 'userData-2'))
  const b = second.page
  await b.getByLabel('URL del Worker').fill(workerUrl)
  await b.getByLabel('SYNC_TOKEN').fill(workerToken)
  await b.getByLabel('Nombre de esta PC').fill('Caja 2')
  await showWorkerUrl(b)
  await b.mouse.move(1300, 780)
  await shot(b, '17-join-pc')
  await b.getByLabel('URL del Worker').fill(workerUrl)
  await b.getByRole('button', { name: 'Conectar', exact: true }).click()
  await b.getByRole('heading', { name: 'Iniciar sesión' }).waitFor({ timeout: 60_000 })
  await b.getByLabel('Usuario').fill('dueno')
  await b.getByLabel('Contraseña').fill('secreto123')
  await b.getByRole('button', { name: 'Entrar' }).click()
  await b.getByRole('heading', { name: 'Inicio' }).waitFor({ timeout: 30_000 })
  await syncNow(b)
  await second.app.close()
  await syncNow(page)
  step('segunda PC')

  // Reload so the list of PCs is read again.
  await page.reload()
  await page.getByRole('heading', { name: 'Inicio' }).waitFor()
  await page.getByRole('button', { name: 'Configuración' }).click()
  await page.getByRole('tab', { name: 'Nube' }).click()
  await page.getByRole('cell', { name: /Caja 2/ }).waitFor()
  await showWindowsPaths(page)
  await showWorkerUrl(page)
  await page.mouse.move(700, 800)
  await shot(page, '14-cloud')
  await page.getByRole('button', { name: 'Inicio' }).click()
  await page.getByText('Todo al día').waitFor()
  await page.getByText(/Caja 2/).waitFor()
  await page.mouse.move(700, 800)
  await settle(page)
  const card = page.locator('[data-slot="card"]').filter({ hasText: 'Todo al día' }).last()
  // The card stretches to the row's height; keep only the part with content.
  const box = await card.boundingBox()
  await page.screenshot({
    path: join(shots, '18-sync-status.png'),
    clip: { ...box, height: Math.min(box.height, 170) }
  })
  step('nube')
} catch (error) {
  if (app) await app.windows()[0]?.screenshot({ path: join(data, 'error.png') })
  console.error(`Captura del error en ${join(data, 'error.png')}`)
  throw error
} finally {
  await app?.close()
}
rmSync(data, { recursive: true, force: true })
