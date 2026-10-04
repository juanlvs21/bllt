import { ConflictKind, nowIso, OutboxEntity, wins, type PullItem, type UserRow } from '@bllt/shared'
import { transaction } from '../../core/db'
import { newId } from '../../utils/id'
import { deviceService } from '../devices/device.service'
import { SettingKey, settingsService } from '../settings/settings.service'
import { applyRepository } from './apply.repository'
import { outboxService } from './outbox.service'

/** Key of the shared setting that carries the business name, RIF and logo. */
export const BUSINESS_SETTING_KEY = 'business'

interface Context {
  /** Products whose movements changed: their cached stock is rebuilt at the end. */
  stockOf: Set<string>
  /** Products that may now share a code with another one. */
  codes: Set<string>
}

function conflict(
  entity: OutboxEntity,
  entityId: string,
  kind: ConflictKind,
  detail: string,
  once = false
): void {
  if (once && applyRepository.openConflict(entityId, kind)) return
  applyRepository.insertConflict({
    id: newId(),
    entity,
    entityId,
    kind,
    detail,
    createdAt: nowIso()
  })
}

/** First free "name-2", "name-3"... */
function freeName(base: string, taken: (candidate: string) => boolean): string {
  let n = 2
  while (taken(`${base}-${n}`)) n++
  return `${base}-${n}`
}

function applyUser(p: Extract<PullItem, { entity: 'USER' }>['payload']): void {
  const current = applyRepository.userById(p.id)
  if (current && !wins(p, current)) return
  const clash = applyRepository.userByUsername(p.username, p.id)
  const incoming: UserRow = { ...p }
  if (!clash) return applyRepository.upsertUser(incoming)
  // The same name on two PCs: the user with the greater id is renamed, on every PC alike.
  const detail = `Dos usuarios se llamaban "${p.username}"; uno pasó a llamarse distinto`
  if (p.id > clash.id) {
    incoming.username = freeName(p.username, (u) => !!applyRepository.userByUsername(u, p.id))
    applyRepository.upsertUser(incoming)
    const renamed = applyRepository.renameUser(p.id, incoming.username, deviceService.stamp())
    outboxService.enqueue(OutboxEntity.USER, renamed.id, renamed)
    conflict(OutboxEntity.USER, p.id, ConflictKind.DUPLICATE_USERNAME, detail)
  } else {
    applyRepository.upsertUser(incoming)
    const name = freeName(clash.username, (u) => !!applyRepository.userByUsername(u, clash.id))
    const renamed = applyRepository.renameUser(clash.id, name, deviceService.stamp())
    outboxService.enqueue(OutboxEntity.USER, renamed.id, renamed)
    conflict(OutboxEntity.USER, clash.id, ConflictKind.DUPLICATE_USERNAME, detail)
  }
}

/** Two products with the same code: the greater id gets CODE-2, the same on every PC. */
function resolveCodes(codes: Iterable<string>): void {
  for (const code of codes) {
    const [, ...losers] = applyRepository.productsByCode(code)
    for (const loser of losers) {
      const next = freeName(loser.code, (c) => applyRepository.productCodeTaken(c))
      const row = applyRepository.renameProduct(loser.id, next, deviceService.stamp())
      const { stock: _stock, ...payload } = row
      outboxService.enqueue(OutboxEntity.PRODUCT, row.id, payload)
      conflict(
        OutboxEntity.PRODUCT,
        row.id,
        ConflictKind.DUPLICATE_PRODUCT_CODE,
        `"${row.name}" tenía el mismo código ${loser.code} que otro producto; ahora es ${next}`
      )
    }
  }
}

function applySale(p: Extract<PullItem, { entity: 'SALE' }>['payload']): void {
  const { items, ...sale } = p
  const current = applyRepository.saleById(p.id)
  if (current) {
    // Sales never change, except that voiding wins over everything.
    if (p.status === 'VOIDED' && current.status !== 'VOIDED') {
      applyRepository.voidSale(p.id, p.voidedAt, p.voidedBy)
    }
    return
  }
  const row = { ...sale }
  const taken = applyRepository.saleWithNumber(p.series, p.number)
  if (taken) {
    // Only after restoring a backup: that number was reused locally. This copy takes a new one.
    row.number = applyRepository.nextNumber(p.series)
    conflict(
      OutboxEntity.SALE,
      p.id,
      ConflictKind.DUPLICATE_SALE_NUMBER,
      `La venta ${p.series}-${p.number} se guardó como ${p.series}-${row.number} porque ese número ya estaba en uso`
    )
  }
  applyRepository.insertSale(row, items)
}

function applyBusinessSetting(value: string): void {
  try {
    const { name, rif, logo } = JSON.parse(value) as {
      name: string
      rif: string | null
      logo: string | null
    }
    settingsService.set(SettingKey.BUSINESS_NAME, name)
    for (const [key, v] of [
      [SettingKey.BUSINESS_RIF, rif],
      [SettingKey.BUSINESS_LOGO, logo]
    ] as const) {
      if (v) settingsService.set(key, v)
      else settingsService.delete(key)
    }
  } catch {
    // A malformed value from another PC must not stop the sync.
  }
}

function applyItem(item: PullItem, ctx: Context): void {
  switch (item.entity) {
    case 'USER':
      return applyUser(item.payload)
    case 'PRODUCT': {
      const current = applyRepository.productById(item.payload.id)
      if (current && !wins(item.payload, current)) return
      applyRepository.upsertProduct(item.payload)
      ctx.codes.add(item.payload.code)
      return
    }
    case 'CUSTOMER': {
      const current = applyRepository.customerById(item.payload.id)
      if (current && !wins(item.payload, current)) return
      applyRepository.upsertCustomer(item.payload)
      const { document, id, name } = item.payload
      if (document && applyRepository.customersByDocument(document).length > 1) {
        conflict(
          OutboxEntity.CUSTOMER,
          id,
          ConflictKind.DUPLICATE_CUSTOMER_DOCUMENT,
          `"${name}" comparte la cédula o RIF ${document} con otro cliente`,
          true
        )
      }
      return
    }
    case 'EXCHANGE_RATE': {
      const p = item.payload
      const current = applyRepository.rateByDate(p.date)
      const incoming = { updatedAt: p.confirmedAt, updatedByDevice: p.updatedByDevice }
      if (
        current &&
        !wins(incoming, {
          updatedAt: current.confirmedAt,
          updatedByDevice: current.updatedByDevice
        })
      )
        return
      applyRepository.upsertRate(p)
      return
    }
    case 'SALE':
      return applySale(item.payload)
    case 'STOCK_MOVEMENT':
      applyRepository.insertMovement(item.payload)
      ctx.stockOf.add(item.payload.productId)
      return
    case 'SETTING': {
      const p = item.payload
      const current = applyRepository.settingByKey(p.key)
      if (current && !wins(p, current)) return
      applyRepository.upsertSetting(p)
      if (p.key === BUSINESS_SETTING_KEY) applyBusinessSetting(p.value)
    }
  }
}

/** Two PCs can each deactivate a different admin offline; someone must be able to log in. */
function ensureAnAdmin(): void {
  if (applyRepository.activeAdmins() > 0) return
  const last = applyRepository.lastDeactivatedAdmin()
  if (!last) return
  const row = applyRepository.reactivateUser(last.id, deviceService.stamp())
  outboxService.enqueue(OutboxEntity.USER, row.id, row)
  conflict(
    OutboxEntity.USER,
    row.id,
    ConflictKind.LAST_ADMIN_REACTIVATED,
    `Se reactivó a "${row.username}" porque no quedaba ningún administrador activo`
  )
}

export const applyService = {
  /**
   * Applies a batch of changes from the Worker in one transaction, together with the cursor, so a
   * cut in the middle leaves nothing half done. Nothing here goes to the outbox, or the change
   * would travel back to the Worker and around again; only the fixes the sync itself makes do.
   */
  applyBatch(items: PullItem[], nextSeq: number): void {
    transaction(() => {
      const ctx: Context = { stockOf: new Set(), codes: new Set() }
      for (const item of items) applyItem(item, ctx)
      applyRepository.refreshStock(ctx.stockOf)
      resolveCodes(ctx.codes)
      ensureAnAdmin()
      settingsService.set(SettingKey.PULL_CURSOR, String(nextSeq))
    })
  }
}
