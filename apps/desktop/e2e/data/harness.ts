/**
 * Data layer checks that need the real code and a real SQLite, run under Electron-as-Node
 * (better-sqlite3 is built for Electron). See e2e/data.mjs.
 *
 * 1. An installation from before the sync between PCs is migrated without losing anything.
 * 2. Changes coming from another PC are applied the way the sync rules say.
 */
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { businessDate, nowIso, SaleStatus, type PullItem } from '@bllt/shared'
import { prepareDatabase } from '../../src/main/core/migrate'
import { openDatabase, rawDb, closeDatabase } from '../../src/main/core/db'

const migrations = join(__dirname, '../../drizzle')
let failures = 0
const check = (ok: boolean, label: string, extra = '') => {
  if (ok) console.log(`  ✓ ${label}`)
  else {
    failures++
    console.log(`  ✗ ${label} ${extra}`)
  }
}
const eq = <T>(actual: T, expected: T, label: string) =>
  check(
    JSON.stringify(actual) === JSON.stringify(expected),
    label,
    `(${JSON.stringify(actual)} ≠ ${JSON.stringify(expected)})`
  )

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const root = mkdtempSync(join(tmpdir(), 'bllt-data-'))

// ---------------------------------------------------------------------------------------------
console.log('1. Migración de una instalación anterior')
{
  // The schema as it was in v0.1.4: only the first two migrations.
  const old = join(root, 'old-migrations')
  cpSync(migrations, old, { recursive: true })
  const journalPath = join(old, 'meta', '_journal.json')
  const journal = JSON.parse(readFileSync(journalPath, 'utf8'))
  journal.entries = journal.entries.slice(0, 2)
  writeFileSync(journalPath, JSON.stringify(journal))

  const file = join(root, 'legacy.db')
  const sqlite = new Database(file)
  migrate(drizzle(sqlite), { migrationsFolder: old })
  const backups = join(root, 'backups')
  const now = '2026-09-01T10:00:00.000Z'
  const hash = JSON.stringify({ hash: 'h', salt: 's', iterations: 1 })
  for (const [k, v] of [
    ['business_name', 'Bodega'],
    ['backup_dir', backups],
    ['recovery_code_hash', hash]
  ])
    sqlite.prepare('insert into settings (key, value) values (?, ?)').run(k, v)
  const user = sqlite.prepare(
    'insert into users (id, username, password_hash, salt, iterations, role, active, created_at, updated_at) values (?, ?, ?, ?, ?, ?, 1, ?, ?)'
  )
  user.run(uuid(1), 'dueno', 'x', 'x', 1, 'ADMIN', now, now)
  user.run(uuid(2), 'cajera', 'x', 'x', 1, 'EMPLOYEE', now, now)
  const product = sqlite.prepare(
    'insert into products (id, code, name, stock, cost_cents, price_cents, active, updated_at) values (?, ?, ?, ?, ?, ?, 1, ?)'
  )
  product.run(uuid(10), '7591', 'Harina', 24, 95, 140, now)
  product.run(uuid(11), '7592', 'Arroz', 0, 80, 120, now)
  product.run(uuid(12), '7593', 'Aceite', -3, 300, 450, now)
  sqlite
    .prepare('insert into customers (id, name, created_at, updated_at) values (?, ?, ?, ?)')
    .run(uuid(20), 'Ana', now, now)
  sqlite
    .prepare(
      'insert into exchange_rates (date, bs_per_usd, source, confirmed_by, confirmed_at) values (?, ?, ?, ?, ?)'
    )
    .run('2026-09-01', 8556625, 'MANUAL', uuid(1), now)
  const sale = sqlite.prepare(
    'insert into sales (id, number, customer_id, user_id, rate, total_cents, status, created_at) values (?, ?, ?, ?, ?, ?, ?, ?)'
  )
  sale.run(uuid(30), 1, null, uuid(2), 8556625, 280, 'COMPLETED', now)
  sale.run(uuid(31), 2, uuid(20), uuid(2), 8556625, 450, 'VOIDED', now)
  const item = sqlite.prepare(
    'insert into sale_items (id, sale_id, product_id, product_code, product_name, qty, price_cents, cost_cents) values (?, ?, ?, ?, ?, ?, ?, ?)'
  )
  item.run(uuid(40), uuid(30), uuid(10), '7591', 'Harina', 2, 140, 95)
  item.run(uuid(41), uuid(31), uuid(12), '7593', 'Aceite', 1, 450, 300)
  for (let i = 0; i < 4; i++)
    sqlite
      .prepare(
        'insert into outbox (id, entity, entity_id, payload, created_at) values (?, ?, ?, ?, ?)'
      )
      .run(uuid(50 + i), 'PRODUCT', uuid(10), '{"old":true}', now)

  const before = {
    sales: sqlite.prepare('select count(*) n, sum(total_cents) t from sales').get(),
    profit: sqlite
      .prepare(
        "select sum(i.qty * (i.price_cents - i.cost_cents)) p from sale_items i join sales s on s.id = i.sale_id where s.status = 'COMPLETED'"
      )
      .get()
  }

  prepareDatabase(
    sqlite,
    () => migrate(drizzle(sqlite), { migrationsFolder: migrations }),
    migrations
  )

  const one = (sql: string) => sqlite.prepare(sql).get() as Record<string, number>
  eq(
    one('select count(*) n, sum(total_cents) t from sales'),
    before.sales as never,
    'ventas y total iguales'
  )
  eq(
    one(
      "select sum(i.qty * (i.price_cents - i.cost_cents)) p from sale_items i join sales s on s.id = i.sale_id where s.status = 'COMPLETED'"
    ),
    before.profit as never,
    'ganancia igual'
  )
  eq(one('select count(*) n from users').n, 2, 'usuarios')
  eq(one('select count(*) n from products').n, 3, 'productos')
  eq(one("select count(*) n from sales where series = 'A'").n, 2, 'todas las ventas en la serie A')
  eq(
    one("select number from sales where id = '" + uuid(31) + "'").number,
    2,
    'los números no cambian'
  )
  eq(
    one(
      'select count(*) n from products p where p.stock <> (select coalesce(sum(delta),0) from stock_movements m where m.product_id = p.id)'
    ).n,
    0,
    'stock = suma de movimientos'
  )
  eq(
    one("select count(*) n from stock_movements where reason = 'INITIAL'").n,
    2,
    'INITIAL solo para stock <> 0'
  )
  eq(
    one("select delta d from stock_movements where product_id = '" + uuid(12) + "'").d,
    -3,
    'el stock negativo también se conserva'
  )
  const ids = sqlite.prepare('select id from stock_movements').all() as { id: string }[]
  check(
    ids.every((r) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(r.id)
    ),
    'UUID v4 con guiones'
  )
  const device = (
    sqlite.prepare("select value from settings where key = 'device_id'").get() as { value: string }
  ).value
  eq(
    one(`select count(*) n from users where updated_by_device = '${device}'`).n,
    2,
    'usuarios con el dispositivo de esta PC'
  )
  eq(
    one("select count(*) n from business_settings where key = 'recovery_code_hash'").n,
    1,
    'el código de recuperación pasó a los datos compartidos'
  )
  eq(one('select count(*) n from outbox_legacy').n, 4, 'la cola vieja se conserva')
  eq(one('select count(*) n from outbox').n, 0, 'la cola nueva empieza vacía')
  const copies = existsSync(backups)
    ? readdirSync(backups).filter((f) => f.startsWith('premigracion-'))
    : []
  eq(copies.length, 1, 'respaldo previo a migrar')
  if (copies[0]) {
    const copy = new Database(join(backups, copies[0]), { readonly: true })
    eq(
      (copy.prepare('select count(*) n from sales').get() as { n: number }).n,
      2,
      'el respaldo tiene las ventas'
    )
    check(
      !copy.prepare("select name from sqlite_master where name = 'stock_movements'").get(),
      'el respaldo es la base anterior, sin tocar'
    )
    copy.close()
  }
  // Uniqueness: codes may repeat, an invoice (series, number) may not.
  sqlite.prepare("update products set code = '7591' where id = ?").run(uuid(11))
  check(true, 'dos productos pueden tener el mismo código')
  let rejected = false
  try {
    sqlite
      .prepare(
        "insert into sales (id, series, number, user_id, rate, total_cents, status, created_at) values (?, 'A', 1, ?, 1, 1, 'COMPLETED', ?)"
      )
      .run(uuid(32), uuid(2), now)
  } catch {
    rejected = true
  }
  check(rejected, 'no se repite (serie, número)')
  sqlite
    .prepare(
      "insert into sales (id, series, number, user_id, rate, total_cents, status, created_at) values (?, 'B', 1, ?, 1, 1, 'COMPLETED', ?)"
    )
    .run(uuid(33), uuid(2), now)
  check(true, 'otra serie puede usar el mismo número')

  // Running it again must not do anything.
  const movements = one('select count(*) n from stock_movements').n
  prepareDatabase(
    sqlite,
    () => migrate(drizzle(sqlite), { migrationsFolder: migrations }),
    migrations
  )
  eq(
    one('select count(*) n from stock_movements').n,
    movements,
    'una segunda apertura no repite el stock inicial'
  )
  sqlite.close()
}

// ---------------------------------------------------------------------------------------------
console.log('2. Una instalación nueva no crea movimientos INITIAL')
{
  const sqlite = new Database(join(root, 'fresh.db'))
  prepareDatabase(
    sqlite,
    () => migrate(drizzle(sqlite), { migrationsFolder: migrations }),
    migrations
  )
  eq(
    (sqlite.prepare('select count(*) n from stock_movements').get() as { n: number }).n,
    0,
    'sin movimientos'
  )
  // Products that arrive later (a PC joining the business) are not converted on the next start.
  sqlite
    .prepare(
      "insert into products (id, code, name, stock, cost_cents, price_cents, active, updated_at) values ('p','C','N',7,1,1,1,'x')"
    )
    .run()
  prepareDatabase(
    sqlite,
    () => migrate(drizzle(sqlite), { migrationsFolder: migrations }),
    migrations
  )
  eq(
    (sqlite.prepare('select count(*) n from stock_movements').get() as { n: number }).n,
    0,
    'ni al volver a abrirla'
  )
  sqlite.close()
}

// ---------------------------------------------------------------------------------------------
async function applyChecks() {
  console.log('3. Cambios que llegan de otra PC')
  process.env['BLLT_TEST_DIR'] = join(root, 'pc-b')
  mkdirSync(process.env['BLLT_TEST_DIR'], { recursive: true })
  openDatabase(join(root, 'pc-b.db'))
  const sqlite = rawDb()
  const { productService } = await import('../../src/main/modules/products/product.service')
  const { saleService } = await import('../../src/main/modules/sales/sale.service')
  const { rateRepository } = await import('../../src/main/modules/rates/rate.repository')
  const { applyService } = await import('../../src/main/modules/sync/apply.service')
  const { deviceService } = await import('../../src/main/modules/devices/device.service')
  const { Role } = await import('@bllt/shared')

  const me = deviceService.id()
  const other = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
  const owner = { id: uuid(1), username: 'dueno', role: Role.ADMIN }
  const n = (sql: string) => (sqlite.prepare(sql).get() as { n: number }).n
  const outbox = () => n('select count(*) n from outbox')
  const stockOf = (id: string) => n(`select stock n from products where id = '${id}'`)
  const batch = (items: unknown[], seq = 1) => applyService.applyBatch(items as PullItem[], seq)

  // A user and a rate to sell with.
  const now = nowIso()
  sqlite
    .prepare(
      'insert into users (id, username, password_hash, salt, iterations, role, active, created_at, updated_at, updated_by_device) values (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)'
    )
    .run(owner.id, 'dueno', 'x', 'x', 1, 'ADMIN', now, now, me)
  rateRepository.upsert({
    date: businessDate(),
    bsPerUsd: 8556625,
    source: 'MANUAL',
    confirmedBy: owner.id,
    confirmedAt: now,
    updatedByDevice: me
  })

  const p = productService.create({
    code: '7591',
    name: 'Harina',
    stock: 10,
    costCents: 95,
    priceCents: 140
  })
  eq(p.stock, 10, 'producto con stock inicial')
  eq(
    n("select count(*) n from stock_movements where reason = 'INITIAL'"),
    1,
    'un movimiento INITIAL'
  )

  const s1 = saleService.create(owner, { customerId: null, items: [{ productId: p.id, qty: 2 }] })
  const s2 = saleService.create(owner, { customerId: null, items: [{ productId: p.id, qty: 1 }] })
  eq([s1.series, s1.number, s2.number], ['A', 1, 2], 'las ventas siguen su serie')
  eq(stockOf(p.id), 7, 'la venta descuenta con movimientos')
  saleService.void(owner, s1.id)
  eq(stockOf(p.id), 9, 'anular devuelve el stock')

  // 3a. Edit conflicts.
  const remoteProduct = (over: Record<string, unknown>) => ({
    seq: 1,
    entity: 'PRODUCT',
    payload: {
      id: p.id,
      code: '7591',
      name: 'Harina PAN',
      costCents: 95,
      priceCents: 150,
      active: true,
      updatedAt: '2099-01-01T00:00:00.000Z',
      updatedByDevice: other,
      ...over
    }
  })
  let before = outbox()
  batch([remoteProduct({})], 5)
  eq(n(`select price_cents n from products where id = '${p.id}'`), 150, 'el cambio más nuevo gana')
  eq(stockOf(p.id), 9, 'el stock no se copia de otra PC')
  eq(outbox(), before, 'lo que baja no entra al outbox')
  eq(
    n("select cast(value as integer) n from settings where key = 'pull_cursor'"),
    5,
    'el cursor se guarda con los cambios'
  )
  batch([remoteProduct({ priceCents: 1, updatedAt: '2000-01-01T00:00:00.000Z' })], 6)
  eq(
    n(`select price_cents n from products where id = '${p.id}'`),
    150,
    'un cambio más viejo se ignora'
  )

  // 3b. Stock from the other PC.
  const movement = (id: string, delta: number, reason = 'SALE') => ({
    seq: 2,
    entity: 'STOCK_MOVEMENT',
    payload: { id, productId: p.id, delta, reason, refId: null, deviceId: other, createdAt: now }
  })
  batch([movement(uuid(900), -4)])
  eq(stockOf(p.id), 5, 'los movimientos de otra PC se suman')
  batch([movement(uuid(900), -4)])
  eq(stockOf(p.id), 5, 'el mismo movimiento dos veces cuenta una')
  // The same sale voided on both PCs returns the stock once.
  const { deterministicId } = await import('../../src/main/utils/id')
  const item = (
    sqlite.prepare('select id from sale_items where sale_id = ?').get(s1.id) as { id: string }
  ).id
  batch([movement(deterministicId(`${item}:VOID`), 2, 'VOID')])
  eq(stockOf(p.id), 5, 'anulada en dos PCs: el stock vuelve una sola vez')

  // 3c. Duplicate codes: the greater id is renamed, on every PC alike.
  before = outbox()
  batch([
    {
      seq: 3,
      entity: 'PRODUCT',
      payload: {
        id: 'ffffffff-0000-4000-8000-000000000001',
        code: '7591',
        name: 'Otra harina',
        costCents: 1,
        priceCents: 2,
        active: true,
        updatedAt: now,
        updatedByDevice: other
      }
    }
  ])
  eq(
    n("select count(*) n from products where code = '7591'"),
    1,
    'un solo producto conserva el código'
  )
  eq(n("select count(*) n from products where code = '7591-2'"), 1, 'el otro pasa a 7591-2')
  eq(
    (sqlite.prepare("select name from products where code = '7591-2'").get() as { name: string })
      .name,
    'Otra harina',
    'se renombra el de id mayor'
  )
  eq(outbox() - before, 1, 'el renombrado se sube como una edición normal')
  eq(
    n("select count(*) n from sync_conflicts where kind = 'DUPLICATE_PRODUCT_CODE'"),
    1,
    'queda un aviso para el admin'
  )
  batch([
    {
      seq: 4,
      entity: 'PRODUCT',
      payload: {
        id: '00000000-0000-4000-8000-000000000001',
        code: '7591',
        name: 'Harina menor',
        costCents: 1,
        priceCents: 2,
        active: true,
        updatedAt: now,
        updatedByDevice: other
      }
    }
  ])
  eq(
    (sqlite.prepare("select name from products where code = '7591'").get() as { name: string })
      .name,
    'Harina menor',
    'si el entrante tiene el id menor, conserva el código'
  )
  eq(n("select count(*) n from products where code like '7591%'"), 3, 'los tres productos existen')

  // 3d. Sales.
  const saleItem = (saleId: string, id: string) => ({
    id,
    saleId,
    productId: p.id,
    productCode: '7591',
    productName: 'Harina',
    qty: 1,
    priceCents: 140,
    costCents: 95
  })
  const remoteSale = (over: Record<string, unknown>) => ({
    seq: 6,
    entity: 'SALE',
    payload: {
      id: uuid(700),
      series: 'B',
      number: 1,
      customerId: null,
      userId: owner.id,
      rate: 8556625,
      totalCents: 140,
      status: 'COMPLETED',
      createdAt: now,
      voidedAt: null,
      voidedBy: null,
      items: [saleItem(uuid(700), uuid(701))],
      ...over
    }
  })
  batch([remoteSale({})])
  eq(
    n("select count(*) n from sales where series = 'B'"),
    1,
    'la venta de la serie B llega con sus líneas'
  )
  eq(
    n("select count(*) n from sale_items where sale_id = '" + uuid(700) + "'"),
    1,
    'con sus líneas'
  )
  batch([remoteSale({ status: 'VOIDED', voidedAt: now, voidedBy: owner.id })])
  eq(
    (sqlite.prepare('select status from sales where id = ?').get(uuid(700)) as { status: string })
      .status,
    SaleStatus.VOIDED,
    'la anulación llega'
  )
  batch([remoteSale({ status: 'COMPLETED', totalCents: 1 })])
  eq(
    (
      sqlite.prepare('select status, total_cents t from sales where id = ?').get(uuid(700)) as {
        status: string
      }
    ).status,
    SaleStatus.VOIDED,
    'una venta anulada no vuelve a completada'
  )
  batch([
    remoteSale({ id: uuid(710), items: [saleItem(uuid(710), uuid(711))], series: 'A', number: 1 })
  ])
  eq(
    n("select count(*) n from sales where series = 'A' and number = 1"),
    1,
    'un número repetido no rompe el sync'
  )
  eq(
    n("select count(*) n from sync_conflicts where kind = 'DUPLICATE_SALE_NUMBER'"),
    1,
    'y queda avisado'
  )

  // 3e. Users.
  const remoteUser = (id: string, username: string, role: string, active: boolean, at: string) => ({
    seq: 7,
    entity: 'USER',
    payload: {
      id,
      username,
      passwordHash: 'x',
      salt: 'x',
      iterations: 1,
      role,
      active,
      createdAt: at,
      updatedAt: at,
      updatedByDevice: other
    }
  })
  batch([remoteUser('ffffffff-0000-4000-8000-0000000000aa', 'Dueno', 'EMPLOYEE', true, now)])
  eq(
    n("select count(*) n from users where lower(username) = 'dueno'"),
    1,
    'dos usuarios con el mismo nombre no rompen el sync'
  )
  eq(
    n("select count(*) n from users where username like 'Dueno-%' or username like 'dueno-%'"),
    1,
    'uno se renombra'
  )
  batch([remoteUser(owner.id, 'dueno', 'ADMIN', false, '2099-01-01T00:00:00.000Z')])
  eq(
    n("select count(*) n from users where role = 'ADMIN' and active = 1"),
    1,
    'nunca se queda sin administrador activo'
  )
  eq(
    n("select count(*) n from sync_conflicts where kind = 'LAST_ADMIN_REACTIVATED'"),
    1,
    'y queda avisado'
  )

  // 3f. Shared settings reach the local ones.
  batch([
    {
      seq: 8,
      entity: 'SETTING',
      payload: {
        key: 'business',
        value: JSON.stringify({ name: 'Bodega Nueva', rif: 'J-1', logo: null }),
        updatedAt: '2099-01-01T00:00:00.000Z',
        updatedByDevice: other
      }
    }
  ])
  eq(
    (
      sqlite.prepare("select value from settings where key = 'business_name'").get() as {
        value: string
      }
    ).value,
    'Bodega Nueva',
    'el nombre del negocio llega'
  )

  closeDatabase()
}

applyChecks()
  .then(() => {
    console.log(failures === 0 ? '\nTodo bien' : `\n${failures} fallos`)
    process.exit(failures === 0 ? 0 : 1)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
