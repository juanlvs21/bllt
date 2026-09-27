/**
 * Fills a Bllt database with demo data: products, customers, daily rates and
 * ~3 months of sales. Meant for showing the app to prospective clients.
 *
 *   pnpm --filter @bllt/desktop seed:demo [--db <file>] [--days 90] [--seed 42] [--reset] [--force]
 *
 * Runs under Electron as Node (ELECTRON_RUN_AS_NODE) because better-sqlite3 is
 * built for Electron's ABI. Close Bllt first, and open it once beforehand so
 * the owner user exists: sales need a user.
 *
 * Nothing goes to the outbox, so demo data never syncs to the cloud.
 * The database is copied next to itself before any write.
 */
import Database from 'better-sqlite3'
import { copyFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { parseArgs } from 'node:util'

const { values: args } = parseArgs({
  options: {
    db: { type: 'string' },
    days: { type: 'string', default: '90' },
    seed: { type: 'string', default: '42' },
    reset: { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false }
  }
})

if (args.help) {
  console.log(`Uso: pnpm --filter @bllt/desktop seed:demo [opciones]

  --db <archivo>  Base de datos (por defecto la de Bllt en este equipo)
  --days <n>      Días de ventas hacia atrás (90)
  --seed <n>      Semilla: la misma semilla da los mismos datos (42)
  --reset         Borra productos, clientes, tasas y ventas antes de sembrar
  --force         Siembra aunque ya haya productos o ventas`)
  process.exit(0)
}

// --- Constants mirrored from @bllt/shared (plain .mjs can't import its TS) ---

const RATE_SCALE = 10_000
const OFFSET_MS = -4 * 60 * 60 * 1000 // Venezuela, UTC-4
const DAY_MS = 24 * 60 * 60 * 1000

const businessDate = (at) => new Date(at.getTime() + OFFSET_MS).toISOString().slice(0, 10)
/** UTC instant for a business date plus hours (decimal) of local time. */
const businessInstant = (date, hours) =>
  new Date(Date.parse(`${date}T00:00:00.000Z`) - OFFSET_MS + hours * 60 * 60 * 1000)
const addDays = (date, n) =>
  new Date(Date.parse(`${date}T00:00:00.000Z`) + n * DAY_MS).toISOString().slice(0, 10)

// --- Deterministic randomness ---

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(Number(args.seed))
const int = (min, max) => min + Math.floor(rand() * (max - min + 1))
const pick = (list) => list[Math.floor(rand() * list.length)]
/** Picks by weight; weights are parallel to the list. */
function weighted(list, weights) {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rand() * total
  for (let i = 0; i < list.length; i++) {
    r -= weights[i]
    if (r <= 0) return list[i]
  }
  return list[list.length - 1]
}

// --- Catalog: a neighborhood "abasto" (name, cost USD, price USD, popularity) ---

const CATALOG = [
  ['Harina de maíz precocida 1 kg', 0.95, 1.3, 10],
  ['Arroz blanco 1 kg', 1.1, 1.5, 9],
  ['Pasta larga 1 kg', 1.2, 1.65, 8],
  ['Pasta corta 500 g', 0.7, 0.95, 5],
  ['Azúcar refinada 1 kg', 1.15, 1.55, 7],
  ['Café molido 250 g', 2.4, 3.3, 7],
  ['Aceite vegetal 1 L', 2.6, 3.5, 7],
  ['Margarina 500 g', 1.9, 2.6, 5],
  ['Mayonesa 445 g', 2.3, 3.2, 4],
  ['Salsa de tomate 397 g', 1.5, 2.1, 4],
  ['Caraotas negras 500 g', 1.1, 1.55, 6],
  ['Lentejas 500 g', 1.05, 1.45, 3],
  ['Sardinas en lata 170 g', 0.85, 1.25, 6],
  ['Atún en lata 140 g', 1.4, 1.95, 4],
  ['Leche en polvo 400 g', 4.2, 5.6, 5],
  ['Queso blanco duro 1 kg', 4.8, 6.5, 6],
  ['Huevos cartón 30 unid.', 4.5, 6.0, 7],
  ['Mortadela 500 g', 2.1, 2.9, 4],
  ['Pan de sándwich 550 g', 1.8, 2.5, 5],
  ['Galletas de soda 8 paq.', 1.3, 1.85, 4],
  ['Chocolate de taza 145 g', 1.6, 2.2, 2],
  ['Refresco cola 2 L', 1.4, 2.0, 8],
  ['Malta 355 ml', 0.55, 0.85, 7],
  ['Agua mineral 1,5 L', 0.6, 0.9, 6],
  ['Jugo de naranja 1 L', 1.3, 1.8, 3],
  ['Cerveza 355 ml', 0.7, 1.05, 6],
  ['Papel higiénico 4 rollos', 1.6, 2.3, 6],
  ['Jabón de tocador 3 unid.', 1.7, 2.4, 4],
  ['Detergente en polvo 1 kg', 2.5, 3.4, 5],
  ['Cloro 1 L', 0.8, 1.15, 4],
  ['Lavaplatos en crema 500 g', 1.2, 1.7, 3],
  ['Crema dental 100 ml', 1.4, 2.0, 3],
  ['Champú 400 ml', 3.1, 4.3, 2],
  ['Desodorante roll-on', 2.2, 3.1, 2],
  ['Pañales talla G 30 unid.', 8.5, 11.5, 2],
  ['Toallas sanitarias 10 unid.', 1.5, 2.1, 2],
  ['Velas 6 unid.', 1.0, 1.5, 1],
  ['Fósforos caja 10 unid.', 0.5, 0.8, 1],
  ['Bombona de gas 10 kg (recarga)', 4.0, 5.5, 2],
  ['Avena en hojuelas 400 g', 1.3, 1.8, 2]
]

const FIRST_NAMES = [
  'María',
  'José',
  'Luis',
  'Carmen',
  'Ana',
  'Carlos',
  'Rosa',
  'Jesús',
  'Yelitza',
  'Pedro',
  'Luisa',
  'Miguel',
  'Daniela',
  'Jorge',
  'Yusmary',
  'Andrés',
  'Gabriela',
  'Rafael',
  'Oriana',
  'Francisco',
  'Mariela',
  'Antonio',
  'Carolina',
  'Víctor',
  'Rosmary',
  'Alejandro',
  'Elena',
  'Ramón',
  'Karina',
  'Héctor'
]
const LAST_NAMES = [
  'González',
  'Rodríguez',
  'Pérez',
  'Hernández',
  'García',
  'Martínez',
  'López',
  'Sánchez',
  'Ramírez',
  'Díaz',
  'Torres',
  'Rojas',
  'Moreno',
  'Castillo',
  'Mendoza',
  'Rivas',
  'Guzmán',
  'Silva',
  'Blanco',
  'Suárez',
  'Contreras',
  'Bravo',
  'Colmenares',
  'Villarroel',
  'Briceño'
]
const BUSINESSES = [
  'Panadería La Esquina',
  'Inversiones El Samán C.A.',
  'Comedor Doña Carmen',
  'Arepera Los Andes',
  'Bodega Mi Barrio'
]
const PHONE_PREFIXES = ['0412', '0414', '0416', '0424', '0426']

// --- Database ---

function defaultDbPath() {
  const home = homedir()
  if (process.platform === 'darwin') return join(home, 'Library/Application Support/Bllt/bllt.db')
  if (process.platform === 'win32')
    return join(process.env.APPDATA ?? join(home, 'AppData/Roaming'), 'Bllt/bllt.db')
  return join(process.env.XDG_CONFIG_HOME ?? join(home, '.config'), 'Bllt/bllt.db')
}

const file = args.db ?? defaultDbPath()
if (!existsSync(file)) {
  console.error(`No existe ${file}. Abre Bllt una vez y crea el usuario dueño primero.`)
  process.exit(1)
}

const db = new Database(file)
db.pragma('busy_timeout = 5000')

const tableExists = db
  .prepare("select 1 from sqlite_master where type = 'table' and name = 'sales'")
  .get()
if (!tableExists) {
  console.error('La base de datos no tiene las tablas de Bllt. Abre la app una vez primero.')
  process.exit(1)
}

const users = db
  .prepare('select id, username, role from users where active = 1 order by created_at')
  .all()
const admin = users.find((u) => u.role === 'ADMIN')
if (!admin) {
  console.error('No hay un usuario administrador activo. Abre Bllt y completa el primer arranque.')
  process.exit(1)
}

const count = (table) => db.prepare(`select count(*) n from ${table}`).get().n
if (!args.reset && !args.force && (count('products') > 0 || count('sales') > 0)) {
  console.error(
    'Esta base ya tiene productos o ventas. Usa --reset para reemplazarlos o --force para sumar.'
  )
  process.exit(1)
}

// Fold the WAL into the main file so the copy is complete.
db.pragma('wal_checkpoint(TRUNCATE)')
const backup = `${file}.antes-demo-${new Date().toISOString().replace(/[:.]/g, '-')}`
copyFileSync(file, backup)

// --- Generation ---

const now = new Date()
const today = businessDate(now)
const days = Math.max(1, Number(args.days))
const firstDay = addDays(today, -days + 1)
const nowIso = now.toISOString()

// Products: prices went up ~7% about five weeks ago, so older lines show the old price.
const priceChangeDay = addDays(today, -35)
const products = CATALOG.map(([name, cost, price, popularity], i) => ({
  id: randomUUID(),
  code: `759${String(1000000000 + i * 7919 + int(0, 7000)).slice(0, 10)}`,
  name,
  costCents: Math.round(cost * 100),
  priceCents: Math.round(price * 100),
  oldCostCents: Math.round(cost * 100 * 0.93),
  oldPriceCents: Math.round(price * 100 * 0.93),
  popularity,
  stock: 0
}))
// Final stock: most shelves healthy, a few running low or out to show alerts.
for (const p of products) p.stock = int(12, 80)
for (const p of [...products].sort(() => rand() - 0.5).slice(0, 5)) p.stock = int(0, 4)

// Customers: frequent buyers get more weight. Some have no cédula or phone.
const usedDocs = new Set()
const customers = []
for (let i = 0; i < 38; i++) {
  const business = i < BUSINESSES.length
  let document = null
  if (business) document = `J-${int(40000000, 50999999)}-${int(0, 9)}`
  else if (rand() < 0.85) {
    do document = `V-${int(6000000, 32000000)}`
    while (usedDocs.has(document))
  }
  if (document) usedDocs.add(document)
  const createdAt = businessInstant(addDays(firstDay, -int(0, 60)), 9 + rand() * 8).toISOString()
  customers.push({
    id: randomUUID(),
    name: business ? BUSINESSES[i] : `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    document,
    phone: rand() < 0.8 ? `${pick(PHONE_PREFIXES)}-${int(1000000, 9999999)}` : null,
    createdAt,
    updatedAt: createdAt,
    weight: business ? 6 : rand() < 0.25 ? 4 : 1
  })
}

// Daily rates: the bolívar slides from ~620 to ~855 Bs/USD with daily noise.
const rates = new Map()
const startRate = 620
const endRate = 855.6625
for (let d = 0; d < days; d++) {
  const date = addDays(firstDay, d)
  const t = days === 1 ? 1 : d / (days - 1)
  const trend = startRate * Math.pow(endRate / startRate, t)
  const value = d === days - 1 ? endRate : trend * (1 + (rand() - 0.5) * 0.006)
  rates.set(date, Math.round(value * RATE_SCALE))
}

// Sales: busier on Fridays/Saturdays, quieter on Sundays, growing ~35% over the period.
const sales = []
const items = []
const productWeights = products.map((p) => p.popularity)
const customerWeights = customers.map((c) => c.weight)
const sellers = users.length > 0 ? users : [admin]
const currentHour = (now.getTime() + OFFSET_MS - Date.parse(`${today}T00:00:00.000Z`)) / 3_600_000

for (let d = 0; d < days; d++) {
  const date = addDays(firstDay, d)
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay()
  const dayFactor = [0.55, 0.9, 0.95, 1, 1.05, 1.3, 1.4][weekday]
  const growth = 0.8 + 0.35 * (d / Math.max(1, days - 1))
  const target = Math.round(int(14, 22) * dayFactor * growth)
  const closing = date === today ? Math.min(19, currentHour - 0.1) : 19
  if (closing <= 8) continue

  for (let s = 0; s < target; s++) {
    // Two rush hours: mid-morning and late afternoon.
    const hour = rand() < 0.5 ? 8 + rand() * 4 : 15 + rand() * 4
    if (hour >= closing) continue
    const at = businessInstant(date, hour)
    const saleId = randomUUID()
    const lines = new Map()
    const lineCount = weighted([1, 2, 3, 4, 5, 6], [30, 28, 20, 12, 6, 4])
    for (let l = 0; l < lineCount; l++) {
      const p = weighted(products, productWeights)
      lines.set(p, (lines.get(p) ?? 0) + weighted([1, 2, 3, 4, 6], [55, 25, 10, 6, 4]))
    }
    const old = date < priceChangeDay
    let totalCents = 0
    for (const [p, qty] of lines) {
      const priceCents = old ? p.oldPriceCents : p.priceCents
      totalCents += qty * priceCents
      items.push({
        id: randomUUID(),
        saleId,
        productId: p.id,
        productCode: p.code,
        productName: p.name,
        qty,
        priceCents,
        costCents: old ? p.oldCostCents : p.costCents
      })
    }
    const customer = rand() < 0.6 ? weighted(customers, customerWeights) : null
    const createdAt = at.toISOString()
    const voided = rand() < 0.03
    sales.push({
      id: saleId,
      number: 0,
      customerId: customer && customer.createdAt <= createdAt ? customer.id : null,
      userId: pick(sellers).id,
      rate: rates.get(date),
      totalCents,
      status: voided ? 'VOIDED' : 'COMPLETED',
      createdAt,
      voidedAt: voided ? new Date(at.getTime() + int(2, 40) * 60_000).toISOString() : null,
      voidedBy: voided ? admin.id : null
    })
  }
}
sales.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

// --- Write ---

const insertProduct = db.prepare(
  `insert into products (id, code, name, stock, cost_cents, price_cents, active, updated_at)
   values (@id, @code, @name, @stock, @costCents, @priceCents, 1, @updatedAt)`
)
const insertCustomer = db.prepare(
  `insert into customers (id, name, document, phone, created_at, updated_at)
   values (@id, @name, @document, @phone, @createdAt, @updatedAt)`
)
const insertRate = db.prepare(
  `insert into exchange_rates (date, bs_per_usd, source, confirmed_by, confirmed_at)
   values (?, ?, 'PUBLIC_API', ?, ?)
   on conflict(date) do nothing`
)
const insertSale = db.prepare(
  `insert into sales (id, number, customer_id, user_id, rate, total_cents, status, created_at, voided_at, voided_by)
   values (@id, @number, @customerId, @userId, @rate, @totalCents, @status, @createdAt, @voidedAt, @voidedBy)`
)
const insertItem = db.prepare(
  `insert into sale_items (id, sale_id, product_id, product_code, product_name, qty, price_cents, cost_cents)
   values (@id, @saleId, @productId, @productCode, @productName, @qty, @priceCents, @costCents)`
)

db.transaction(() => {
  if (args.reset) {
    for (const table of [
      'sale_items',
      'sales',
      'products',
      'customers',
      'exchange_rates',
      'outbox'
    ])
      db.prepare(`delete from ${table}`).run()
  }
  for (const p of products) insertProduct.run({ ...p, updatedAt: nowIso })
  for (const c of customers) insertCustomer.run(c)
  for (const [date, rate] of rates) {
    const confirmedAt = businessInstant(date, 7.5 + rand()).toISOString()
    insertRate.run(
      date,
      rate,
      admin.id,
      date === today && confirmedAt > nowIso ? nowIso : confirmedAt
    )
  }
  // Existing rates win on conflict: stamp each sale with the rate actually stored for its day.
  const storedRate = db.prepare('select bs_per_usd r from exchange_rates where date = ?')
  let number = db.prepare('select coalesce(max(number), 0) n from sales').get().n
  for (const sale of sales) {
    sale.number = ++number
    sale.rate = storedRate.get(businessDate(new Date(sale.createdAt))).r
    insertSale.run(sale)
  }
  for (const item of items) insertItem.run(item)
})()
db.close()

const completed = sales.filter((s) => s.status === 'COMPLETED')
const revenue = completed.reduce((sum, s) => sum + s.totalCents, 0)
console.log(`✓ Datos de demo en ${file}
  ${products.length} productos, ${customers.length} clientes, ${rates.size} tasas
  ${sales.length} ventas del ${firstDay} al ${today} (${sales.length - completed.length} anuladas)
  Vendido: $${(revenue / 100).toFixed(2)}
  Copia previa: ${backup}`)
