/**
 * End-to-end smoke test of the built app (run `pnpm build` first):
 * first run, daily rate, products, an anonymous sale and the dashboard.
 * Screenshots land in e2e/screenshots.
 */
import { _electron as electron } from 'playwright-core'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const shots = join(root, 'e2e', 'screenshots')
const data = mkdtempSync(join(tmpdir(), 'bllt-e2e-'))
mkdirSync(shots, { recursive: true })

const app = await electron.launch({
  // Launch the folder, not out/main/index.js: Electron only reads productName ("Bllt") from package.json then.
  args: [root],
  cwd: root,
  env: { ...process.env, BLLT_USER_DATA_DIR: join(data, 'userData'), BLLT_DOCUMENTS_DIR: data }
})
const page = await app.firstWindow()
await page.setViewportSize({ width: 1366, height: 820 })
// Wait for dialog/toast enter and exit animations so captures never show a
// half-open or half-closed dialog. Infinite animations (spinners) are skipped.
const settle = () =>
  page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => {}))
    )
  )
const shot = async (name, { toasts = true } = {}) => {
  if (!toasts)
    await page
      .locator('[data-sonner-toast]')
      .first()
      .waitFor({ state: 'detached', timeout: 10_000 })
  await settle()
  await page.screenshot({ path: join(shots, `${name}.png`) })
}
const step = (label) => console.log(`✓ ${label}`)

try {
  // First run: owner + recovery code.
  await page.getByRole('button', { name: 'Usar solo en esta PC' }).click()
  await page.getByLabel('Nombre del negocio').fill('Bodega La Esquina')
  await page.getByLabel('RIF (opcional)').fill('j123456789')
  await page.locator('#logo').setInputFiles(join(root, 'build', 'icon.png'))
  await page.getByAltText('Logo del negocio').waitFor()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByLabel('Usuario').fill('dueno')
  await page.getByLabel('Contraseña', { exact: true }).fill('secreto123')
  await page.getByLabel('Repite la contraseña').fill('secreto123')
  await shot('01-setup')
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await page.getByText('Código de recuperación').waitFor()
  await shot('02-recovery-code')
  await page.getByRole('checkbox').click()
  await page.getByRole('button', { name: 'Entrar a Bllt' }).click()
  step('primer arranque')

  // Daily rate: type it by hand so the test doesn't depend on the network.
  await page.getByText('Confirma la tasa de hoy').waitFor()
  await page.waitForTimeout(1500)
  await page.getByLabel('Bolívares por dólar').fill('855,6625')
  await shot('03-rate')
  await page.getByRole('button', { name: 'Confirmar tasa' }).click()
  await page.getByRole('heading', { name: 'Inicio' }).waitFor()
  await page.getByText('J-12345678-9').waitFor()
  await page.locator('aside img[src^="data:image/"]').waitFor()
  step('tasa confirmada')

  // Products.
  await page.getByRole('button', { name: 'Productos' }).click()
  for (const [code, name, stock, cost, price] of [
    ['7591', 'Harina PAN 1 kg', '24', '0,95', '1,40'],
    ['7592', 'Arroz Mary 1 kg', '12', '1,10', '1,60'],
    ['7593', 'Café Fama de América 250 g', '3', '2,80', '3,90']
  ]) {
    await page.getByRole('button', { name: 'Nuevo producto' }).click()
    await page.getByLabel('Código').fill(code)
    await page.getByLabel('Cantidad inicial').fill(stock)
    await page.getByLabel('Nombre').fill(name)
    await page.getByLabel('Precio de compra').fill(cost)
    await page.getByLabel('Precio de venta').fill(price)
    if (code === '7593') await shot('04-product-dialog')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await page.getByRole('cell', { name }).waitFor()
    await page.getByRole('dialog').waitFor({ state: 'detached' })
  }
  await shot('05-products')
  step('productos')

  // Anonymous sale scanning codes.
  await page.getByRole('button', { name: 'Nueva venta' }).first().click()
  const search = page.getByPlaceholder('Código o nombre del producto')
  for (const code of ['7591', '7591', '7593']) {
    await search.fill(code)
    await page.waitForTimeout(250)
    await search.press('Enter')
  }
  await page.waitForTimeout(300)
  await shot('06-new-sale', { toasts: false })
  await page.getByRole('button', { name: 'Registrar venta' }).click()
  await page.getByRole('dialog').getByText('Resumen de venta').waitFor()
  await page.getByRole('button', { name: 'Confirmar venta' }).click()
  await page.getByRole('dialog').getByText('Venta A-000001', { exact: true }).waitFor()
  await shot('07-invoice', { toasts: false })
  // Printing previews the receipt PDF in its own window, straight from memory.
  await page.getByRole('button', { name: 'Imprimir' }).click()
  let preview
  for (let i = 0; i < 100 && !preview; i++) {
    preview = app.windows().find((w) => w.url().startsWith('bllt-receipt:'))
    if (!preview) await page.waitForTimeout(100)
  }
  if (!preview) throw new Error('No se abrió la vista previa del PDF')
  await preview.waitForLoadState()
  if (!/^bllt-receipt:\/\/pdf\/.+\/Venta-A-000001\.pdf#/.test(preview.url()))
    throw new Error(`Vista previa inesperada: ${preview.url()}`)
  const pdfBytes = await preview.evaluate(
    async () => (await (await fetch(location.href)).arrayBuffer()).byteLength
  )
  if (pdfBytes < 1000) throw new Error(`PDF vacío: ${pdfBytes} bytes`)
  await preview.waitForTimeout(1500)
  await preview.screenshot({ path: join(shots, '07-receipt-preview.png') })
  await preview.close()
  step('comprobante en PDF')
  await page.getByRole('button', { name: 'Listo' }).click()
  step('venta anónima')

  await page.getByRole('button', { name: 'Inicio' }).click()
  await page.getByText('Ventas de hoy').waitFor()
  await page.waitForTimeout(500)
  await shot('08-dashboard')
  const profit = await page.getByText('Ganancia de hoy').locator('..').locator('..').innerText()
  if (!profit.includes('$2,00')) throw new Error(`Ganancia inesperada: ${profit}`)
  step('dashboard con ganancia $2,00')

  await page.getByRole('button', { name: 'Ventas', exact: true }).click()
  await page.getByLabel('Período').click()
  await shot('08-sales-period')
  // Today to today: the first click starts the range, the second closes it.
  const today = page.locator('[data-bits-day][data-today]:not([data-outside-month])')
  await today.click()
  await today.click()
  await page.getByRole('cell', { name: 'A-000001', exact: true }).waitFor()
  step('ventas filtradas por período')

  await page.getByRole('button', { name: 'Productos' }).click()
  await page
    .getByRole('row', { name: /Harina PAN/ })
    .getByText('22')
    .waitFor()
  step('inventario descontado')

  await page.getByRole('button', { name: 'Configuración' }).click()
  await page.getByRole('tab', { name: 'Respaldos' }).click()
  await page.getByRole('button', { name: 'Respaldar ahora' }).click()
  await page
    .getByText(/^bllt-.*\.db$/)
    .first()
    .waitFor()
  await shot('09-backups')
  step('respaldo manual')

  // Optional: sync against a local Worker (`pnpm --filter @bllt/worker dev`).
  if (process.env.BLLT_E2E_WORKER) {
    await page.getByRole('tab', { name: 'Nube' }).click()
    await page.getByLabel('URL del Worker').fill(process.env.BLLT_E2E_WORKER)
    await page.getByLabel('SYNC_TOKEN').fill('token-equivocado')
    await page.getByRole('button', { name: 'Probar conexión' }).click()
    await page.getByText('El token no es válido').waitFor()
    await page.getByLabel('SYNC_TOKEN').fill(process.env.BLLT_E2E_TOKEN ?? 'test-token')
    await page.getByRole('button', { name: 'Probar conexión' }).click()
    await page.getByText('Conexión correcta con el Worker').waitFor()
    step('probar conexión antes de conectar')
    await page.getByLabel('Nombre de esta PC').fill('Caja principal')
    await page.getByRole('button', { name: 'Conectar', exact: true }).click()
    await page.getByText('Caja principal').first().waitFor()
    await page.getByRole('button', { name: 'Inicio' }).click()
    await page.getByText('Todo al día').waitFor({ timeout: 30_000 })
    await shot('10-synced')
    step('sincronizado con el Worker')

    // The PWA reads the synced business name from the Worker.
    const { name } = await (await fetch(`${process.env.BLLT_E2E_WORKER}/api/business`)).json()
    if (name !== 'Bodega La Esquina')
      throw new Error(`La PWA no recibe el nombre del negocio sincronizado: ${name}`)
    step('nombre del negocio en la PWA')

    // Disconnect asks first; confirming clears the URL.
    await page.getByRole('button', { name: 'Configuración' }).click()
    await page.getByRole('tab', { name: 'Nube' }).click()
    await page.getByRole('button', { name: 'Desconectar' }).click()
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await page.getByRole('alertdialog').waitFor({ state: 'detached' })
    await page.getByText('Caja principal').first().waitFor()
    await page.getByRole('button', { name: 'Desconectar' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Desconectar' }).click()
    await page.getByText('Nube desconectada').waitFor()
    await page.getByRole('button', { name: 'Desconectar' }).waitFor({ state: 'detached' })
    step('desconectar con confirmación')
  }

  // Logout asks first; the login shows the business logo.
  await page.getByRole('button', { name: 'Salir' }).click()
  await page.getByRole('button', { name: 'Cancelar' }).click()
  await page.getByRole('alertdialog').waitFor({ state: 'detached' })
  await page.getByRole('button', { name: 'Salir' }).click()
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await page.getByRole('heading', { name: 'Iniciar sesión' }).waitFor()
  await page.getByAltText('Bodega La Esquina').waitFor()
  await shot('11-login')
  step('cerrar sesión con confirmación')
} catch (error) {
  await shot('error')
  throw error
} finally {
  await app.close()
  rmSync(data, { recursive: true, force: true })
}
