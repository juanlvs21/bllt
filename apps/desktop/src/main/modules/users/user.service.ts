import {
  DomainError,
  ErrorCode,
  hashPassword,
  normalizeRecoveryCode,
  OutboxEntity,
  Role,
  generateRecoveryCode,
  verifyPassword,
  type LoginInput,
  type PasswordHash,
  type RecoverInput,
  type SetupInput,
  type UserCreateInput,
  type UserRow
} from '@bllt/shared'
import type { AuthStatus, SessionUser, SetupResult, UserDto } from '../../../types/api'
import { transaction } from '../../core/db'
import { forbidden, notFound } from '../../core/errors'
import { session } from '../../core/session'
import { newId } from '../../utils/id'
import { businessService } from '../business/business.service'
import {
  businessSettingsService,
  BusinessSettingKey
} from '../business-settings/business-settings.service'
import { deviceService } from '../devices/device.service'
import { syncService } from '../sync/sync.service'
import { userRepository } from './user.repository'

const toSession = (u: UserRow): SessionUser => ({ id: u.id, username: u.username, role: u.role })
const toDto = (u: UserRow): UserDto => ({
  id: u.id,
  username: u.username,
  role: u.role,
  active: u.active,
  createdAt: u.createdAt
})

function syncUser(user: UserRow): void {
  syncService.enqueue(OutboxEntity.USER, user.id, user)
}

async function newUserRow(username: string, password: string, role: Role): Promise<UserRow> {
  if (userRepository.findByUsername(username)) {
    throw new DomainError(ErrorCode.CONFLICT, 'Ese usuario ya existe')
  }
  const hash = await hashPassword(password)
  const stamp = deviceService.stamp()
  return {
    id: newId(),
    username,
    ...hash,
    role,
    active: true,
    createdAt: stamp.updatedAt,
    ...stamp
  }
}

async function storeRecoveryCode(): Promise<string> {
  const code = generateRecoveryCode()
  const hash = await hashPassword(normalizeRecoveryCode(code))
  transaction(() => businessSettingsService.setJson(BusinessSettingKey.RECOVERY_CODE, hash))
  return code
}

export const userService = {
  status(): AuthStatus {
    return { needsSetup: userRepository.count() === 0, user: session.get() }
  },

  /** First run: creates the owner (ADMIN) and returns a recovery code to write down. */
  async setup(input: SetupInput): Promise<SetupResult> {
    if (userRepository.count() > 0)
      throw new DomainError(ErrorCode.CONFLICT, 'Bllt ya está configurado')
    const row = await newUserRow(input.username, input.password, Role.ADMIN)
    const recoveryCode = await storeRecoveryCode()
    businessService.save(input.business)
    transaction(() => {
      userRepository.insert(row)
      syncUser(row)
    })
    if (input.workerUrl) {
      // The connection was already tried on the first screen; if the Worker is down now, the
      // owner can connect later from Settings.
      await syncService
        .connect({
          workerUrl: input.workerUrl,
          syncToken: input.syncToken ?? '',
          deviceName: input.deviceName ?? ''
        })
        .catch((error) => console.error('[sync]', error))
    }
    const user = toSession(row)
    session.set(user)
    return { user, recoveryCode }
  },

  async login(input: LoginInput): Promise<SessionUser> {
    const row = userRepository.findByUsername(input.username)
    const valid = row && row.active && (await verifyPassword(input.password, row))
    if (!row || !valid) {
      throw new DomainError(ErrorCode.UNAUTHORIZED, 'Usuario o contraseña incorrectos')
    }
    const user = toSession(row)
    session.set(user)
    return user
  },

  logout(): void {
    session.set(null)
  },

  /** Resets the password of an ADMIN using the paper recovery code. */
  async recover(input: RecoverInput): Promise<void> {
    const stored = businessSettingsService.getJson<PasswordHash | null>(
      BusinessSettingKey.RECOVERY_CODE,
      null
    )
    const row = userRepository.findByUsername(input.username)
    const valid =
      stored &&
      row?.role === Role.ADMIN &&
      (await verifyPassword(normalizeRecoveryCode(input.recoveryCode), stored))
    if (!row || !valid) {
      throw new DomainError(ErrorCode.UNAUTHORIZED, 'El código de recuperación no es válido')
    }
    const hash = await hashPassword(input.newPassword)
    transaction(() =>
      syncUser(userRepository.update(row.id, { ...hash, active: true, ...deviceService.stamp() }))
    )
  },

  async changePassword(user: SessionUser, current: string, next: string): Promise<void> {
    const row = userRepository.findById(user.id)
    if (!row || !(await verifyPassword(current, row))) {
      throw new DomainError(ErrorCode.VALIDATION, 'La contraseña actual no es correcta')
    }
    const hash = await hashPassword(next)
    transaction(() =>
      syncUser(userRepository.update(row.id, { ...hash, ...deviceService.stamp() }))
    )
  },

  list(): UserDto[] {
    return userRepository.list().map(toDto)
  },

  async create(input: UserCreateInput): Promise<UserDto> {
    const row = await newUserRow(input.username, input.password, input.role)
    transaction(() => {
      userRepository.insert(row)
      syncUser(row)
    })
    return toDto(row)
  },

  /** Users are deactivated, never deleted. The last active ADMIN can't be deactivated. */
  setActive(actor: SessionUser, id: string, active: boolean): void {
    const row = userRepository.findById(id)
    if (!row) throw notFound('El usuario')
    if (!active && row.id === actor.id) {
      throw new DomainError(ErrorCode.VALIDATION, 'No puedes desactivar tu propio usuario')
    }
    if (
      !active &&
      row.role === Role.ADMIN &&
      row.active &&
      userRepository.countActiveAdmins() <= 1
    ) {
      throw new DomainError(ErrorCode.VALIDATION, 'Debe quedar al menos un administrador activo')
    }
    transaction(() => syncUser(userRepository.update(id, { active, ...deviceService.stamp() })))
  },

  async resetPassword(id: string, password: string): Promise<void> {
    const row = userRepository.findById(id)
    if (!row) throw notFound('El usuario')
    const hash = await hashPassword(password)
    transaction(() => syncUser(userRepository.update(id, { ...hash, ...deviceService.stamp() })))
  },

  async regenerateRecoveryCode(actor: SessionUser): Promise<string> {
    if (actor.role !== Role.ADMIN) throw forbidden()
    return storeRecoveryCode()
  },

  /** Sanity check for a live session: a deactivated user gets logged out. */
  isStillActive(id: string): boolean {
    return userRepository.findById(id)?.active ?? false
  }
}
