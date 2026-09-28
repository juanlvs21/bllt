import {
  DomainError,
  ENTITY_PROTOCOL,
  ErrorCode,
  healthResponse,
  nowIso,
  pushResponse,
  rateResponse,
  SYNC_BATCH_SIZE,
  SYNC_PROTOCOL,
  type OutboxEntity,
  type OutboxMessage,
  type RateResponse
} from '@bllt/shared'
import { net } from 'electron'
import type { CloudSettings, SyncStatus } from '../../../types/api'
import { SYNC_INTERVAL_MS } from '../../core/config'
import { broadcast } from '../../core/ipc'
import { secureStorage } from '../../libs/secure-storage'
import { newId } from '../../utils/id'
import { SettingKey, settingsService } from '../settings/settings.service'
import { EventChannel } from '../../../types/api'
import { outboxRepository } from './outbox.repository'

type CandidateListener = (candidates: RateResponse) => void

const state = {
  running: false,
  lastError: null as string | null,
  /** Last protocol the Worker announced; null until the first cycle. */
  protocol: null as number | null
}
const candidateListeners: CandidateListener[] = []
let timer: NodeJS.Timeout | null = null

function config(): { url: string; token: string } | null {
  const url = settingsService.get(SettingKey.WORKER_URL)
  const stored = settingsService.get(SettingKey.SYNC_TOKEN)
  if (!url || !stored) return null
  const token = secureStorage.decrypt(stored)
  return token ? { url: url.replace(/\/+$/, ''), token } : null
}

async function request(path: string, init: RequestInit = {}, cfg = config()): Promise<Response> {
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
    if (res.status === 401)
      throw new DomainError(ErrorCode.UNAUTHORIZED, 'El SYNC_TOKEN no es válido')
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

async function workerProtocol(): Promise<number> {
  const res = await request('/api/health')
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

export const syncService = {
  /**
   * Appends a snapshot to the outbox. Callers invoke it inside the same
   * transaction as the write it describes.
   */
  enqueue(entity: OutboxEntity, entityId: string, payload: unknown): void {
    outboxRepository.insert({
      id: newId(),
      entity,
      entityId,
      payload: JSON.stringify(payload),
      createdAt: nowIso()
    })
  },

  isConfigured(): boolean {
    return config() !== null
  },

  status(): SyncStatus {
    return {
      configured: this.isConfigured(),
      running: state.running,
      // What's held for an older Worker isn't counted: the notice below covers it.
      pending: outboxRepository.countPending(heldFor(state.protocol ?? SYNC_PROTOCOL)),
      lastSyncAt: settingsService.get(SettingKey.LAST_SYNC_AT),
      lastError: state.lastError,
      workerOutdated: state.protocol !== null && state.protocol < SYNC_PROTOCOL
    }
  },

  onCandidates(listener: CandidateListener): void {
    candidateListeners.push(listener)
  },

  /** Rate candidates from the Worker (cron and phone); never applied automatically. */
  async fetchCandidates(cfg = config()): Promise<RateResponse> {
    const res = await request('/api/sync/rate', {}, cfg)
    return rateResponse.parse(await res.json())
  },

  /** One cycle: push the outbox (including rate decisions), then ask for rate candidates. */
  async runCycle(): Promise<SyncStatus> {
    if (state.running || !this.isConfigured()) return this.status()
    state.running = true
    broadcast(EventChannel.SYNC_STATUS, this.status())
    try {
      state.protocol = await workerProtocol()
      await pushPending(state.protocol)
      settingsService.set(SettingKey.LAST_SYNC_AT, nowIso())
      const candidates = await this.fetchCandidates()
      candidateListeners.forEach((listener) => listener(candidates))
      state.lastError = null
    } catch (error) {
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
      hasToken: !!settingsService.get(SettingKey.SYNC_TOKEN),
      secureStorage: secureStorage.available()
    }
  },

  /** Saves the Worker URL and token. An empty token keeps the stored one. */
  saveSettings(input: { workerUrl: string; syncToken: string }): CloudSettings {
    if (input.workerUrl)
      settingsService.set(SettingKey.WORKER_URL, input.workerUrl.replace(/\/+$/, ''))
    else settingsService.delete(SettingKey.WORKER_URL)
    state.protocol = null
    if (input.syncToken)
      settingsService.set(SettingKey.SYNC_TOKEN, secureStorage.encrypt(input.syncToken))
    if (!input.workerUrl) settingsService.delete(SettingKey.SYNC_TOKEN)
    state.lastError = null
    void this.runCycle()
    return this.getSettings()
  },

  /**
   * Tries the URL and token typed in the form before saving them. An empty token falls back
   * to the stored one, as saveSettings does.
   */
  async test(input: { workerUrl: string; syncToken: string }): Promise<{
    ok: boolean
    message: string
  }> {
    const stored = settingsService.get(SettingKey.SYNC_TOKEN)
    const token = input.syncToken || (stored ? secureStorage.decrypt(stored) : null)
    if (!input.workerUrl) return { ok: false, message: 'Escribe la URL del Worker' }
    if (!token) return { ok: false, message: 'Escribe el SYNC_TOKEN' }
    try {
      await this.fetchCandidates({ url: input.workerUrl.replace(/\/+$/, ''), token })
      return { ok: true, message: 'Conexión correcta con el Worker' }
    } catch (error) {
      return {
        ok: false,
        message: error instanceof DomainError ? error.message : 'No se pudo conectar con el Worker'
      }
    }
  }
}
