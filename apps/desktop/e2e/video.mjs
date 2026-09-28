/**
 * Demo video for the landing page: log in, confirm today's rate, create a
 * product and sell it, ending on the PDF receipt. Runs over the demo store
 * (scripts/seed-demo.mjs) and needs ffmpeg on the PATH.
 * Output: apps/site/static/video/demo.mp4, demo.webm and demo.jpg (poster).
 */
import { _electron as electron } from 'playwright-core'
import electronPath from 'electron'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, '..', 'site', 'static', 'video')
const data = mkdtempSync(join(tmpdir(), 'bllt-video-'))
const userData = join(data, 'userData')
const raw = join(data, 'raw')
mkdirSync(out, { recursive: true })

const W = 1366
const H = 820
// The receipt viewer is shown as a window over the last frame of the app.
const VIEWER = { width: 760, height: H }
const RATE = 855.6625

const launch = async (recordVideo) => {
  const app = await electron.launch({
    args: [root],
    cwd: root,
    env: { ...process.env, BLLT_USER_DATA_DIR: userData, BLLT_DOCUMENTS_DIR: data },
    ...(recordVideo && { recordVideo: { dir: raw, size: { width: W, height: H } } })
  })
  const page = await app.firstWindow()
  // Resize the window itself: viewport emulation would crop the recording.
  await app.evaluate(
    ({ BrowserWindow }, [w, h]) => BrowserWindow.getAllWindows()[0].setContentSize(w, h),
    [W, H]
  )
  // Public API quotes come from a stub, so the suggested rate is the same on every run.
  await app.evaluate(({ net }, promedio) => {
    net.fetch = async () =>
      new Response(JSON.stringify({ promedio, fechaActualizacion: new Date().toISOString() }), {
        headers: { 'content-type': 'application/json' }
      })
  }, RATE)
  return { app, page }
}

// Recordings have no pointer: draw one that follows the mouse and pulses on click.
const showCursor = (page) =>
  page.evaluate(() => {
    if (document.getElementById('demo-cursor')) return
    const cursor = document.createElement('div')
    cursor.id = 'demo-cursor'
    cursor.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24"><path d="M5 3l14 8-6.5 1.5L9 19z" fill="#27302F" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>`
    Object.assign(cursor.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      zIndex: '2147483647',
      pointerEvents: 'none',
      transform: 'translate(683px, 600px)',
      filter: 'drop-shadow(0 1px 2px rgb(0 0 0 / .35))'
    })
    document.documentElement.appendChild(cursor)
    addEventListener(
      'mousemove',
      (e) => (cursor.style.transform = `translate(${e.clientX - 5}px, ${e.clientY - 3}px)`),
      true
    )
    addEventListener(
      'mousedown',
      (e) => {
        const ring = document.createElement('div')
        Object.assign(ring.style, {
          position: 'fixed',
          left: `${e.clientX - 18}px`,
          top: `${e.clientY - 18}px`,
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'rgb(27 174 143 / .35)',
          zIndex: '2147483646',
          pointerEvents: 'none'
        })
        document.documentElement.appendChild(ring)
        ring
          .animate(
            [
              { transform: 'scale(.3)', opacity: 1 },
              { transform: 'scale(1.4)', opacity: 0 }
            ],
            { duration: 450, easing: 'ease-out' }
          )
          .finished.then(() => ring.remove())
      },
      true
    )
  })

const pause = (page, ms) => page.waitForTimeout(ms)
let mouse = { x: 683, y: 600 }
const moveTo = async (page, locator) => {
  await locator.waitFor()
  // Dialogs zoom in: measure once they stop moving.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => {}))
    )
  )
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  const to = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  const steps = Math.max(8, Math.round(Math.hypot(to.x - mouse.x, to.y - mouse.y) / 25))
  await page.mouse.move(to.x, to.y, { steps })
  mouse = to
}
const click = async (page, locator) => {
  await showCursor(page)
  await moveTo(page, locator)
  await pause(page, 150)
  await locator.click()
}
const type = async (page, locator, text) => {
  await click(page, locator)
  await locator.pressSequentially(text, { delay: 55 })
}
const expect = async (locator, count) => {
  for (let t = 0; (await locator.count()) !== count; t++) {
    if (t > 50) throw new Error(`Se esperaban ${count} elementos`)
    await new Promise((r) => setTimeout(r, 100))
  }
}
const step = (label) => console.log(`✓ ${label}`)

let app
try {
  // Off camera: first run with the owner, then the demo store without today's rate.
  let page
  ;({ app, page } = await launch(false))
  await page.getByLabel('Nombre del negocio').fill('Bodega La Esquina')
  await page.getByLabel('RIF (opcional)').fill('J-12345678-9')
  await page.locator('#logo').setInputFiles(join(root, 'build', 'icon.png'))
  await page.getByAltText('Logo del negocio').waitFor()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByLabel('Usuario').fill('dueno')
  await page.getByLabel('Contraseña', { exact: true }).fill('secreto123')
  await page.getByLabel('Repite la contraseña').fill('secreto123')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Configurar después' }).click()
  await page.getByRole('checkbox').click()
  await page.getByRole('button', { name: 'Entrar a Bllt' }).click()
  await page.getByText('Confirma la tasa de hoy').waitFor()
  await app.close()
  const db = join(userData, 'bllt.db')
  const node = { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, cwd: root }
  execFileSync(electronPath, [join(root, 'scripts', 'seed-demo.mjs'), '--db', db], {
    ...node,
    stdio: 'inherit'
  })
  execFileSync(
    electronPath,
    [
      '-e',
      `const db = require('better-sqlite3')(process.argv[1]);
       db.prepare('delete from exchange_rates where date = (select max(date) from exchange_rates)').run()`,
      db
    ],
    node
  )
  step('tienda de demo')

  ;({ app, page } = await launch(true))
  await showCursor(page)
  await page.getByLabel('Usuario').waitFor()
  await pause(page, 1200)

  await type(page, page.getByLabel('Usuario'), 'dueno')
  await type(page, page.getByLabel('Contraseña'), 'secreto123')
  await pause(page, 300)
  await click(page, page.getByRole('button', { name: 'Entrar' }))
  step('inicio de sesión')

  await page.getByText('Tasa sugerida').waitFor()
  await showCursor(page)
  await pause(page, 1800)
  await click(page, page.getByRole('button', { name: 'Confirmar tasa' }))
  await page.getByRole('heading', { name: 'Inicio' }).waitFor()
  await showCursor(page)
  await pause(page, 1800)
  const homeAt = Date.now() - 300
  step('tasa del día')

  await click(page, page.getByRole('button', { name: 'Productos' }))
  await page.getByRole('cell', { name: 'Arroz blanco 1 kg' }).waitFor()
  await pause(page, 900)
  await click(page, page.getByRole('button', { name: 'Nuevo producto' }))
  const dialog = page.getByRole('dialog')
  await dialog.getByText('Nuevo producto').waitFor()
  await pause(page, 400)
  await type(page, dialog.getByLabel('Código'), '7591002000417')
  await dialog.getByLabel('Cantidad inicial').fill('')
  await type(page, dialog.getByLabel('Cantidad inicial'), '24')
  await type(page, dialog.getByLabel('Nombre'), 'Galletas María 200 g')
  await type(page, dialog.getByLabel('Precio de compra'), '0,85')
  await type(page, dialog.getByLabel('Precio de venta'), '1,40')
  await pause(page, 900)
  await click(page, dialog.getByRole('button', { name: 'Guardar' }))
  await dialog.waitFor({ state: 'detached' })
  await pause(page, 1500)
  step('producto')

  await click(page, page.getByRole('button', { name: 'Nueva venta' }).first())
  const search = page.getByPlaceholder('Código o nombre del producto')
  await search.waitFor()
  await pause(page, 500)
  // Enter adds the product when the search leaves a single match.
  for (const [i, name] of ['Galletas María', 'Harina de maíz', 'Café molido'].entries()) {
    await type(page, search, name)
    await pause(page, 600)
    await search.press('Enter')
    await expect(page.getByRole('button', { name: 'Quitar' }), i + 1)
    await pause(page, 450)
  }
  // Two packs of the new product.
  await click(page, page.getByRole('button', { name: 'Más' }).first())
  await pause(page, 700)
  // A regular customer, so the receipt carries their name.
  await click(page, page.getByRole('button', { name: 'Venta anónima' }))
  await type(page, page.getByPlaceholder('Buscar por nombre o cédula…'), 'Carmen')
  const customer = page.getByRole('option', { name: /Comedor Doña Carmen/ })
  await customer.waitFor()
  await pause(page, 400)
  await click(page, customer)
  await pause(page, 1000)
  await click(page, page.getByRole('button', { name: 'Registrar venta' }))
  await page.getByRole('dialog').getByText('Resumen de venta').waitFor()
  await pause(page, 1800)
  await click(page, page.getByRole('button', { name: 'Confirmar venta' }))
  await page
    .getByRole('dialog')
    .getByText(/^Venta #\d+$/)
    .waitFor()
  await pause(page, 1600)
  await click(page, page.getByRole('button', { name: 'Imprimir' }))
  const printedAt = Date.now()
  step('venta')

  // The PDF is rendered in a hidden window first; the viewer is the one on bllt-receipt://.
  let viewer
  while (!viewer) {
    viewer = app.windows().find((w) => w.url().startsWith('bllt-receipt:'))
    if (!viewer) await page.waitForTimeout(100)
  }
  await viewer.setViewportSize(VIEWER)
  await viewer.waitForLoadState()
  await viewer.waitForTimeout(2500)
  const viewerReady = Date.now()
  await viewer.waitForTimeout(3500)
  const mainVideo = await page.video().path()
  const viewerVideo = await viewer.video().path()
  const closedAt = Date.now()
  await app.close()
  app = undefined
  step('comprobante')

  // App until the click on Imprimir, then the viewer over its last frame.
  // The recording starts before any of our clocks: count back from its end.
  const length = (video) =>
    Number(
      execFileSync('ffprobe', [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'csv=p=0',
        video
      ])
    )
  const duration = length(mainVideo)
  const skip = (length(viewerVideo) - (closedAt - viewerReady) / 1000).toFixed(2)
  const at = (time) => duration - (closedAt - time) / 1000
  const cut = (at(printedAt) + 0.6).toFixed(2)
  const x = Math.round((W - VIEWER.width) / 2)
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-loglevel',
      'error',
      '-i',
      mainVideo,
      '-ss',
      skip,
      '-i',
      viewerVideo,
      '-filter_complex',
      [
        `[0:v]trim=end=${cut},setpts=PTS-STARTPTS,fps=25[app]`,
        `[app]split[a1][a2]`,
        `[a2]trim=start=${(cut - 0.05).toFixed(2)},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=6,trim=duration=5,colorchannelmixer=rr=.55:gg=.55:bb=.55[bg]`,
        `[1:v]crop=${VIEWER.width}:${VIEWER.height}:0:0,fps=25,trim=duration=5,setpts=PTS-STARTPTS,format=yuva420p,fade=t=in:st=0:d=0.3:alpha=1[pdf]`,
        `[bg][pdf]overlay=${x}:0:shortest=1[end]`,
        `[a1][end]concat=n=2:v=1:a=0,format=yuv420p[v]`
      ].join(';'),
      '-map',
      '[v]',
      join(data, 'demo.mkv')
    ].map(String)
  )
  const master = join(data, 'demo.mkv')
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-i',
    master,
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '24',
    '-movflags',
    '+faststart',
    '-an',
    join(out, 'demo.mp4')
  ])
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-i',
    master,
    '-c:v',
    'libvpx-vp9',
    '-b:v',
    '0',
    '-crf',
    '38',
    '-row-mt',
    '1',
    '-an',
    join(out, 'demo.webm')
  ])
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-ss',
    at(homeAt).toFixed(2),
    '-i',
    master,
    '-frames:v',
    '1',
    '-q:v',
    '3',
    join(out, 'demo.jpg')
  ])
  step(`video en ${out}`)
} catch (error) {
  if (app) await app.windows()[0]?.screenshot({ path: join(data, 'error.png') })
  console.error(`Captura del error en ${join(data, 'error.png')}`)
  throw error
} finally {
  await app?.close()
}
rmSync(data, { recursive: true, force: true })
