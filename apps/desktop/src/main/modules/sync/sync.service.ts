import {
  businessStatus,
  DomainError,
  devicesResponse,
  ENTITY_PROTOCOL,
  ErrorCode,
  healthResponse,
  nowIso,
  OutboxEntity,
  PULL_BATCH_SIZE,
  pullResponse,
  pushResponse,
  rateResponse,
  registerResponse,
  SHARED_ENTITIES,
  SYNC_BATCH_SIZE,
  SYNC_PROTOCOL,
  type BusinessStatus,
  type DeviceDto,
  type CloudSettingsInput,
  type OutboxMessage,
  type RateResponse
} from '@bllt/shared'
import { net } from 'electron'
import type { CloudSettings, SyncConflictDto, SyncStatus } from '../../../types/api'
import { EventChannel } from '../../../types/api'
import { SYNC_INTERVAL_MS } from '../../core/config'
import { transaction } from '../../core/db'
import { broadcast } from '../../core/ipc'
import { secureStorage } from '../../libs/secure-storage'
import { deviceService } from '../devices/device.service'
import { SettingKey, settingsService } from '../settings/settings.service'
import { applyRepository } from './apply.repository'
import { applyService } from './apply.service'
import { outboxRepository } from './outbox.repository'
import { outboxService } from './outbox.service'
import { snapshotRepository } from './snapshot.repository'

type CandidateListener = (candidates: RateResponse) => void

/** Rows per page when the outbox is rebuilt from the tables, so memory stays flat. */
const REBUILD_PAGE = 200
/** Sent rows older than this are dropped from the outbox. */
const SENT_RETENTION_DAYS = 14

const state = {
  running: false,
  lastError: null as string | null,
  /** Last protocol the Worker announced; null until the first cycle. */
  protocol: null as number | null,
  /** Changes waiting on the Worker after the last pull; null until the first one. */
  pendingDown: null as number | null,
  /** Changes applied since the app opened, to show progress while joining. */
  downloaded: 0,
  /** This PC was deactivated from the Worker. */
  revoked: false
}
const candidateListeners: CandidateListener[] = []
let timer: NodeJS.Timeout | null = null

interface Endpoint {
  url: string
  token: string
}

/** The Worker and the token of this PC, once it is connected. */
function config(): Endpoint | null {
  const url = settingsService.get(SettingKey.WORKER_URL)
  const stored = settingsService.get(SettingKey.DEVICE_TOKEN)
  if (!url || !stored) return null
  const token = secureStorage.decrypt(stored)
  return token ? { url: url.replace(/\/+$/, ''), token } : null
}

async function request(
  path: string,
  init: RequestInit = {},
  cfg: Endpoint | null = config()
): Promise<Response> {
  if (!cfg) throw new DomainError(ErrorCode.UNAVAILABLE, 'La nube no está configurada')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  try {
    const res = await net.fetch(`${cfg.url}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(init.headers as Record<string, string>),
        authorization: `Bearer ${cfg.token}`,
        'content-type': 'application/json'
      }
    })
    if (res.status === 401) {
      throw new DomainError(
        ErrorCode.UNAUTHORIZED,
        'El token no es válido o esta PC fue desactivada'
      )
    }
    if (res.status === 409) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null
      throw new DomainError(ErrorCode.CONFLICT, body?.message ?? 'El Worker rechazó la solicitud')
    }
    if (!res.ok) throw new DomainError(ErrorCode.UNAVAILABLE, `El Worker respondió ${res.status}`)
    return res
  } finally {
    clearTimeout(timeout)
  }
}

/** Entities this Worker's protocol can't take; they stay in the outbox until it's updated. */
function heldFor(protocol: number): OutboxEntity[] {
  return (Object.entries(ENTITY_PROTOCOL) as [OutboxEntity, number][])
    .filter(([, since]) => since > protocol)
    .map(([entity]) => entity)
}

async function workerProtocol(cfg: Endpoint | null = config()): Promise<number> {
  const res = await request('/api/health', {}, cfg)
  return healthResponse.parse(await res.json()).protocol
}

async function pushPending(protocol: number): Promise<void> {
  const held = heldFor(protocol)
  for (;;) {
    const rows = outboxRepository.pending(SYNC_BATCH_SIZE, held)
    if (rows.length === 0) return
    const messages = rows.map(
      (row) =>
        ({ id: row.id, entity: row.entity, payload: JSON.parse(row.payload) }) as OutboxMessage
    )
    const res = await request('/api/sync/push', {
      method: 'POST',
      body: JSON.stringify({ messages })
    })
    const { accepted } = pushResponse.parse(await res.json())
    outboxRepository.markSent(accepted, nowIso())
    // The Worker may accept only a prefix; stop only when nothing moved.
    if (accepted.length === 0) return
  }
}

/** Downloads and applies what the other PCs did, until nothing is left. */
async function pullAll(): Promise<void> {
  const includeOwn = settingsService.get(SettingKey.PULL_INCLUDE_OWN) === '1'
  for (;;) {
    const since = Number(settingsService.get(SettingKey.PULL_CURSOR) ?? '0')
    const query = `since=${since}&limit=${PULL_BATCH_SIZE}&includeOwn=${includeOwn}`
    const res = await request(`/api/sync/pull?${query}`)
    const page = pullResponse.parse(await res.json())
    applyService.applyBatch(page.items, page.nextSeq)
    state.downloaded += page.items.length
    state.pendingDown = page.remaining
    broadcast(EventChannel.SYNC_STATUS, syncService.status())
    if (!page.hasMore) break
  }
  settingsService.delete(SettingKey.PULL_INCLUDE_OWN)
  settingsService.set(SettingKey.LAST_PULL_AT, nowIso())
}

async function refreshDevices(): Promise<void> {
  const res = await request('/api/devices')
  deviceService.replaceAll(devicesResponse.parse(await res.json()).devices)
}

/**
 * Tells the Worker this PC finished its first upload, so a new PC can join. Once confirmed the
 * queue from before this version is no longer needed.
 */
async function confirmUpload(): Promise<void> {
  if (settingsService.get(SettingKey.UPLOAD_CONFIRMED)) return
  if (outboxRepository.countPending() > 0) return
  await request('/api/sync/upload-complete', { method: 'POST', body: '{}' })
  settingsService.set(SettingKey.UPLOAD_CONFIRMED, nowIso())
  outboxRepository.dropLegacy()
}

/** Queues every row that exists, once, when this PC becomes the first one of a business. */
function queueEverything(): void {
  const queue = (entity: OutboxEntity, id: string, payload: unknown) =>
    outboxService.enqueue(entity, id, payload)
  transaction(() => {
    // These are rebuilt from the tables below; rate decisions and the name are not.
    outboxRepository.discardPending([...SHARED_ENTITIES])
    for (const row of snapshotRepository.users()) queue(OutboxEntity.USER, row.id, row)
    for (const { stock: _stock, ...row } of snapshotRepository.products())
      queue(OutboxEntity.PRODUCT, row.id, row)
    for (const row of snapshotRepository.customers()) queue(OutboxEntity.CUSTOMER, row.id, row)
    for (const row of snapshotRepository.rates()) queue(OutboxEntity.EXCHANGE_RATE, row.date, row)
    for (const row of snapshotRepository.settings()) queue(OutboxEntity.SETTING, row.key, row)
  })
  for (let offset = 0; ; offset += REBUILD_PAGE) {
    const sales = snapshotRepository.sales(REBUILD_PAGE, offset)
    if (sales.length === 0) break
    const items = snapshotRepository.itemsOf(sales.map((s) => s.id))
    transaction(() => {
      for (const sale of sales) {
        queue(OutboxEntity.SALE, sale.id, {
          ...sale,
          items: items.filter((i) => i.saleId === sale.id)
        })
      }
    })
  }
  for (let offset = 0; ; offset += REBUILD_PAGE) {
    const movements = snapshotRepository.movements(REBUILD_PAGE, offset)
    if (movements.length === 0) break
    transaction(() => movements.forEach((m) => queue(OutboxEntity.STOCK_MOVEMENT, m.id, m)))
  }
  settingsService.set(SettingKey.UPLOAD_TOTAL, String(outboxRepository.countPending()))
}

function store(input: { workerUrl: string }, token: string, name: string, series: string): void {
  settingsService.set(SettingKey.WORKER_URL, input.workerUrl.replace(/\/+$/, ''))
  settingsService.set(SettingKey.DEVICE_TOKEN, secureStorage.encrypt(token))
  deviceService.assign(name, series)
  state.protocol = null
  state.revoked = false
  state.lastError = null
}

/** Registers this PC with the Worker. `series` is what the PC already uses, if it has sales. */
async function register(
  input: { workerUrl: string; syncToken: string },
  name: string,
  series?: string
) {
  const cfg = { url: input.workerUrl.replace(/\/+$/, ''), token: input.syncToken }
  if ((await workerProtocol(cfg)) < SYNC_PROTOCOL) {
    throw new DomainError(
      ErrorCode.UNAVAILABLE,
      'El Worker es de una versión anterior. Actualízalo antes de conectar esta PC'
    )
  }
  const res = await request(
    '/api/devices/register',
    { method: 'POST', body: JSON.stringify({ deviceId: deviceService.id(), name, series }) },
    cfg
  )
  return registerResponse.parse(await res.json())
}

export const syncService = {
  /** Kept for the modules that queue their writes through here. */
  enqueue(entity: OutboxEntity, entityId: string, payload: unknown): void {
    outboxService.enqueue(entity, entityId, payload)
  },

  isConfigured(): boolean {
    return config() !== null
  },

  status(): SyncStatus {
    const uploadTotal = settingsService.get(SettingKey.UPLOAD_TOTAL)
    const uploading = !!uploadTotal && !settingsService.get(SettingKey.UPLOAD_CONFIRMED)
    return {
      configured: this.isConfigured(),
      running: state.running,
      // What's held for an older Worker isn't counted: the notice below covers it.
      pending: outboxRepository.countPending(heldFor(state.protocol ?? SYNC_PROTOCOL)),
      pendingDown: state.pendingDown,
      downloaded: state.downloaded,
      lastSyncAt: settingsService.get(SettingKey.LAST_SYNC_AT),
      lastPushAt: settingsService.get(SettingKey.LAST_PUSH_AT),
      lastPullAt: settingsService.get(SettingKey.LAST_PULL_AT),
      lastError: state.lastError,
      workerOutdated: state.protocol !== null && state.protocol < SYNC_PROTOCOL,
      revoked: state.revoked,
      deviceName: deviceService.name(),
      series: deviceService.series(),
      uploadTotal: uploading ? Number(uploadTotal) : null
    }
  },

  onCandidates(listener: CandidateListener): void {
    candidateListeners.push(listener)
  },

  /** Rate candidates from the Worker (cron and phone); never applied automatically. */
  async fetchCandidates(cfg: Endpoint | null = config()): Promise<RateResponse> {
    const res = await request('/api/sync/rate', {}, cfg)
    return rateResponse.parse(await res.json())
  },

  /** One cycle: push the outbox, pull what other PCs did, then ask for rate candidates. */
  async runCycle(): Promise<SyncStatus> {
    if (state.running || !this.isConfigured()) return this.status()
    state.running = true
    broadcast(EventChannel.SYNC_STATUS, this.status())
    try {
      state.protocol = await workerProtocol()
      if (state.protocol < SYNC_PROTOCOL) {
        throw new DomainError(ErrorCode.UNAVAILABLE, 'El Worker es de una versión anterior')
      }
      await pushPending(state.protocol)
      settingsService.set(SettingKey.LAST_PUSH_AT, nowIso())
      await pullAll()
      await confirmUpload()
      await refreshDevices()
      settingsService.set(SettingKey.LAST_SYNC_AT, nowIso())
      outboxRepository.prune(
        new Date(Date.now() - SENT_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
      )
      const candidates = await this.fetchCandidates()
      candidateListeners.forEach((listener) => listener(candidates))
      state.lastError = null
      state.revoked = false
    } catch (error) {
      state.revoked = error instanceof DomainError && error.code === ErrorCode.UNAUTHORIZED
      state.lastError = error instanceof DomainError ? error.message : 'Sin conexión con el Worker'
    } finally {
      state.running = false
      broadcast(EventChannel.SYNC_STATUS, this.status())
    }
    return this.status()
  },

  start(): void {
    if (timer) return
    setTimeout(() => void this.runCycle(), 3_000)
    timer = setInterval(() => void this.runCycle(), SYNC_INTERVAL_MS)
  },

  stop(): void {
    if (timer) clearInterval(timer)
    timer = null
  },

  getSettings(): CloudSettings {
    return {
      workerUrl: settingsService.get(SettingKey.WORKER_URL) ?? '',
      connected: this.isConfigured(),
      deviceName: deviceService.name(),
      series: deviceService.series(),
      secureStorage: secureStorage.available()
    }
  },

  /**
   * Connects this PC, which already has its own data, to a Worker (or disconnects it when the URL
   * is empty). It asks for the series it already uses and uploads everything once.
   */
  async connect(input: CloudSettingsInput): Promise<CloudSettings> {
    if (!input.workerUrl) {
      settingsService.delete(SettingKey.WORKER_URL)
      settingsService.delete(SettingKey.DEVICE_TOKEN)
      state.protocol = null
      state.lastError = null
      return this.getSettings()
    }
    if (!input.syncToken) {
      throw new DomainError(ErrorCode.VALIDATION, 'Escribe el SYNC_TOKEN')
    }
    const name = input.deviceName || deviceService.name() || 'Caja'
    const done = await register(input, name, deviceService.series())
    store(input, done.token, name, done.series)
    settingsService.delete(SettingKey.UPLOAD_CONFIRMED)
    queueEverything()
    void this.runCycle()
    return this.getSettings()
  },

  /** What a Worker says about the business, before this PC decides how to join. */
  async inspect(input: { workerUrl: string; syncToken: string }): Promise<BusinessStatus> {
    const cfg = { url: input.workerUrl.replace(/\/+$/, ''), token: input.syncToken }
    if ((await workerProtocol(cfg)) < SYNC_PROTOCOL) {
      throw new DomainError(
        ErrorCode.UNAVAILABLE,
        'El Worker es de una versión anterior. Actualízalo antes de conectar esta PC'
      )
    }
    const res = await request('/api/business/status', {}, cfg)
    return businessStatus.parse(await res.json())
  },

  /** A new PC joins a business that already exists: registers and downloads everything. */
  async join(input: { workerUrl: string; syncToken: string; deviceName: string }): Promise<void> {
    const status = await this.inspect(input)
    if (!status.hasData) {
      throw new DomainError(ErrorCode.CONFLICT, 'Este negocio todavía no tiene datos en la nube')
    }
    if (!status.complete) {
      throw new DomainError(
        ErrorCode.CONFLICT,
        'La PC original todavía está subiendo sus datos. Espera a que termine e inténtalo de nuevo'
      )
    }
    const done = await register(input, input.deviceName || 'Caja')
    store(input, done.token, input.deviceName || 'Caja', done.series)
    settingsService.set(SettingKey.PULL_CURSOR, '0')
    state.running = true
    state.downloaded = 0
    state.pendingDown = null
    try {
      await pullAll()
      await refreshDevices()
    } finally {
      state.running = false
      broadcast(EventChannel.SYNC_STATUS, this.status())
    }
    // Everything on this PC came from the Worker: nothing of its own to upload.
    settingsService.set(SettingKey.UPLOAD_CONFIRMED, nowIso())
    settingsService.set(SettingKey.LAST_SYNC_AT, nowIso())
  },

  conflicts(): SyncConflictDto[] {
    return applyRepository.unresolvedConflicts().map((c) => ({
      id: c.id,
      kind: c.kind,
      detail: c.detail,
      createdAt: c.createdAt
    }))
  },

  resolveConflict(id: string): void {
    applyRepository.resolveConflict(id, nowIso())
  },

  async revokeDevice(id: string): Promise<DeviceDto[]> {
    if (id === deviceService.id()) {
      throw new DomainError(ErrorCode.VALIDATION, 'No puedes desactivar esta misma PC')
    }
    await request(`/api/devices/${id}/revoke`, { method: 'POST', body: '{}' })
    await refreshDevices()
    return deviceService.list()
  },

  /** Tries the URL and registration token typed in the form, without saving anything. */
  async test(input: { workerUrl: string; syncToken: string }): Promise<{
    ok: boolean
    message: string
  }> {
    if (!input.workerUrl) return { ok: false, message: 'Escribe la URL del Worker' }
    if (!input.syncToken) return { ok: false, message: 'Escribe el SYNC_TOKEN' }
    try {
      const status = await this.inspect(input)
      return {
        ok: true,
        message: status.hasData
          ? 'Conexión correcta. Este negocio ya tiene datos en la nube'
          : 'Conexión correcta con el Worker'
      }
    } catch (error) {
      return {
        ok: false,
        message: error instanceof DomainError ? error.message : 'No se pudo conectar con el Worker'
      }
    }
  }
}
