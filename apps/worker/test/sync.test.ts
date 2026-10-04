import {
  DomainError,
  ErrorCode,
  pullResponse,
  type OutboxMessage,
  type PullItem
} from '@bllt/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { deviceService } from '../src/modules/devices/device.service'
import { syncService } from '../src/modules/sync/sync.service'
import { createD1, type TestD1 } from './d1'

let d1: TestD1
beforeEach(() => {
  d1 = createD1()
})

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const A = uuid(1)
const B = uuid(2)

async function register(id: string, name: string, series?: string) {
  return deviceService.register(d1, { deviceId: id, name, series })
}

const product = (over: Record<string, unknown> = {}) =>
  ({
    id: uuid(100),
    code: '7591',
    name: 'Harina',
    costCents: 95,
    priceCents: 140,
    active: true,
    updatedAt: '2026-10-01T10:00:00.000Z',
    updatedByDevice: A,
    ...over
  }) as never

const msg = (entity: string, payload: unknown): OutboxMessage =>
  ({ id: crypto.randomUUID(), entity, payload }) as OutboxMessage

const sale = (over: Record<string, unknown> = {}) => ({
  id: uuid(200),
  series: 'A',
  number: 1,
  customerId: null,
  userId: uuid(300),
  rate: 8556625,
  totalCents: 280,
  status: 'COMPLETED',
  createdAt: '2026-10-01T11:00:00.000Z',
  voidedAt: null,
  voidedBy: null,
  items: [
    {
      id: uuid(201),
      saleId: uuid(200),
      productId: uuid(100),
      productCode: '7591',
      productName: 'Harina',
      qty: 2,
      priceCents: 140,
      costCents: 95
    }
  ],
  ...over
})

const pull = (device: string, since = 0, limit = 50, includeOwn = false) =>
  syncService.pull(d1, device, { since, limit, includeOwn })

const pushed = (device: string, ...messages: OutboxMessage[]) =>
  syncService.push(d1, device, { messages })

describe('devices', () => {
  it('gives the original PC the series it asks for and the next PC the next free one', async () => {
    const a = await register(A, 'Caja 1', 'A')
    const b = await register(B, 'Caja 2')
    expect([a.series, b.series]).toEqual(['A', 'B'])
  })

  it('refuses a series another PC already has', async () => {
    await register(A, 'Caja 1', 'A')
    await expect(register(B, 'Caja 2', 'A')).rejects.toMatchObject({ code: ErrorCode.CONFLICT })
  })

  it('keeps the series when a PC registers again, with a new token that replaces the old one', async () => {
    const first = await register(A, 'Caja 1', 'A')
    const second = await register(A, 'Caja 1')
    expect(second.series).toBe('A')
    expect(await deviceService.authenticate(d1, first.token)).toBeNull()
    expect((await deviceService.authenticate(d1, second.token))?.id).toBe(A)
  })

  it('stores only the hash of the token and rejects a revoked device', async () => {
    const a = await register(A, 'Caja 1', 'A')
    await register(B, 'Caja 2')
    const row = d1.sqlite.prepare('select token_hash from devices where id = ?').get(A) as {
      token_hash: string
    }
    expect(row.token_hash).not.toContain(a.token)
    expect(await deviceService.authenticate(d1, a.token)).not.toBeNull()
    await deviceService.revoke(d1, A, B)
    expect(await deviceService.authenticate(d1, a.token)).toBeNull()
  })

  it('does not let a PC revoke itself', async () => {
    await register(A, 'Caja 1', 'A')
    await expect(deviceService.revoke(d1, A, A)).rejects.toBeInstanceOf(DomainError)
  })
})

describe('push: newest edit wins', () => {
  it('keeps the newer edit whatever the order they arrive in', async () => {
    await pushed(
      A,
      msg('PRODUCT', product({ priceCents: 200, updatedAt: '2026-10-01T12:00:00.000Z' }))
    )
    await pushed(
      B,
      msg(
        'PRODUCT',
        product({ priceCents: 150, updatedAt: '2026-10-01T11:00:00.000Z', updatedByDevice: B })
      )
    )
    const row = d1.sqlite.prepare('select price_cents from products').get() as {
      price_cents: number
    }
    expect(row.price_cents).toBe(200)
  })

  it('breaks a tie with the greater device id', async () => {
    const at = '2026-10-01T12:00:00.000Z'
    await pushed(B, msg('PRODUCT', product({ priceCents: 300, updatedAt: at, updatedByDevice: B })))
    await pushed(A, msg('PRODUCT', product({ priceCents: 100, updatedAt: at, updatedByDevice: A })))
    const row = d1.sqlite.prepare('select price_cents from products').get() as {
      price_cents: number
    }
    expect(row.price_cents).toBe(300)
  })

  it('pulls a timestamp from the far future back to now', async () => {
    await pushed(A, msg('PRODUCT', product({ updatedAt: '2099-01-01T00:00:00.000Z' })))
    const row = d1.sqlite.prepare('select updated_at from products').get() as { updated_at: string }
    expect(row.updated_at < '2030').toBe(true)
  })
})

describe('push: sales and stock', () => {
  it('voiding wins over a completed copy, in either order', async () => {
    await pushed(
      A,
      msg(
        'SALE',
        sale({ status: 'VOIDED', voidedAt: '2026-10-01T12:00:00.000Z', voidedBy: uuid(300) })
      )
    )
    await pushed(B, msg('SALE', sale()))
    const row = d1.sqlite.prepare('select status from sales').get() as { status: string }
    expect(row.status).toBe('VOIDED')

    d1 = createD1()
    await pushed(B, msg('SALE', sale()))
    await pushed(
      A,
      msg(
        'SALE',
        sale({ status: 'VOIDED', voidedAt: '2026-10-01T12:00:00.000Z', voidedBy: uuid(300) })
      )
    )
    expect((d1.sqlite.prepare('select status from sales').get() as { status: string }).status).toBe(
      'VOIDED'
    )
  })

  it('never edits a sale otherwise, and does not duplicate its lines', async () => {
    await pushed(A, msg('SALE', sale()))
    await pushed(B, msg('SALE', sale({ totalCents: 999 })))
    const row = d1.sqlite.prepare('select total_cents from sales').get() as { total_cents: number }
    expect(row.total_cents).toBe(280)
    expect((d1.sqlite.prepare('select count(*) n from sale_items').get() as { n: number }).n).toBe(
      1
    )
  })

  it('ignores a stock movement it already has', async () => {
    const movement = {
      id: uuid(400),
      productId: uuid(100),
      delta: -2,
      reason: 'SALE',
      refId: uuid(201),
      deviceId: A,
      createdAt: '2026-10-01T11:00:00.000Z'
    }
    await pushed(A, msg('STOCK_MOVEMENT', movement))
    await pushed(B, msg('STOCK_MOVEMENT', movement))
    expect(
      (d1.sqlite.prepare('select count(*) n from stock_movements').get() as { n: number }).n
    ).toBe(1)
  })

  it('is idempotent: sending the same batch twice changes nothing', async () => {
    const batch = [msg('PRODUCT', product()), msg('SALE', sale())]
    await pushed(A, ...batch)
    await pushed(A, ...batch)
    expect((d1.sqlite.prepare('select count(*) n from products').get() as { n: number }).n).toBe(1)
    expect((d1.sqlite.prepare('select count(*) n from sale_items').get() as { n: number }).n).toBe(
      1
    )
  })
})

describe('pull', () => {
  it('sends other PCs what changed and never the requester its own changes', async () => {
    await pushed(A, msg('PRODUCT', product()))
    expect((await pull(A)).items).toHaveLength(0)
    const forB = await pull(B)
    expect(forB.items.map((i) => i.entity)).toEqual(['PRODUCT'])
    // The stock is not part of a product: each PC counts its own movements.
    expect(forB.items[0]!.payload).not.toHaveProperty('stock')
  })

  it('sends a row changed several times once, in its current state', async () => {
    await pushed(A, msg('PRODUCT', product({ priceCents: 100 })))
    await pushed(
      A,
      msg('PRODUCT', product({ priceCents: 120, updatedAt: '2026-10-01T10:05:00.000Z' }))
    )
    const { items } = await pull(B)
    expect(items).toHaveLength(1)
    expect((items[0]!.payload as { priceCents: number }).priceCents).toBe(120)
  })

  it('pages with a server cursor and reports what is left', async () => {
    for (let i = 0; i < 5; i++) {
      await pushed(A, msg('PRODUCT', product({ id: uuid(500 + i), code: `C${i}` })))
    }
    const first = await pull(B, 0, 2)
    expect(first).toMatchObject({ hasMore: true, remaining: 3 })
    const second = await pull(B, first.nextSeq, 2)
    expect(second).toMatchObject({ hasMore: true, remaining: 1 })
    const third = await pull(B, second.nextSeq, 2)
    expect(third).toMatchObject({ hasMore: false, remaining: 0 })
    const ids = [...first.items, ...second.items, ...third.items].map(
      (i) => (i.payload as { id: string }).id
    )
    expect(new Set(ids).size).toBe(5)
    expect(() => pullResponse.parse(first)).not.toThrow()
  })

  it('skips past its own trailing changes so they are not scanned again', async () => {
    await pushed(B, msg('PRODUCT', product()))
    const first = await pull(B, 0)
    expect(first.items).toHaveLength(0)
    expect(first.nextSeq).toBeGreaterThan(0)
  })

  it('returns a PC its own changes when asked (after restoring a backup)', async () => {
    await pushed(A, msg('PRODUCT', product()))
    expect((await pull(A, 0, 50, true)).items).toHaveLength(1)
  })

  it('carries a sale with its lines, and the rate by date', async () => {
    await pushed(
      A,
      msg('SALE', sale()),
      msg('EXCHANGE_RATE', {
        date: '2026-10-01',
        bsPerUsd: 8556625,
        source: 'MANUAL',
        confirmedBy: uuid(300),
        confirmedAt: '2026-10-01T09:00:00.000Z',
        updatedByDevice: A
      })
    )
    const { items } = await pull(B)
    const byEntity = Object.fromEntries(items.map((i: PullItem) => [i.entity, i.payload]))
    expect((byEntity.SALE as { items: unknown[] }).items).toHaveLength(1)
    expect((byEntity.EXCHANGE_RATE as { date: string }).date).toBe('2026-10-01')
  })

  it('does not hand out rate decisions or the business name: those are only for the Worker', async () => {
    await pushed(A, msg('BUSINESS', { name: 'Bodega' }))
    expect((await pull(B)).items).toHaveLength(0)
  })
})
