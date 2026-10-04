import {
  DomainError,
  ErrorCode,
  nowIso,
  type DeviceDto,
  type RegisterRequest,
  type RegisterResponse
} from '@bllt/shared'
import { deviceRepository, type DeviceRow } from './device.repository'

const SERIES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** 256 random bits, URL safe. Shown once to the PC; only its hash is stored. */
function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

const toDto = (d: DeviceRow): DeviceDto => ({
  id: d.id,
  name: d.name,
  series: d.series,
  active: d.active,
  createdAt: d.createdAt,
  lastSeenAt: d.lastSeenAt
})

export const deviceService = {
  /** The active device owning this token, with its last connection updated. */
  async authenticate(d1: D1Database, token: string): Promise<DeviceRow | null> {
    const device = await deviceRepository.findActiveByTokenHash(d1, await sha256Hex(token))
    if (!device) return null
    await deviceRepository.update(d1, device.id, { lastSeenAt: nowIso() })
    return device
  },

  /**
   * Registers a PC and hands it its token. The series is the PC's invoice letter: the one it
   * asks for if it's free (the original PC asks for "A"), otherwise the next free one. A PC that
   * registers again (reinstalled app, same id) keeps its series and gets a new token.
   */
  async register(d1: D1Database, request: RegisterRequest): Promise<RegisterResponse> {
    const token = newToken()
    const tokenHash = await sha256Hex(token)
    const existing = await deviceRepository.findById(d1, request.deviceId)
    if (existing) {
      await deviceRepository.update(d1, existing.id, {
        name: request.name,
        tokenHash,
        active: true,
        lastSeenAt: nowIso()
      })
      return { deviceId: existing.id, series: existing.series, token }
    }
    const used = new Set((await deviceRepository.list(d1)).map((d) => d.series))
    let series: string
    if (request.series) {
      if (used.has(request.series)) {
        throw new DomainError(
          ErrorCode.CONFLICT,
          `La serie ${request.series} ya la usa otra PC de este negocio. Si esta PC es nueva, instala Bllt desde cero y conéctala en la primera pantalla.`
        )
      }
      series = request.series
    } else {
      const free = [...SERIES].find((s) => !used.has(s))
      if (!free) throw new DomainError(ErrorCode.CONFLICT, 'No quedan series libres')
      series = free
    }
    const now = nowIso()
    try {
      await deviceRepository.insert(d1, {
        id: request.deviceId,
        name: request.name,
        series,
        tokenHash,
        active: true,
        createdAt: now,
        lastSeenAt: now
      })
    } catch {
      // Two PCs picked the same free letter at the same moment.
      throw new DomainError(
        ErrorCode.CONFLICT,
        'Otra PC se registró al mismo tiempo. Inténtalo de nuevo'
      )
    }
    return { deviceId: request.deviceId, series, token }
  },

  async list(d1: D1Database): Promise<DeviceDto[]> {
    return (await deviceRepository.list(d1)).map(toDto)
  },

  async revoke(d1: D1Database, id: string, actorId: string): Promise<void> {
    if (id === actorId) {
      throw new DomainError(ErrorCode.VALIDATION, 'Una PC no puede desactivarse a sí misma')
    }
    if (!(await deviceRepository.findById(d1, id))) {
      throw new DomainError(ErrorCode.NOT_FOUND, 'La PC no existe')
    }
    await deviceRepository.update(d1, id, { active: false })
  },

  hasDevices: async (d1: D1Database) => (await deviceRepository.count(d1)) > 0
}
